import { Redis } from "@upstash/redis";

/**
 * Upstash Redis client (serverless, HTTP-based).
 * Used for: system prompt cache, distributed rate limiting.
 * Requires: UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN in .env
 */
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});
