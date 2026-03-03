import { NextRequest } from "next/server";
import { requireSession } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { clients, geminiClient, groqClient, getModelEndpoint, AI_MODEL, FALLBACK_MODELS, VALID_MODEL_IDS } from "@/lib/ai";
import { db } from "@/lib/db";
import { redis } from "@/lib/redis";
import OpenAI from "openai";
import type { ChatCompletionTool, ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { buildPromoPrompt } from "@/lib/prompts";
import { promoOutputSchema } from "@/schemas/promo";

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

// ─── Optimization 2: Lightweight context builder (data via tools) ───
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
Kamu memiliki akses ke 10 tools. WAJIB panggil tools — JANGAN menjawab sendiri tanpa data:

### Data & Analisis
1. **get_customer_stats** — Statistik ringkas: total pelanggan, tag populer, minuman favorit, pelanggan baru.
   → Panggil saat: berapa pelanggan, tren, statistik, overview, ringkasan, dashboard.
2. **search_customers** — Cari/daftar pelanggan. Tanpa query = semua. Query 'baru' = baru 7 hari.
   → Panggil saat: siapa pelanggan, cari nama, daftar semua, pelanggan baru.
3. **analyze_segments** — Analisis mendalam satu segmen/tag: jumlah, top drinks, related tags, member terbaru.
   → Panggil saat: analisis segmen X, detail tag X, breakdown pelanggan X.
4. **get_customer_growth** — Timeline pertumbuhan pelanggan per hari/minggu.
   → Panggil saat: pertumbuhan, growth, tren pelanggan baru, kapan paling banyak.
5. **find_top_customers** — Ranking pelanggan paling engaged/loyal berdasarkan skor.
   → Panggil saat: pelanggan terbaik, paling loyal, paling aktif, top customers.
6. **compare_segments** — Bandingkan 2 segmen: jumlah, drinks, overlap.
   → Panggil saat: bandingkan X vs Y, mana lebih besar, perbedaan segmen.
7. **get_drink_analysis** — Ranking minuman populer dengan tags dan customer per drink.
   → Panggil saat: minuman terlaris, menu populer, analisis minuman.

### Promo & Kampanye
8. **generate_promo** — Buat 2-3 kampanye promo baru, simpan ke database.
   → Panggil saat: buat promo, generate promo, ide kampanye.
9. **get_promo_history** — Riwayat semua promo yang pernah dibuat.
   → Panggil saat: promo sebelumnya, riwayat kampanye, history promo.
10. **suggest_new_promo** — Cari segmen yang BELUM pernah dipromo.
    → Panggil saat: saran promo, peluang baru, segmen belum ditarget.

**ATURAN PENTING:**
- Kamu TIDAK memiliki data pelanggan di memorimu. Semua data harus diambil lewat tools.
- Jika ragu apakah perlu panggil tool, PANGGIL saja. Lebih baik panggil tool daripada menjawab tanpa data.
- Saat user minta promo, LANGSUNG panggil generate_promo tanpa bertanya lagi.
- JANGAN pernah menulis "saya akan panggil tool" atau "sedang mengambil data". Langsung panggil toolnya, jangan deskripsikan.
- JANGAN menghasilkan teks apapun sebelum memanggil tool. Panggil tool DULU, baru balas setelah dapat hasilnya.

## Konteks Ringkas
Kedai: "Kopi Kita" milik Mimi, total pelanggan: ${totalCustomers} orang.

## Aturan Formatting (PENTING)
- Gunakan **markdown** dengan baik: heading ##/###, **bold**, *italic*, list (- atau 1.), tabel, blockquote (>).
- Gunakan heading (## atau ###) untuk setiap bagian/seksi utama.
- Gunakan **---** (horizontal rule) untuk memisahkan seksi besar agar rapi.
- Untuk daftar pelanggan, gunakan **tabel markdown** jika ≥ 3 orang:
  | Nama | Minuman Favorit | Tags |
  |------|----------------|------|
- Untuk angka penting, gunakan **bold** agar menonjol.
- Untuk pesan WhatsApp, selalu bungkus dalam **blockquote** (> ) agar terlihat seperti preview pesan.
- Jangan gunakan emoji berlebihan. Boleh 1-2 emoji di heading saja.
- Buat paragraf pendek. Jangan menumpuk teks panjang tanpa pemisahan.

## Format Presentasi Promo (setelah tool generate_promo memberikan data)
Setelah menerima hasil dari generate_promo, tampilkan SEMUA kampanye (biasanya 2-3). Ulangi format ini untuk SETIAP campaign:

### 🎯 [theme] (Campaign 1/2/3)

**Target segmen:** [segment] — [customerCount] pelanggan
**Periode:** [timeWindow]

#### Alasan "Why Now"
- [dari data whyNow]

#### 📱 Pesan WhatsApp Siap Kirim

> [dari data message — copy-paste siap]

---

PENTING: Tampilkan SEMUA campaign, jangan hanya satu. Di akhir, beri ringkasan total jangkauan.

## Aturan Data
- Jangan mengarang data. SELALU panggil tools untuk mendapat data real.
- Jika tidak tahu, panggil tool yang relevan. Jangan langsung bilang tidak bisa.
- Data pelanggan (nama, minuman favorit, tags, tanggal bergabung) BOLEH ditampilkan — itu data bisnis Mimi.
- Jika data sudah ada di percakapan sebelumnya, boleh langsung gunakan tanpa panggil tool lagi.
- Jika user tanya tentang pelanggan tertentu, panggil search_customers untuk cari datanya.
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

// ─── Tool Definitions for Function Calling ───
const CHAT_TOOLS: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "generate_promo",
      description:
        "Generate 2-3 AI-powered promo campaign ideas based on customer data. Saves to database. Call this when user explicitly asks to create/generate promo ideas or campaigns.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_customers",
      description:
        "Search and list customers. Use when user asks about customers: list all, find by name/tag/drink, or get new customers. Pass empty query or omit to list ALL customers. Pass 'baru' to get new customers this week.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "Search term: customer name, interest tag, drink name, or 'baru' for new customers this week. Leave empty to list ALL customers.",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_customer_stats",
      description:
        "Get aggregated statistics: total customers, top interest tags with counts, top drinks with counts, new customers this week. Call when user asks for trends, stats, overview, or dashboard data.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "analyze_segments",
      description:
        "Deep analysis of a specific customer segment/tag. Returns: member count, top drinks in segment, newest members, percentage of total. Call when user asks to analyze a segment, tag group, or customer category.",
      parameters: {
        type: "object",
        properties: {
          tag: {
            type: "string",
            description:
              "The interest tag to analyze, e.g. 'oat milk', 'sweet drinks', 'caramel', 'morning coffee'. Must match existing tags.",
          },
        },
        required: ["tag"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_customer_growth",
      description:
        "Customer growth timeline: new customers per day/week with cumulative totals. Call when user asks about growth, pertumbuhan, tren pelanggan baru, or customer acquisition over time.",
      parameters: {
        type: "object",
        properties: {
          period: {
            type: "string",
            enum: ["daily", "weekly"],
            description: "Group by day or week. Default: daily.",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_promo_history",
      description:
        "Get history of all promo campaigns ever generated, grouped by batch. Returns theme, segment, customerCount, date. Call when user asks: promo apa saja yang sudah dibuat, riwayat promo, history kampanye.",
      parameters: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "Number of recent batches to return. Default: 5.",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "find_top_customers",
      description:
        "Find most engaged/loyal customers ranked by engagement score (based on number of interest tags and membership duration). Call when user asks: pelanggan paling loyal, pelanggan paling aktif, top customers, pelanggan terbaik.",
      parameters: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "Number of top customers to return. Default: 10.",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "compare_segments",
      description:
        "Compare two customer segments side-by-side: member counts, top drinks, overlap, unique traits. Call when user asks to compare/bandingkan two tags or segments.",
      parameters: {
        type: "object",
        properties: {
          tag_a: {
            type: "string",
            description: "First segment tag to compare, e.g. 'sweet drinks'.",
          },
          tag_b: {
            type: "string",
            description: "Second segment tag to compare, e.g. 'black coffee'.",
          },
        },
        required: ["tag_a", "tag_b"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_drink_analysis",
      description:
        "Analyze drink popularity: ranking, customer count per drink, associated tags for each drink. Call when user asks: minuman paling populer, analisis minuman, drink ranking, menu terlaris.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "suggest_new_promo",
      description:
        "Suggest which customer segments have NOT been targeted by recent promos. Identifies untapped opportunities. Call when user asks: segmen mana yang belum dipromo, saran promo baru, peluang promo, untapped segments.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
];

// ─── Tool Execution ───
async function executeTool(
  name: string,
  args: Record<string, unknown>,
): Promise<string> {
  switch (name) {
    case "generate_promo":
      return await executeGeneratePromo();
    case "search_customers":
      return await executeSearchCustomers(String(args.query ?? ""));
    case "get_customer_stats":
      return await executeGetCustomerStats();
    case "analyze_segments":
      return await executeAnalyzeSegments(String(args.tag ?? ""));
    case "get_customer_growth":
      return await executeGetCustomerGrowth(String(args.period ?? "daily"));
    case "get_promo_history":
      return await executeGetPromoHistory(Number(args.limit ?? 5));
    case "find_top_customers":
      return await executeFindTopCustomers(Number(args.limit ?? 10));
    case "compare_segments":
      return await executeCompareSegments(String(args.tag_a ?? ""), String(args.tag_b ?? ""));
    case "get_drink_analysis":
      return await executeGetDrinkAnalysis();
    case "suggest_new_promo":
      return await executeSuggestNewPromo();
    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}

async function executeGeneratePromo(): Promise<string> {
  const customers = await db.customer.findMany({
    select: { name: true, favoriteDrink: true, interestTags: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  const tagCounts: Record<string, number> = {};
  const drinkCounts: Record<string, number> = {};
  for (const c of customers) {
    for (const tag of c.interestTags) tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    const drink = c.favoriteDrink.toLowerCase().trim();
    drinkCounts[drink] = (drinkCounts[drink] || 0) + 1;
  }

  const prompt = buildPromoPrompt({ totalCustomers: customers.length, tagCounts, topDrinks: drinkCounts });

  // Use a fast model to generate promo
  const promoModels = ["gemini-2.5-flash-lite", "llama-3.3-70b-versatile", "openai/gpt-4.1-mini"];
  let result: string | null = null;

  const errors: string[] = [];

  for (const model of promoModels) {
    const endpoint = getModelEndpoint(model);
    const client =
      endpoint === "gemini" ? geminiClient :
      endpoint === "groq" ? groqClient :
      clients[0];
    if (!client) {
      const reason = `[Chat Tool] generate_promo: No client for ${model} (endpoint=${endpoint})`;
      console.warn(reason);
      errors.push(reason);
      continue;
    }

    try {
      console.info(`[Chat Tool] generate_promo: Trying model=${model}, endpoint=${endpoint}`);
      const completion = await client.chat.completions.create({
        model,
        messages: [
          { role: "system", content: `Kamu adalah AI marketing assistant untuk kedai kopi "Kopi Kita". Selalu respond dengan valid JSON sesuai format yang diminta. Berikan 2-3 campaigns. Pastikan JSON valid tanpa teks tambahan.` },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 4096,
      });

      const raw = completion.choices[0]?.message?.content;
      if (!raw) {
        const reason = `[Chat Tool] generate_promo: ${model} returned empty content. finish_reason=${completion.choices[0]?.finish_reason}`;
        console.warn(reason);
        errors.push(reason);
        continue;
      }

      console.info(`[Chat Tool] generate_promo: ${model} returned ${raw.length} chars`);

      // Extract JSON
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        const reason = `[Chat Tool] generate_promo: ${model} no JSON found in response. Raw (first 500): ${raw.slice(0, 500)}`;
        console.warn(reason);
        errors.push(reason);
        continue;
      }

      const parsed = JSON.parse(jsonMatch[0]);
      console.info(`[Chat Tool] generate_promo: ${model} parsed keys:`, JSON.stringify(Object.keys(parsed)), parsed.campaigns?.[0] ? `first campaign keys: ${JSON.stringify(Object.keys(parsed.campaigns[0]))}` : 'no campaigns array');
      const validated = promoOutputSchema.safeParse(parsed);
      if (!validated.success) {
        const reason = `[Chat Tool] generate_promo: ${model} Zod validation failed: ${JSON.stringify(validated.error.issues)}`;
        console.warn(reason);
        errors.push(reason);
        continue;
      }

      // Save to DB
      console.info(`[Chat Tool] generate_promo: ${model} validated OK, saving ${validated.data.campaigns.length} campaigns to DB`);
      const batch = await db.promoBatch.create({
        data: {
          campaigns: {
            create: validated.data.campaigns.map((c) => ({
              theme: c.theme,
              segment: c.segment,
              customerCount: c.customerCount,
              whyNow: c.whyNow,
              message: c.message,
              timeWindow: c.timeWindow ?? null,
            })),
          },
        },
        include: { campaigns: true },
      });

      console.info(`[Chat Tool] generate_promo: SUCCESS with ${model}, batchId=${batch.id}`);
      result = JSON.stringify({
        success: true,
        campaigns: batch.campaigns,
        meta: { totalCustomers: customers.length, model, generatedAt: new Date().toISOString() },
      });
      break;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const status = (err as { status?: number }).status;
      const reason = `[Chat Tool] generate_promo: ${model} threw error (status=${status}): ${errMsg}`;
      console.error(reason);
      errors.push(reason);
      continue;
    }
  }

  if (!result) {
    console.error(`[Chat Tool] generate_promo: ALL models failed. Errors:\n${errors.join("\n")}`);
  }

  return result ?? JSON.stringify({ error: `Gagal generate promo. Detail: ${errors.map(e => e.replace(/\[Chat Tool\] generate_promo: /g, '')).join(' | ')}` });
}

async function executeSearchCustomers(query: string): Promise<string> {
  const customers = await db.customer.findMany({
    select: { name: true, favoriteDrink: true, interestTags: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  const q = query.trim().toLowerCase();
  let matched = customers;
  let label = "semua";

  if (q === "baru" || q === "new" || q === "pelanggan baru") {
    // New customers (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    matched = customers.filter((c) => c.createdAt >= sevenDaysAgo);
    label = "pelanggan baru (7 hari terakhir)";
  } else if (q) {
    // Filter by name, tag, or drink match
    matched = customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.interestTags.some((tag) => tag.toLowerCase().includes(q)) ||
        c.favoriteDrink.toLowerCase().includes(q),
    );
    label = `pencarian: "${query.trim()}"`;
  }

  return JSON.stringify({
    customers: matched.map((c) => ({
      name: c.name,
      favoriteDrink: c.favoriteDrink,
      tags: c.interestTags,
      joinedAt: c.createdAt.toISOString().slice(0, 10),
    })),
    total: matched.length,
    totalAll: customers.length,
    label,
  });
}

async function executeGetCustomerStats(): Promise<string> {
  const customers = await db.customer.findMany({
    select: { name: true, favoriteDrink: true, interestTags: true, createdAt: true },
  });

  const tagCounts: Record<string, number> = {};
  const drinkCounts: Record<string, number> = {};
  for (const c of customers) {
    for (const tag of c.interestTags) tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    drinkCounts[c.favoriteDrink] = (drinkCounts[c.favoriteDrink] || 0) + 1;
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const newCustomers = customers.filter((c) => c.createdAt >= sevenDaysAgo);

  return JSON.stringify({
    totalCustomers: customers.length,
    newThisWeek: newCustomers.length,
    topTags: Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 10),
    topDrinks: Object.entries(drinkCounts).sort((a, b) => b[1] - a[1]).slice(0, 10),
  });
}

// ─── Shared: fetch all customers (reused across tools) ───
async function fetchAllCustomers() {
  return db.customer.findMany({
    select: { name: true, favoriteDrink: true, interestTags: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
}

// ─── Tool: analyze_segments ───
async function executeAnalyzeSegments(tag: string): Promise<string> {
  if (!tag.trim()) return JSON.stringify({ error: "Tag parameter is required." });

  const customers = await fetchAllCustomers();
  const q = tag.trim().toLowerCase();
  const membersInSegment = customers.filter((c) =>
    c.interestTags.some((t) => t.toLowerCase().includes(q)),
  );

  if (membersInSegment.length === 0) {
    return JSON.stringify({
      tag,
      count: 0,
      message: `Tidak ada pelanggan dengan tag "${tag}".`,
      availableTags: [...new Set(customers.flatMap((c) => c.interestTags))].sort(),
    });
  }

  // Top drinks in this segment
  const drinkCounts: Record<string, number> = {};
  for (const c of membersInSegment) {
    const drink = c.favoriteDrink.toLowerCase().trim();
    drinkCounts[drink] = (drinkCounts[drink] || 0) + 1;
  }

  // Other tags these members also have
  const otherTags: Record<string, number> = {};
  for (const c of membersInSegment) {
    for (const t of c.interestTags) {
      if (t.toLowerCase() !== q) otherTags[t] = (otherTags[t] || 0) + 1;
    }
  }

  // Newest 5 members in segment
  const newestMembers = membersInSegment.slice(0, 5).map((c) => ({
    name: c.name,
    favoriteDrink: c.favoriteDrink,
    joinedAt: c.createdAt.toISOString().slice(0, 10),
  }));

  return JSON.stringify({
    tag,
    count: membersInSegment.length,
    percentageOfTotal: Math.round((membersInSegment.length / customers.length) * 100),
    totalCustomers: customers.length,
    topDrinks: Object.entries(drinkCounts).sort((a, b) => b[1] - a[1]).slice(0, 5),
    relatedTags: Object.entries(otherTags).sort((a, b) => b[1] - a[1]).slice(0, 5),
    newestMembers,
  });
}

// ─── Tool: get_customer_growth ───
async function executeGetCustomerGrowth(period: string): Promise<string> {
  const customers = await fetchAllCustomers();

  const grouped: Record<string, number> = {};
  for (const c of customers) {
    let key: string;
    if (period === "weekly") {
      // ISO week start (Monday)
      const d = new Date(c.createdAt);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d.setDate(diff));
      key = `Minggu ${monday.toISOString().slice(0, 10)}`;
    } else {
      key = c.createdAt.toISOString().slice(0, 10);
    }
    grouped[key] = (grouped[key] || 0) + 1;
  }

  // Sort by date and add cumulative
  const sorted = Object.entries(grouped).sort((a, b) => a[0].localeCompare(b[0]));
  let cumulative = 0;
  const timeline = sorted.map(([date, count]) => {
    cumulative += count;
    return { date, newCustomers: count, cumulative };
  });

  return JSON.stringify({
    period,
    totalCustomers: customers.length,
    timeline,
    firstCustomerDate: sorted[0]?.[0] ?? null,
    latestCustomerDate: sorted[sorted.length - 1]?.[0] ?? null,
  });
}

// ─── Tool: get_promo_history ───
async function executeGetPromoHistory(limit: number): Promise<string> {
  const safeLimit = Math.max(1, Math.min(limit, 20));
  const batches = await db.promoBatch.findMany({
    orderBy: { createdAt: "desc" },
    take: safeLimit,
    include: {
      campaigns: {
        select: {
          theme: true,
          segment: true,
          customerCount: true,
          whyNow: true,
          message: true,
          timeWindow: true,
          createdAt: true,
        },
      },
    },
  });

  const totalBatches = await db.promoBatch.count();

  return JSON.stringify({
    totalBatches,
    showing: batches.length,
    batches: batches.map((b) => ({
      batchId: b.id,
      createdAt: b.createdAt.toISOString().slice(0, 10),
      campaignCount: b.campaigns.length,
      campaigns: b.campaigns.map((c) => ({
        theme: c.theme,
        segment: c.segment,
        customerCount: c.customerCount,
        timeWindow: c.timeWindow,
        createdAt: c.createdAt.toISOString().slice(0, 10),
      })),
    })),
  });
}

// ─── Tool: find_top_customers ───
async function executeFindTopCustomers(limit: number): Promise<string> {
  const safeLimit = Math.max(1, Math.min(limit, 50));
  const customers = await fetchAllCustomers();

  const now = Date.now();
  const scored = customers.map((c) => {
    const tagScore = c.interestTags.length * 3; // More tags = more engaged
    const daysSinceJoin = Math.floor((now - c.createdAt.getTime()) / (1000 * 60 * 60 * 24));
    const loyaltyScore = Math.min(daysSinceJoin, 90); // Cap at 90 days
    const engagementScore = tagScore + loyaltyScore;

    return {
      name: c.name,
      favoriteDrink: c.favoriteDrink,
      tags: c.interestTags,
      joinedAt: c.createdAt.toISOString().slice(0, 10),
      daysSinceJoin,
      tagCount: c.interestTags.length,
      engagementScore,
    };
  });

  scored.sort((a, b) => b.engagementScore - a.engagementScore);

  return JSON.stringify({
    topCustomers: scored.slice(0, safeLimit),
    totalCustomers: customers.length,
    averageTagCount: +(customers.reduce((sum, c) => sum + c.interestTags.length, 0) / customers.length).toFixed(1),
  });
}

// ─── Tool: compare_segments ───
async function executeCompareSegments(tagA: string, tagB: string): Promise<string> {
  if (!tagA.trim() || !tagB.trim()) {
    return JSON.stringify({ error: "Both tag_a and tag_b are required." });
  }

  const customers = await fetchAllCustomers();
  const qa = tagA.trim().toLowerCase();
  const qb = tagB.trim().toLowerCase();

  const groupA = customers.filter((c) =>
    c.interestTags.some((t) => t.toLowerCase().includes(qa)),
  );
  const groupB = customers.filter((c) =>
    c.interestTags.some((t) => t.toLowerCase().includes(qb)),
  );
  const overlap = customers.filter(
    (c) =>
      c.interestTags.some((t) => t.toLowerCase().includes(qa)) &&
      c.interestTags.some((t) => t.toLowerCase().includes(qb)),
  );

  const drinksA: Record<string, number> = {};
  const drinksB: Record<string, number> = {};
  for (const c of groupA) drinksA[c.favoriteDrink] = (drinksA[c.favoriteDrink] || 0) + 1;
  for (const c of groupB) drinksB[c.favoriteDrink] = (drinksB[c.favoriteDrink] || 0) + 1;

  return JSON.stringify({
    segmentA: {
      tag: tagA.trim(),
      count: groupA.length,
      topDrinks: Object.entries(drinksA).sort((a, b) => b[1] - a[1]).slice(0, 5),
    },
    segmentB: {
      tag: tagB.trim(),
      count: groupB.length,
      topDrinks: Object.entries(drinksB).sort((a, b) => b[1] - a[1]).slice(0, 5),
    },
    overlap: {
      count: overlap.length,
      members: overlap.slice(0, 5).map((c) => c.name),
    },
    totalCustomers: customers.length,
    insight: groupA.length > groupB.length
      ? `"${tagA.trim()}" lebih besar (${groupA.length} vs ${groupB.length})`
      : groupB.length > groupA.length
        ? `"${tagB.trim()}" lebih besar (${groupB.length} vs ${groupA.length})`
        : `Keduanya sama besar (${groupA.length} pelanggan)`,
  });
}

// ─── Tool: get_drink_analysis ───
async function executeGetDrinkAnalysis(): Promise<string> {
  const customers = await fetchAllCustomers();

  const drinkData: Record<string, { count: number; tags: Record<string, number>; customers: string[] }> = {};

  for (const c of customers) {
    const drink = c.favoriteDrink;
    if (!drinkData[drink]) drinkData[drink] = { count: 0, tags: {}, customers: [] };
    drinkData[drink].count++;
    drinkData[drink].customers.push(c.name);
    for (const tag of c.interestTags) {
      drinkData[drink].tags[tag] = (drinkData[drink].tags[tag] || 0) + 1;
    }
  }

  const ranked = Object.entries(drinkData)
    .sort((a, b) => b[1].count - a[1].count)
    .map(([drink, data], i) => ({
      rank: i + 1,
      drink,
      customerCount: data.count,
      percentageOfTotal: Math.round((data.count / customers.length) * 100),
      topTags: Object.entries(data.tags).sort((a, b) => b[1] - a[1]).slice(0, 3),
      sampleCustomers: data.customers.slice(0, 3),
    }));

  return JSON.stringify({
    totalDrinks: ranked.length,
    totalCustomers: customers.length,
    ranking: ranked,
  });
}

// ─── Tool: suggest_new_promo ───
async function executeSuggestNewPromo(): Promise<string> {
  const [customers, recentBatches] = await Promise.all([
    fetchAllCustomers(),
    db.promoBatch.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { campaigns: { select: { segment: true, theme: true } } },
    }),
  ]);

  // Collect all segments that have been targeted recently
  const targetedSegments = new Set<string>();
  for (const batch of recentBatches) {
    for (const campaign of batch.campaigns) {
      targetedSegments.add(campaign.segment.toLowerCase());
      // Also extract keywords from theme
      for (const word of campaign.theme.toLowerCase().split(/\s+/)) {
        if (word.length > 3) targetedSegments.add(word);
      }
    }
  }

  // All current tags with counts
  const tagCounts: Record<string, number> = {};
  for (const c of customers) {
    for (const tag of c.interestTags) tagCounts[tag] = (tagCounts[tag] || 0) + 1;
  }

  // Find tags NOT mentioned in recent promos
  const untapped = Object.entries(tagCounts)
    .filter(([tag]) => {
      const tagLower = tag.toLowerCase();
      return ![...targetedSegments].some(
        (seg) => seg.includes(tagLower) || tagLower.includes(seg),
      );
    })
    .sort((a, b) => b[1] - a[1]);

  // Find tags that WERE targeted (for context)
  const alreadyTargeted = Object.entries(tagCounts)
    .filter(([tag]) => {
      const tagLower = tag.toLowerCase();
      return [...targetedSegments].some(
        (seg) => seg.includes(tagLower) || tagLower.includes(seg),
      );
    })
    .sort((a, b) => b[1] - a[1]);

  return JSON.stringify({
    untappedSegments: untapped.map(([tag, count]) => ({ tag, customerCount: count })),
    alreadyTargeted: alreadyTargeted.map(([tag, count]) => ({ tag, customerCount: count })),
    totalPromosBefore: recentBatches.length,
    totalCustomers: customers.length,
    recommendation: untapped.length > 0
      ? `Ada ${untapped.length} segmen yang belum pernah dipromo. Segmen terbesar: "${untapped[0][0]}" (${untapped[0][1]} pelanggan).`
      : "Semua segmen sudah pernah ditarget. Pertimbangkan membuat variasi promo baru untuk segmen yang sudah ada.",
  });
}

// ─── Create AI completion (with or without tools) ───
async function createChatCompletion(
  model: string,
  messages: ChatCompletionMessageParam[],
  useTools: boolean,
) {
  const endpoint = getModelEndpoint(model);
  // Models that support max_completion_tokens (OpenAI, Gemini, Groq)
  const supportsMaxTokens = /^(openai\/|gemini-|llama-)/i.test(model);
  const params = {
    model,
    stream: true as const,
    messages,
    ...(supportsMaxTokens ? { max_completion_tokens: 8192 } : {}),
    ...(useTools ? { tools: CHAT_TOOLS, tool_choice: "auto" as const } : {}),
  };

  if (endpoint === "groq") {
    if (!groqClient) return null;
    return { stream: await groqClient.chat.completions.create(params), tokenIdx: -2 };
  }
  if (endpoint === "gemini") {
    if (!geminiClient) return null;
    return { stream: await geminiClient.chat.completions.create(params), tokenIdx: -1 };
  }
  // GitHub Models — try token pool
  for (let t = 0; t < clients.length; t++) {
    try {
      const stream = await clients[t].chat.completions.create(params);
      return { stream, tokenIdx: t };
    } catch (err) {
      if (err instanceof OpenAI.APIError && [401, 403, 404, 413, 422, 429, 500, 502, 503].includes(err.status)) {
        await new Promise((r) => setTimeout(r, 500));
        continue;
      }
      throw err;
    }
  }
  return null;
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
    // Validate model if provided
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

    // Stream response from AI provider
    // Strategy: for each model, pick the right provider (GitHub token pool vs Gemini)
    const primaryModel = requestedModel || AI_MODEL;
    const fallbackModels = [AI_MODEL, ...FALLBACK_MODELS].filter(
      (m) => m !== primaryModel,
    );
    const models = [primaryModel, ...fallbackModels];
    const baseMessages: ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...sanitizedMessages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ];

    // Try models in order using the shared createChatCompletion helper
    let result: Awaited<ReturnType<typeof createChatCompletion>> = null;
    let usedModel = primaryModel;

    for (const model of models) {
      try {
        result = await createChatCompletion(model, baseMessages, true);
        if (result) {
          usedModel = model;
          break;
        }
      } catch (err) {
        if (err instanceof OpenAI.APIError && [401, 403, 404, 413, 422, 429, 500, 502, 503].includes(err.status)) {
          console.warn(`[Chat API] Model ${model} hit ${err.status} — trying next`);
          continue;
        }
        throw err;
      }
    }

    if (usedModel !== primaryModel && result) {
      const endpoint = getModelEndpoint(usedModel);
      const provider = result.tokenIdx === -1
        ? (endpoint === "gemini" ? "Gemini" : "AgentRouter")
        : result.tokenIdx === -2
        ? "Groq"
        : `GitHub token #${result.tokenIdx + 1}`;
      console.info(`[Chat API] Using ${provider}, model: ${usedModel}`);
    }

    if (!result) {
      return new Response(
        JSON.stringify({
          error: "Semua model AI sedang sibuk, coba lagi dalam 1 menit ya ☕",
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": "60",
          },
        },
      );
    }

    // Return Server-Sent Events stream with tool_calls support
    const encoder = new TextEncoder();
    const userContent = lastMsg.content;
    const userId = session.user.id;
    const { stream } = result;

    const readable = new ReadableStream({
      async start(controller) {
        const send = (data: Record<string, unknown>) =>
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

        let hasContent = false;
        let fullResponse = "";

        try {
          // ─── Phase 1: Stream response, detect tool_calls ───
          const toolCallsMap: Record<number, { name: string; arguments: string }> = {};
          let hasToolCalls = false;

          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta;
            if (!delta) continue;

            // Text content
            if (delta.content) {
              hasContent = true;
              fullResponse += delta.content;
              send({ content: delta.content });
            }

            // Accumulate tool_calls deltas
            if (delta.tool_calls) {
              hasToolCalls = true;
              for (const tc of delta.tool_calls) {
                if (!toolCallsMap[tc.index]) {
                  toolCallsMap[tc.index] = { name: "", arguments: "" };
                }
                if (tc.function?.name) toolCallsMap[tc.index].name += tc.function.name;
                if (tc.function?.arguments) toolCallsMap[tc.index].arguments += tc.function.arguments;
              }
            }
          }

          // ─── Phase 2: Execute tools if model requested them ───
          if (hasToolCalls) {
            const toolCalls = Object.values(toolCallsMap);
            console.info(`[Chat API] Tool calls detected: ${toolCalls.map(tc => tc.name).join(', ')}`);
            const toolMessages: ChatCompletionMessageParam[] = [...baseMessages];

            // Add assistant message with tool_calls
            // Generate 9-char alphanumeric IDs (Mistral requires [a-zA-Z0-9]{9})
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            const genId = () => Array.from({ length: 9 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
            const assistantToolCalls = toolCalls.map((tc) => ({
              id: genId(),
              type: "function" as const,
              function: { name: tc.name, arguments: tc.arguments },
            }));
            toolMessages.push({
              role: "assistant",
              content: null,
              tool_calls: assistantToolCalls,
            });

            // Execute each tool and add results
            for (const tc of assistantToolCalls) {
              send({ tool: { name: tc.function.name, status: "executing" } });
              let args: Record<string, unknown> = {};
              try {
                args = tc.function.arguments ? JSON.parse(tc.function.arguments) : {};
              } catch { /* empty args */ }
              const toolResult = await executeTool(tc.function.name, args);
              send({ tool: { name: tc.function.name, status: "done" } });

              toolMessages.push({
                role: "tool",
                tool_call_id: tc.id,
                content: toolResult,
              });
            }

            // ─── Phase 3: Stream final response with tool results ───
            const phase2 = await createChatCompletion(usedModel, toolMessages, false);
            if (phase2) {
              for await (const chunk of phase2.stream) {
                const content = chunk.choices[0]?.delta?.content;
                if (content) {
                  hasContent = true;
                  fullResponse += content;
                  send({ content });
                }
              }
            }
          }

          // Fallback if model returned empty stream
          if (!hasContent) {
            fullResponse = "Maaf, saya tidak bisa memproses permintaan ini. Coba ulangi pertanyaanmu ya! 🙏";
            send({ content: fullResponse });
          }

          // ─── Persist to DB (fire-and-forget, don't block stream) ───
          saveMessages(userId, conversationId, userContent, fullResponse)
            .then((convoId) => {
              if (!conversationId && convoId) {
                send({ conversationId: convoId });
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
          const message = err instanceof Error ? err.message : "Stream error";
          send({ error: message });
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

    // Graceful handling for GitHub Models 429
    if (err instanceof OpenAI.APIError && err.status === 429) {
      const retryAfter =
        (err.headers as Record<string, string> | undefined)?.["retry-after"] ?? "60";
      return new Response(
        JSON.stringify({
          error: "AI sedang sibuk, coba lagi dalam 1 menit ya ☕",
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": retryAfter,
          },
        },
      );
    }

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
