# Wayfinder API Contract

**Owner:** backend teammate (embeddings + LLM)
**Consumer:** frontend (React app)
**Status:** v1 — agreed for hackathon demo

The frontend treats the backend as a single endpoint. Everything else — embedding model, vector store, LLM provider — is the backend's concern and can change without breaking the frontend, as long as this contract holds.

---

## Endpoint

```
POST /api/chat
Content-Type: application/json
```

---

## Request

```ts
{
  // The user's latest message. Required, non-empty.
  message: string;

  // Optional conversation history for follow-ups. Most recent last.
  // Frontend sends this so the backend can resolve "what about there?" etc.
  // Empty/missing on the first turn.
  history?: Array<{
    role: "user" | "assistant";
    content: string;
  }>;

  // Optional knobs the UI may expose. Backend can ignore.
  options?: {
    // How many source snippets to retrieve. Default: 4.
    top_k?: number;
    // Restrict retrieval to specific cities. Empty = no filter.
    city_filter?: string[];
    // "gemini" | "perplexity" | "both". Default: "both".
    source_filter?: "gemini" | "perplexity" | "both";
  };
}
```

---

## Response (success, 200)

```ts
{
  // The model's answer. Markdown allowed (frontend renders it).
  reply: string;

  // The snippets the LLM was grounded on. Display as citation chips.
  // Order = relevance, most relevant first.
  citations: Array<{
    id: string;          // stable id, e.g. "paris-gemini-3"
    city: string;        // "Paris", "São Paulo" (UTF-8, with diacritics)
    source: "gemini" | "perplexity";
    excerpt: string;     // ~150 chars, what to show on hover
    full_text: string;   // the entire snippet, for the "view source" modal
    score?: number;      // optional similarity score, 0..1
  }>;

  // Optional, helpful for the demo:
  meta?: {
    retrieval_ms?: number;
    llm_ms?: number;
    model?: string;       // e.g. "claude-sonnet-4-5"
    embedding_model?: string;
  };
}
```

### Example response

```json
{
  "reply": "From the field reports for **Paris**: the boulevards are wide and sun-dappled, with the clink of ceramic on saucers spilling from outdoor cafés. A faint accordion drifts from an open window...",
  "citations": [
    {
      "id": "paris-gemini-0",
      "city": "Paris",
      "source": "gemini",
      "excerpt": "The muted hum of the street welcomes me as I step from the shadowed passage...",
      "full_text": "The muted hum of the street welcomes me as I step from the shadowed passage into the wide, sun-dappled boulevard...",
      "score": 0.87
    }
  ],
  "meta": {
    "retrieval_ms": 42,
    "llm_ms": 1180,
    "model": "claude-sonnet-4-5"
  }
}
```

---

## Errors

Return standard HTTP status codes with a JSON body:

```ts
{
  error: {
    code: "BAD_REQUEST" | "RATE_LIMITED" | "UPSTREAM_ERROR" | "INTERNAL";
    message: string;     // human-readable, may be shown to user
  }
}
```

| Status | Code             | When                                          |
|--------|------------------|-----------------------------------------------|
| 400    | `BAD_REQUEST`    | `message` empty or malformed body             |
| 429    | `RATE_LIMITED`   | LLM provider rate limit hit                   |
| 502    | `UPSTREAM_ERROR` | LLM or vector store unreachable               |
| 500    | `INTERNAL`       | anything else                                 |

---

## Streaming (nice-to-have, **v2**)

If time allows, expose a streaming variant at `POST /api/chat/stream` returning Server-Sent Events:

```
event: token
data: {"text": "From"}

event: token
data: {"text": " the"}

event: citations
data: { ...same citations array as above... }

event: done
data: {"meta": {...}}
```

Frontend can fall back to the non-streaming endpoint if `/stream` 404s. Don't block v1 on this.

---

## CORS

For local dev, allow `http://localhost:5173` (Vite default). For demo, allow the deployed frontend origin.

---

## Notes & non-goals

- **No auth** for the hackathon demo. Add a header-based key if we go past the demo.
- **No conversation persistence on the backend.** Frontend sends history each turn.
- **No streaming required for v1.** Frontend shows a "consulting the field library…" indicator while waiting; one round-trip is fine.
- The frontend will never inspect `citations[].full_text` until the user clicks a chip, so it's okay if it's a few KB.
