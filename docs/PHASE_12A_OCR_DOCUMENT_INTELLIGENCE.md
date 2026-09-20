# TRINETRA Phase 12A — OCR & Document Intelligence

## 1. Executive Summary

Phase 12A introduces a robust **Document Intelligence & Local OCR Pipeline** to TRINETRA. While prior phases focused on structured telemetry, GIS digital twin synchronization, and text-native government knowledge retrieval (Phase 11C), Phase 12A closes the operational gap for **scanned legacy PDFs, inspection notices, challans, and physical mine records**.

```
                           DOCUMENT INTELLIGENCE PIPELINE
  ┌─────────────────────────────────────────────────────────────────────────────┐
  │                                                                             │
  │   [ Physical Scan / PDF / Image ]                                           │
  │                 │                                                           │
  │                 ▼                                                           │
  │   [ SHA-256 Provenance & Header Validation ]                                │
  │                 │                                                           │
  │                 ▼                                                           │
  │   [ Hybrid Page Inspection (pypdfium2) ]                                    │
  │         ├── Text-Bearing Page  ──> [ Native Text Extraction (Conf: 1.0) ]  │
  │         └── Scanned / Image    ──> [ Tesseract / Local OCR Provider ]       │
  │                 │                                                           │
  │                 ▼                                                           │
  │   [ Deterministic 16-Category Document Classifier ]                         │
  │                 │                                                           │
  │                 ▼                                                           │
  │   [ Regex & Pattern Structured Field Extraction ]                           │
  │                 │                                                           │
  │                 ▼                                                           │
  │   [ Strict Boundary & Format Validation (VALID / REVIEW / INVALID) ]        │
  │                 │                                                           │
  │                 ▼                                                           │
  │   [ Dynamic RAG Memory Indexing & Copilot Evidence Grounding ]              │
  │                 │                                                           │
  │                 ▼                                                           │
  │   [ Human-in-the-Loop Field Verification & Cryptographic Audit Log ]        │
  │                 │                                                           │
  │                 ▼                                                           │
  │   [ Draft Governance Task Creation (Strictly Prevents Auto-Violations) ]    │
  │                                                                             │
  └─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. OCR Architecture & Provider Abstraction

### 2.1 Provider Hierarchy
- **`OCRProvider` (Base Interface)**: Defines `is_available`, `process_image(bytes)`, and `process_pdf_page(pdf_path, page_num)`.
- **`TesseractOCRProvider`**:
  - Leverages `pypdfium2` to render PDF pages at 300 DPI into high-resolution RGB raster images.
  - Executes `pytesseract.image_to_data` to compute per-word confidence metrics and line-level structure.
  - Automatically identifies host binary PATH via `shutil.which("tesseract")` or environment variable `TESSERACT_CMD`.
- **`UnavailableOCRProvider` (Strict Failure Transparency)**:
  - When Tesseract is not installed on the host system PATH, TRINETRA transparently marks pages with `status="UNAVAILABLE"`, `confidence=0.0`, and quality flag `Tesseract binary not installed`.
  - **Zero Fabrication**: TRINETRA never fabricates OCR text or pretends OCR succeeded when it was unavailable.

### 2.2 Confidence Bands & Quality Status
| Confidence Score | Confidence Band | Quality Status Default | Action Required |
|:---|:---|:---|:---|
| $\ge 85.0\%$ | `HIGH` | `GOOD` | Automated field extraction accepted |
| $60.0\% - 84.9\%$ | `MEDIUM` | `REVIEW` | Flagged for operator review |
| $> 0.0\% - 59.9\%$ | `LOW` | `POOR` | Flagged for mandatory manual transcription |
| $0.0\%$ (or Error) | `N/A` | `UNREADABLE` / `UNAVAILABLE` | OCR provider missing or corrupt image |

---

## 3. Document Classification (16 Statutory Categories)

Classification uses high-precision terminology and structure matching across 16 categories:
1. `DGMS` (DGMS Inspection Notice, Contravention, Coal Mines Regulations 2017)
2. `GOVERNMENT_CIRCULAR` (DGMS Technical Circulars, Safety Guidelines)
3. `CMSMS` (Coal Mine Surveillance and Management System, Khanan Prahari)
4. `PGRM` (Public Grievance Redressal Mechanism, CPGRAMS)
5. `ANNUAL_REPORT` (Ministry of Coal Annual Reports)
6. `BUDGET` (Demands for Grants, Output-Outcome Framework)
7. `MINE_SUMMARY` (CMPDI Coal Block Geological Summaries)
8. `INSPECTION_REPORT` (Form IV Fatal Accident Notices, Form VI Overman Reports)
9. `SAFETY_REGISTER` (Daily Gas Testing, Methane CH4, Mechanical Ventilation Logs)
10. `PRODUCTION_REPORT` (Coal Production, Dispatch Challans, Rake Loading)
11. `ATTENDANCE_REGISTER` (Workforce Muster Rolls, Form B Register)
12. `CONTRACTOR_DOCUMENT` (VTC Safety Passport, Contractor SLA)
13. `ENVIRONMENT_REPORT` (MoEFCC Environmental Clearance, PM10/PM2.5, Respirable Dust)
14. `GRIEVANCE` (Worker Grievance Petitions)
15. `REGULATORY_REPORT` (Statutory Non-Compliance Notices)
16. `OTHER` (General Operational Governance Records)

---

## 4. Structured Field Extraction & Boundary Validation

Extracted fields are evaluated with strict domain validation rules:
- **Geographic Coordinates**:
  - `latitude`: Must fall within $[-90.0, 90.0]$. Out-of-bounds marked `REVIEW_REQUIRED`.
  - `longitude`: Must fall within $[-180.0, 180.0]$.
- **Dates**: Validated against ISO (`YYYY-MM-DD`), Indian (`DD/MM/YYYY`), and statutory text date formats.
- **Quantities**: Tonnes, reserves, worker counts must be non-negative real numbers.
- **Statutes**: Validated against DGMS regulation formats (`Regulation \d+ of CMR 2017`, `Section \d+ of Mines Act 1952`).

---

## 5. Security Model, Mine Isolation & Human-in-the-Loop Governance

1. **Mine Isolation**: Every document is bound to `mine_id` (or `None` for central ministry documents). Multi-tenant checks prevent cross-mine data leaks.
2. **Cryptographic SHA-256 Provenance**: Every uploaded document and individual chunk records an immutable SHA-256 fingerprint.
3. **Audit Log Hash-Chaining**: Field verification and correction emits a cryptographically chained `AuditEvent` (`action="DOCUMENT_FIELD_VERIFIED"`).
4. **Draft Governance Safeguard**: Documents can trigger `create-draft-governance` to create `OPEN` / `PENDING` draft tasks for safety officers, strictly preventing auto-generation of unverified statutory violations.

---

## 6. Copilot & RAG Integration

Uploaded documents are dynamically ingested into the active TF-IDF/BM25 memory index and exposed via two new allow-listed Copilot tools:
- **`search_uploaded_documents`**: Queries uploaded documents by keyword or semantic query with mine isolation.
- **`get_uploaded_document_field_evidence`**: Retrieves extracted and verified fields with source page and confidence provenance.

---

## 7. Verification & Test Coverage

- **Backend Pytest Suite**: 8/8 tests in `backend/tests/test_phase12a_ocr_documents.py` passing (100%).
- **Frontend Compilation**: Built with zero errors via Vite and TypeScript (`npm run build`).
