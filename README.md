# AI Tender Document Analyzer (B26 / FAIR-AI-B01)

Pipeline: PDF -> text (OCR fallback) -> clean -> chunk (page-aware) -> embeddings -> FAISS -> RAG -> LLM -> JSON -> checklist with source pages.

## Setup
    python3 -m venv venv && source venv/bin/activate
    brew install tesseract          # Mac; needed only for scanned PDFs
    pip install -r requirements.txt
    cp .env.example .env            # add your ANTHROPIC_API_KEY

## Run
    streamlit run app.py

## Structure
- modules/pdf_processor.py  text extraction, cleaning, page rendering
- modules/ocr_processor.py  Tesseract OCR
- modules/chunker.py        page-aware chunks
- modules/embeddings.py     sentence-transformers
- modules/vector_store.py   FAISS search
- modules/rag.py            topic queries and context building
- modules/extractor.py      LLM call and JSON parsing
