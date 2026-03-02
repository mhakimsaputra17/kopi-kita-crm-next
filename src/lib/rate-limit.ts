/**
 * Distributed rate limiter using Upstash Redis.
 * PRD §9.3: AI endpoints rate limiting.
 * Sliding window algorithm — accurate across serverless instances.
 */

import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "@/lib/redis";

// Pre-configured limiters for different endpoints
const limiters = {
  chat: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, "600 s"),
    prefix: "ratelimit:chat",
  }),
  promo: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "600 s"),
    prefix: "ratelimit:promo",
  }),
};

type LimiterName = keyof typeof limiters;

export async function rateLimit(key: string, limiterName: LimiterName = "chat") {
  const limiter = limiters[limiterName];
  const { success, remaining, reset } = await limiter.limit(key);
  const retryAfter = success ? 0 : Math.ceil((reset - Date.now()) / 1000);
  return { success, remaining, retryAfter };
}
