"""Step 7: FAISS index (inner product on normalized vectors = cosine similarity)."""
import faiss

from modules.embeddings import embed_texts


class VectorStore:
    def __init__(self, chunks):
        self.chunks = chunks
        vectors = embed_texts([c["text"] for c in chunks])
        self.index = faiss.IndexFlatIP(vectors.shape[1])
        self.index.add(vectors)

    def search(self, query: str, k: int = 4):
        k = min(k, len(self.chunks))
        scores, ids = self.index.search(embed_texts([query]), k)
        return [
            {**self.chunks[i], "score": float(s)}
            for s, i in zip(scores[0], ids[0]) if i != -1
        ]
