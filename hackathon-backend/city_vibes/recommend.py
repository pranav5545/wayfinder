"""Retrieval: embed a user query, find the best-matching cities."""
import re
from sentence_transformers import SentenceTransformer
import chromadb

from city_vibes import config

# Load once at import time. Both objects are thread-safe for read operations,
# which is what we need for query-only access.
print(f"Loading embedding model ({config.MODEL_NAME})...")
_model = SentenceTransformer(config.MODEL_NAME)

_client = chromadb.PersistentClient(path=config.DB_PATH)
_collection = _client.get_collection(config.COLLECTION_NAME)
print(f"Loaded collection '{config.COLLECTION_NAME}' with {_collection.count()} passages.")


def clean_text(text: str) -> str:
    """Strip LLM intro phrases and citation artefacts from raw source passages."""
    text = re.sub(
        r"^(sure[!,.]?|here'?s?|certainly[!,.]?|of course[!,.]?).*?\n",
        "",
        text.strip(),
        flags=re.IGNORECASE,
    )
    text = re.sub(r"\[\d+\]", "", text)  # Perplexity-style [1], [23]
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def find_matching_cities(user_query: str, top_k: int = config.DEFAULT_TOP_K):
    """Return matches for a query.

    For the #1 city, fetch BOTH Gemini and Perplexity passages
    (even if one didn't appear in the initial over-fetch) so the user
    sees how both LLMs describe their best-matched city.
    For subsequent cities, return only the best-scoring source.
    """
    print(f">>> NEW find_matching_cities running for query: {user_query!r}")

    query_embedding = _model.encode(user_query).tolist()

    results = _collection.query(
        query_embeddings=[query_embedding],
        n_results=top_k * config.OVERFETCH_MULTIPLIER,
        include=["documents", "metadatas", "distances"],
    )

    # First pass: best passage per (city, source) from initial over-fetch
    by_city_source = {}
    for doc, meta, dist in zip(
        results["documents"][0],
        results["metadatas"][0],
        results["distances"][0],
    ):
        key = (meta["city"], meta["source"])
        if key not in by_city_source or dist < by_city_source[key]["distance"]:
            by_city_source[key] = {
                "city": meta["city"],
                "source": meta["source"],
                "passage": clean_text(doc),
                "distance": dist,
                "score": round(1 - dist, 3),
            }

    # Best score per city — used to rank which cities to surface
    best_by_city = {}
    for entry in by_city_source.values():
        city = entry["city"]
        if city not in best_by_city or entry["distance"] < best_by_city[city]["distance"]:
            best_by_city[city] = entry

    ranked_cities = sorted(best_by_city.values(), key=lambda x: x["score"], reverse=True)
    top_cities = ranked_cities[:top_k]

    output = []
    if top_cities:
        winner_city = top_cities[0]["city"]

        # For the winner, ensure we have BOTH sources — fetch directly from
        # Chroma if a source didn't make the initial over-fetch cutoff.
        for src in ("Gemini", "Perplexity"):
            if (winner_city, src) in by_city_source:
                output.append(by_city_source[(winner_city, src)])
            else:
                # Targeted query: best passage from this source for this city
                extra = _collection.query(
                    query_embeddings=[query_embedding],
                    n_results=1,
                    where={"$and": [{"city": winner_city}, {"source": src}]},
                    include=["documents", "metadatas", "distances"],
                )
                if extra["ids"] and extra["ids"][0]:
                    dist = extra["distances"][0][0]
                    output.append({
                        "city": winner_city,
                        "source": src,
                        "passage": clean_text(extra["documents"][0][0]),
                        "distance": dist,
                        "score": round(1 - dist, 3),
                    })

        # Safety net: if neither source produced anything (shouldn't happen)
        if not output:
            output.append(top_cities[0])

    # Cities #2 and #3 get their best source only
    for city_entry in top_cities[1:]:
        output.append(city_entry)

    return output


def collection_size() -> int:
    """For the /health endpoint."""
    return _collection.count()
