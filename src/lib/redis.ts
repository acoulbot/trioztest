import Redis from "ioredis";

const globalForRedis = globalThis as unknown as { redis?: Redis };

function createRedisClient(): Redis {
  const url = process.env.REDIS_URL || "redis://localhost:6379";
  return new Redis(url, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      if (times > 10) return null;
      return Math.min(times * 200, 2000);
    },
    lazyConnect: true,
  });
}

export const redis: Redis = globalForRedis.redis ?? createRedisClient();

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}

export async function connectRedis(): Promise<boolean> {
  try {
    if (redis.status === "ready") return true;
    await redis.connect();
    return true;
  } catch {
    console.warn("[Redis] Connection failed, falling back to in-memory");
    return false;
  }
}
