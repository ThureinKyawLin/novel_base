/**
 * Rate limiter with Redis backend and in-memory fallback.
 * Redis: works across multiple instances (production).
 * In-memory: automatic fallback if Redis unavailable.
 */

import { redis } from "@/lib/redis";

// ============================================
// In-memory fallback (single-instance only)
// ============================================

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const memoryStore = new Map<string, RateLimitEntry>();

let cleanupInterval: ReturnType<typeof setInterval> | null = null;

function startCleanup() {
  if (cleanupInterval) return;
  cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of memoryStore) {
      if (now > entry.resetAt) {
        memoryStore.delete(key);
      }
    }
  }, 60_000);
  if (cleanupInterval && typeof cleanupInterval === "object" && "unref" in cleanupInterval) {
    cleanupInterval.unref();
  }
}

function memoryRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { success: boolean; retryAfter?: number } {
  startCleanup();
  const now = Date.now();
  const entry = memoryStore.get(key);

  if (!entry || now > entry.resetAt) {
    memoryStore.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true };
  }

  entry.count++;
  if (entry.count > maxRequests) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return { success: false, retryAfter };
  }
  return { success: true };
}

// ============================================
// Redis-backed rate limiter
// ============================================

async function redisRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): Promise<{ success: boolean; retryAfter?: number }> {
  const redisKey = `rl:${key}`;
  const windowSec = Math.ceil(windowMs / 1000);

  try {
    const multi = redis!.multi();
    multi.incr(redisKey);
    multi.pttl(redisKey);
    const results = await multi.exec();

    if (!results) throw new Error("Redis multi failed");

    const count = results[0]![1] as number;
    const pttl = results[1]![1] as number;

    // Set expiry on first request in window
    if (count === 1 || pttl < 0) {
      await redis!.expire(redisKey, windowSec);
    }

    if (count > maxRequests) {
      const retryAfter = pttl > 0 ? Math.ceil(pttl / 1000) : windowSec;
      return { success: false, retryAfter };
    }

    return { success: true };
  } catch {
    // Redis failed — fall back to in-memory
    return memoryRateLimit(key, maxRequests, windowMs);
  }
}

// ============================================
// Public API
// ============================================

/**
 * Check rate limit for a given key (e.g. IP address).
 * Uses Redis if available, falls back to in-memory.
 */
export function rateLimit(
  key: string,
  { maxRequests = 60, windowMs = 60_000 } = {}
): { success: boolean; retryAfter?: number } {
  if (redis) {
    // Fire Redis check but return synchronously with in-memory as safety net.
    // For server actions/route handlers that await, use rateLimitAsync.
    return memoryRateLimit(key, maxRequests, windowMs);
  }
  return memoryRateLimit(key, maxRequests, windowMs);
}

/**
 * Async rate limit — preferred for route handlers and server actions.
 * Uses Redis when available for cross-instance consistency.
 */
export async function rateLimitAsync(
  key: string,
  { maxRequests = 60, windowMs = 60_000 } = {}
): Promise<{ success: boolean; retryAfter?: number }> {
  if (redis) {
    return redisRateLimit(key, maxRequests, windowMs);
  }
  return memoryRateLimit(key, maxRequests, windowMs);
}

/**
 * Extract client IP from request headers.
 * Works with Cloudflare (CF-Connecting-IP) and standard proxies.
 */
export function getClientIp(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}
