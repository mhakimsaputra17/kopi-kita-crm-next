// ─── Available AI models (multi-provider) ───
// Client-safe: no secrets, no server-only imports.

export interface AIModel {
  id: string;           // exact model ID for the API
  name: string;         // display name
  provider: string;     // provider label
  providerSlug: string; // for logo/icon
  description: string;  // short description
  tier: "primary" | "fast" | "open"; // UI badge
  endpoint: "github" | "gemini" | "groq"; // which API endpoint to use
}

export const AVAILABLE_MODELS: AIModel[] = [
  {
    id: "openai/gpt-5-mini",
    name: "GPT-5 Mini",
    provider: "OpenAI",
    providerSlug: "openai",
    description: "Paling cerdas, cocok untuk analisis kompleks",
    tier: "primary",
    endpoint: "github",
  },
  {
    id: "openai/gpt-4.1",
    name: "GPT-4.1",
    provider: "OpenAI",
    providerSlug: "openai",
    description: "Upgrade dari GPT-4o, unggul di coding & reasoning",
    tier: "primary",
    endpoint: "github",
  },
  {
    id: "openai/gpt-4.1-mini",
    name: "GPT-4.1 Mini",
    provider: "OpenAI",
    providerSlug: "openai",
    description: "Lebih cerdas dari 4o-mini, balance kualitas & kecepatan",
    tier: "fast",
    endpoint: "github",
  },
  {
    id: "openai/gpt-4o",
    name: "GPT-4o",
    provider: "OpenAI",
    providerSlug: "openai",
    description: "Multimodal, cepat & cerdas untuk berbagai tugas",
    tier: "primary",
    endpoint: "github",
  },
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    provider: "Google",
    providerSlug: "google",
    description: "Cepat & cerdas dari Google, thinking model",
    tier: "fast",
    endpoint: "gemini",
  },
  {
    id: "gemini-2.5-flash-lite",
    name: "Gemini 2.5 Flash Lite",
    provider: "Google",
    providerSlug: "google",
    description: "Super ringan & cepat, cocok chat harian",
    tier: "fast",
    endpoint: "gemini",
  },
  {
    id: "deepseek/DeepSeek-V3-0324",
    name: "DeepSeek V3",
    provider: "DeepSeek",
    providerSlug: "deepseek",
    description: "Reasoning kuat, function calling & code generation",
    tier: "primary",
    endpoint: "github",
  },
  {
    id: "meta/Llama-4-Maverick-17B-128E-Instruct-FP8",
    name: "Llama 4 Maverick",
    provider: "Meta",
    providerSlug: "meta",
    description: "Terbaru dari Meta, creative writing & image understanding",
    tier: "primary",
    endpoint: "github",
  },
  {
    id: "mistral-ai/mistral-medium-2505",
    name: "Mistral Medium 3",
    provider: "Mistral",
    providerSlug: "mistral",
    description: "State-of-the-art reasoning & vision dari Mistral",
    tier: "primary",
    endpoint: "github",
  },
  {
    id: "xai/grok-3",
    name: "Grok 3",
    provider: "xAI",
    providerSlug: "xai",
    description: "Model flagship xAI, reasoning kuat",
    tier: "primary",
    endpoint: "github",
  },
  {
    id: "xai/grok-3-mini",
    name: "Grok 3 Mini",
    provider: "xAI",
    providerSlug: "xai",
    description: "Versi ringan Grok 3, cepat & efisien",
    tier: "fast",
    endpoint: "github",
  },
  {
    id: "openai/gpt-4.1-nano",
    name: "GPT-4.1 Nano",
    provider: "OpenAI",
    providerSlug: "openai",
    description: "Cepat & ringan, cocok untuk chat harian",
    tier: "fast",
    endpoint: "github",
  },
  {
    id: "llama-3.3-70b-versatile",
    name: "Llama 3.3 70B",
    provider: "Groq",
    providerSlug: "groq",
    description: "Model open-source kuat, inferensi super cepat via Groq",
    tier: "primary",
    endpoint: "groq",
  },
  {
    id: "llama-3.1-8b-instant",
    name: "Llama 3.1 8B",
    provider: "Groq",
    providerSlug: "groq",
    description: "Ultra-cepat & ringan, cocok fallback",
    tier: "fast",
    endpoint: "groq",
  },
] as const;

export const DEFAULT_MODEL = AVAILABLE_MODELS[0];

// Valid model IDs for validation
export const VALID_MODEL_IDS = new Set(AVAILABLE_MODELS.map((m) => m.id));
