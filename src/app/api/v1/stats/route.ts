import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const limiter = rateLimit(`stats:${ip}`, { maxRequests: 30, windowMs: 60_000 });
  if (!limiter.success) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(limiter.retryAfter ?? 60) } }
    );
  }
  const supabase = await createClient();

  const [novels, genres] = await Promise.all([
    supabase.from("novels").select("*", { count: "exact", head: true }),
    supabase.from("genres").select("*", { count: "exact", head: true }),
  ]);

  return NextResponse.json({
    data: {
      total_novels: novels.count ?? 0,
      total_genres: genres.count ?? 0,
    },
  });
}
