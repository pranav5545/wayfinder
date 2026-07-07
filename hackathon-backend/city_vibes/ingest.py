"""(Re)build the Chroma DB from source .txt files.

You only need to run this if:
- You're setting up on a new machine and don't have ./city_vibe_db_v2
- You've added new city files
- You changed MODEL_NAME in config.py

Run with: python -m city_vibes.ingest
"""
from sentence_transformers import SentenceTransformer
import chromadb

from city_vibes import config


def main():
    if not config.BASE_DIR.exists():
        raise FileNotFoundError(
            f"BASE_DIR does not exist: {config.BASE_DIR}\n"
            f"Edit city_vibes/config.py to point at your source data folder."
        )

    print(f"Loading embedding model ({config.MODEL_NAME})...")
    model = SentenceTransformer(config.MODEL_NAME)

    client = chromadb.PersistentClient(path=config.DB_PATH)
    collection = client.get_or_create_collection(
        config.COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"},
    )
    print(f"Writing to collection '{config.COLLECTION_NAME}' at {config.DB_PATH}")

    total = 0
    for city_dir in sorted(config.BASE_DIR.iterdir()):
        if not city_dir.is_dir():
            continue
        city = city_dir.name

        for source in config.SOURCES:
            source_dir = city_dir / source
            if not source_dir.exists():
                continue

            for filepath in sorted(source_dir.glob("*.txt")):
                doc_id = f"{city}__{source}__{filepath.stem}"

                # Skip if already indexed — makes the script idempotent.
                # Remove ./city_vibe_db_v2 first if you want a full rebuild.
                existing = collection.get(ids=[doc_id])
                if existing["ids"]:
                    continue

                text = filepath.read_text(encoding="utf-8", errors="replace")
                embedding = model.encode(text).tolist()

                collection.add(
                    ids=[doc_id],
                    embeddings=[embedding],
                    documents=[text],
                    metadatas=[{"city": city, "source": source, "file": filepath.stem}],
                )
                total += 1

        print(f"  ✓ {city}")

    print(f"\nDone — {total} new passages embedded. Collection now has {collection.count()} total.")


if __name__ == "__main__":
    main()
