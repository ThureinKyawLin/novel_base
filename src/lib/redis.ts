import Redis from "ioredis";

// ============================================
// Redis Client Singleton
// ============================================

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

function createRedisClient(): Redis | null {
  const url = process.env.REDIS_URL;
  if (!url) {
    console.warn("⚠️  REDIS_URL not set — caching disabled, using in-memory fallback");
    return null;
  }

  try {
    const client = new Redis(url, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 5) return null; // Stop retrying after 5 attempts
        return Math.min(times * 200, 2000);
      },
      lazyConnect: true,
      enableOfflineQueue: false,
    });

    client.on("error", (err) => {
      console.error("Redis connection error:", err.message);
    });

    client.connect().catch(() => {
      // Silently handle initial connection failure — will retry on next operation
    });

    return client;
  } catch {
    console.warn("⚠️  Failed to create Redis client — caching disabled");
    return null;
  }
}

export const redis: Redis | null =
  globalForRedis.redis ?? createRedisClient();

if (process.env.NODE_ENV !== "production" && redis) {
  globalForRedis.redis = redis;
}

// ============================================
// Cache Helpers (graceful fallback on failure)
// ============================================

/**
 * Get a cached value by key. Returns null on miss or Redis failure.
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!redis) return null;
  try {
    const data = await redis.get(key);
    if (!data) return null;
    return JSON.parse(data) as T;
  } catch {
    return null;
  }
}

/**
 * Set a cached value with TTL in seconds.
 */
export async function cacheSet(
  key: string,
  value: unknown,
  ttlSeconds: number
): Promise<void> {
  if (!redis) return;
  try {
    await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
  } catch {
    // Cache write failure is non-fatal
  }
}

/**
 * Delete one or more specific cache keys.
 */
export async function cacheInvalidate(...keys: string[]): Promise<void> {
  if (!redis || keys.length === 0) return;
  try {
    await redis.del(...keys);
  } catch {
    // Invalidation failure is non-fatal
  }
}

/**
 * Delete all keys matching a pattern (e.g. "api:novels:*").
 * Uses SCAN to avoid blocking Redis.
 */
export async function cacheInvalidatePattern(pattern: string): Promise<void> {
  if (!redis) return;
  try {
    let cursor = "0";
    do {
      const [nextCursor, keys] = await redis.scan(
        cursor,
        "MATCH",
        pattern,
        "COUNT",
        100
      );
      cursor = nextCursor;
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } while (cursor !== "0");
  } catch {
    // Pattern invalidation failure is non-fatal
  }
}

/**
 * Invalidate all novel-related caches (API + server components).
 * Call after any novel create/update/delete.
 */
export async function invalidateNovelCaches(novelId?: string): Promise<void> {
  await Promise.all([
    cacheInvalidatePattern("api:novels:*"),
    cacheInvalidate("api:stats"),
    cacheInvalidatePattern("cache:novels:*"),
    cacheInvalidate("cache:home"),
    ...(novelId
      ? [
          cacheInvalidate(`api:novel:${novelId}`),
          cacheInvalidate(`cache:novel:${novelId}`),
        ]
      : []),
  ]);
}

/**
 * Invalidate all genre-related caches.
 * Call after any genre create/update/delete.
 */
export async function invalidateGenreCaches(): Promise<void> {
  await Promise.all([
    cacheInvalidate("api:genres"),
    cacheInvalidate("cache:genres"),
    // Genre changes affect novel displays too
    cacheInvalidate("cache:home"),
  ]);
}
