import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { uuidSchema } from "@/lib/validations";
import { rateLimitAsync, getClientIp } from "@/lib/rate-limit";
import { cacheGet, cacheSet } from "@/lib/redis";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = getClientIp(_request);
  const limiter = await rateLimitAsync(`novel-detail:${ip}`, { maxRequests: 60, windowMs: 60_000 });
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

  // Check Redis cache
  const cacheKey = `api:novel:${id}`;
  const cached = await cacheGet<object>(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  const [novelRaw, linksRaw] = await Promise.all([
    prisma.novel.findUnique({
      where: { id },
      include: {
        novelGenres: { include: { genre: { select: { id: true, name: true, nameMm: true } } } },
      },
    }),
    prisma.readingLink.findMany({
      where: { novelId: id },
      orderBy: { createdAt: "asc" },
      select: { id: true, platformName: true, url: true },
    }),
  ]);

  if (!novelRaw) {
    return NextResponse.json({ error: "Novel not found" }, { status: 404 });
  }

  const genres = novelRaw.novelGenres
    .map((ng) => ({ id: ng.genre.id, name: ng.genre.name, name_mm: ng.genre.nameMm }))
    .filter(Boolean);

  const reading_links = linksRaw.map((l) => ({
    id: l.id,
    platform_name: l.platformName,
    url: l.url,
  }));

  const responseData = {
    data: {
      id: novelRaw.id,
      title_en: novelRaw.titleEn,
      title_mm: novelRaw.titleMm,
      author_pen_name: novelRaw.authorPenName,
      translator_name: novelRaw.translatorName,
      synopsis: novelRaw.synopsis,
      cover_image_url: novelRaw.coverImageUrl,
      fb_page_url: novelRaw.fbPageUrl,
      tg_username: novelRaw.tgUsername,
      tg_group_url: novelRaw.tgGroupUrl,
      tg_channel_url: novelRaw.tgChannelUrl,
      novel_status: novelRaw.novelStatus,
      chapters_count: novelRaw.chaptersCount,
      source_url: novelRaw.sourceUrl,
      translation_status: novelRaw.translationStatus,
      translation_note: novelRaw.translationNote,
      translated_chapters: novelRaw.translatedChapters,
      last_translated_at: novelRaw.lastTranslatedAt?.toISOString() ?? null,
      extra_info: novelRaw.extraInfo,
      created_at: novelRaw.createdAt.toISOString(),
      updated_at: novelRaw.updatedAt.toISOString(),
      genres,
      reading_links,
    },
  };

  // Cache for 120 seconds
  await cacheSet(cacheKey, responseData, 120);

  return NextResponse.json(responseData);
}
