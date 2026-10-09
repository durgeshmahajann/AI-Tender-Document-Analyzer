"""Step 1-4: read PDF pages, fall back to OCR for scanned pages, clean text."""
import re

import fitz  # PyMuPDF

MIN_CHARS_FOR_TEXT_PAGE = 30


def clean_text(text: str) -> str:
    text = text.replace("\x00", " ")
    text = re.sub(r"-\n(\w)", r"\1", text)      # re-join hyphenated line breaks
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def extract_pages(pdf_bytes: bytes, use_ocr: bool = True):
    """Return [{"page": 1, "text": "...", "ocr": False}, ...] (page is 1-based)."""
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    pages = []
    for i, page in enumerate(doc):
        text = page.get_text().strip()
        used_ocr = False
        if len(text) < MIN_CHARS_FOR_TEXT_PAGE and use_ocr:
            from modules.ocr_processor import ocr_page
            text = ocr_page(page)
            used_ocr = True
        pages.append({"page": i + 1, "text": clean_text(text), "ocr": used_ocr})
    return pages


_STOP = {"the", "of", "and", "a", "an", "to", "in", "for", "at", "on", "by", "with", "be", "is",
         "are", "or", "as", "from", "that", "this", "it", "must", "shall", "will", "have", "has"}


def _words(text: str):
    return [w for w in re.findall(r"[a-z0-9]+", text.lower()) if w not in _STOP]


def _best_block(page, text: str):
    """Find the paragraph on the page that shares the most words with the LLM's (paraphrased) value."""
    target = set(_words(text))
    if len(target) < 2:
        return None
    best, best_score = None, 0.0
    for b in page.get_text("blocks"):
        if len(b) > 6 and b[6] != 0:      # skip image blocks
            continue
        words = set(_words(b[4]))
        if not words:
            continue
        score = len(target & words) / len(target)
        if score > best_score:
            best, best_score = fitz.Rect(b[:4]), score
    return best if best_score >= 0.45 else None


def _find_rects(page, text: str):
    """Try the full text, then shorter word prefixes, until something is found on the page."""
    words = " ".join(str(text).split()).split(" ")
    for n in range(min(len(words), 8), 1, -1):
        rects = page.search_for(" ".join(words[:n]))
        if rects:
            return rects
    block = _best_block(page, text)
    if block is not None:
        return [block]
    for w in words:                      # last resort: a number-like token (amounts, dates)
        if any(ch.isdigit() for ch in w) and len(w) >= 3:
            rects = page.search_for(w.strip(",.;:()"))
            if rects:
                return rects
    return []


def render_page_png(pdf_bytes: bytes, page_number: int, zoom: float = 1.6, highlight: str = None) -> bytes:
    """Render a 1-based page to PNG bytes; optionally highlight the given text."""
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    page = doc[page_number - 1]
    if highlight:
        for rect in _find_rects(page, highlight):
            page.add_highlight_annot(rect)
    pix = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom))
    return pix.tobytes("png")
