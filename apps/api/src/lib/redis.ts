import { Redis } from "ioredis";

export const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: 1,
});
redis.on("error", () => {});

export async function cached<T>(key: string, ttl: number, fn: () => Promise<T>): Promise<T> {
  try {
    const hit = await redis.get(key);
    if (hit) return JSON.parse(hit);
  } catch {}
  const val = await fn();
  redis.set(key, JSON.stringify(val), "EX", ttl).catch(() => {});
  return val;
}

export async function delPattern(pattern: string) {
  try {
    for await (const keys of redis.scanStream({ match: pattern })) {
      if (keys.length) await redis.del(...keys);
    }
  } catch {}
}
