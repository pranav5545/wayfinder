# Wayfinder — frontend

Sensory travel chat, grounded in field reports from 59 cities.
Vite + React + TypeScript. No CSS framework, no UI library — keeps the bundle small and the demo loads instantly.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:5173

The app boots with a **mock backend** so you can develop the UI without waiting for the real API. Everything else is real — the conversation state, the citation chips, the source modal.

## Hooking up the real backend

When your teammate's `/api/chat` is live:

```bash
cp .env.example .env.local
# edit .env.local: VITE_USE_MOCK=false
npm run dev
```

If the backend runs on a different host, also set `VITE_API_BASE=http://your-host:port`. Otherwise the Vite proxy in `vite.config.ts` forwards `/api/*` to `localhost:8000` — change that target if needed.

That's the only change. No component touches `fetch` directly — everything goes through `src/lib/api.ts`.

## The shared contract

See `API_CONTRACT.md`. The TypeScript types in `src/types/api.ts` mirror it 1:1. **If the contract changes, both files change together.**

## File map

```
src/
  App.tsx                 # owns chat state, wires everything
  main.tsx                # entry
  styles.css              # one stylesheet, mobile-responsive
  types/api.ts            # shared types (matches API_CONTRACT.md)
  lib/
    api.ts                # the only place that hits the network
    mockBackend.ts        # dev-only; delete when real backend is solid
    sampleCorpus.ts       # data for the mock; not used in production
  components/
    Header.tsx
    ChatPane.tsx          # messages + composer
    Message.tsx           # one message + tiny markdown
    PromptChips.tsx       # suggested-question chips (welcome state only)
    SourceModal.tsx       # full-source view
```

## What I'd build next

- **Streaming.** If your teammate ships `/api/chat/stream` (SSE), swap `sendChat` to read the stream and append tokens to the in-flight assistant message. The rest of the UI is already shaped for it.
- **City filter UI.** The request type already supports `options.city_filter`; expose it as a chip-toggle row above the composer.
- **A small world map.** Once a reply lands, plot the cited cities on a map next to the citation chips. Use a static SVG world map and pin via lat/lon — no map library needed.
- **Persisted conversations.** `localStorage` snapshot of `messages` on every change, restore on load.

## Deploying

Vercel or Netlify — drag the repo in, set `VITE_USE_MOCK=false` and `VITE_API_BASE` to the production backend URL, ship. Build command is `npm run build`, output dir is `dist`.
