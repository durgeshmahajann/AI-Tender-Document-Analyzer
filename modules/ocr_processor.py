"""OCR for scanned pages using Tesseract (install: brew install tesseract)."""
import io

import fitz
import pytesseract
from PIL import Image


def ocr_page(page: "fitz.Page", dpi: int = 200, lang: str = "eng") -> str:
    pix = page.get_pixmap(matrix=fitz.Matrix(dpi / 72, dpi / 72))
    image = Image.open(io.BytesIO(pix.tobytes("png")))
    return pytesseract.image_to_string(image, lang=lang)
