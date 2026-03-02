import { NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";

export async function POST() {
  let session;
  try {
    session = await requireSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // PRD §9.3: 5 requests per 10 minutes
  const limit = await rateLimit(`promo:${session.user.id}`, "promo");
  if (!limit.success) {
    return NextResponse.json(
      { error: "Terlalu banyak request. Coba lagi nanti." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  // TODO: Integrate with OpenAI when ready
  return NextResponse.json({
    campaigns: [
      {
        theme: "Promo Mingguan",
        segment: "Semua pelanggan",
        customerCount: 0,
        whyNow: "AI belum diaktifkan — fitur ini akan tersedia setelah integrasi OpenAI.",
        message: "Halo! Kopi spesial minggu ini menunggu kamu ☕",
        timeWindow: "Segera",
      },
    ],
  });
}
