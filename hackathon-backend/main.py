"""FastAPI app — the only file uvicorn needs to know about.

Run with: uvicorn main:app --reload --port 8000
"""
from dotenv import load_dotenv
load_dotenv()  # must run BEFORE importing anything that reads env vars

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Literal

from city_vibes import config
from city_vibes.recommend import find_matching_cities, collection_size
from city_vibes.explain import explain_match
from city_vibes.compare import compare_city

app = FastAPI(title="City Vibes API")

# CORS: wide open for local dev. Lock this down before deploying anywhere public.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Request / response shapes ---

class HistoryTurn(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[HistoryTurn] = []


class Citation(BaseModel):
    id: str
    city: str
    source: Literal["gemini", "perplexity"]
    excerpt: str
    full_text: str
    score: float | None = None


class ChatResponse(BaseModel):
    reply: str
    citations: list[Citation]


class SourcePerspective(BaseModel):
    passage: str
    passage_count: int
    distinctive_words: list[str]


class CityCompareResponse(BaseModel):
    city: str
    similarity: float
    interpretation: str
    gemini: SourcePerspective
    perplexity: SourcePerspective


# --- Endpoints ---

@app.get("/api/health")
def health():
    """Liveness check. Hit this during the demo to confirm the backend is up."""
    return {"status": "ok", "passages": collection_size()}


@app.post("/api/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    matches = find_matching_cities(req.message, top_k=3)
    if not matches:
        raise HTTPException(status_code=500, detail="No matches found in the database.")

    # Low-confidence guard: check the BEST score across all matches,
    # not just matches[0]. matches[0] may now be Gemini (lower-scoring)
    # because we surface both sources for the winner city.
    best_score = max(m["score"] for m in matches)
    if best_score < config.MIN_MATCH_SCORE:
        reply = (
            "I couldn't find a strong match for that in my collection of city descriptions. "
            "My sources describe atmosphere — light, sound, smells, the feel of streets — "
            "so things like architecture, mood, weather, or pace of life work best. "
            "Could you try rephrasing in those terms?"
        )
        return ChatResponse(reply=reply, citations=[])

    # Use the highest-scoring passage for the LLM explanation
    best_match = max(matches, key=lambda m: m["score"])
    explanation = explain_match(req.message, best_match["city"], best_match["passage"])

    citations = [
        Citation(
            id=f"{m['city']}-{m['source'].lower()}-{i}",
            city=m["city"],
            source=m["source"].lower(),
            excerpt=m["passage"][:300],
            full_text=m["passage"],
            score=m["score"],
        )
        for i, m in enumerate(matches)
    ]

    reply = f"**{best_match['city']}** is your closest match.\n\n{explanation}"
    return ChatResponse(reply=reply, citations=citations)

@app.get("/api/city/{city}", response_model=CityCompareResponse)
def city_comparison(city: str):
    """Compare how Gemini and Perplexity describe the same city.

    Returns the two passages, a similarity score (cosine similarity of
    averaged embeddings), a human-readable interpretation, and each
    source's distinctive vocabulary.
    """
    result = compare_city(city)
    if result is None:
        raise HTTPException(
            status_code=404,
            detail=f"No comparison available for '{city}' — it may not have both sources.",
        )
    return CityCompareResponse(**result)
