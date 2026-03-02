"use server";

import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { startOfWeek, endOfWeek } from "date-fns";

export async function getDashboardStats() {
  await requireSession();

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const [totalCustomers, customers, weekCampaigns] = await Promise.all([
    db.customer.count(),
    db.customer.findMany({ select: { interestTags: true } }),
    db.promoCampaign.findMany({
      where: { createdAt: { gte: weekStart, lte: weekEnd } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // Calculate tag counts
  const tagCounts: Record<string, number> = {};
  for (const c of customers) {
    for (const tag of c.interestTags) {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    }
  }

  const topInterests = Object.entries(tagCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([tag, count]) => ({ tag, count }));

  return {
    totalCustomers,
    totalTags: Object.keys(tagCounts).length,
    activeCampaigns: weekCampaigns.length,
    topInterests,
    weekCampaigns,
  };
}
