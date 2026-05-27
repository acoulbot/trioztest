import { LRUCache } from "lru-cache";
import { NextRequest, NextResponse } from "next/server";
import { redis } from "./redis";

type RateLimitOptions = {
  limit: number;
  windowMs: number;
};

const memoryCounters = new LRUCache<string, number[]>({ max: 10_000 });

function buildResponse(limit: number, windowMs: number): NextResponse {
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

async function rateLimitRedis(
  cacheKey: string,
  limit: number,
  windowMs: number
): Promise<boolean> {
  try {
    if (redis.status !== "ready") throw new Error("not connected");
    const windowSec = Math.ceil(windowMs / 1000);
    const current = await redis.incr(cacheKey);
    if (current === 1) {
      await redis.expire(cacheKey, windowSec);
    }
    return current > limit;
  } catch {
    return false;
  }
}

function rateLimitMemory(cacheKey: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const windowStart = now - windowMs;
  const timestamps = (memoryCounters.get(cacheKey) ?? []).filter((t) => t > windowStart);
  timestamps.push(now);
  memoryCounters.set(cacheKey, timestamps);
  return timestamps.length > limit;
}

export async function rateLimit(
  req: NextRequest,
  key: string,
  { limit, windowMs }: RateLimitOptions
): Promise<NextResponse | null> {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  const cacheKey = `rl:${key}:${ip}`;

  const redisResult = await rateLimitRedis(cacheKey, limit, windowMs);
  // Use Redis if available (returned a definitive answer), otherwise fall back to in-memory
  const exceeded = redis.status === "ready"
    ? redisResult
    : rateLimitMemory(cacheKey, limit, windowMs);

  return exceeded ? buildResponse(limit, windowMs) : null;
}
