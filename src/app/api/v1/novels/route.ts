import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { rateLimitAsync, getClientIp } from "@/lib/rate-limit";
import { cacheGet, cacheSet } from "@/lib/redis";
import type { Prisma } from "@/generated/prisma/client";

const VALID_STATUSES = ["ongoing", "completed", "dropped"];

export async function GET(request: NextRequest) {
  // Rate limit: 60 requests per minute per IP
  const ip = getClientIp(request);
  const limiter = await rateLimitAsync(`novels:${ip}`, { maxRequests: 60, windowMs: 60_000 });
  if (!limiter.success) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(limiter.retryAfter ?? 60) } }
    );
  }
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const perPage = Math.min(100, Math.max(1, Number(searchParams.get("per_page")) || 20));
  const rawQuery = (searchParams.get("q") || "").slice(0, 200);
  const genre = searchParams.get("genre") || "";
  const status = searchParams.get("status") || "";

  // Validate status enum
  if (status && !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
  }

  // Build cache key from query params
  const cacheKey = `api:novels:${page}:${perPage}:${rawQuery}:${genre}:${status}`;
  const cached = await cacheGet<object>(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  try {
    const where: Prisma.NovelWhereInput = {};

    if (rawQuery) {
      where.OR = [
        { titleEn: { contains: rawQuery, mode: "insensitive" } },
        { titleMm: { contains: rawQuery, mode: "insensitive" } },
        { authorPenName: { contains: rawQuery, mode: "insensitive" } },
        { translatorName: { contains: rawQuery, mode: "insensitive" } },
      ];
    }

    if (status) {
      where.novelStatus = status as "ongoing" | "completed" | "dropped";
    }

    if (genre) {
      where.novelGenres = { some: { genreId: genre } };
    }

    const [novelsRaw, total] = await Promise.all([
      prisma.novel.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
        include: {
          novelGenres: { include: { genre: { select: { id: true, name: true, nameMm: true } } } },
        },
      }),
      prisma.novel.count({ where }),
    ]);

    const cleanNovels = novelsRaw.map((n) => {
      const genres = n.novelGenres
        .map((ng) => ({ id: ng.genre.id, name: ng.genre.name, name_mm: ng.genre.nameMm }))
        .filter(Boolean);

      return {
        id: n.id,
        title_en: n.titleEn,
        title_mm: n.titleMm,
        author_pen_name: n.authorPenName,
        translator_name: n.translatorName,
        synopsis: n.synopsis,
        cover_image_url: n.coverImageUrl,
        fb_page_url: n.fbPageUrl,
        tg_username: n.tgUsername,
        tg_group_url: n.tgGroupUrl,
        tg_channel_url: n.tgChannelUrl,
        novel_status: n.novelStatus,
        chapters_count: n.chaptersCount,
        source_url: n.sourceUrl,
        translation_status: n.translationStatus,
        translation_note: n.translationNote,
        translated_chapters: n.translatedChapters,
        last_translated_at: n.lastTranslatedAt?.toISOString() ?? null,
        extra_info: n.extraInfo,
        created_at: n.createdAt.toISOString(),
        updated_at: n.updatedAt.toISOString(),
        genres,
      };
    });

    const responseData = {
      data: cleanNovels,
      total,
      page,
      per_page: perPage,
      total_pages: Math.ceil(total / perPage),
    };

    // Cache for 60 seconds
    await cacheSet(cacheKey, responseData, 60);

    return NextResponse.json(responseData);
  } catch (e) {
    console.error("Novels API error:", e);
    return NextResponse.json({ error: "Failed to fetch novels" }, { status: 500 });
  }
}
