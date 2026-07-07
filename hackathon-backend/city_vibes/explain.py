"""Groq-powered explanations for why a city matches a user's query."""
import os
from groq import Groq

from city_vibes import config

_api_key = os.environ.get("GROQ_API_KEY")
if not _api_key:
    raise RuntimeError(
        "GROQ_API_KEY not set. Copy .env.example to .env and fill in your key, "
        "or export GROQ_API_KEY before starting the server."
    )

_groq_client = Groq(api_key=_api_key)


def explain_match(user_query: str, city: str, passage: str) -> str:
    """Generate a 2-3 sentence rationale for why `city` matches `user_query`.

    Falls back to a short generic message if Groq is unavailable, so a flaky
    network doesn't take down the whole endpoint.
    """
    prompt = f"""A user described their ideal city atmosphere as:
"{user_query}"

The following is a real atmospheric description of {city}:
---
{passage}
---

In 2-3 sentences, explain specifically why {city} matches what the user is looking for.
Be evocative but precise — reference actual details from the passage. Do not invent
details that aren't in the passage."""

    try:
        response = _groq_client.chat.completions.create(
            model=config.GROQ_MODEL,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=config.GROQ_MAX_TOKENS,
        )
        return response.choices[0].message.content
    except Exception as e:
        # Log the real error server-side, return something graceful to the user
        print(f"[explain_match] Groq call failed: {e}")
        return (
            f"{city} matches your description closely — see the passage below "
            f"for the atmospheric details that drove the match."
        )
