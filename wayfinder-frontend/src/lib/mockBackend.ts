import type { ChatRequest, ChatResponse, Citation } from "../types/api";
import { SAMPLE_CORPUS } from "./sampleCorpus";

/**
 * Tiny in-memory mock so the frontend works before the backend ships.
 * - Detects city names in the query for grounded responses.
 * - Falls back to keyword overlap for vibe-based queries.
 * - Returns the exact ChatResponse shape from API_CONTRACT.md.
 *
 * Delete this file (and the USE_MOCK branch in api.ts) once the real backend works.
 */

const STOP = new Set(
  "a an and are as at be by for from has have he her his i in into is it its of on or our she that the their them they this to was we were what when where which who will with you your".split(
    " ",
  ),
);

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-zà-ÿ\s]/gi, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w));
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function detectCities(query: string): string[] {
  const q = ` ${normalize(query)} `;
  const cities = [...new Set(SAMPLE_CORPUS.map((d) => d.city))];
  return cities.filter((c) => q.includes(` ${normalize(c)} `));
}

function score(query: string, text: string): number {
  const qToks = new Set(tokenize(query));
  const tToks = tokenize(text);
  let hits = 0;
  for (const t of tToks) if (qToks.has(t)) hits++;
  return hits / Math.max(1, tToks.length);
}

function pickCitations(query: string, k: number): Citation[] {
  const cities = detectCities(query);
  const scored = SAMPLE_CORPUS.map((d) => ({
    d,
    s: score(query, d.text) + (cities.includes(d.city) ? 0.5 : 0),
  })).sort((a, b) => b.s - a.s);

  const picks: typeof scored = [];
  const cityCount = new Map<string, number>();
  for (const item of scored) {
    const seen = cityCount.get(item.d.city) ?? 0;
    if (seen < 2) {
      picks.push(item);
      cityCount.set(item.d.city, seen + 1);
    }
    if (picks.length >= k) break;
  }

  return picks.map(({ d, s }) => ({
    id: d.id,
    city: d.city,
    source: d.source,
    excerpt: d.text.slice(0, 160).trim() + "…",
    full_text: d.text,
    score: Number(s.toFixed(2)),
  }));
}

function composeReply(query: string, cits: Citation[]): string {
  if (!cits.length) {
    return "I don't have field reports that match that. Try mentioning a sense (a smell, a sound), or a city by name.";
  }
  const cities = detectCities(query);
  const q = query.toLowerCase();
  const isCompare = /\b(vs|versus|compare|difference|or)\b/.test(q) && cities.length >= 2;
  const isMatch = /\b(recommend|suggest|pick|find me|where should|which city)\b/.test(q);

  if (isCompare && cities.length >= 2) {
    const parts: string[] = ["Here's how the field reports render the two side by side:\n"];
    for (const city of cities.slice(0, 2)) {
      const own = cits.find((c) => c.city === city);
      if (own) parts.push(`**${city}.** ${own.excerpt}\n`);
    }
    return parts.join("\n");
  }
  if (isMatch && !cities.length) {
    const uniq = [...new Map(cits.map((c) => [c.city, c])).values()].slice(0, 3);
    return [
      "Based on what you described, three places turn up in the reports:\n",
      ...uniq.map((c) => `**${c.city}.** ${c.excerpt}`),
    ].join("\n\n");
  }
  if (cities.length === 1) {
    return [
      `From the field reports for **${cities[0]}**:\n`,
      ...cits.filter((c) => c.city === cities[0]).slice(0, 2).map((c) => c.excerpt),
    ].join("\n\n");
  }
  return [
    "Here's what the reports surface for that:\n",
    ...cits.slice(0, 3).map((c) => `**${c.city}.** ${c.excerpt}`),
  ].join("\n\n");
}

export async function mockChat(req: ChatRequest): Promise<ChatResponse> {
  // Simulate retrieval + LLM latency so the loading state is testable.
  await new Promise((r) => setTimeout(r, 600 + Math.random() * 500));

  const k = req.options?.top_k ?? 4;
  const citations = pickCitations(req.message, k);
  const reply = composeReply(req.message, citations);

  return {
    reply,
    citations,
    meta: {
      retrieval_ms: 42,
      llm_ms: 800,
      model: "mock-v1",
      embedding_model: "mock",
    },
  };
}
