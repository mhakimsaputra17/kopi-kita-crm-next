/**
 * Distributed rate limiter using Upstash Redis.
 * PRD §9.3: AI endpoints rate limiting.
 * Sliding window algorithm — accurate across serverless instances.
 */

import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "@/lib/redis";

// Pre-configured limiters for different endpoints
// GitHub Models free tier: ~10 req/min/model. Use dual window to stay safe.
const limiters = {
  chat: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(8, "60 s"), // 8/min — stay under GitHub's ~10/min
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
