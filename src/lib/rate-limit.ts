import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Only initialize if env vars are present (graceful degradation in dev)
function createRedis() {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

const redis = createRedis();

function createLimiter(requests: number, window: `${number} ${"ms" | "s" | "m" | "h" | "d"}`) {
  if (!redis) return null;
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requests, window),
    analytics: false,
  });
}

// 10 requests per minute — for guest API routes
export const guestRateLimit = createLimiter(10, "1 m");

// 3 SMS per hour — per authenticated user
export const smsRateLimit = createLimiter(3, "1 h");

// 20 AI calls per hour — per authenticated user
export const aiRateLimit = createLimiter(20, "1 h");

// 5 guest profiles per hour per IP — prevents token farming
export const guestCreateRateLimit = createLimiter(5, "1 h");

export async function checkRateLimit(
  identifier: string,
  limiter: Ratelimit | null
): Promise<{ success: boolean; reset: number; remaining: number }> {
  if (!limiter) {
    // No Redis configured — allow all in dev
    return { success: true, reset: 0, remaining: 999 };
  }
  const result = await limiter.limit(identifier);
  return {
    success: result.success,
    reset: result.reset,
    remaining: result.remaining,
  };
}
