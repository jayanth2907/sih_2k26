import os
import io
import re
import hashlib
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple

import pypdf
from sqlalchemy.orm import Session

from app.models.document import Document, DocumentPage, ExtractedDocumentField
from app.models.user import User
from app.models.mine import Mine
from app.models.governance_task import GovernanceTask
from app.services.audit_service import AuditService
from app.services.ocr_service import get_ocr_provider, compute_confidence_band, compute_quality_status
from app.services.government_rag_service import government_rag_service, IngestedChunk

logger = logging.getLogger(__name__)

SERVICES_DIR = os.path.dirname(os.path.abspath(__file__))
APP_DIR = os.path.dirname(SERVICES_DIR)
BACKEND_DIR = os.path.dirname(APP_DIR)
BASE_DIR = os.path.dirname(BACKEND_DIR)
UPLOADS_DIR = os.path.join(BASE_DIR, "data", "uploads")
PREVIEWS_DIR = os.path.join(UPLOADS_DIR, "previews")

os.makedirs(UPLOADS_DIR, exist_ok=True)
os.makedirs(PREVIEWS_DIR, exist_ok=True)


class DocumentIntelligenceService:
    _instance: Optional["DocumentIntelligenceService"] = None

    @classmethod
    def get_instance(cls) -> "DocumentIntelligenceService":
        if cls._instance is None:
            cls._instance = DocumentIntelligenceService()
        return cls._instance

    @staticmethod
    def compute_sha256(content_bytes: bytes) -> str:
        return hashlib.sha256(content_bytes).hexdigest()

    @staticmethod
    def sanitize_filename(filename: str) -> str:
        clean = re.sub(r"[^\w\.-]", "_", os.path.basename(filename))
        return clean or "uploaded_document"

    @staticmethod
    def classify_document(filename: str, combined_text: str) -> Tuple[str, float, str]:
        """
        Deterministic first-pass classification into 16 statutory & mine categories.
        """
        fn_lower = filename.lower()
        txt_lower = combined_text.lower()

        if any(w in fn_lower or w in txt_lower for w in ["cmsms", "khanan prahari", "illegal mining"]):
            return "CMSMS", 0.95, "Matched CMSMS / Khanan Prahari surveillance terminology"
        
        if any(w in fn_lower or w in txt_lower for w in ["pgrm", "cpgrams", "public grievance", "grievance cell"]):
            return "PGRM", 0.95, "Matched Public Grievances Redressal Mechanism identifiers"

        if any(w in fn_lower or w in txt_lower for w in ["annual report", "annualreport", "mocar"]):
            return "ANNUAL_REPORT", 0.90, "Matched Ministry of Coal Annual Report structure"

        if any(w in fn_lower or w in txt_lower for w in ["demand no 8", "demand no 9", "ddg", "oomf", "budget allocation"]):
            return "BUDGET", 0.92, "Matched Union Budget demands for grants and output-outcome indicators"

        if any(w in fn_lower or w in txt_lower for w in ["dgms circular", "technical circular", "safety circular"]):
            return "GOVERNMENT_CIRCULAR", 0.94, "Matched DGMS statutory technical circular header"

        if any(w in fn_lower or w in txt_lower for w in ["coal mines regulations", "cmr 2017", "mines rules 1955", "mines act 1952"]):
            return "DGMS", 0.96, "Matched primary DGMS safety legislation"

        if any(w in fn_lower or w in txt_lower for w in ["mine summary", "coal block", "geological reserve", "cmpdi summary"]):
            return "MINE_SUMMARY", 0.93, "Matched CMPDI Coal Block geological summary template"

        if any(w in fn_lower or w in txt_lower for w in ["inspection report", "form iv", "form vi", "inspector finding", "statutory inspection", "standing committee"]):
            return "INSPECTION_REPORT", 0.91, "Matched statutory mine inspection report patterns"

        if any(w in fn_lower or w in txt_lower for w in ["shift register", "gas register", "ventilation log", "overman diary", "shift report"]):
            return "SAFETY_REGISTER", 0.89, "Matched statutory shift & gas monitoring register"

        if any(w in fn_lower or w in txt_lower for w in ["production report", "monthly output", "coal dispatch", "rake loading", "tonnage"]):
            return "PRODUCTION_REPORT", 0.88, "Matched coal production and dispatch records"

        if any(w in fn_lower or w in txt_lower for w in ["attendance register", "muster roll", "shift worker", "manpower", "vocational training"]):
            return "ATTENDANCE_REGISTER", 0.88, "Matched workforce attendance and muster roll format"

        if any(w in fn_lower or w in txt_lower for w in ["contractor", "vtc certificate", "safety passport", "contract agreement"]):
            return "CONTRACTOR_DOCUMENT", 0.89, "Matched contractor worker onboarding and compliance"

        if any(w in fn_lower or w in txt_lower for w in ["environmental", "respirable dust", "effluent", "air quality", "pm10", "pm2.5", "spm"]):
            return "ENVIRONMENT_REPORT", 0.90, "Matched environmental monitoring and dust sampling"

        if any(w in fn_lower or w in txt_lower for w in ["grievance", "complaint", "worker petition"]):
            return "GRIEVANCE", 0.85, "Matched grievance petition"

        if any(w in fn_lower or w in txt_lower for w in ["violation", "statutory notice", "show cause", "contravention"]):
            return "REGULATORY_REPORT", 0.87, "Matched statutory non-compliance notice"

        return "OTHER", 0.70, "General mining governance document"

    @staticmethod
    def validate_field(field_name: str, field_value: str) -> Tuple[str, Optional[str]]:
        """
        Field validation rules: Latitude (-90..90), Longitude (-180..180), Dates, Numbers.
        Returns (status, error_message).
        """
        val = str(field_value).strip()
        if not val:
            return "INVALID", "Empty field value"

        # 1. Coordinates
        if field_name.lower() in ["latitude", "lat"]:
            try:
                lat = float(val)
                if -90.0 <= lat <= 90.0:
                    return "VALID", None
                return "REVIEW_REQUIRED", f"Latitude {lat} out of valid range [-90.0, 90.0]"
            except ValueError:
                return "INVALID", f"Invalid numeric latitude: {val}"

        if field_name.lower() in ["longitude", "lon", "long"]:
            try:
                lon = float(val)
                if -180.0 <= lon <= 180.0:
                    return "VALID", None
                return "REVIEW_REQUIRED", f"Longitude {lon} out of valid range [-180.0, 180.0]"
            except ValueError:
                return "INVALID", f"Invalid numeric longitude: {val}"

        # 2. Dates
        if "date" in field_name.lower():
            date_patterns = [
                r"^\d{4}-\d{2}-\d{2}$",
                r"^\d{2}[/-]\d{2}[/-]\d{4}$",
                r"^\d{2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}$"
            ]
            if any(re.match(p, val, re.IGNORECASE) for p in date_patterns):
                return "VALID", None
            return "REVIEW_REQUIRED", f"Date format requires verification: {val}"

        # 3. Numeric Quantities
        if any(k in field_name.lower() for k in ["production_quantity", "tonnage", "reserve", "area", "worker_count", "attendance"]):
            clean_num = re.sub(r"[^\d\.]", "", val)
            try:
                num = float(clean_num)
                if num >= 0:
                    return "VALID", None
                return "INVALID", f"Quantity cannot be negative: {val}"
            except ValueError:
                return "REVIEW_REQUIRED", f"Suspicious numeric field: {val}"

        # 4. Regulatory Clauses
        if any(k in field_name.lower() for k in ["regulation", "clause", "rule", "statute"]):
            if re.search(r"(?:regulation|reg|rule|section|sec|act|clause)\s*[\d\(\)]+", val, re.IGNORECASE):
                return "VALID", None
            return "REVIEW_REQUIRED", f"Check statutory clause format: {val}"

        return "VALID", None

    @staticmethod
    def extract_structured_fields(page_number: int, text: str, doc_category: str) -> List[Dict[str, Any]]:
        """
        Regex and pattern-based structured field extraction.
        Never fabricates values; only extracts genuine matched spans.
        """
        fields: List[Dict[str, Any]] = []

        # Helper to add field with validation
        def _add_field(name: str, value: str, confidence: float, source_text: str, method: str = "REGEX"):
            status, err = DocumentIntelligenceService.validate_field(name, value)
            fields.append({
                "field_name": name,
                "field_value": value.strip(),
                "confidence": round(confidence, 2),
                "source_page": page_number,
                "source_text": source_text.strip()[:200],
                "extraction_method": method,
                "validation_status": status,
                "validation_error": err
            })

        # 1. Mine Block Name
        mine_match = re.search(r"(?:Mine|Block|Colliery|Project)\s*(?:Name)?[:\-]?\s*([A-Z][A-Za-z0-9\s\-]{3,40}(?:Block|Mine|Colliery)?)", text)
        if mine_match:
            _add_field("mine_name", mine_match.group(1), 0.92, mine_match.group(0))

        # 2. Inspection / Report Date
        date_match = re.search(r"(?:Date of Inspection|Inspection Date|Report Date|Date)[:\-]?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{4}|\d{4}-\d{2}-\d{2}|\d{1,2}\s+[A-Za-z]+\s+\d{4})", text, re.IGNORECASE)
        if date_match:
            _add_field("inspection_date", date_match.group(1), 0.95, date_match.group(0))

        # 3. Officer / Inspector Name
        officer_match = re.search(r"(?:Inspecting Officer|Inspector|Manager|Officer-in-charge)[:\-]?\s*(?:Shri|Dr|Mr|Mrs)?\.?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})", text)
        if officer_match:
            _add_field("officer_name", officer_match.group(1), 0.88, officer_match.group(0))

        # 4. Coordinates (Latitude & Longitude)
        lat_match = re.search(r"(?:Latitude|Lat)[:\-]?\s*([+-]?\d{1,2}\.\d{2,7})", text, re.IGNORECASE)
        lon_match = re.search(r"(?:Longitude|Lon|Long)[:\-]?\s*([+-]?\d{1,3}\.\d{2,7})", text, re.IGNORECASE)
        if lat_match:
            _add_field("latitude", lat_match.group(1), 0.96, lat_match.group(0))
        if lon_match:
            _add_field("longitude", lon_match.group(1), 0.96, lon_match.group(0))

        # 5. Statutory Regulation References
        reg_match = re.search(r"(?:Regulation|Rule|Section)\s*(\d+[\(a-zA-Z0-9\)]*)\s*(?:of\s*(?:Coal Mines Regulations,?\s*2017|Mines Rules,?\s*1955|Mines Act,?\s*1952))?", text, re.IGNORECASE)
        if reg_match:
            _add_field("regulation_reference", reg_match.group(0), 0.93, reg_match.group(0))

        # 6. Production Tonnage
        prod_match = re.search(r"(?:Coal Production|Raw Coal|Output)[:\-]?\s*([\d,\.]+\s*(?:MT|Tonnes|Lakh Tonnes|Te))", text, re.IGNORECASE)
        if prod_match:
            _add_field("production_quantity", prod_match.group(1), 0.90, prod_match.group(0))

        # 7. Geological Reserves
        res_match = re.search(r"(?:Geological Reserve|Extractable Reserve|Total Reserve)[:\-]?\s*([\d,\.]+\s*(?:MT|Million Tonnes))", text, re.IGNORECASE)
        if res_match:
            _add_field("geological_reserve", res_match.group(1), 0.92, res_match.group(0))

        # 8. Workforce / Attendance Count
        worker_match = re.search(r"(?:Total Workers|Persons Employed|Muster Count|Attendance)[:\-]?\s*(\d+)", text, re.IGNORECASE)
        if worker_match:
            _add_field("worker_count", worker_match.group(1), 0.89, worker_match.group(0))

        # 9. Environmental Parameter
        dust_match = re.search(r"(?:Respirable Dust|Dust Level|PM10|PM2\.5|CH4|Methane)[:\-]?\s*([\d\.]+\s*(?:mg/m³|%|ppm))", text, re.IGNORECASE)
        if dust_match:
            _add_field("measured_parameter", dust_match.group(1), 0.91, dust_match.group(0))

        # 10. Grievance Reference
        griev_match = re.search(r"(?:CPGRAMS Ref|Grievance No|Complaint ID)[:\-]?\s*([A-Za-z0-9/\-_]{6,30})", text, re.IGNORECASE)
        if griev_match:
            _add_field("grievance_reference", griev_match.group(1), 0.95, griev_match.group(0))

        return fields

    def process_document(
        self,
        file_bytes: bytes,
        filename: str,
        title: Optional[str] = None,
        mine_id: Optional[int] = None,
        uploader_id: Optional[int] = None,
        source_tier: str = "TIER_3_TRINETRA_OPERATIONAL",
        db: Optional[Session] = None
    ) -> Document:
        """
        Complete deterministic hybrid processing pipeline:
        File Validation -> SHA-256 -> Hybrid Page Extraction (Native vs OCR) ->
        Classification -> Structured Fields -> Validation -> RAG Chunking -> DB Persistence.
        """
        file_hash = self.compute_sha256(file_bytes)
        clean_fn = self.sanitize_filename(filename)
        doc_title = title or clean_fn.rsplit(".", 1)[0].replace("_", " ").title()

        # Save original file to disk
        file_save_path = os.path.join(UPLOADS_DIR, f"{file_hash[:16]}_{clean_fn}")
        with open(file_save_path, "wb") as f:
            f.write(file_bytes)

        mime_type = "application/pdf" if clean_fn.lower().endswith(".pdf") else "image/png" if clean_fn.lower().endswith(".png") else "image/jpeg"

        # Create Document record
        doc = Document(
            title=doc_title,
            source_filename=clean_fn,
            source_tier=source_tier,
            file_path=file_save_path,
            file_hash=file_hash,
            original_sha256=file_hash,
            mime_type=mime_type,
            file_size_bytes=len(file_bytes),
            mine_id=mine_id,
            uploader_id=uploader_id,
            processing_stage="VALIDATING",
            ocr_status="PROCESSING"
        )
        if db:
            db.add(doc)
            db.commit()
            db.refresh(doc)

        ocr_provider = get_ocr_provider()
        pages_data: List[Dict[str, Any]] = []
        all_extracted_fields: List[Dict[str, Any]] = []
        combined_text_list: List[str] = []

        native_count = 0
        ocr_count = 0
        ocr_confidences: List[float] = []

        # Processing PDF vs Image
        if mime_type == "application/pdf":
            try:
                reader = pypdf.PdfReader(io.BytesIO(file_bytes))
                total_pages = len(reader.pages)
                doc.page_count = total_pages

                for p_idx, page in enumerate(reader.pages):
                    page_num = p_idx + 1
                    raw_text = page.extract_text() or ""
                    clean_text = re.sub(r"\s+", " ", raw_text).strip()

                    # Check if page has native digital text
                    if len(clean_text) >= 40:
                        # TEXT_NATIVE
                        native_count += 1
                        page_hash = self.compute_sha256(clean_text.encode("utf-8"))
                        pages_data.append({
                            "page_number": page_num,
                            "extraction_method": "TEXT_NATIVE",
                            "ocr_provider": "PYPDF_NATIVE",
                            "ocr_confidence": 100.0,
                            "ocr_confidence_band": "HIGH",
                            "quality_status": "GOOD",
                            "page_hash": page_hash,
                            "text_content": clean_text
                        })
                        combined_text_list.append(clean_text)
                    else:
                        # OCR_REQUIRED
                        ocr_count += 1
                        doc.processing_stage = "OCR_PROCESSING"
                        ocr_res = ocr_provider.process_pdf_page(file_save_path, page_num)
                        
                        page_hash = self.compute_sha256(ocr_res.text.encode("utf-8")) if ocr_res.text else file_hash
                        pages_data.append({
                            "page_number": page_num,
                            "extraction_method": "OCR",
                            "ocr_provider": ocr_res.provider,
                            "ocr_confidence": ocr_res.confidence,
                            "ocr_confidence_band": ocr_res.confidence_band,
                            "quality_status": ocr_res.quality_status,
                            "page_hash": page_hash,
                            "text_content": ocr_res.text or f"[Scanned page {page_num}: OCR {ocr_res.status}]"
                        })
                        if ocr_res.confidence > 0:
                            ocr_confidences.append(ocr_res.confidence)
                        if ocr_res.text:
                            combined_text_list.append(ocr_res.text)

            except Exception as e:
                logger.error(f"Error parsing PDF {clean_fn}: {e}", exc_info=True)
                doc.processing_stage = "FAILED"
                doc.ocr_status = "FAILED"
                doc.processing_error = f"PDF parsing failure: {str(e)}"
                if db:
                    db.commit()
                return doc
        else:
            # Standalone image file (PNG / JPG)
            doc.page_count = 1
            ocr_count = 1
            doc.processing_stage = "OCR_PROCESSING"
            ocr_res = ocr_provider.process_image(file_bytes)
            
            pages_data.append({
                "page_number": 1,
                "extraction_method": "OCR",
                "ocr_provider": ocr_res.provider,
                "ocr_confidence": ocr_res.confidence,
                "ocr_confidence_band": ocr_res.confidence_band,
                "quality_status": ocr_res.quality_status,
                "page_hash": self.compute_sha256(ocr_res.text.encode("utf-8")) if ocr_res.text else file_hash,
                "text_content": ocr_res.text or f"[Image: OCR {ocr_res.status}]"
            })
            if ocr_res.confidence > 0:
                ocr_confidences.append(ocr_res.confidence)
            if ocr_res.text:
                combined_text_list.append(ocr_res.text)

        # Classification
        full_doc_text = "\n\n".join(combined_text_list)
        doc_type, class_conf, class_reason = self.classify_document(clean_fn, full_doc_text)
        
        doc.doc_type = doc_type
        doc.source_category = doc_type
        doc.classification_confidence = class_conf
        doc.classification_reason = class_reason
        doc.extracted_text = full_doc_text[:8000] if full_doc_text else ""
        doc.native_page_count = native_count
        doc.ocr_page_count = ocr_count

        if ocr_confidences:
            doc.average_ocr_confidence = round(sum(ocr_confidences) / len(ocr_confidences), 2)
        elif native_count > 0:
            doc.average_ocr_confidence = 100.0
        else:
            doc.average_ocr_confidence = 0.0

        # Structured Field Extraction
        doc.processing_stage = "FIELD_EXTRACTION"
        for p in pages_data:
            f_list = self.extract_structured_fields(p["page_number"], p["text_content"], doc_type)
            all_extracted_fields.extend(f_list)

        # Quality Status calculation
        if not ocr_provider.is_available and ocr_count > 0 and native_count == 0:
            doc.quality_status = "UNAVAILABLE"
            doc.ocr_status = "OCR_UNAVAILABLE"
            doc.processing_stage = "OCR_UNAVAILABLE"
            doc.processing_error = "Tesseract OCR engine binary is not installed in the environment."
        elif all(p["quality_status"] == "GOOD" for p in pages_data):
            doc.quality_status = "GOOD"
            doc.ocr_status = "COMPLETED"
            doc.processing_stage = "COMPLETED"
        elif any(p["quality_status"] in ["REVIEW", "POOR"] for p in pages_data):
            doc.quality_status = "REVIEW"
            doc.ocr_status = "COMPLETED"
            doc.processing_stage = "COMPLETED"
        else:
            doc.quality_status = "GOOD" if native_count > 0 else "REVIEW"
            doc.ocr_status = "COMPLETED"
            doc.processing_stage = "COMPLETED"

        # Persist Pages and Fields to DB
        if db:
            for p_dict in pages_data:
                db_page = DocumentPage(
                    document_id=doc.id,
                    page_number=p_dict["page_number"],
                    extraction_method=p_dict["extraction_method"],
                    ocr_provider=p_dict["ocr_provider"],
                    ocr_confidence=p_dict["ocr_confidence"],
                    ocr_confidence_band=p_dict["ocr_confidence_band"],
                    quality_status=p_dict["quality_status"],
                    page_hash=p_dict["page_hash"],
                    text_content=p_dict["text_content"]
                )
                db.add(db_page)

            for f_dict in all_extracted_fields:
                db_field = ExtractedDocumentField(
                    document_id=doc.id,
                    page_number=f_dict["source_page"],
                    field_name=f_dict["field_name"],
                    field_value=f_dict["field_value"],
                    confidence=f_dict["confidence"],
                    source_text=f_dict["source_text"],
                    extraction_method=f_dict["extraction_method"],
                    validation_status=f_dict["validation_status"],
                    validation_error=f_dict["validation_error"],
                    is_verified="PENDING"
                )
                db.add(db_field)

            doc.processing_stage = "COMPLETED"
            db.commit()
            db.refresh(doc)

            # RAG dynamic indexing
            try:
                self.index_document_into_rag(doc, pages_data)
            except Exception as e:
                logger.warning(f"Could not index uploaded doc {doc.id} into RAG: {e}")

            # Audit event
            if uploader_id:
                AuditService.log_event(
                    db=db,
                    actor_id=uploader_id,
                    action="DOCUMENT_UPLOAD_AND_PROCESSED",
                    resource_type="DOCUMENT",
                    resource_id=str(doc.id),
                    mine_id=mine_id,
                    metadata={
                        "filename": clean_fn,
                        "file_hash": file_hash,
                        "pages": doc.page_count,
                        "native_pages": native_count,
                        "ocr_pages": ocr_count,
                        "doc_type": doc_type,
                        "fields_extracted": len(all_extracted_fields)
                    }
                )

        return doc

    def index_document_into_rag(self, doc: Document, pages_data: List[Dict[str, Any]]):
        """
        Dynamically adds verified uploaded document pages as RAG chunks.
        """
        rag = government_rag_service
        for p in pages_data:
            txt = p.get("text_content", "").strip()
            if not txt or len(txt) < 20:
                continue

            chunk_id = f"UPLOAD_DOC_{doc.id}_p{p['page_number']}"
            chunk_hash = hashlib.sha256(f"{doc.id}_{p['page_number']}_{txt[:80]}".encode("utf-8")).hexdigest()

            chunk_obj = IngestedChunk(
                chunk_id=chunk_id,
                document_code=f"UPLOAD_DOC_{doc.id}",
                document_title=f"{doc.title} [{p['extraction_method']}]",
                organization=f"Mine Upload Archive (Mine {doc.mine_id or 'General'})",
                page_number=p["page_number"],
                section_heading=f"Uploaded {doc.doc_type} (p. {p['page_number']})",
                text_content=txt,
                chunk_hash=chunk_hash,
                file_hash=doc.file_hash,
                source_tier=doc.source_tier,
                source_status="REAL_SOURCE",
                domain=doc.doc_type if doc.doc_type in rag.keyword_index else "GOVERNANCE",
                keywords=rag._tokenize(txt),
                document_date=str(doc.uploaded_at.year)
            )
            rag.chunks.append(chunk_obj)

        rag._build_lexical_and_idf_index()
        logger.info(f"Dynamically indexed uploaded document {doc.id} into RAG active memory.")

    def verify_field(
        self,
        document_id: int,
        field_id: int,
        is_verified: str,  # VERIFIED, REJECTED, EDITED
        verified_value: Optional[str],
        user: User,
        db: Session
    ) -> ExtractedDocumentField:
        """
        Human-in-the-loop field verification with audit logging.
        """
        field = db.query(ExtractedDocumentField).filter(
            ExtractedDocumentField.id == field_id,
            ExtractedDocumentField.document_id == document_id
        ).first()
        if not field:
            raise ValueError(f"Extracted field {field_id} not found on document {document_id}")

        old_val = field.field_value
        field.is_verified = is_verified
        if verified_value is not None:
            field.verified_value = verified_value.strip()
            field.field_value = verified_value.strip()
        field.verified_by_user_id = user.id
        field.verified_at = datetime.now(timezone.utc)

        db.commit()
        db.refresh(field)

        AuditService.log_event(
            db=db,
            actor_id=user.id,
            action="DOCUMENT_FIELD_VERIFIED",
            resource_type="ExtractedDocumentField",
            resource_id=str(field.id),
            mine_id=field.document.mine_id if field.document else None,
            metadata={
                "document_id": document_id,
                "field_name": field.field_name,
                "old_value": old_val,
                "new_value": field.field_value,
                "verification_status": is_verified
            }
        )
        return field

    def create_draft_governance_task(
        self,
        document_id: int,
        title: str,
        description: str,
        user: User,
        db: Session
    ) -> GovernanceTask:
        """
        Creates a DRAFT Governance Task from document findings.
        Mandatory rule: Never automatically creates a final statutory violation.
        """
        import uuid
        from datetime import timedelta

        doc = db.query(Document).filter(Document.id == document_id).first()
        if not doc:
            raise ValueError(f"Document {document_id} not found")

        task_code = f"TASK-DOC-{doc.id}-{uuid.uuid4().hex[:6].upper()}"
        due_date = datetime.now(timezone.utc) + timedelta(days=7)

        task = GovernanceTask(
            task_code=task_code,
            mine_id=doc.mine_id or 1,
            domain="SAFETY",
            title=f"[DRAFT from Doc #{doc.id}] {title}",
            description=f"Generated from Document Intelligence review of '{doc.title}' (SHA-256: {doc.file_hash[:16]}...).\n\n{description}",
            source_resource_type="DOCUMENT",
            source_resource_id=str(doc.id),
            priority="MEDIUM",
            status="OPEN",
            due_at=due_date,
            sla_status="ON_TRACK",
            created_by_id=user.id
        )
        db.add(task)
        db.commit()
        db.refresh(task)

        AuditService.log_event(
            db=db,
            actor_id=user.id,
            action="DRAFT_GOVERNANCE_TASK_CREATED",
            resource_type="GovernanceTask",
            resource_id=str(task.id),
            mine_id=doc.mine_id,
            metadata={
                "document_id": doc.id,
                "document_title": doc.title,
                "task_title": task.title
            }
        )
        return task


document_intelligence_service = DocumentIntelligenceService.get_instance()

