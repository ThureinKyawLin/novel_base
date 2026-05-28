import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const limiter = rateLimit(`genres:${ip}`, { maxRequests: 60, windowMs: 60_000 });
  if (!limiter.success) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(limiter.retryAfter ?? 60) } }
    );
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("genres")
    .select("*")
    .order("name");

  if (error) {
    console.error("Genres API error:", error);
    return NextResponse.json({ error: "Failed to fetch genres" }, { status: 500 });
  }

  return NextResponse.json({ data });
}
