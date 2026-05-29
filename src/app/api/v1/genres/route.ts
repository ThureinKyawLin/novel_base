import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { rateLimitAsync, getClientIp } from "@/lib/rate-limit";
import { cacheGet, cacheSet } from "@/lib/redis";

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const limiter = await rateLimitAsync(`genres:${ip}`, { maxRequests: 60, windowMs: 60_000 });
  if (!limiter.success) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(limiter.retryAfter ?? 60) } }
    );
  }

  // Check Redis cache
  const cacheKey = "api:genres";
  const cached = await cacheGet<object>(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  try {
    const genresRaw = await prisma.genre.findMany({ orderBy: { name: "asc" } });
    const data = genresRaw.map((g) => ({
      id: g.id,
      name: g.name,
      name_mm: g.nameMm,
      created_at: g.createdAt.toISOString(),
    }));

    const responseData = { data };
    await cacheSet(cacheKey, responseData, 300); // 5 minutes

    return NextResponse.json(responseData);
  } catch (e) {
    console.error("Genres API error:", e);
    return NextResponse.json({ error: "Failed to fetch genres" }, { status: 500 });
  }
}
