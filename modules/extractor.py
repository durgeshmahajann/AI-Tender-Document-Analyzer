"""Step 9-10: Gemini (free tier) for structured extraction + question answering."""
import json
import os
import re
import time

from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

SYSTEM_PROMPT = """You are a tender analysis assistant.
You are given excerpts from a tender document. Each excerpt starts with [Page N].
Extract the requested information using ONLY these excerpts.
Do not invent information. If something is not present, use "Not Found" as the value and null as the page.
Return ONLY valid JSON, no markdown fences, no commentary."""

QA_PROMPT = """You answer questions about a tender document using ONLY the excerpts provided.
Each excerpt starts with [Page N]. Cite pages like (p.14) after each fact.
If the answer is not in the excerpts, say you could not find it. Be concise."""

SCHEMA = """{
  "tender_title":        {"value": "", "page": null},
  "submission_deadline": {"value": "", "page": null},
  "tender_fee":          {"value": "", "page": null},
  "emd":                 {"value": "", "page": null},
  "minimum_turnover":    {"value": "", "page": null},
  "eligibility":           [{"value": "", "page": null}],
  "documents_required":    [{"value": "", "page": null}],
  "technical_requirements":[{"value": "", "page": null}],
  "deliverables":          [{"value": "", "page": null}]
}"""


def _parse_json(text: str) -> dict:
    text = re.sub(r"^```(?:json)?|```$", "", text.strip(), flags=re.MULTILINE).strip()
    return json.loads(text)


def _generate(prompt: str, system: str, json_mode: bool) -> str:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is missing. Add it to your .env file.")
    client = genai.Client(api_key=api_key)

    models = [os.getenv("GEMINI_MODEL", "gemini-3.8-flash")]
    models += [m.strip() for m in os.getenv("GEMINI_FALLBACK_MODELS", "").split(",") if m.strip()]

    config = types.GenerateContentConfig(
        system_instruction=system,
        temperature=0,
        **({"response_mime_type": "application/json"} if json_mode else {}),
    )
    last_error = None
    for model in models:
        for attempt in range(4):  # retry busy/overloaded errors with backoff
            try:
                return client.models.generate_content(model=model, contents=prompt, config=config).text
            except Exception as e:
                last_error = e
                msg = str(e)
                busy = any(k in msg for k in ("503", "UNAVAILABLE", "429", "RESOURCE_EXHAUSTED"))
                if not busy:
                    raise
                time.sleep(3 * (2 ** attempt))
    raise last_error


def extract_tender_info(context: str) -> dict:
    prompt = f"Tender excerpts:\n\n{context}\n\nReturn JSON in exactly this shape:\n{SCHEMA}"
    return _parse_json(_generate(prompt, SYSTEM_PROMPT, json_mode=True))


def answer_question(question: str, context: str) -> str:
    prompt = f"Tender excerpts:\n\n{context}\n\nQuestion: {question}"
    return _generate(prompt, QA_PROMPT, json_mode=False)
