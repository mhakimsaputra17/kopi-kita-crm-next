import { NextRequest } from "next/server";
import { requireSession } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { AI_MODEL, FALLBACK_MODELS, VALID_MODEL_IDS } from "@/lib/ai";
import { db } from "@/lib/db";
import { redis } from "@/lib/redis";
import { streamAgent } from "@/lib/langchain/agent";

// ─── System prompt cache via Upstash Redis (survives cold starts) ───
const CACHE_KEY = "kopi:system-prompt";
const CACHE_TTL_S = 60;

async function getSystemPrompt(): Promise<string> {
  const cached = await redis.get<string>(CACHE_KEY);
  if (cached) return cached;

  const text = await buildSystemPrompt();
  await redis.set(CACHE_KEY, text, { ex: CACHE_TTL_S });
  return text;
}

async function buildSystemPrompt(): Promise<string> {
  const totalCustomers = await db.customer.count();

  return `Kamu adalah **Kopi AI**, asisten cerdas untuk kedai kopi "Kopi Kita" milik Mimi.
Hari ini: ${new Date().toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}

## Peranmu
- Bantu Mimi menganalisis data pelanggan, membuat ide promo, dan menjawab pertanyaan bisnis.
- Selalu balas dalam **Bahasa Indonesia** dengan nada ramah, hangat, dan profesional.
- SELALU berikan respons yang lengkap dan substantif. Jangan pernah mengirim respons kosong.
- Jika pengguna meng-konfirmasi atau mengatakan "ya"/"oke"/"lanjut", langsung eksekusi tanpa bertanya ulang.

## Tools Tersedia (WAJIB DIPAKAI)
Kamu memiliki akses ke 11 tools. WAJIB panggil tools — JANGAN menjawab sendiri tanpa data:

### Data & Analisis
1. **get_customer_stats** — Statistik ringkas: total pelanggan, tag populer, minuman favorit, pelanggan baru.
2. **search_customers** — Cari/daftar pelanggan berdasarkan keyword. Tanpa query = semua. Query 'baru' = 7 hari.
3. **semantic_search_customers** — Pencarian semantik/natural: "yang suka minuman manis dingin". Lebih pintar dari keyword.
4. **analyze_segments** — Analisis mendalam satu segmen/tag.
5. **get_customer_growth** — Timeline pertumbuhan pelanggan per hari/minggu.
6. **find_top_customers** — Ranking pelanggan paling engaged/loyal.
7. **compare_segments** — Bandingkan 2 segmen.
8. **get_drink_analysis** — Ranking minuman populer.

### Promo & Kampanye
9. **generate_promo** — Buat 2-3 kampanye promo baru, simpan ke database.
10. **get_promo_history** — Riwayat semua promo yang pernah dibuat.
11. **suggest_new_promo** — Cari segmen yang BELUM pernah dipromo.

**ATURAN PENTING:**
- Kamu TIDAK memiliki data pelanggan di memorimu. Semua data harus diambil lewat tools.
- Jika ragu apakah perlu panggil tool, PANGGIL saja. Lebih baik panggil tool daripada menjawab tanpa data.
- Untuk pencarian natural/deskriptif (misal: "cari pelanggan yg suka kopi manis"), gunakan **semantic_search_customers**.
- Untuk pencarian exact (misal: cari nama "Rina"), gunakan **search_customers**.
- Saat user minta promo, LANGSUNG panggil generate_promo tanpa bertanya lagi.
- JANGAN pernah menulis "saya akan panggil tool". Langsung panggil toolnya.
- JANGAN menghasilkan teks apapun sebelum memanggil tool. Panggil tool DULU, baru balas setelah dapat hasilnya.

## Konteks Ringkas
Kedai: "Kopi Kita" milik Mimi, total pelanggan: ${totalCustomers} orang.

## Aturan Formatting (PENTING)
- Gunakan **markdown** dengan baik: heading ##/###, **bold**, *italic*, list, tabel, blockquote.
- Untuk daftar pelanggan ≥ 3 orang, gunakan **tabel markdown**.
- Untuk angka penting, gunakan **bold**.
- Untuk pesan WhatsApp, bungkus dalam **blockquote** (> ).
- Buat paragraf pendek. Jangan menumpuk teks panjang.

## Format Presentasi Promo
Setelah menerima hasil dari generate_promo, tampilkan SEMUA kampanye:

### 🎯 [theme] (Campaign 1/2/3)
**Target segmen:** [segment] — [customerCount] pelanggan
**Periode:** [timeWindow]
#### Alasan "Why Now"
- [dari data whyNow]
#### 📱 Pesan WhatsApp Siap Kirim
> [dari data message]
---

PENTING: Tampilkan SEMUA campaign. Di akhir, beri ringkasan total jangkauan.

## Aturan Data
- Jangan mengarang data. SELALU panggil tools.
- WAJIB selalu memberikan jawaban. Tidak boleh mengirim respons kosong.`;
}

// ─── Input sanitization (prompt injection defense) ───
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /forget\s+(your\s+)?(previous\s+)?prompt/i,
  /you\s+are\s+now\s+a/i,
  /system\s*prompt\s*:/i,
  /\[INST\]|\[\/INST\]/i,
  /<\|im_start\|>|<\|im_end\|>/i,
];

function sanitizeMessage(content: string): string {
  let safe = content;
  for (const pattern of INJECTION_PATTERNS) {
    safe = safe.replace(pattern, "");
  }
  return safe.trim();
}

// ─── Conversation history trimming ───
const MAX_HISTORY_MESSAGES = 20;

function trimHistory(
  messages: { role: string; content: string }[],
): { role: string; content: string }[] {
  if (messages.length <= MAX_HISTORY_MESSAGES) return messages;
  return messages.slice(-MAX_HISTORY_MESSAGES);
}

export async function POST(request: NextRequest) {
  // Auth check
  let session;
  try {
    session = await requireSession();
  } catch {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Rate limiting
  const limit = await rateLimit(`chat:${session.user.id}`, "chat");
  if (!limit.success) {
    return new Response(
      JSON.stringify({ error: "Terlalu banyak pesan. Coba lagi nanti." }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(limit.retryAfter),
        },
      },
    );
  }

  // Parse & validate request body
  let messages: { role: string; content: string }[];
  let conversationId: string | undefined;
  let requestedModel: string | undefined;
  try {
    const body = await request.json();
    messages = body?.messages;
    conversationId = body?.conversationId;
    requestedModel = body?.model;
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Messages array is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }
    if (requestedModel && !VALID_MODEL_IDS.has(requestedModel)) {
      return new Response(
        JSON.stringify({ error: "Invalid model" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Validate last message
  const lastMsg = messages[messages.length - 1];
  if (lastMsg?.role !== "user" || !lastMsg.content?.trim()) {
    return new Response(JSON.stringify({ error: "Message is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Input length guard
  if (lastMsg.content.length > 2000) {
    return new Response(
      JSON.stringify({ error: "Pesan terlalu panjang (maks 2000 karakter)" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  try {
    const systemPrompt = await getSystemPrompt();

    const sanitizedMessages = trimHistory(
      messages.map((m) => ({
        role: m.role,
        content: m.role === "user" ? sanitizeMessage(m.content) : m.content,
      })),
    );

    // Determine model with fallback chain
    const primaryModel = requestedModel || AI_MODEL;
    const models = [
      primaryModel,
      ...[AI_MODEL, ...FALLBACK_MODELS].filter((m) => m !== primaryModel),
    ];

    const encoder = new TextEncoder();
    const userContent = lastMsg.content;
    const userId = session.user.id;

    const readable = new ReadableStream({
      async start(controller) {
        const safeEnqueue = (chunk: Uint8Array) => {
          try { controller.enqueue(chunk); } catch { /* closed */ }
        };
        const safeClose = () => {
          try { controller.close(); } catch { /* closed */ }
        };
        const send = (data: Record<string, unknown>) => {
          safeEnqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };
        const sendDone = () => {
          safeEnqueue(encoder.encode("data: [DONE]\n\n"));
          safeClose();
        };

        let fullResponse = "";
        let hasContent = false;
        let succeeded = false;

        // Try models in order until one works
        for (const model of models) {
          try {
            const agentStream = streamAgent(model, systemPrompt, sanitizedMessages);

            for await (const event of agentStream) {
              switch (event.type) {
                case "text":
                  hasContent = true;
                  fullResponse += event.content;
                  send({ content: event.content });
                  break;
                case "tool_start":
                  send({ tool: { name: event.name, status: "executing" } });
                  break;
                case "tool_end":
                  send({ tool: { name: event.name, status: "done" } });
                  break;
                case "error":
                  throw new Error(event.message);
              }
            }

            succeeded = true;
            break; // Model worked, stop trying
          } catch (err) {
            const status = (err as { status?: number }).status;
            if (status && [401, 403, 404, 413, 422, 429, 500, 502, 503].includes(status)) {
              console.warn(`[Chat API] Model ${model} hit ${status} — trying next`);
              fullResponse = "";
              hasContent = false;
              continue;
            }
            // For non-retryable errors on first model, try next
            console.warn(`[Chat API] Model ${model} error: ${err instanceof Error ? err.message : err}`);
            fullResponse = "";
            hasContent = false;
            continue;
          }
        }

        if (!succeeded || !hasContent) {
          fullResponse = "Maaf, saya tidak bisa memproses permintaan ini. Coba ulangi pertanyaanmu ya! 🙏";
          send({ content: fullResponse });
        }

        // Persist messages to DB
        saveMessages(userId, conversationId, userContent, fullResponse)
          .then((convoId) => {
            if (!conversationId && convoId) {
              send({ conversationId: convoId });
            }
            sendDone();
          })
          .catch((err) => {
            console.error("[Chat Persist Error]", err);
            sendDone();
          });
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    console.error("[Chat API Error]", err);

    const message = err instanceof Error ? err.message : "AI service unavailable";
    return new Response(
      JSON.stringify({ error: `AI Error: ${message}` }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }
}

// ─── Persist messages to DB ───
async function saveMessages(
  userId: string,
  conversationId: string | undefined,
  userContent: string,
  assistantContent: string,
) {
  if (!conversationId) {
    const convo = await db.chatConversation.create({
      data: {
        userId,
        title: userContent.slice(0, 80) || "Chat Baru",
        messages: {
          createMany: {
            data: [
              { role: "user", content: userContent },
              { role: "assistant", content: assistantContent },
            ],
          },
        },
      },
    });
    return convo.id;
  }

  await db.chatMessage.createMany({
    data: [
      { conversationId, role: "user", content: userContent },
      { conversationId, role: "assistant", content: assistantContent },
    ],
  });

  await db.chatConversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });

  return conversationId;
}
