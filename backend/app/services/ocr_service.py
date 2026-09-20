import os
import io
import logging
import shutil
from typing import Optional, Dict, Any, List, Tuple
from dataclasses import dataclass, field
from PIL import Image

logger = logging.getLogger(__name__)

# Try importing pytesseract and pypdfium2
try:
    import pytesseract
    PYTESSERACT_AVAILABLE = True
except ImportError:
    PYTESSERACT_AVAILABLE = False

try:
    import pypdfium2
    PYPDFIUM2_AVAILABLE = True
except ImportError:
    PYPDFIUM2_AVAILABLE = False


@dataclass
class OCRResult:
    text: str = ""
    confidence: float = 0.0  # 0.0 to 100.0
    confidence_band: str = "N/A"  # HIGH (>=85), MEDIUM (60-84), LOW (<60), N/A
    quality_status: str = "UNAVAILABLE"  # GOOD, REVIEW, POOR, UNREADABLE, UNAVAILABLE
    provider: str = "UNAVAILABLE"  # TESSERACT, UNAVAILABLE, etc.
    status: str = "UNAVAILABLE"  # SUCCESS, UNAVAILABLE, FAILED, BLANK
    line_count: int = 0
    word_count: int = 0
    page_image_bytes: Optional[bytes] = None
    reason: Optional[str] = None
    raw_data: Optional[Dict[str, Any]] = field(default_factory=dict)


def compute_confidence_band(confidence: float) -> str:
    if confidence >= 85.0:
        return "HIGH"
    elif confidence >= 60.0:
        return "MEDIUM"
    elif confidence > 0.0:
        return "LOW"
    return "N/A"


def compute_quality_status(text: str, confidence: float, status: str) -> str:
    if status == "UNAVAILABLE":
        return "UNAVAILABLE"
    if status == "FAILED":
        return "UNREADABLE"
    clean_text = text.strip()
    if not clean_text or len(clean_text) < 10:
        return "UNREADABLE"
    if confidence >= 85.0:
        return "GOOD"
    elif confidence >= 60.0:
        return "REVIEW"
    return "POOR"


class OCRProvider:
    """Base abstract provider interface for OCR operations."""
    
    @property
    def is_available(self) -> bool:
        raise NotImplementedError

    def process_image(self, image_bytes: bytes) -> OCRResult:
        raise NotImplementedError

    def process_pdf_page(self, pdf_path: str, page_number: int) -> OCRResult:
        raise NotImplementedError


class UnavailableOCRProvider(OCRProvider):
    """Fallback provider when real OCR engine binary is not installed in the environment."""

    def __init__(self, reason: str = "Tesseract OCR engine binary is not installed or not in PATH."):
        self.reason = reason

    @property
    def is_available(self) -> bool:
        return False

    def process_image(self, image_bytes: bytes) -> OCRResult:
        logger.warning(f"OCR requested but provider is unavailable: {self.reason}")
        return OCRResult(
            text="",
            confidence=0.0,
            confidence_band="N/A",
            quality_status="UNAVAILABLE",
            provider="UNAVAILABLE",
            status="UNAVAILABLE",
            reason=self.reason
        )

    def process_pdf_page(self, pdf_path: str, page_number: int) -> OCRResult:
        # If pypdfium2 is available, we can still generate the rasterized page image for user inspection!
        page_img_bytes = None
        if PYPDFIUM2_AVAILABLE and os.path.exists(pdf_path):
            try:
                pdf = pypdfium2.PdfDocument(pdf_path)
                if 0 <= page_number - 1 < len(pdf):
                    page = pdf[page_number - 1]
                    pil_image = page.render(scale=2.0).to_pil()
                    buf = io.BytesIO()
                    pil_image.save(buf, format="PNG")
                    page_img_bytes = buf.getvalue()
            except Exception as e:
                logger.debug(f"Could not render page image preview: {e}")

        return OCRResult(
            text="",
            confidence=0.0,
            confidence_band="N/A",
            quality_status="UNAVAILABLE",
            provider="UNAVAILABLE",
            status="UNAVAILABLE",
            page_image_bytes=page_img_bytes,
            reason=self.reason
        )


class TesseractOCRProvider(OCRProvider):
    """Concrete Tesseract OCR provider with page rasterization and token confidence extraction."""

    def __init__(self, tesseract_cmd: Optional[str] = None):
        self.tesseract_cmd = tesseract_cmd or os.getenv("TESSERACT_CMD")
        if self.tesseract_cmd and PYTESSERACT_AVAILABLE:
            pytesseract.pytesseract.tesseract_cmd = self.tesseract_cmd

    @property
    def is_available(self) -> bool:
        if not PYTESSERACT_AVAILABLE:
            return False
        # Check if tesseract binary can actually execute
        try:
            cmd = self.tesseract_cmd or "tesseract"
            if shutil.which(cmd) or (self.tesseract_cmd and os.path.exists(self.tesseract_cmd)):
                # Test version check
                pytesseract.get_tesseract_version()
                return True
        except Exception:
            return False
        return False

    def process_image(self, image_bytes: bytes) -> OCRResult:
        if not self.is_available:
            return UnavailableOCRProvider().process_image(image_bytes)

        try:
            image = Image.open(io.BytesIO(image_bytes))
            # Convert to RGB if necessary
            if image.mode not in ("L", "RGB"):
                image = image.convert("RGB")

            # Extract structured OCR data
            data = pytesseract.image_to_data(image, output_type=pytesseract.Output.DICT)
            
            extracted_words = []
            confidences = []
            
            for word, conf in zip(data.get("text", []), data.get("conf", [])):
                w_clean = str(word).strip()
                if w_clean:
                    extracted_words.append(w_clean)
                    try:
                        c_val = float(conf)
                        if c_val >= 0:  # -1 indicates non-word elements
                            confidences.append(c_val)
                    except (ValueError, TypeError):
                        pass

            full_text = " ".join(extracted_words).strip()
            avg_conf = sum(confidences) / len(confidences) if confidences else 0.0
            
            conf_band = compute_confidence_band(avg_conf)
            quality = compute_quality_status(full_text, avg_conf, "SUCCESS" if full_text else "BLANK")
            
            lines = [l for l in full_text.split("\n") if l.strip()]
            
            return OCRResult(
                text=full_text,
                confidence=round(avg_conf, 2),
                confidence_band=conf_band,
                quality_status=quality,
                provider="TESSERACT",
                status="SUCCESS" if full_text else "BLANK",
                line_count=len(lines) if lines else 1 if full_text else 0,
                word_count=len(extracted_words),
                page_image_bytes=image_bytes
            )
        except Exception as e:
            logger.error(f"Tesseract OCR processing failed: {e}", exc_info=True)
            return OCRResult(
                text="",
                confidence=0.0,
                confidence_band="N/A",
                quality_status="UNREADABLE",
                provider="TESSERACT",
                status="FAILED",
                reason=f"OCR execution error: {str(e)}"
            )

    def process_pdf_page(self, pdf_path: str, page_number: int) -> OCRResult:
        if not PYPDFIUM2_AVAILABLE:
            return OCRResult(
                text="",
                confidence=0.0,
                confidence_band="N/A",
                quality_status="UNAVAILABLE",
                provider="TESSERACT",
                status="UNAVAILABLE",
                reason="pypdfium2 PDF renderer is not installed."
            )

        try:
            pdf = pypdfium2.PdfDocument(pdf_path)
            if page_number < 1 or page_number > len(pdf):
                return OCRResult(
                    text="",
                    confidence=0.0,
                    confidence_band="N/A",
                    quality_status="UNREADABLE",
                    provider="TESSERACT",
                    status="FAILED",
                    reason=f"Page number {page_number} out of range (total pages: {len(pdf)})"
                )

            page = pdf[page_number - 1]
            pil_image = page.render(scale=2.0).to_pil()
            
            buf = io.BytesIO()
            pil_image.save(buf, format="PNG")
            image_bytes = buf.getvalue()

            res = self.process_image(image_bytes)
            res.page_image_bytes = image_bytes
            return res
        except Exception as e:
            logger.error(f"PDF page rasterization failed for {pdf_path} (p. {page_number}): {e}", exc_info=True)
            return OCRResult(
                text="",
                confidence=0.0,
                confidence_band="N/A",
                quality_status="UNREADABLE",
                provider="TESSERACT",
                status="FAILED",
                reason=f"PDF rendering error: {str(e)}"
            )


def get_ocr_provider() -> OCRProvider:
    """
    Factory function: returns TesseractOCRProvider if engine is installed,
    or UnavailableOCRProvider with truthful diagnostic reporting.
    """
    # Check standard install locations on Windows if not in PATH
    standard_paths = [
        r"C:\Program Files\Tesseract-OCR\tesseract.exe",
        r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
        r"C:\Users\srija\AppData\Local\Tesseract-OCR\tesseract.exe"
    ]
    custom_cmd = os.getenv("TESSERACT_CMD")
    if not custom_cmd:
        for p in standard_paths:
            if os.path.exists(p):
                custom_cmd = p
                break

    provider = TesseractOCRProvider(tesseract_cmd=custom_cmd)
    if provider.is_available:
        return provider
    return UnavailableOCRProvider()
