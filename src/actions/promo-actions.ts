"use server";

import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { revalidatePath } from "next/cache";
import type { PromoCampaign } from "@/schemas/promo";

export async function savePromoCampaigns(campaigns: PromoCampaign[]) {
  await requireSession();

  if (!campaigns.length) {
    return { success: false, error: "No campaigns to save" };
  }

  const batch = await db.promoBatch.create({
    data: {
      campaigns: {
        create: campaigns.map((c) => ({
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

  revalidatePath("/dashboard");
  revalidatePath("/promo");
  return { success: true, batch };
}

export async function getLatestCampaigns(limit: number = 3) {
  await requireSession();

  return db.promoBatch.findMany({
    include: { campaigns: true },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getPromoInputData() {
  await requireSession();

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

  return {
    totalCustomers: customers.length,
    tagCounts,
    topDrinks: drinkCounts,
  };
}
