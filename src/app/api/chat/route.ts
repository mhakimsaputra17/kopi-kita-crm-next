import { NextRequest } from "next/server";
import { requireSession } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { openai, AI_MODEL } from "@/lib/ai";
import { db } from "@/lib/db";
import { redis } from "@/lib/redis";

// ─── System prompt cache via Upstash Redis (survives cold starts) ───
const CACHE_KEY = "kopi:system-prompt";
const CACHE_TTL_S = 60; // 60 seconds

async function getSystemPrompt(): Promise<string> {
  const cached = await redis.get<string>(CACHE_KEY);
  if (cached) return cached;

  const text = await buildSystemPrompt();
  await redis.set(CACHE_KEY, text, { ex: CACHE_TTL_S });
  return text;
}

// ─── Optimization 2: Compact context builder ───
async function buildSystemPrompt(): Promise<string> {
  const customers = await db.customer.findMany({
    select: {
      name: true,
      favoriteDrink: true,
      interestTags: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const totalCustomers = customers.length;

  // Aggregate stats (summary instead of raw list = fewer tokens)
  const tagCounts: Record<string, number> = {};
  const drinkCounts: Record<string, number> = {};
  for (const c of customers) {
    for (const tag of c.interestTags) {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    }
    drinkCounts[c.favoriteDrink] = (drinkCounts[c.favoriteDrink] || 0) + 1;
  }

  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([tag, count]) => `${tag}(${count})`)
    .join(", ");

  const topDrinks = Object.entries(drinkCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([drink, count]) => `${drink}(${count})`)
    .join(", ");

  // New customers (7 days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const newCustomers = customers.filter((c) => c.createdAt >= sevenDaysAgo);

  // Compact customer list — name:drink:tags (minimal tokens)
  const customerList = customers
    .map(
      (c) =>
        `${c.name}|${c.favoriteDrink}|${c.interestTags.join(",")}|${c.createdAt.toISOString().slice(0, 10)}`,
    )
    .join("\n");

  return `Kamu adalah **Kopi AI**, asisten cerdas untuk kedai kopi "Kopi Kita" milik Mimi.
Hari ini: ${new Date().toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}

## Peranmu
- Bantu Mimi menganalisis data pelanggan, membuat ide promo, dan menjawab pertanyaan bisnis.
- Selalu balas dalam **Bahasa Indonesia** dengan nada ramah, hangat, dan profesional.
- Gunakan markdown untuk formatting (bold, list, heading) agar rapi.
- SELALU berikan respons yang lengkap dan substantif. Jangan pernah mengirim respons kosong.
- Jika pengguna meng-konfirmasi atau mengatakan "ya"/"oke"/"lanjut", langsung eksekusi tanpa bertanya ulang.

## Cara Membuat Promo
Jika diminta membuat promo, LANGSUNG buat dengan format ini:
### 🎯 [Nama Promo]
**Tema:** ...
**Target segmen:** [nama segmen] — [jumlah] pelanggan
**Pelanggan target:**
- [daftar nama + minuman favorit]
**Alasan "why now":** ...
**Diskon/Penawaran:** ...

**📱 Pesan WhatsApp siap kirim:**
> [pesan yang bisa langsung di-copy paste ke WhatsApp]

## Data Pelanggan (total: ${totalCustomers})
Tags populer: ${topTags}
Minuman favorit: ${topDrinks}
Pelanggan baru (7 hari): ${newCustomers.length} orang${newCustomers.length > 0 ? "\n" + newCustomers.map((c) => `- ${c.name}: ${c.favoriteDrink} [${c.interestTags.join(",")}]`).join("\n") : ""}

Format data: nama|minuman|tags|tanggal_bergabung
${customerList}

## Aturan
- Jangan mengarang data. Hanya gunakan data pelanggan di atas.
- Jika tidak tahu, katakan jujur.
- Untuk promo, hitung jumlah target dari data real.
- Jangan share kontak pelanggan kecuali Mimi minta spesifik.
- WAJIB selalu memberikan jawaban. Tidak boleh mengirim respons kosong.`;
}


// ─── Optimization 3: Input sanitization (prompt injection defense) ───
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

// ─── Optimization 4: Conversation history trimming ───
const MAX_HISTORY_MESSAGES = 20; // keep last 20 messages max

function trimHistory(
  messages: { role: string; content: string }[],
): { role: string; content: string }[] {
  if (messages.length <= MAX_HISTORY_MESSAGES) return messages;
  // Always keep the most recent messages
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

  // PRD §9.3: 20 messages per 10 minutes (Upstash sliding window)
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
  try {
    const body = await request.json();
    messages = body?.messages;
    conversationId = body?.conversationId;
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Messages array is required" }),
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

  // Input length guard (prevent token bombing)
  if (lastMsg.content.length > 2000) {
    return new Response(
      JSON.stringify({ error: "Pesan terlalu panjang (maks 2000 karakter)" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  try {
    // Build system prompt (cached)
    const systemPrompt = await getSystemPrompt();

    // Sanitize + trim history
    const sanitizedMessages = trimHistory(
      messages.map((m) => ({
        role: m.role,
        content: m.role === "user" ? sanitizeMessage(m.content) : m.content,
      })),
    );

    // Stream response from GitHub Models
    const stream = await openai.chat.completions.create({
      model: AI_MODEL,
      stream: true,
      messages: [
        { role: "system" as const, content: systemPrompt },
        ...sanitizedMessages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ],
      max_completion_tokens: 2048,
    });

    // Return Server-Sent Events stream
    const encoder = new TextEncoder();
    const userContent = lastMsg.content;
    const userId = session.user.id;

    const readable = new ReadableStream({
      async start(controller) {
        let hasContent = false;
        let fullResponse = "";
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              hasContent = true;
              fullResponse += content;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ content })}\n\n`),
              );
            }
          }
          // Fallback if model returned empty stream
          if (!hasContent) {
            fullResponse = "Maaf, saya tidak bisa memproses permintaan ini. Coba ulangi pertanyaanmu ya! 🙏";
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ content: fullResponse })}\n\n`,
              ),
            );
          }

          // ─── Persist to DB (fire-and-forget, don't block stream) ───
          saveMessages(userId, conversationId, userContent, fullResponse)
            .then((convoId) => {
              // Send conversationId so frontend can track it
              if (!conversationId && convoId) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ conversationId: convoId })}\n\n`),
                );
              }
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              controller.close();
            })
            .catch((err) => {
              console.error("[Chat Persist Error]", err);
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              controller.close();
            });
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Stream error";
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: message })}\n\n`,
            ),
          );
          controller.close();
        }
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
    const message =
      err instanceof Error ? err.message : "AI service unavailable";
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
  // Create conversation if not provided
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
    // Note: conversationId will be sent back via a header or the frontend
    // will pick it up from the conversation list
    return convo.id;
  }

  // Append to existing conversation
  await db.chatMessage.createMany({
    data: [
      { conversationId, role: "user", content: userContent },
      { conversationId, role: "assistant", content: assistantContent },
    ],
  });

  // Update conversation timestamp
  await db.chatConversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });

  return conversationId;
}
