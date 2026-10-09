import csv
import io
import json
from datetime import datetime
from pathlib import Path

import pandas as pd
import streamlit as st

from modules.chunker import chunk_pages
from modules.extractor import answer_question, extract_tender_info
from modules.pdf_processor import extract_pages, render_page_png
from modules.rag import format_context, retrieve_context
from modules.vector_store import VectorStore

st.set_page_config(page_title="Tender Analyzer", page_icon="📄", layout="wide")

LANDING = "result" not in st.session_state
st.markdown("""<style>
@import url('https://fonts.googleapis.com/css2?family=Newsreader:ital,wght@0,400;0,500;0,600;1,400&display=swap');
:root{--accent:#3f9b7e;--ink:#262b30;--muted:#7b8289;--line:#e8e8e5;}
.stApp{background:#f7f7f6;}
.block-container{padding-top:1.2rem;max-width:1180px;}
h1,h2,h3,h4,.brand,.headline{font-family:'Newsreader',Georgia,serif !important;color:var(--ink);font-weight:500;}
.brand{font-size:1.5rem;font-weight:600;letter-spacing:-.01em;}
.headline{font-size:2.9rem;line-height:1.1;text-align:center;margin:.5rem 0 .7rem;}
.headline em{color:var(--accent);font-style:italic;}
.sub{text-align:center;color:var(--muted);margin-bottom:1.5rem;}
.orb{width:92px;height:92px;margin:0 auto 10px;border-radius:50%;
  background:radial-gradient(circle at 30% 30%,#d9efe6,#8cc9b1 55%,#4a9a7f);
  box-shadow:0 10px 30px rgba(63,155,126,.35);display:flex;align-items:center;justify-content:center;font-size:2.2rem;}
[data-testid="stFileUploaderDropzone"]{background:#fff;border:1px solid var(--line);border-radius:18px;
  padding:1.5rem;box-shadow:0 6px 24px rgba(0,0,0,.05);}
[data-testid="stFileUploaderDropzone"] button{border-radius:999px;border:1px solid var(--accent);color:var(--accent);background:#fff;}
div.stButton>button,div.stDownloadButton>button{border-radius:999px;}
div.stButton>button[kind="primary"]{width:100%;background:var(--accent);border:none;padding:.6rem 1rem;}
.card-label{font-size:.8rem;opacity:.7;margin-bottom:2px}
.card-value{font-size:1.15rem;font-weight:700;line-height:1.3}
#MainMenu,footer,.stDeployButton{visibility:hidden;}
</style>""", unsafe_allow_html=True)
if LANDING:
    st.markdown("<style>[data-testid='stSidebar'],[data-testid='stSidebarCollapsedControl'],"
                "[data-testid='collapsedControl']{display:none;}</style>", unsafe_allow_html=True)

SAMPLE_PDF = Path("data/Sample_Tender_Solar_Plant.pdf")

CATEGORIES = [
    ("Eligibility", "eligibility", "🧾"),
    ("Documents required", "documents_required", "📎"),
    ("Technical requirements", "technical_requirements", "🛠️"),
    ("Deliverables", "deliverables", "📦"),
]
SUGGESTED_QUESTIONS = [
    "What is the last date to submit the bid?",
    "How much EMD must be paid and how?",
    "What experience does the bidder need?",
    "What is the project timeline?",
]


# ---------- helpers ----------
def single(r, key):
    item = r.get(key)
    if isinstance(item, dict):
        return item.get("value") or "Not Found", item.get("page")
    return "Not Found", None


def items_for(r, key):
    return [i for i in (r.get(key) or []) if isinstance(i, dict) and i.get("value")]


def to_page(p, total):
    try:
        return max(1, min(int(p), total))
    except (TypeError, ValueError):
        return None


def days_left(text):
    try:
        from dateutil import parser
        return (parser.parse(text, fuzzy=True).date() - datetime.now().date()).days
    except Exception:
        return None


def show_image(img):
    try:
        st.image(img, width="stretch")
    except TypeError:
        st.image(img, use_container_width=True)


def result_to_csv(r):
    rows = []
    for label, key in [("Tender title", "tender_title"), ("Submission deadline", "submission_deadline"),
                       ("Tender fee", "tender_fee"), ("EMD", "emd"), ("Minimum turnover", "minimum_turnover")]:
        v, p = single(r, key)
        rows.append([label, v, p or "", "No"])
    for label, key, _ in CATEGORIES:
        for item in items_for(r, key):
            rows.append([label, item["value"], item.get("page") or "", "No"])
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["Category", "Requirement", "Source Page", "Done"])
    w.writerows(rows)
    return buf.getvalue()


def checklist_progress(r):
    total = done = 0
    for _, key, _ in CATEGORIES:
        for i, _item in enumerate(items_for(r, key)):
            total += 1
            done += bool(st.session_state.get(f"chk-{key}-{i}"))
    return done, total


def open_source(page, text=None):
    st.session_state.selected = {"page": page, "text": text}


def run_analysis(pdf_bytes, use_ocr):
    with st.status("Analyzing tender...", expanded=True) as status:
        try:
            st.write("📖 Reading PDF pages (OCR for scanned pages)...")
            pages = extract_pages(pdf_bytes, use_ocr=use_ocr)
            st.write(f"✂️ Splitting {len(pages)} pages into searchable chunks...")
            chunks = chunk_pages(pages)
            if not chunks:
                status.update(label="No text found", state="error")
                st.error("No text found. Turn on OCR in the sidebar and try again.")
                return False
            st.write("🧠 Building the search index (embeddings + FAISS)...")
            store = VectorStore(chunks)
            hits = retrieve_context(store)
            st.write("🤖 Extracting requirements with the LLM...")
            result = extract_tender_info(format_context(hits))
        except Exception as e:
            status.update(label="Analysis failed", state="error")
            st.error(f"Extraction failed: {e}")
            return False
        status.update(label="Analysis complete", state="complete", expanded=False)
    st.session_state.update(pdf=pdf_bytes, pages=pages, store=store, result=result,
                            selected=None, chat=[])
    for k in [k for k in st.session_state if str(k).startswith("chk-")]:
        del st.session_state[k]
    Path("output").mkdir(exist_ok=True)
    Path("output/last_result.json").write_text(json.dumps(result, indent=2, ensure_ascii=False))
    st.toast("Analysis complete!", icon="✅")
    return True


# ---------- landing (centered upload) ----------
if LANDING:
    st.markdown('<div class="brand">Tender Analyzer</div><div style="height:6vh"></div>', unsafe_allow_html=True)
    _, mid, _ = st.columns([1, 2, 1])
    with mid:
        st.markdown('<div class="orb">📄</div>'
                    '<h1 class="headline">Tenders, analyzed. <em>For you.</em></h1>'
                    '<p class="sub">Upload a tender PDF and get eligibility, deadlines, fees and deliverables, '
                    'each linked to its source page.</p>', unsafe_allow_html=True)
        uploaded = st.file_uploader("Upload tender PDF", type=["pdf"], label_visibility="collapsed")
        use_ocr = st.toggle("OCR scanned pages", value=True)
        if uploaded is not None and st.button("Analyze tender →", type="primary"):
            if run_analysis(uploaded.getvalue(), use_ocr):
                st.rerun()
        if SAMPLE_PDF.exists():
            _, pill, _ = st.columns([1, 2, 1])
            if pill.button("Not sure? Try the sample tender"):
                if run_analysis(SAMPLE_PDF.read_bytes(), use_ocr):
                    st.rerun()
    st.stop()

# ---------- results header + sidebar ----------
top_l, top_r = st.columns([6, 1])
top_l.markdown('<div class="brand">Tender Analyzer</div>', unsafe_allow_html=True)
if top_r.button("＋ New tender"):
    for k in list(st.session_state.keys()):
        del st.session_state[k]
    st.rerun()

with st.sidebar:
    done, total = checklist_progress(st.session_state["result"])
    st.subheader("Checklist progress")
    st.progress(done / total if total else 0.0, text=f"{done} of {total} done")
    if total and done == total:
        st.success("All requirements checked!")

r, pages, pdf, store = (st.session_state[k] for k in ("result", "pages", "pdf", "store"))
total_pages = len(pages)
ocr_count = sum(p["ocr"] for p in pages)

tab_over, tab_check, tab_ask, tab_doc, tab_data = st.tabs(
    ["📊 Overview", "✅ Checklist", "💬 Ask the tender", "🔍 Document explorer", "🧾 Data & export"])

# ---------- Overview ----------
with tab_over:
    title, title_page = single(r, "tender_title")
    st.subheader(title)
    st.caption(f"{total_pages} pages processed" + (f" · {ocr_count} read with OCR" if ocr_count else ""))

    cards = [("📅", "Submission deadline", "submission_deadline"), ("💰", "EMD", "emd"),
             ("🧾", "Tender fee", "tender_fee"), ("🏦", "Minimum turnover", "minimum_turnover")]
    cols = st.columns(len(cards))
    for col, (icon, label, key) in zip(cols, cards):
        value, page = single(r, key)
        with col.container(border=True):
            st.markdown(f'<div class="card-label">{icon} {label}</div><div class="card-value">{value}</div>',
                        unsafe_allow_html=True)
            p = to_page(page, total_pages)
            if p and st.button(f"View source · p.{p}", key=f"ov-{key}"):
                open_source(p, value)
                st.toast(f"Opened page {p} in the Checklist tab preview")

    dl, _ = single(r, "submission_deadline")
    left = days_left(dl)
    if left is not None:
        if left < 0:
            st.error(f"⏰ Deadline passed {abs(left)} day(s) ago.")
        elif left <= 7:
            st.warning(f"⏰ Only {left} day(s) left to submit!")
        else:
            st.info(f"⏰ {left} days left until the deadline.")

    st.markdown("#### What this tender asks for")
    counts = {label: len(items_for(r, key)) for label, key, _ in CATEGORIES}
    cc = st.columns(len(CATEGORIES))
    for col, (label, key, icon) in zip(cc, CATEGORIES):
        col.metric(f"{icon} {label}", counts[label])
    if any(counts.values()):
        st.bar_chart(pd.DataFrame({"Requirements": counts}))

# ---------- Checklist ----------
with tab_check:
    left_col, right_col = st.columns([1.1, 1])
    with left_col:
        q = st.text_input("🔎 Search requirements", placeholder="e.g. turnover, GST, warranty")
        chosen = st.multiselect("Categories", [c[0] for c in CATEGORIES], default=[c[0] for c in CATEGORIES])
        shown = 0
        for label, key, icon in CATEGORIES:
            if label not in chosen:
                continue
            items = items_for(r, key)
            visible = [(i, it) for i, it in enumerate(items) if q.lower() in it["value"].lower()]
            if not visible:
                continue
            st.markdown(f"#### {icon} {label}")
            for i, it in visible:
                shown += 1
                c1, c2 = st.columns([6, 1])
                c1.checkbox(it["value"], key=f"chk-{key}-{i}")
                p = to_page(it.get("page"), total_pages)
                if p:
                    c2.button(f"p.{p}", key=f"go-{key}-{i}", on_click=open_source, args=(p, it["value"]))
        if shown == 0:
            st.info("No requirements match your search.")

    with right_col:
        sel = st.session_state.get("selected") or {"page": 1, "text": None}
        st.markdown("#### 📄 Source preview")
        n1, n2, n3 = st.columns([1, 2, 1])
        n1.button("◀ Prev", key="prev", on_click=open_source, args=(max(1, sel["page"] - 1), None))
        n3.button("Next ▶", key="next", on_click=open_source, args=(min(total_pages, sel["page"] + 1), None))
        n2.markdown(f"<div style='text-align:center;padding-top:6px'>Page <b>{sel['page']}</b> of {total_pages}</div>",
                    unsafe_allow_html=True)
        st.caption("The matching text is highlighted in yellow." if sel["text"] else "Click a page button next to a requirement.")
        show_image(render_page_png(pdf, sel["page"], highlight=sel["text"]))

# ---------- Ask ----------
with tab_ask:
    st.caption("Answers come only from the tender text. Page numbers are shown so you can verify.")
    chat = st.session_state.setdefault("chat", [])
    sc = st.columns(len(SUGGESTED_QUESTIONS))
    for col, sq in zip(sc, SUGGESTED_QUESTIONS):
        if col.button(sq, key=f"sq-{sq}"):
            st.session_state["pending_q"] = sq

    for m in chat:
        with st.chat_message(m["role"]):
            st.markdown(m["content"])

    question = st.chat_input("Ask anything about this tender...") or st.session_state.pop("pending_q", None)
    if question:
        chat.append({"role": "user", "content": question})
        with st.chat_message("user"):
            st.markdown(question)
        with st.chat_message("assistant"):
            with st.spinner("Searching the tender..."):
                try:
                    hits = store.search(question, k=5)
                    answer = answer_question(question, format_context(hits))
                    srcs = sorted({h["page"] for h in hits})
                    answer += "\n\n_Sources searched: pages " + ", ".join(map(str, srcs)) + "_"
                except Exception as e:
                    answer = f"Sorry, that failed: {e}"
            st.markdown(answer)
        chat.append({"role": "assistant", "content": answer})

# ---------- Document explorer ----------
with tab_doc:
    term = st.text_input("🔍 Find a word or phrase in the document", placeholder="e.g. blacklisted")
    matches = [p["page"] for p in pages if term and term.lower() in p["text"].lower()]
    if term:
        st.caption(f"Found on {len(matches)} page(s): " + (", ".join(map(str, matches)) or "none"))
    options = matches or list(range(1, total_pages + 1))
    page_no = st.select_slider("Page", options=options, value=options[0]) if len(options) > 1 else options[0]
    c1, c2 = st.columns(2)
    with c1:
        show_image(render_page_png(pdf, page_no, highlight=term or None))
    with c2:
        st.markdown(f"**Extracted text · page {page_no}**" + (" (OCR)" if pages[page_no - 1]["ocr"] else ""))
        st.text(pages[page_no - 1]["text"] or "(no text on this page)")

# ---------- Data ----------
with tab_data:
    d1, d2 = st.columns(2)
    d1.download_button("⬇️ Download CSV checklist", result_to_csv(r).encode("utf-8-sig"),
                       file_name="tender_checklist.csv", mime="text/csv")
    d2.download_button("⬇️ Download JSON", json.dumps(r, indent=2, ensure_ascii=False),
                       file_name="tender_checklist.json", mime="application/json")
    st.json(r, expanded=False)