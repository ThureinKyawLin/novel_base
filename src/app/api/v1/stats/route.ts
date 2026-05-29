import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { rateLimitAsync, getClientIp } from "@/lib/rate-limit";
import { cacheGet, cacheSet } from "@/lib/redis";

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const limiter = await rateLimitAsync(`stats:${ip}`, { maxRequests: 30, windowMs: 60_000 });
  if (!limiter.success) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(limiter.retryAfter ?? 60) } }
    );
  }

  // Check Redis cache
  const cacheKey = "api:stats";
  const cached = await cacheGet<object>(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  const [novelsCount, genresCount] = await Promise.all([
    prisma.novel.count(),
    prisma.genre.count(),
  ]);

  const responseData = {
    data: {
      total_novels: novelsCount,
      total_genres: genresCount,
    },
  };

  await cacheSet(cacheKey, responseData, 60); // 1 minute

  return NextResponse.json(responseData);
}
