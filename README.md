# Wayfinder

A sensory travel-recommendation chatbot, grounded in field reports from 59 cities.

Describe a vibe — "rainy, melancholic, ancient streets" — and Wayfinder retrieves the
closest-matching cities from a vector database of atmospheric descriptions (generated
by Gemini and Perplexity for each city) and explains the match with an LLM, citing the
exact passage it's grounded in. No answer is invented — every reply points back to a
real source excerpt you can inspect.

🏆 Built at Hackathon 2026 — 1st place.

## How it works

```
User query ("rainy, ancient streets, melancholic")
        ↓
Embed query (sentence-transformers, all-MiniLM-L6-v2)
        ↓
Nearest-neighbor search over 59 cities × 2 sources in ChromaDB
        ↓
Best match explained by an LLM (Groq / Llama 3.3), grounded in the retrieved passage
        ↓
Reply + citations returned to the chat UI
```

There's also a `/api/city/{city}` endpoint that compares how Gemini and Perplexity
each describe the same city — cosine similarity between their averaged embeddings,
plus each source's distinctive vocabulary.

## Structure

| Path | What it is |
|---|---|
| [`hackathon-backend/`](hackathon-backend/) | FastAPI service: retrieval (ChromaDB), explanation (Groq), city comparison |
| [`wayfinder-frontend/`](wayfinder-frontend/) | Vite + React + TypeScript chat UI, with citation chips and a source viewer |

Each has its own README with setup instructions. Short version:

```bash
# Backend
cd hackathon-backend
python -m venv .venv && source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env   # add your Groq API key
# You'll also need ./city_vibe_db_v2 (the vector DB) — see the backend README
uvicorn main:app --reload --port 8000

# Frontend (separate terminal)
cd wayfinder-frontend
npm install
npm run dev
```

The frontend boots with a mock backend by default so the UI works standalone. Point
it at the real API by copying `.env.example` to `.env.local` and setting
`VITE_USE_MOCK=false`.

## Stack

- **Backend:** FastAPI, ChromaDB, sentence-transformers, Groq (Llama 3.3 70B)
- **Frontend:** Vite, React, TypeScript — no CSS framework or UI library
