import { NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { clients, geminiClient, groqClient, getModelEndpoint } from "@/lib/ai";
import { db } from "@/lib/db";
import { buildPromoPrompt } from "@/lib/prompts";
import { promoOutputSchema } from "@/schemas/promo";
import OpenAI from "openai";

// Free providers first (per requirements: "Google AI Studio, Groq"),
// then GitHub Models as fallback. Ordered by: free+fast → free+quality → github.
const PROMO_MODELS = [
  "gemini-2.5-flash-lite",           // Google — free, fast, no thinking overhead
  "llama-3.3-70b-versatile",         // Groq — free, super fast (~1-3s)
  "gemini-2.5-flash",                // Google — free, thinking model (quality)
  "deepseek/DeepSeek-V3-0324",       // GitHub — strong reasoning + structured output
  "mistral-ai/mistral-medium-2505",  // GitHub — balanced quality
  "xai/grok-3-mini",                 // GitHub — fast xAI
  "openai/gpt-4.1-mini",             // GitHub — balanced OpenAI
  "meta/Llama-4-Maverick-17B-128E-Instruct-FP8", // GitHub — newest Meta
  "openai/gpt-5-mini",               // GitHub — flagship
  "llama-3.1-8b-instant",            // Groq — free ultra-fast last resort
  "openai/gpt-4.1-nano",             // GitHub — final fallback
];

const RETRYABLE_STATUSES = [400, 401, 403, 404, 429, 500, 502, 503];

/**
 * Robustly extract JSON from AI response that may contain thinking tokens,
 * markdown fences, or extra text around the JSON object.
 */
function parseAIJson(raw: string): unknown | null {
  // Step 1: Clean known wrappers
  let cleaned = raw
    .replace(/<think>[\s\S]*?<\/think>/g, "")      // thinking blocks
    .replace(/```(?:json)?\s*\n?/g, "")            // opening code fences
    .replace(/\n?```\s*/g, "")                      // closing code fences
    .trim();

  // Step 2: Try direct parse
  try {
    return JSON.parse(cleaned);
  } catch { /* continue to fallback */ }

  // Step 3: Brace-balanced extraction — find the outermost { ... }
  // This handles trailing text, thinking output, or preamble text
  const startIdx = cleaned.indexOf("{");
  if (startIdx === -1) return null;

  let depth = 0;
  let inString = false;
  let escape = false;
  let endIdx = -1;

  for (let i = startIdx; i < cleaned.length; i++) {
    const ch = cleaned[i];

    if (escape) {
      escape = false;
      continue;
    }
    if (ch === "\\") {
      if (inString) escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        endIdx = i;
        break;
      }
    }
  }

  if (endIdx === -1) return null;

  try {
    return JSON.parse(cleaned.slice(startIdx, endIdx + 1));
  } catch (e) {
    console.error("[Promo API] Brace-balanced extraction failed:", e);
    return null;
  }
}

const SYSTEM_MESSAGE = `Kamu adalah AI marketing assistant untuk kedai kopi "Kopi Kita".
Selalu respond dengan valid JSON sesuai format berikut:
{
  "campaigns": [
    {
      "theme": "nama tema promo",
      "segment": "deskripsi segmen target",
      "customerCount": jumlah_pelanggan_dalam_segmen,
      "whyNow": "alasan singkat kenapa tema ini relevan sekarang berdasarkan data",
      "message": "pesan promo 1-2 kalimat, friendly, bilingual ID/EN, ada CTA jelas, siap copy-paste ke WhatsApp",
      "timeWindow": "waktu terbaik untuk promo ini (contoh: Morning rush 7-10 AM)"
    }
  ]
}
Berikan 2-3 campaigns. Pastikan JSON valid tanpa teks tambahan di luar JSON.`;

export async function POST() {
  // ─── Auth ───
  let session;
  try {
    session = await requireSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ─── Rate limit: 5 requests per 10 minutes ───
  const limit = await rateLimit(`promo:${session.user.id}`, "promo");
  if (!limit.success) {
    return NextResponse.json(
      { error: "Terlalu banyak request. Coba lagi nanti." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  try {
    // ─── 1. Fetch customer data ───
    const customers = await db.customer.findMany({
      select: { interestTags: true, favoriteDrink: true },
    });

    const tagCounts: Record<string, number> = {};
    const drinkCounts: Record<string, number> = {};
    for (const c of customers) {
      for (const tag of c.interestTags) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }
      const drink = c.favoriteDrink.toLowerCase().trim();
      drinkCounts[drink] = (drinkCounts[drink] || 0) + 1;
    }

    const inputData = {
      totalCustomers: customers.length,
      tagCounts,
      topDrinks: drinkCounts,
    };

    // ─── 2. Build prompt ───
    const userPrompt = buildPromoPrompt(inputData);

    // ─── 3. Call AI with multi-provider fallback chain ───
    // Gemini 2.5 Flash is a thinking model — thinking tokens count towards
    // max_completion_tokens. We need a high limit (16384) so the actual JSON
    // output (~800 tokens) isn't truncated after thinking uses ~1500+ tokens.
    // GitHub Models (non-thinking) can use a lower limit.
    let rawContent: string | null = null;
    let usedModel: string | null = null;

    outer: for (const model of PROMO_MODELS) {
      const endpoint = getModelEndpoint(model);
      const isThinkingModel = model.includes("2.5-flash") && !model.includes("lite");
      const maxTokens = isThinkingModel ? 16384 : 4096;

      if (endpoint === "groq") {
        if (!groqClient) continue;
        try {
          const response = await groqClient.chat.completions.create({
            model,
            messages: [
              { role: "system", content: SYSTEM_MESSAGE },
              { role: "user", content: userPrompt },
            ],
            response_format: { type: "json_object" },
            max_completion_tokens: maxTokens,
          });
          const content = response.choices[0]?.message?.content ?? null;
          const finishReason = response.choices[0]?.finish_reason;

          if (finishReason === "length" || !content) {
            console.warn(`[Promo API] Groq model ${model} truncated (finish_reason: ${finishReason}) — trying next`);
            continue;
          }

          rawContent = content;
          usedModel = model;
          break outer;
        } catch (err) {
          if (
            err instanceof OpenAI.APIError &&
            RETRYABLE_STATUSES.includes(err.status)
          ) {
            console.warn(
              `[Promo API] Groq model ${model} hit ${err.status} — trying next`,
            );
            continue;
          }
          throw err;
        }
      } else if (endpoint === "gemini") {
        if (!geminiClient) continue;
        try {
          const response = await geminiClient.chat.completions.create({
            model,
            messages: [
              { role: "system", content: SYSTEM_MESSAGE },
              { role: "user", content: userPrompt },
            ],
            response_format: { type: "json_object" },
            max_completion_tokens: maxTokens,
          });
          const content = response.choices[0]?.message?.content ?? null;
          const finishReason = response.choices[0]?.finish_reason;

          // Detect truncation: if finish_reason is "length", output was cut off
          if (finishReason === "length" || !content) {
            console.warn(`[Promo API] Model ${model} truncated (finish_reason: ${finishReason}) — trying next`);
            continue;
          }

          rawContent = content;
          usedModel = model;
          break outer;
        } catch (err) {
          if (
            err instanceof OpenAI.APIError &&
            RETRYABLE_STATUSES.includes(err.status)
          ) {
            console.warn(
              `[Promo API] Gemini model ${model} hit ${err.status} — trying next`,
            );
            continue;
          }
          throw err;
        }
      } else {
        // GitHub Models: rotate through token pool
        for (let t = 0; t < clients.length; t++) {
          try {
            const response = await clients[t].chat.completions.create({
              model,
              messages: [
                { role: "system", content: SYSTEM_MESSAGE },
                { role: "user", content: userPrompt },
              ],
              response_format: { type: "json_object" },
              max_completion_tokens: maxTokens,
            });
            const content = response.choices[0]?.message?.content ?? null;
            const finishReason = response.choices[0]?.finish_reason;

            if (finishReason === "length" || !content) {
              console.warn(`[Promo API] Token #${t + 1} + model ${model} truncated — trying next`);
              continue;
            }

            rawContent = content;
            usedModel = model;
            break outer;
          } catch (err) {
            if (
              err instanceof OpenAI.APIError &&
              RETRYABLE_STATUSES.includes(err.status)
            ) {
              console.warn(
                `[Promo API] Token #${t + 1} + model ${model} hit ${err.status} — trying next`,
              );
              continue;
            }
            throw err;
          }
        }
      }
    }

    if (!rawContent || !usedModel) {
      return NextResponse.json(
        { error: "Semua model AI sedang sibuk, coba lagi nanti ☕" },
        { status: 503 },
      );
    }

    console.info(`[Promo API] Generated with model: ${usedModel}`);

    // ─── 4. Parse JSON + Zod validation ───
    // Gemini 2.5 Flash is a thinking model that may include thinking tokens,
    // markdown fences, or trailing text around the JSON output.
    // Strategy: try direct parse first, then progressively more aggressive extraction.
    const parsed = parseAIJson(rawContent);

    if (!parsed) {
      console.error("[Promo API] Failed to parse AI output. Raw content:", rawContent);
      return NextResponse.json(
        { error: "AI menghasilkan format yang tidak valid. Coba generate ulang." },
        { status: 502 },
      );
    }

    const result = promoOutputSchema.safeParse(parsed);

    if (!result.success) {
      console.error("[Promo API] Zod validation failed:", result.error.issues);
      console.error("[Promo API] Parsed object:", JSON.stringify(parsed).slice(0, 500));
      return NextResponse.json(
        { error: "AI menghasilkan format yang tidak sesuai. Coba generate ulang." },
        { status: 502 },
      );
    }

    // ─── 5. Save to DB (PromoBatch + PromoCampaigns) ───
    await db.promoBatch.create({
      data: {
        campaigns: {
          create: result.data.campaigns.map((c) => ({
            theme: c.theme,
            segment: c.segment,
            customerCount: c.customerCount,
            whyNow: c.whyNow,
            message: c.message,
            timeWindow: c.timeWindow ?? null,
          })),
        },
      },
    });

    // ─── 6. Return campaigns + metadata ───
    const topTags = Object.entries(tagCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([tag, count]) => ({ tag, count }));

    return NextResponse.json({
      campaigns: result.data.campaigns,
      meta: {
        totalCustomers: inputData.totalCustomers,
        topTags,
        model: usedModel,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error("[Promo API] Error:", err);
    return NextResponse.json(
      { error: "Gagal generate promo. Coba lagi nanti." },
      { status: 500 },
    );
  }
}

// ─── GET: Fetch latest saved campaigns from DB (load from DB on page open) ───
export async function GET() {
  try {
    await requireSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get the most recent batch
    const latestBatch = await db.promoBatch.findFirst({
      include: { campaigns: true },
      orderBy: { createdAt: "desc" },
    });

    if (!latestBatch || latestBatch.campaigns.length === 0) {
      return NextResponse.json({ campaigns: [], meta: null });
    }

    // Get top tags for metadata
    const customers = await db.customer.findMany({
      select: { interestTags: true },
    });

    const tagCounts: Record<string, number> = {};
    for (const c of customers) {
      for (const tag of c.interestTags) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }
    }

    const topTags = Object.entries(tagCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([tag, count]) => ({ tag, count }));

    return NextResponse.json({
      campaigns: latestBatch.campaigns.map((c) => ({
        theme: c.theme,
        segment: c.segment,
        customerCount: c.customerCount,
        whyNow: c.whyNow,
        message: c.message,
        timeWindow: c.timeWindow,
      })),
      meta: {
        totalCustomers: customers.length,
        topTags,
        model: "saved",
        generatedAt: latestBatch.createdAt.toISOString(),
      },
    });
  } catch (err) {
    console.error("[Promo API] GET Error:", err);
    return NextResponse.json(
      { error: "Gagal memuat promo." },
      { status: 500 },
    );
  }
}
