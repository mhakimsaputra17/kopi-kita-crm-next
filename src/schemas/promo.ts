import { z } from "zod";

export const promoCampaignSchema = z.object({
  theme: z.string(),
  segment: z.string(),
  customerCount: z.number(),
  whyNow: z.string(),
  message: z.string(),
  timeWindow: z.string().optional(),
});

export const promoOutputSchema = z.object({
  campaigns: z.array(promoCampaignSchema).min(2).max(3),
});

export type PromoCampaign = z.infer<typeof promoCampaignSchema>;
export type PromoOutput = z.infer<typeof promoOutputSchema>;
