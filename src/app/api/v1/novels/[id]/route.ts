import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { uuidSchema } from "@/lib/validations";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = getClientIp(_request);
  const limiter = rateLimit(`novel-detail:${ip}`, { maxRequests: 60, windowMs: 60_000 });
  if (!limiter.success) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(limiter.retryAfter ?? 60) } }
    );
  }
  const { id } = await params;

  // Validate UUID format
  if (!uuidSchema.safeParse(id).success) {
    return NextResponse.json({ error: "Invalid novel ID" }, { status: 400 });
  }

  const supabase = await createClient();

  const [novelResult, linksResult] = await Promise.all([
    supabase
      .from("novels")
      .select("*, novel_genres(genre_id, genres(id, name, name_mm))")
      .eq("id", id)
      .single(),
    supabase
      .from("reading_links")
      .select("id, platform_name, url")
      .eq("novel_id", id)
      .order("created_at"),
  ]);

  const novel = novelResult.data;
  if (novelResult.error || !novel) {
    if (novelResult.error) console.error("Novel detail API error:", novelResult.error);
    return NextResponse.json({ error: "Novel not found" }, { status: 404 });
  }

  const genres = (
    novel.novel_genres as {
      genre_id: string;
      genres: { id: string; name: string; name_mm: string | null };
    }[]
  )
    ?.map((ng) => ng.genres)
    .filter(Boolean) ?? [];

  const { novel_genres, created_by, updated_by, ...rest } = novel;

  return NextResponse.json({
    data: { ...rest, genres, reading_links: linksResult.data ?? [] },
  });
}
