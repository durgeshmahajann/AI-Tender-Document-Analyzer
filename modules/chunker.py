"""Step 5: split page text into overlapping chunks that keep their page number."""


def chunk_pages(pages, chunk_size: int = 900, overlap: int = 150):
    chunks = []
    for p in pages:
        text = p["text"]
        if not text:
            continue
        start = 0
        while start < len(text):
            end = min(start + chunk_size, len(text))
            piece = text[start:end].strip()
            if piece:
                chunks.append({"id": len(chunks), "page": p["page"], "text": piece})
            if end == len(text):
                break
            start = end - overlap
    return chunks
