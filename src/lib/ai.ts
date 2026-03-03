import "server-only";
import OpenAI from "openai";
import { AVAILABLE_MODELS } from "./ai-models";

// Re-export client-safe model definitions
export { AVAILABLE_MODELS, DEFAULT_MODEL, VALID_MODEL_IDS } from "./ai-models";
export type { AIModel } from "./ai-models";

// ─── Model → endpoint lookup ───
const MODEL_ENDPOINT_MAP = new Map(
  AVAILABLE_MODELS.map((m) => [m.id, m.endpoint]),
);

export function getModelEndpoint(modelId: string): "github" | "gemini" | "groq" {
  return MODEL_ENDPOINT_MAP.get(modelId) ?? "github";
}

/**
 * GitHub Models token pool.
 * Rate limits are per-token (UserByModelByMinute), so rotating tokens
 * multiplies available quota. Set GITHUB_TOKEN_2 and GITHUB_TOKEN_3
 * in .env for extra capacity. Falls back gracefully if only 1 token exists.
 */
const GITHUB_TOKENS = [
  process.env.GITHUB_TOKEN,
  process.env.GITHUB_TOKEN_2,
  process.env.GITHUB_TOKEN_3,
].filter(Boolean) as string[];

if (GITHUB_TOKENS.length === 0) {
  throw new Error("At least GITHUB_TOKEN must be set in environment variables");
}

const BASE_URL = "https://models.github.ai/inference";

// Create an OpenAI client for each token
export const clients: OpenAI[] = GITHUB_TOKENS.map(
  (token) => new OpenAI({ baseURL: BASE_URL, apiKey: token }),
);

// Default export for backward compatibility
export const openai = clients[0];

/**
 * Gemini client via Google's OpenAI-compatible endpoint.
 * Uses GEMINI_API_KEY from env. Only created if key is present.
 * Docs: https://ai.google.dev/gemini-api/docs/openai
 */
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export const geminiClient: OpenAI | null = GEMINI_API_KEY
  ? new OpenAI({ baseURL: GEMINI_BASE_URL, apiKey: GEMINI_API_KEY })
  : null;

/**
 * Groq client via OpenAI-compatible endpoint.
 * Uses GROQ_API_KEY from env. Only created if key is present.
 * Docs: https://console.groq.com/docs/openai
 */
const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
const GROQ_API_KEY = process.env.GROQ_API_KEY;

export const groqClient: OpenAI | null = GROQ_API_KEY
  ? new OpenAI({ baseURL: GROQ_BASE_URL, apiKey: GROQ_API_KEY })
  : null;

// Convenience constants for the API route
export const AI_MODEL = "openai/gpt-5-mini";
export const FALLBACK_MODELS = [
  "openai/gpt-4.1",
  "openai/gpt-4o",
  "gemini-2.5-flash",
  "deepseek/DeepSeek-V3-0324",
  "meta/Llama-4-Maverick-17B-128E-Instruct-FP8",
  "mistral-ai/mistral-medium-2505",
  "xai/grok-3",
  "xai/grok-3-mini",
  "llama-3.3-70b-versatile",
  "openai/gpt-4.1-mini",
  "gemini-2.5-flash-lite",
  "llama-3.1-8b-instant",
  "openai/gpt-4.1-nano",
];
