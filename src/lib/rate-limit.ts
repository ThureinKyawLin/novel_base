/**
 * Simple in-memory rate limiter using a sliding window.
 * Suitable for single-instance deployments.
 * For Cloudflare Pages, consider using Cloudflare's built-in rate limiting instead.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 60 seconds
let cleanupInterval: ReturnType<typeof setInterval> | null = null;

function startCleanup() {
  if (cleanupInterval) return;
  cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now > entry.resetAt) {
        store.delete(key);
      }
    }
  }, 60_000);
  // Don't prevent Node from exiting
  if (cleanupInterval && typeof cleanupInterval === "object" && "unref" in cleanupInterval) {
    cleanupInterval.unref();
  }
}

/**
 * Check rate limit for a given key (e.g. IP address).
 * Returns { success: true } if under limit, { success: false, retryAfter } if over.
 */
export function rateLimit(
  key: string,
  { maxRequests = 60, windowMs = 60_000 } = {}
): { success: boolean; retryAfter?: number } {
  startCleanup();

  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true };
  }

  entry.count++;

  if (entry.count > maxRequests) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return { success: false, retryAfter };
  }

  return { success: true };
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
