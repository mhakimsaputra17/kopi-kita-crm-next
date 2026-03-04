import "server-only";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { db } from "@/lib/db";
import { buildPromoPrompt } from "@/lib/prompts";
import { promoOutputSchema } from "@/schemas/promo";
import { hybridSearchCustomers, upsertCustomerEmbedding } from "@/lib/vector-store";
import { generateCustomerEmbedding } from "@/lib/embeddings";
import { getModelEndpoint, clients, geminiClient, groqClient } from "@/lib/ai";

// ─── Shared: fetch all customers ───
async function fetchAllCustomers() {
  return db.customer.findMany({
    select: { name: true, favoriteDrink: true, interestTags: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
}

// ─── Tool 1: semantic_search_customers ───
export const semanticSearchCustomersTool = tool(
  async ({ query, limit }) => {
    const results = await hybridSearchCustomers(query, limit);
    if (results.length === 0) {
      return JSON.stringify({ message: "Tidak ada pelanggan yang sangat cocok dengan pencarian ini. Coba keyword search biasa.", results: [] });
    }
    return JSON.stringify({
      results: results.map((r) => ({
        name: r.name,
        favoriteDrink: r.favoriteDrink,
        tags: r.interestTags,
        similarity: Math.round(r.similarity * 100) + "%",
      })),
      total: results.length,
    });
  },
  {
    name: "semantic_search_customers",
    description:
      "Cari pelanggan berdasarkan kesamaan semantik + keyword. Gunakan untuk pencarian natural seperti 'pelanggan yang suka kopi pahit' atau 'yang tertarik latte art'. Hybrid search: gabungan vector similarity + keyword matching.",
    schema: z.object({
      query: z.string().describe("Deskripsi natural pelanggan yang dicari, misal: 'suka minuman dingin dan manis' atau 'black coffee'"),
      limit: z.number().optional().default(10).describe("Jumlah hasil maksimal"),
    }),
  },
);

// ─── Tool 2: generate_promo ───
export const generatePromoTool = tool(
  async () => {
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
    const promoModels = ["gemini-2.5-flash-lite", "llama-3.3-70b-versatile", "openai/gpt-4.1-mini"];
    const errors: string[] = [];

    for (const model of promoModels) {
      const endpoint = getModelEndpoint(model);
      const client =
        endpoint === "gemini" ? geminiClient :
        endpoint === "groq" ? groqClient :
        clients[0];
      if (!client) continue;

      try {
        const completion = await client.chat.completions.create({
          model,
          messages: [
            { role: "system", content: "Kamu adalah AI marketing assistant untuk kedai kopi \"Kopi Kita\". Selalu respond dengan valid JSON sesuai format yang diminta. Berikan 2-3 campaigns. Pastikan JSON valid tanpa teks tambahan." },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
          max_completion_tokens: 4096,
        });

        const raw = completion.choices[0]?.message?.content;
        if (!raw) { errors.push(`${model}: empty`); continue; }

        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (!jsonMatch) { errors.push(`${model}: no JSON`); continue; }

        const validated = promoOutputSchema.safeParse(JSON.parse(jsonMatch[0]));
        if (!validated.success) { errors.push(`${model}: validation failed`); continue; }

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

        return JSON.stringify({
          success: true,
          campaigns: batch.campaigns,
          meta: { totalCustomers: customers.length, model, generatedAt: new Date().toISOString() },
        });
      } catch (err) {
        errors.push(`${model}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    return JSON.stringify({ error: `Gagal generate promo. ${errors.join(" | ")}` });
  },
  {
    name: "generate_promo",
    description: "Generate 2-3 AI-powered promo campaign ideas berdasarkan data pelanggan. Simpan ke database. Panggil saat user minta buat/generate promo.",
    schema: z.object({}),
  },
);

// ─── Tool 3: search_customers ───
export const searchCustomersTool = tool(
  async ({ query }) => {
    const customers = await fetchAllCustomers();
    const q = (query ?? "").trim().toLowerCase();
    let matched = customers;
    let label = "semua";

    if (q === "baru" || q === "new" || q === "pelanggan baru") {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      matched = customers.filter((c) => c.createdAt >= sevenDaysAgo);
      label = "pelanggan baru (7 hari terakhir)";
    } else if (q) {
      matched = customers.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.interestTags.some((tag) => tag.toLowerCase().includes(q)) ||
          c.favoriteDrink.toLowerCase().includes(q),
      );
      label = `pencarian: "${query}"`;
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
  },
  {
    name: "search_customers",
    description: "Cari pelanggan berdasarkan nama/tag/minuman. Tanpa query = semua pelanggan. Query 'baru' = pelanggan baru 7 hari.",
    schema: z.object({
      query: z.string().optional().default("").describe("Kata kunci pencarian. Kosong = semua pelanggan. 'baru' = 7 hari terakhir."),
    }),
  },
);

// ─── Tool 4: get_customer_stats ───
export const getCustomerStatsTool = tool(
  async () => {
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
  },
  {
    name: "get_customer_stats",
    description: "Statistik ringkas: total pelanggan, tag populer, minuman favorit, pelanggan baru minggu ini.",
    schema: z.object({}),
  },
);

// ─── Tool 5: analyze_segments ───
export const analyzeSegmentsTool = tool(
  async ({ tag }) => {
    if (!tag.trim()) return JSON.stringify({ error: "Tag parameter is required." });

    const customers = await fetchAllCustomers();
    const q = tag.trim().toLowerCase();
    const members = customers.filter((c) =>
      c.interestTags.some((t) => t.toLowerCase().includes(q)),
    );

    if (members.length === 0) {
      return JSON.stringify({
        tag, count: 0,
        message: `Tidak ada pelanggan dengan tag "${tag}".`,
        availableTags: [...new Set(customers.flatMap((c) => c.interestTags))].sort(),
      });
    }

    const drinkCounts: Record<string, number> = {};
    const otherTags: Record<string, number> = {};
    for (const c of members) {
      drinkCounts[c.favoriteDrink.toLowerCase().trim()] = (drinkCounts[c.favoriteDrink.toLowerCase().trim()] || 0) + 1;
      for (const t of c.interestTags) {
        if (t.toLowerCase() !== q) otherTags[t] = (otherTags[t] || 0) + 1;
      }
    }

    return JSON.stringify({
      tag,
      count: members.length,
      percentageOfTotal: Math.round((members.length / customers.length) * 100),
      totalCustomers: customers.length,
      topDrinks: Object.entries(drinkCounts).sort((a, b) => b[1] - a[1]).slice(0, 5),
      relatedTags: Object.entries(otherTags).sort((a, b) => b[1] - a[1]).slice(0, 5),
      newestMembers: members.slice(0, 5).map((c) => ({
        name: c.name, favoriteDrink: c.favoriteDrink, joinedAt: c.createdAt.toISOString().slice(0, 10),
      })),
    });
  },
  {
    name: "analyze_segments",
    description: "Analisis mendalam satu segmen/tag: jumlah member, top drinks, related tags, member terbaru.",
    schema: z.object({
      tag: z.string().describe("Interest tag yang mau dianalisis, misal 'oat milk', 'sweet drinks'."),
    }),
  },
);

// ─── Tool 6: get_customer_growth ───
export const getCustomerGrowthTool = tool(
  async ({ period }) => {
    const customers = await fetchAllCustomers();
    const grouped: Record<string, number> = {};

    for (const c of customers) {
      let key: string;
      if (period === "weekly") {
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
  },
  {
    name: "get_customer_growth",
    description: "Timeline pertumbuhan pelanggan per hari/minggu dengan total kumulatif.",
    schema: z.object({
      period: z.enum(["daily", "weekly"]).optional().default("daily").describe("Group by day or week."),
    }),
  },
);

// ─── Tool 7: get_promo_history ───
export const getPromoHistoryTool = tool(
  async ({ limit }) => {
    const safeLimit = Math.max(1, Math.min(limit, 20));
    const batches = await db.promoBatch.findMany({
      orderBy: { createdAt: "desc" },
      take: safeLimit,
      include: {
        campaigns: {
          select: { theme: true, segment: true, customerCount: true, whyNow: true, message: true, timeWindow: true, createdAt: true },
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
          theme: c.theme, segment: c.segment, customerCount: c.customerCount,
          timeWindow: c.timeWindow, createdAt: c.createdAt.toISOString().slice(0, 10),
        })),
      })),
    });
  },
  {
    name: "get_promo_history",
    description: "Riwayat semua promo yang pernah dibuat, grouped by batch.",
    schema: z.object({
      limit: z.number().optional().default(5).describe("Jumlah batch terbaru. Default: 5."),
    }),
  },
);

// ─── Tool 8: find_top_customers ───
export const findTopCustomersTool = tool(
  async ({ limit }) => {
    const safeLimit = Math.max(1, Math.min(limit, 50));
    const customers = await fetchAllCustomers();
    const now = Date.now();

    const scored = customers.map((c) => {
      const tagScore = c.interestTags.length * 3;
      const daysSinceJoin = Math.floor((now - c.createdAt.getTime()) / (1000 * 60 * 60 * 24));
      const loyaltyScore = Math.min(daysSinceJoin, 90);
      const engagementScore = tagScore + loyaltyScore;
      return {
        name: c.name, favoriteDrink: c.favoriteDrink, tags: c.interestTags,
        joinedAt: c.createdAt.toISOString().slice(0, 10),
        daysSinceJoin, tagCount: c.interestTags.length, engagementScore,
      };
    });

    scored.sort((a, b) => b.engagementScore - a.engagementScore);

    return JSON.stringify({
      topCustomers: scored.slice(0, safeLimit),
      totalCustomers: customers.length,
      averageTagCount: +(customers.reduce((sum, c) => sum + c.interestTags.length, 0) / customers.length).toFixed(1),
    });
  },
  {
    name: "find_top_customers",
    description: "Ranking pelanggan paling engaged/loyal berdasarkan skor engagement.",
    schema: z.object({
      limit: z.number().optional().default(10).describe("Jumlah top customers. Default: 10."),
    }),
  },
);

// ─── Tool 9: compare_segments ───
export const compareSegmentsTool = tool(
  async ({ tag_a, tag_b }) => {
    if (!tag_a.trim() || !tag_b.trim()) {
      return JSON.stringify({ error: "Both tag_a and tag_b are required." });
    }

    const customers = await fetchAllCustomers();
    const qa = tag_a.trim().toLowerCase();
    const qb = tag_b.trim().toLowerCase();

    const groupA = customers.filter((c) => c.interestTags.some((t) => t.toLowerCase().includes(qa)));
    const groupB = customers.filter((c) => c.interestTags.some((t) => t.toLowerCase().includes(qb)));
    const overlap = customers.filter(
      (c) => c.interestTags.some((t) => t.toLowerCase().includes(qa)) &&
             c.interestTags.some((t) => t.toLowerCase().includes(qb)),
    );

    const drinksA: Record<string, number> = {};
    const drinksB: Record<string, number> = {};
    for (const c of groupA) drinksA[c.favoriteDrink] = (drinksA[c.favoriteDrink] || 0) + 1;
    for (const c of groupB) drinksB[c.favoriteDrink] = (drinksB[c.favoriteDrink] || 0) + 1;

    return JSON.stringify({
      segmentA: { tag: tag_a.trim(), count: groupA.length, topDrinks: Object.entries(drinksA).sort((a, b) => b[1] - a[1]).slice(0, 5) },
      segmentB: { tag: tag_b.trim(), count: groupB.length, topDrinks: Object.entries(drinksB).sort((a, b) => b[1] - a[1]).slice(0, 5) },
      overlap: { count: overlap.length, members: overlap.slice(0, 5).map((c) => c.name) },
      totalCustomers: customers.length,
      insight: groupA.length > groupB.length
        ? `"${tag_a.trim()}" lebih besar (${groupA.length} vs ${groupB.length})`
        : groupB.length > groupA.length
          ? `"${tag_b.trim()}" lebih besar (${groupB.length} vs ${groupA.length})`
          : `Keduanya sama besar (${groupA.length} pelanggan)`,
    });
  },
  {
    name: "compare_segments",
    description: "Bandingkan 2 segmen pelanggan: jumlah, top drinks, overlap, insight.",
    schema: z.object({
      tag_a: z.string().describe("Segmen pertama, misal 'sweet drinks'."),
      tag_b: z.string().describe("Segmen kedua, misal 'black coffee'."),
    }),
  },
);

// ─── Tool 10: get_drink_analysis ───
export const getDrinkAnalysisTool = tool(
  async () => {
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
        rank: i + 1, drink, customerCount: data.count,
        percentageOfTotal: Math.round((data.count / customers.length) * 100),
        topTags: Object.entries(data.tags).sort((a, b) => b[1] - a[1]).slice(0, 3),
        sampleCustomers: data.customers.slice(0, 3),
      }));

    return JSON.stringify({ totalDrinks: ranked.length, totalCustomers: customers.length, ranking: ranked });
  },
  {
    name: "get_drink_analysis",
    description: "Ranking minuman populer dengan jumlah pelanggan, tags terkait, dan contoh pelanggan.",
    schema: z.object({}),
  },
);

// ─── Tool 11: suggest_new_promo ───
export const suggestNewPromoTool = tool(
  async () => {
    const [customers, recentBatches] = await Promise.all([
      fetchAllCustomers(),
      db.promoBatch.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { campaigns: { select: { segment: true, theme: true } } },
      }),
    ]);

    const targetedSegments = new Set<string>();
    for (const batch of recentBatches) {
      for (const campaign of batch.campaigns) {
        targetedSegments.add(campaign.segment.toLowerCase());
        for (const word of campaign.theme.toLowerCase().split(/\s+/)) {
          if (word.length > 3) targetedSegments.add(word);
        }
      }
    }

    const tagCounts: Record<string, number> = {};
    for (const c of customers) {
      for (const tag of c.interestTags) tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    }

    const untapped = Object.entries(tagCounts)
      .filter(([tag]) => {
        const tagLower = tag.toLowerCase();
        return ![...targetedSegments].some((seg) => seg.includes(tagLower) || tagLower.includes(seg));
      })
      .sort((a, b) => b[1] - a[1]);

    const alreadyTargeted = Object.entries(tagCounts)
      .filter(([tag]) => {
        const tagLower = tag.toLowerCase();
        return [...targetedSegments].some((seg) => seg.includes(tagLower) || tagLower.includes(seg));
      })
      .sort((a, b) => b[1] - a[1]);

    return JSON.stringify({
      untappedSegments: untapped.map(([tag, count]) => ({ tag, customerCount: count })),
      alreadyTargeted: alreadyTargeted.map(([tag, count]) => ({ tag, customerCount: count })),
      totalPromosBefore: recentBatches.length,
      totalCustomers: customers.length,
      recommendation: untapped.length > 0
        ? `Ada ${untapped.length} segmen yang belum pernah dipromo. Terbesar: "${untapped[0][0]}" (${untapped[0][1]} pelanggan).`
        : "Semua segmen sudah pernah ditarget. Pertimbangkan variasi promo baru.",
    });
  },
  {
    name: "suggest_new_promo",
    description: "Cari segmen yang BELUM ditarget promo. Identifikasi peluang baru yang belum digarap.",
    schema: z.object({}),
  },
);

// ─── Tool 12: create_customer ───
export const createCustomerTool = tool(
  async ({ name, contact, favoriteDrink, interestTags }) => {
    // Check for duplicate by name (case-insensitive)
    const existing = await db.customer.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
    });
    if (existing) {
      return JSON.stringify({ error: `Pelanggan dengan nama "${name}" sudah ada.`, existing: { id: existing.id, name: existing.name } });
    }

    const customer = await db.customer.create({
      data: { name, contact: contact ?? null, favoriteDrink, interestTags },
    });

    // Generate and store embedding
    try {
      const embedding = await generateCustomerEmbedding({ name, favoriteDrink, interestTags });
      await upsertCustomerEmbedding(customer.id, embedding);
    } catch (err) {
      console.warn("[create_customer] Embedding generation failed:", err);
    }

    return JSON.stringify({ success: true, customer: { id: customer.id, name: customer.name, contact: customer.contact, favoriteDrink: customer.favoriteDrink, interestTags: customer.interestTags } });
  },
  {
    name: "create_customer",
    description: "Tambah pelanggan baru ke database. Otomatis generate embedding untuk pencarian semantik.",
    schema: z.object({
      name: z.string().describe("Nama lengkap pelanggan"),
      contact: z.string().optional().describe("Email atau nomor telepon"),
      favoriteDrink: z.string().describe("Minuman favorit, misal: Americano, Latte, Cappuccino"),
      interestTags: z.array(z.string()).describe('Tag minat pelanggan, misal: ["black coffee", "regular"]'),
    }),
  },
);

// ─── Tool 13: update_customer ───
export const updateCustomerTool = tool(
  async ({ name, newName, contact, favoriteDrink, interestTags }) => {
    const customer = await db.customer.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
    });
    if (!customer) {
      return JSON.stringify({ error: `Pelanggan dengan nama "${name}" tidak ditemukan.` });
    }

    const data: Record<string, unknown> = {};
    if (newName) data.name = newName;
    if (contact !== undefined) data.contact = contact;
    if (favoriteDrink) data.favoriteDrink = favoriteDrink;
    if (interestTags) data.interestTags = interestTags;

    const updated = await db.customer.update({ where: { id: customer.id }, data });

    // Re-generate embedding if drink or tags changed
    if (favoriteDrink || interestTags || newName) {
      try {
        const embedding = await generateCustomerEmbedding({
          name: updated.name,
          favoriteDrink: updated.favoriteDrink,
          interestTags: updated.interestTags,
        });
        await upsertCustomerEmbedding(updated.id, embedding);
      } catch (err) {
        console.warn("[update_customer] Embedding re-generation failed:", err);
      }
    }

    return JSON.stringify({ success: true, customer: { id: updated.id, name: updated.name, contact: updated.contact, favoriteDrink: updated.favoriteDrink, interestTags: updated.interestTags } });
  },
  {
    name: "update_customer",
    description: "Update data pelanggan yang sudah ada. Cari by nama, bisa update nama, kontak, minuman favorit, dan tags. Otomatis regenerate embedding.",
    schema: z.object({
      name: z.string().describe("Nama pelanggan yang ingin diupdate (pencarian case-insensitive)"),
      newName: z.string().optional().describe("Nama baru (opsional)"),
      contact: z.string().optional().describe("Email atau telepon baru"),
      favoriteDrink: z.string().optional().describe("Minuman favorit baru"),
      interestTags: z.array(z.string()).optional().describe("Tags baru (akan menggantikan tags lama)"),
    }),
  },
);

/**
 * All tools array — used by the LangChain agent.
 */
export const ALL_TOOLS = [
  semanticSearchCustomersTool,
  generatePromoTool,
  searchCustomersTool,
  getCustomerStatsTool,
  analyzeSegmentsTool,
  getCustomerGrowthTool,
  getPromoHistoryTool,
  findTopCustomersTool,
  compareSegmentsTool,
  getDrinkAnalysisTool,
  suggestNewPromoTool,
  createCustomerTool,
  updateCustomerTool,
];
