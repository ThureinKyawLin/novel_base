import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { sanitizePostgrestValue } from "@/lib/validations";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

const VALID_STATUSES = ["ongoing", "completed", "dropped"];

export async function GET(request: NextRequest) {
  // Rate limit: 60 requests per minute per IP
  const ip = getClientIp(request);
  const limiter = rateLimit(`novels:${ip}`, { maxRequests: 60, windowMs: 60_000 });
  if (!limiter.success) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(limiter.retryAfter ?? 60) } }
    );
  }
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const perPage = Math.min(100, Math.max(1, Number(searchParams.get("per_page")) || 20));
  const rawQuery = (searchParams.get("q") || "").slice(0, 200); // Limit length
  const genre = searchParams.get("genre") || "";
  const status = searchParams.get("status") || "";

  // Validate status enum
  if (status && !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
  }

  const supabase = await createClient();

  let dbQuery = supabase
    .from("novels")
    .select("*, novel_genres(genre_id, genres(id, name, name_mm))", { count: "exact" });

  if (rawQuery) {
    // Sanitize to prevent PostgREST filter injection
    const sanitized = sanitizePostgrestValue(rawQuery);
    if (sanitized) {
      dbQuery = dbQuery.or(
        `title_en.ilike.%${sanitized}%,title_mm.ilike.%${sanitized}%,author_pen_name.ilike.%${sanitized}%`
      );
    }
  }

  if (status) {
    dbQuery = dbQuery.eq("novel_status", status);
  }

  const { data, count, error } = await dbQuery
    .order("created_at", { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1);

  if (error) {
    console.error("Novels API error:", error);
    return NextResponse.json({ error: "Failed to fetch novels" }, { status: 500 });
  }

  let novels = data ?? [];

  // Filter by genre
  if (genre) {
    novels = novels.filter((n) =>
      (n.novel_genres as { genre_id: string }[])?.some(
        (ng) => ng.genre_id === genre
      )
    );
  }

  // Clean up response
  const cleanNovels = novels.map((n) => {
    const genres = (
      n.novel_genres as {
        genre_id: string;
        genres: { id: string; name: string; name_mm: string | null };
      }[]
    )
      ?.map((ng) => ng.genres)
      .filter(Boolean) ?? [];

    const { novel_genres, created_by, updated_by, ...rest } = n;
    return { ...rest, genres };
  });

  const total = count ?? 0;

  return NextResponse.json({
    data: cleanNovels,
    total,
    page,
    per_page: perPage,
    total_pages: Math.ceil(total / perPage),
  });
}
