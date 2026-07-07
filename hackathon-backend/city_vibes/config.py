"""Central configuration. Edit paths here, not scattered through other files."""
from pathlib import Path

# Source data location — only needed if you re-run ingestion.
# Change this to wherever your <city>/<source>/*.txt files live.
BASE_DIR = Path(r"./data")

# Subfolder names under each city directory
SOURCES = ["Gemini", "Perplexity"]

# Embedding model — keep this in sync with whatever the DB was built with.
# Changing this means re-running ingest.py.
MODEL_NAME = "all-MiniLM-L6-v2"

# ChromaDB location and collection name
DB_PATH = "./city_vibe_db_v2"
COLLECTION_NAME = "city_vibes"

# Groq model for explanations
GROQ_MODEL = "llama-3.3-70b-versatile"
GROQ_MAX_TOKENS = 200

# Retrieval defaults
DEFAULT_TOP_K = 3
# We over-fetch then dedupe by city — same passage from Gemini and Perplexity
# would otherwise eat two of the top-k slots
OVERFETCH_MULTIPLIER = 6

# Cosine similarity below this means "no real match in the corpus".
# 0.0 = unrelated, 1.0 = identical. Atmospheric-text matches usually land
# 0.5–0.7 when they're genuinely good; below 0.4 is almost always noise.
MIN_MATCH_SCORE = 0.3
