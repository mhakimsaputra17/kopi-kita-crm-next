import "server-only";
import OpenAI from "openai";

const EMBEDDING_DIMENSION = 256;

// ─── GitHub Models (primary) — uses existing GITHUB_TOKEN ───
const GITHUB_TOKENS = [
  process.env.GITHUB_TOKEN,
  process.env.GITHUB_TOKEN_2,
  process.env.GITHUB_TOKEN_3,
].filter(Boolean) as string[];

const GITHUB_ENDPOINT = "https://models.github.ai/inference";
const GITHUB_EMBEDDING_MODEL = "openai/text-embedding-3-small";

// ─── Gemini (fallback) ───
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_EMBEDDING_URL = GEMINI_API_KEY
  ? `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${GEMINI_API_KEY}`
  : null;

/**
 * Generate a 256-dim embedding via GitHub Models (primary) or Gemini (fallback).
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  // Try GitHub Models first (uses existing token pool)
  if (GITHUB_TOKENS.length > 0) {
    const token = GITHUB_TOKENS[Math.floor(Math.random() * GITHUB_TOKENS.length)];
    try {
      const client = new OpenAI({ baseURL: GITHUB_ENDPOINT, apiKey: token });
      const response = await client.embeddings.create({
        input: text,
        model: GITHUB_EMBEDDING_MODEL,
        dimensions: EMBEDDING_DIMENSION,
      });
      return response.data[0].embedding;
    } catch (err) {
      console.warn("[Embedding] GitHub Models failed, trying Gemini:", err instanceof Error ? err.message : err);
    }
  }

  // Fallback to Gemini
  if (!GEMINI_EMBEDDING_URL) {
    throw new Error("No embedding provider available (need GITHUB_TOKEN or GEMINI_API_KEY)");
  }

  const response = await fetch(GEMINI_EMBEDDING_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "models/text-embedding-004",
      content: { parts: [{ text }] },
      outputDimensionality: EMBEDDING_DIMENSION,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini Embedding error (${response.status}): ${err}`);
  }

  const data = await response.json();
  return data.embedding.values as number[];
}

/**
 * Tag translations for bilingual embedding enrichment.
 */
const TAG_TRANSLATIONS: Record<string, string> = {
  "black coffee": "kopi hitam, kopi pahit, bitter coffee",
  "sweet drinks": "minuman manis, sweet beverages",
  "cold drinks": "minuman dingin, es, iced drinks",
  "morning coffee": "kopi pagi, morning brew",
  "oat milk": "susu oat, plant-based milk",
  "latte art": "seni latte, coffee art",
  "caramel": "karamel, gula karamel",
  "pastry lover": "pecinta pastry, suka roti kue",
  "matcha": "teh hijau, green tea",
  "workshop": "lokakarya kopi, coffee workshop, edukasi kopi",
};

/**
 * Build a descriptive text from customer data for embedding.
 * Enriched with bilingual context for better cross-language semantic search.
 */
export function buildCustomerEmbeddingText(customer: {
  name: string;
  favoriteDrink: string;
  interestTags: string[];
}): string {
  const tagDescriptions = customer.interestTags
    .map((tag) => {
      const translation = TAG_TRANSLATIONS[tag];
      return translation ? `${tag} (${translation})` : tag;
    })
    .join(", ");

  return `Pelanggan kedai kopi: ${customer.name}. Minuman favorit: ${customer.favoriteDrink}. Minat dan preferensi: ${tagDescriptions}.`;
}

/**
 * Generate embedding for a customer profile.
 */
export async function generateCustomerEmbedding(customer: {
  name: string;
  favoriteDrink: string;
  interestTags: string[];
}): Promise<number[]> {
  const text = buildCustomerEmbeddingText(customer);
  return generateEmbedding(text);
}
