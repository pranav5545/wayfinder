"""Analysis: compare how Gemini and Perplexity describe the same city.

Pulls embeddings + raw text from the existing Chroma collection, computes:
- Cosine similarity between the two LLMs' averaged embeddings for the city
- Set-difference of meaningful words (each LLM's "distinctive vocabulary")
"""
import re
import numpy as np

from city_vibes.recommend import _collection, clean_text


# Stopwords kept short and focused on what survives a casual tokenize.
# Not exhaustive — we just want to strip the noise so unique-word lists
# read meaningfully.
_STOPWORDS = {
    "the", "a", "an", "and", "or", "but", "of", "in", "on", "at", "to", "for",
    "with", "by", "from", "as", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could", "should",
    "may", "might", "must", "can", "this", "that", "these", "those", "i", "you",
    "he", "she", "it", "we", "they", "what", "which", "who", "when", "where",
    "why", "how", "all", "each", "every", "some", "any", "no", "not", "than",
    "then", "so", "if", "else", "while", "during", "after", "before", "above",
    "below", "between", "into", "through", "up", "down", "out", "off", "over",
    "under", "again", "further", "here", "there", "more", "most", "other", "such",
    "only", "own", "same", "very", "just", "also", "like", "its", "their", "his",
    "her", "our", "your", "my", "me", "him", "us", "them", "about", "across",
    "behind", "around", "without", "within", "near", "along",
    # Common atmospheric description filler
    "city", "street", "streets", "air", "sound", "sounds", "smell", "smells",
    "one", "two", "three", "first", "second", "next", "last", "another",
    "way", "ways", "time", "times", "day", "days", "moment", "moments",
}


def _tokenize(text: str) -> set[str]:
    """Lowercase, strip punctuation, drop stopwords and very short tokens."""
    words = re.findall(r"[a-zA-Z]{4,}", text.lower())  # 4+ letters only
    return {w for w in words if w not in _STOPWORDS}


def _get_city_data(city: str, source: str) -> dict | None:
    """Pull all passages + embeddings for one city from one LLM source.

    Returns averaged embedding and a representative passage, or None if
    no passages exist for that city/source combo.
    """
    results = _collection.get(
        where={"$and": [{"city": city}, {"source": source}]},
        include=["documents", "embeddings"],
    )

    if not results["ids"]:
        return None

    embeddings = np.array(results["embeddings"])
    avg_embedding = embeddings.mean(axis=0)

    # Pick the longest passage as the "representative" one for display.
    # Longer ones tend to be richer; this is a heuristic, not science.
    documents = results["documents"]
    representative = max(documents, key=len)

    return {
        "avg_embedding": avg_embedding,
        "passage": clean_text(representative),
        "passage_count": len(documents),
    }


def _cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """Standard cosine similarity between two 1-D vectors."""
    denom = np.linalg.norm(a) * np.linalg.norm(b)
    if denom == 0:
        return 0.0
    return float(np.dot(a, b) / denom)


def _interpret(score: float) -> str:
    """Human-readable label for the similarity score."""
    if score >= 0.85:
        return "strong agreement"
    if score >= 0.70:
        return "moderate agreement"
    if score >= 0.55:
        return "partial agreement"
    return "notable divergence"


def compare_city(city: str) -> dict | None:
    """Compare Gemini's and Perplexity's view of a city.

    Returns None if the city doesn't have both sources.
    """
    gemini = _get_city_data(city, "Gemini")
    perplexity = _get_city_data(city, "Perplexity")

    if gemini is None or perplexity is None:
        return None

    similarity = _cosine_similarity(gemini["avg_embedding"], perplexity["avg_embedding"])

    gemini_words = _tokenize(gemini["passage"])
    perplexity_words = _tokenize(perplexity["passage"])

    # "Distinctive" = appears in one source but not the other.
    # Cap at 12 each for display — too many becomes noise.
    gemini_unique = sorted(gemini_words - perplexity_words)[:12]
    perplexity_unique = sorted(perplexity_words - gemini_words)[:12]

    return {
        "city": city,
        "similarity": round(similarity, 3),
        "interpretation": _interpret(similarity),
        "gemini": {
            "passage": gemini["passage"],
            "passage_count": gemini["passage_count"],
            "distinctive_words": gemini_unique,
        },
        "perplexity": {
            "passage": perplexity["passage"],
            "passage_count": perplexity["passage_count"],
            "distinctive_words": perplexity_unique,
        },
    }
