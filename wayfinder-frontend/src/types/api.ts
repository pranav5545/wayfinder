/**
 * Wayfinder API types — must match API_CONTRACT.md
 *
 * If you change this file, update the contract.
 * If the contract changes, update this file.
 */

export type Role = "user" | "assistant";

export interface ChatMessage {
  role: Role;
  content: string;
  /** Citations attached to assistant messages. Absent on user turns. */
  citations?: Citation[];
}

export interface Citation {
  id: string;
  city: string;
  source: "gemini" | "perplexity";
  excerpt: string;
  full_text: string;
  score?: number;
}

export interface ChatRequest {
  message: string;
  history?: Array<{ role: Role; content: string }>;
  options?: {
    top_k?: number;
    city_filter?: string[];
    source_filter?: "gemini" | "perplexity" | "both";
  };
}

export interface ChatResponse {
  reply: string;
  citations: Citation[];
  meta?: {
    retrieval_ms?: number;
    llm_ms?: number;
    model?: string;
    embedding_model?: string;
  };
}

export interface ApiError {
  error: {
    code: "BAD_REQUEST" | "RATE_LIMITED" | "UPSTREAM_ERROR" | "INTERNAL";
    message: string;
  };
}

export interface SourcePerspective {
  passage: string;
  passage_count: number;
  distinctive_words: string[];
}

export interface CityCompareResponse {
  city: string;
  similarity: number;
  interpretation: string;
  gemini: SourcePerspective;
  perplexity: SourcePerspective;
}