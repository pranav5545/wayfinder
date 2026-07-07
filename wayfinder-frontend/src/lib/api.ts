import type { ChatRequest, ChatResponse, CityCompareResponse} from "../types/api";
import { mockChat } from "./mockBackend";

/**
 * Set USE_MOCK=false (or unset VITE_USE_MOCK in .env) once the backend is live.
 * The mock returns the same shape as the real API, so swapping is invisible
 * to every component above this file.
 */
const USE_MOCK = import.meta.env.VITE_USE_MOCK !== "false";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

export async function fetchCityComparison(city: string): Promise<CityCompareResponse> {
  const res = await fetch(`${API_BASE}/api/city/${encodeURIComponent(city)}`, {
    method: "GET",
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.detail) message = body.detail;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }

  return res.json();
}

export async function sendChat(req: ChatRequest): Promise<ChatResponse> {
  if (USE_MOCK) return mockChat(req);

  const res = await fetch(`${API_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error?.message) message = body.error.message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }

  return res.json();
}
