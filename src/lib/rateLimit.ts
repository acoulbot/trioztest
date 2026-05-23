import { LRUCache } from "lru-cache";
import { NextRequest, NextResponse } from "next/server";

type RateLimitOptions = {
  /** Maximum number of requests allowed in the window */
  limit: number;
  /** Window size in milliseconds */
  windowMs: number;
};

const counters = new LRUCache<string, number[]>({ max: 10_000 });

/**
 * Simple in-memory rate limiter based on IP + route key.
 * Returns a 429 NextResponse if the limit is exceeded, otherwise null.
 */
export function rateLimit(
  req: NextRequest,
  key: string,
  { limit, windowMs }: RateLimitOptions
): NextResponse | null {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  const cacheKey = `${key}:${ip}`;
  const now = Date.now();
  const windowStart = now - windowMs;

  const timestamps = (counters.get(cacheKey) ?? []).filter(
    (t) => t > windowStart
  );
  timestamps.push(now);
  counters.set(cacheKey, timestamps);

  if (timestamps.length > limit) {
    return NextResponse.json(
      { error: "Слишком много запросов. Попробуйте позже." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(windowMs / 1000)),
          "X-RateLimit-Limit": String(limit),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  return null;
}
