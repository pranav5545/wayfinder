# City Vibes — Backend

Atmospheric travel recommendations. User describes a vibe ("rainy, melancholic,
ancient streets"), backend finds the best-matching cities from a vector DB of
sensory descriptions and explains the match with an LLM.

## Setup

```bash
# 1. Install deps (use a venv)
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# 2. Configure secrets
cp .env.example .env
# then edit .env and paste your Groq API key

# 3. Make sure the Chroma DB folder is in place
#    ./city_vibe_db_v2 must exist (copy it from wherever it was built).
#    If you don't have it: see "Rebuilding the DB" below.

# 4. Run the API
uvicorn main:app --reload --port 8000
```

Then hit http://localhost:8000/health to confirm it's alive.

## Endpoints

### `GET /health`
Returns `{"status": "ok", "passages": <count>}`. Use this to verify the DB loaded.

### `POST /chat`
Request:
```json
{
  "message": "rainy, ancient streets, melancholic but quietly alive",
  "history": []
}
```
Response:
```json
{
  "reply": "**Edinburgh** is your closest match.\n\n...",
  "citations": [
    {"city": "Edinburgh", "source": "Gemini", "passage": "...", "score": 0.78},
    ...
  ]
}
```

## Project layout

```
.
├── main.py                 # FastAPI app, only entry point
├── city_vibes/
│   ├── config.py           # All paths, model names, constants
│   ├── recommend.py        # Query the vector DB, dedupe by city
│   ├── explain.py          # Groq call for the "why this city" rationale
│   └── ingest.py           # (Re)build the DB — only run when needed
├── requirements.txt
├── .env.example            # Template — copy to .env and fill in
└── .gitignore
```

## Rebuilding the DB

Only needed if `./city_vibe_db_v2` doesn't exist or source data changed.

1. Edit `city_vibes/config.py` — set `BASE_DIR` to your `<city>/<source>/*.txt` folder.
2. Run:
   ```bash
   python -m city_vibes.ingest
   ```
   This is idempotent — already-indexed passages are skipped, so re-running is safe.
   For a clean rebuild, delete `./city_vibe_db_v2` first.
