"""TenderLens - local web server for the AI Tender Document Analyzer.

Run:  python server.py   ->  http://localhost:8000
"""
import json
import os
import re
import threading
import uuid
import webbrowser
from datetime import datetime
from pathlib import Path

from flask import Flask, Response, abort, jsonify, request, send_from_directory, stream_with_context

BASE = Path(__file__).parent
WEB = BASE / "web"
SAMPLE = BASE / "data" / "Sample_Tender_Solar_Plant.pdf"

app = Flask(__name__, static_folder=None)
DOCS = {}          # doc_id -> {"pdf", "pages", "store", "result", "filename"}
MAX_DOCS = 6

LIST_KEYS = ["eligibility", "documents_required", "technical_requirements", "deliverables"]
SINGLE_KEYS = ["tender_title", "submission_deadline", "tender_fee", "emd", "minimum_turnover"]


# ----------------------------------------------------------------- helpers
def _line(obj) -> str:
    return json.dumps(obj, ensure_ascii=False) + "\n"


def _page(value, total):
    try:
        return max(1, min(int(value), total))
    except (TypeError, ValueError):
        return None


def normalize(result: dict, total_pages: int) -> dict:
    """Make sure the LLM output always has the shape the UI expects."""
    out = {}
    for key in SINGLE_KEYS:
        item = result.get(key) if isinstance(result, dict) else None
        if not isinstance(item, dict):
            item = {}
        value = str(item.get("value") or "Not Found").strip() or "Not Found"
        out[key] = {"value": value, "page": _page(item.get("page"), total_pages)}
    for key in LIST_KEYS:
        items = []
        for item in (result.get(key) or []) if isinstance(result, dict) else []:
            if isinstance(item, dict) and str(item.get("value") or "").strip():
                items.append({"value": str(item["value"]).strip(), "page": _page(item.get("page"), total_pages)})
            elif isinstance(item, str) and item.strip():
                items.append({"value": item.strip(), "page": None})
        out[key] = items
    return out


def days_left(text: str):
    try:
        from dateutil import parser
        return (parser.parse(text, fuzzy=True).date() - datetime.now().date()).days
    except Exception:
        return None


def friendly_error(e: Exception) -> str:
    msg = str(e)
    if "API key not valid" in msg or "API_KEY_INVALID" in msg:
        return "Your Gemini API key was rejected. Check GEMINI_API_KEY in the .env file."
    if "GEMINI_API_KEY is missing" in msg:
        return "GEMINI_API_KEY is missing. Add it to the .env file and restart the server."
    if "429" in msg or "RESOURCE_EXHAUSTED" in msg:
        return "The free Gemini quota is used up for now. Wait a minute and try again."
    if "503" in msg or "UNAVAILABLE" in msg:
        return "Gemini is busy right now. Please try again in a moment."
    if "404" in msg and "model" in msg.lower():
        return "The Gemini model name in .env is not available. Update GEMINI_MODEL."
    return msg[:300]


def pipeline(pdf_bytes: bytes, filename: str, use_ocr: bool):
    """Generator yielding newline-delimited JSON progress events."""
    try:
        yield _line({"step": "read", "state": "active"})
        from modules.pdf_processor import extract_pages
        pages = extract_pages(pdf_bytes, use_ocr=use_ocr)
        ocr_pages = sum(1 for p in pages if p.get("ocr"))
        detail = f"{len(pages)} pages" + (f" · {ocr_pages} via OCR" if ocr_pages else "")
        yield _line({"step": "read", "state": "done", "detail": detail})

        yield _line({"step": "chunk", "state": "active"})
        from modules.chunker import chunk_pages
        chunks = chunk_pages(pages)
        if not chunks:
            yield _line({"error": "No readable text was found in this PDF. Turn on OCR and try again."})
            return
        yield _line({"step": "chunk", "state": "done", "detail": f"{len(chunks)} passages"})

        yield _line({"step": "index", "state": "active"})
        from modules.rag import retrieve_context, format_context
        from modules.vector_store import VectorStore
        store = VectorStore(chunks)
        context = format_context(retrieve_context(store))
        yield _line({"step": "index", "state": "done", "detail": "Search index ready"})

        yield _line({"step": "extract", "state": "active"})
        from modules.extractor import extract_tender_info
        result = normalize(extract_tender_info(context), len(pages))
        n_items = sum(len(result[k]) for k in LIST_KEYS)
        yield _line({"step": "extract", "state": "done", "detail": f"{n_items} requirements found"})

        doc_id = uuid.uuid4().hex[:10]
        DOCS[doc_id] = {"pdf": pdf_bytes, "pages": pages, "store": store, "result": result, "filename": filename}
        while len(DOCS) > MAX_DOCS:
            DOCS.pop(next(iter(DOCS)))

        yield _line({
            "done": True, "doc": doc_id, "filename": filename, "pages": len(pages),
            "ocr_pages": ocr_pages, "result": result,
            "meta": {"deadline_days": days_left(result["submission_deadline"]["value"])},
        })
    except Exception as e:  # noqa: BLE001 - surfaced to the UI
        yield _line({"error": friendly_error(e)})


def stream(pdf_bytes, filename, use_ocr):
    return Response(stream_with_context(pipeline(pdf_bytes, filename, use_ocr)),
                    mimetype="application/x-ndjson",
                    headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


def get_doc(doc_id):
    d = DOCS.get(doc_id)
    if not d:
        abort(404)
    return d


# ------------------------------------------------------------------ routes
@app.get("/")
def index():
    return send_from_directory(WEB, "index.html")


@app.get("/static/<path:name>")
def static_files(name):
    return send_from_directory(WEB, name)


@app.get("/api/config")
def config():
    return jsonify({"sample": SAMPLE.exists()})


@app.post("/api/analyze")
def analyze():
    f = request.files.get("file")
    if not f:
        return jsonify({"error": "No file uploaded"}), 400
    data = f.read()
    if not data.startswith(b"%PDF"):
        return jsonify({"error": "That file is not a PDF"}), 400
    return stream(data, f.filename or "tender.pdf", request.form.get("ocr", "1") == "1")


@app.post("/api/analyze-sample")
def analyze_sample():
    if not SAMPLE.exists():
        return jsonify({"error": "Sample tender not found in the data folder"}), 404
    return stream(SAMPLE.read_bytes(), SAMPLE.name, request.form.get("ocr", "1") == "1")


@app.get("/api/page/<doc_id>/<int:n>")
def page_image(doc_id, n):
    d = get_doc(doc_id)
    if not 1 <= n <= len(d["pages"]):
        abort(404)
    from modules.pdf_processor import render_page_png
    png = render_page_png(d["pdf"], n, zoom=1.8, highlight=request.args.get("hl") or None)
    return Response(png, mimetype="image/png", headers={"Cache-Control": "private, max-age=3600"})


@app.get("/api/text/<doc_id>/<int:n>")
def page_text(doc_id, n):
    d = get_doc(doc_id)
    if not 1 <= n <= len(d["pages"]):
        abort(404)
    p = d["pages"][n - 1]
    return jsonify({"page": n, "text": p["text"], "ocr": bool(p.get("ocr"))})


@app.get("/api/search/<doc_id>")
def search(doc_id):
    d = get_doc(doc_id)
    q = (request.args.get("q") or "").strip()
    if len(q) < 2:
        return jsonify({"query": q, "results": []})
    pattern = re.compile(re.escape(q), re.IGNORECASE)
    results = []
    for p in d["pages"]:
        matches = list(pattern.finditer(p["text"]))
        if not matches:
            continue
        m = matches[0]
        start, end = max(0, m.start() - 70), min(len(p["text"]), m.end() + 90)
        snippet = " ".join(p["text"][start:end].split())
        results.append({"page": p["page"], "count": len(matches), "snippet": snippet})
    return jsonify({"query": q, "results": results[:80]})


@app.post("/api/ask")
def ask():
    body = request.get_json(silent=True) or {}
    d = get_doc(body.get("doc"))
    question = (body.get("question") or "").strip()
    if not question:
        return jsonify({"error": "Empty question"}), 400
    try:
        from modules.extractor import answer_question
        from modules.rag import format_context
        hits = d["store"].search(question, k=5)
        answer = answer_question(question, format_context(hits))
        return jsonify({"answer": answer, "sources": sorted({h["page"] for h in hits})})
    except Exception as e:  # noqa: BLE001
        return jsonify({"error": friendly_error(e)}), 500


def _warmup():
    try:
        from modules.embeddings import get_model
        get_model()
    except Exception:
        pass


if __name__ == "__main__":
    port = int(os.getenv("PORT", "8000"))
    threading.Thread(target=_warmup, daemon=True).start()
    threading.Timer(1.2, lambda: webbrowser.open(f"http://localhost:{port}")).start()
    print(f"\n  TenderLens is running -> http://localhost:{port}\n")
    app.run(host="127.0.0.1", port=port, threaded=True, debug=False)
