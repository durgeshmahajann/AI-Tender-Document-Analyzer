"""Step 8: retrieve the tender chunks relevant to each field we want to extract."""

TOPIC_QUERIES = {
    "title": "tender title name of work project description",
    "deadline": "last date and time of bid submission closing date due date",
    "fees": "tender fee document fee processing fee earnest money deposit EMD bid security",
    "financial": "minimum annual turnover net worth financial eligibility solvency",
    "eligibility": "eligibility criteria qualification requirements bidder must have experience registration",
    "documents": "documents to be submitted along with bid certificate GST PAN registration enclosures",
    "technical": "technical specifications technical requirements scope standards",
    "deliverables": "scope of work deliverables supply installation commissioning testing maintenance delivery schedule",
}


def retrieve_context(store, k_per_topic: int = 4, max_chunks: int = 24):
    seen, picked = set(), []
    for query in TOPIC_QUERIES.values():
        for hit in store.search(query, k=k_per_topic):
            if hit["id"] not in seen:
                seen.add(hit["id"])
                picked.append(hit)
    picked.sort(key=lambda h: (h["page"], h["id"]))
    return picked[:max_chunks]


def format_context(hits):
    return "\n\n".join(f"[Page {h['page']}]\n{h['text']}" for h in hits)
