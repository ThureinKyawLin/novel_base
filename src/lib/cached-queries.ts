import { prisma } from "@/lib/prisma";
import { cacheGet, cacheSet } from "@/lib/redis";
import type { Prisma } from "@/generated/prisma/client";

// ============================================
// Genre list (used by browse filters, submit page, home)
// ============================================

export async function getCachedGenres() {
  const cacheKey = "cache:genres";
  const cached = await cacheGet<{ id: string; name: string; nameMm: string | null }[]>(cacheKey);
  if (cached) return cached;

  const genres = await prisma.genre.findMany({ orderBy: { name: "asc" } });
  const data = genres.map((g) => ({ id: g.id, name: g.name, nameMm: g.nameMm }));

  await cacheSet(cacheKey, data, 300); // 5 minutes
  return data;
}

// ============================================
// Homepage data (recent novels + count)
// ============================================

export async function getCachedHomeData() {
  const cacheKey = "cache:home";
  type HomeData = {
    novels: Awaited<ReturnType<typeof fetchHomeNovels>>;
    totalNovels: number;
  };

  const cached = await cacheGet<HomeData>(cacheKey);
  if (cached) return cached;

  const [novels, totalNovels] = await Promise.all([
    fetchHomeNovels(),
    prisma.novel.count(),
  ]);

  const data = { novels, totalNovels };
  await cacheSet(cacheKey, data, 60); // 1 minute
  return data;
}

async function fetchHomeNovels() {
  const raw = await prisma.novel.findMany({
    orderBy: { createdAt: "desc" },
    take: 12,
    include: {
      novelGenres: { include: { genre: { select: { id: true, name: true } } } },
    },
  });
  return raw.map((n) => ({
    id: n.id,
    titleEn: n.titleEn,
    titleMm: n.titleMm,
    authorPenName: n.authorPenName,
    translatorName: n.translatorName,
    coverImageUrl: n.coverImageUrl,
    novelStatus: n.novelStatus,
    chaptersCount: n.chaptersCount,
    novelGenres: n.novelGenres.map((ng) => ({
      genreId: ng.genreId,
      genre: { id: ng.genre.id, name: ng.genre.name },
    })),
  }));
}

// ============================================
// Browse page (paginated novels with filters)
// ============================================

export async function getCachedBrowseNovels(opts: {
  query: string;
  genreFilter: string;
  statusFilter: string;
  page: number;
  perPage: number;
}) {
  const { query, genreFilter, statusFilter, page, perPage } = opts;
  const cacheKey = `cache:novels:${page}:${perPage}:${query}:${genreFilter}:${statusFilter}`;

  type BrowseData = {
    novels: Awaited<ReturnType<typeof fetchBrowseNovels>>;
    totalCount: number;
  };

  const cached = await cacheGet<BrowseData>(cacheKey);
  if (cached) return cached;

  const where: Prisma.NovelWhereInput = {};

  if (query) {
    const searchTerm = query.slice(0, 200);
    where.OR = [
      { titleEn: { contains: searchTerm, mode: "insensitive" } },
      { titleMm: { contains: searchTerm, mode: "insensitive" } },
      { authorPenName: { contains: searchTerm, mode: "insensitive" } },
      { translatorName: { contains: searchTerm, mode: "insensitive" } },
    ];
  }
  if (statusFilter) {
    where.novelStatus = statusFilter as "ongoing" | "completed" | "dropped";
  }
  if (genreFilter) {
    where.novelGenres = { some: { genreId: genreFilter } };
  }

  const [novels, totalCount] = await Promise.all([
    fetchBrowseNovels(where, page, perPage),
    prisma.novel.count({ where }),
  ]);

  const data = { novels, totalCount };
  await cacheSet(cacheKey, data, 60); // 1 minute
  return data;
}

async function fetchBrowseNovels(
  where: Prisma.NovelWhereInput,
  page: number,
  perPage: number
) {
  const raw = await prisma.novel.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * perPage,
    take: perPage,
    include: {
      novelGenres: { include: { genre: { select: { id: true, name: true } } } },
    },
  });
  return raw.map((n) => ({
    id: n.id,
    titleEn: n.titleEn,
    titleMm: n.titleMm,
    authorPenName: n.authorPenName,
    translatorName: n.translatorName,
    coverImageUrl: n.coverImageUrl,
    novelStatus: n.novelStatus,
    chaptersCount: n.chaptersCount,
    novelGenres: n.novelGenres.map((ng) => ({
      genreId: ng.genreId,
      genre: { id: ng.genre.id, name: ng.genre.name },
    })),
  }));
}

// ============================================
// Novel detail
// ============================================

export async function getCachedNovelDetail(id: string) {
  const cacheKey = `cache:novel:${id}`;

  type DetailData = {
    novel: NonNullable<Awaited<ReturnType<typeof fetchNovelDetail>>>;
    readingLinks: { id: string; platformName: string; url: string }[];
  } | null;

  const cached = await cacheGet<DetailData>(cacheKey);
  if (cached) return cached;

  const [novel, linksRaw] = await Promise.all([
    fetchNovelDetail(id),
    prisma.readingLink.findMany({
      where: { novelId: id },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  if (!novel) return null;

  const readingLinks = linksRaw.map((l) => ({
    id: l.id,
    platformName: l.platformName,
    url: l.url,
  }));

  const data = { novel, readingLinks };
  await cacheSet(cacheKey, data, 120); // 2 minutes
  return data;
}

async function fetchNovelDetail(id: string) {
  const raw = await prisma.novel.findUnique({
    where: { id },
    include: {
      novelGenres: {
        include: { genre: { select: { id: true, name: true, nameMm: true } } },
      },
    },
  });
  if (!raw) return null;

  return {
    id: raw.id,
    titleEn: raw.titleEn,
    titleMm: raw.titleMm,
    authorPenName: raw.authorPenName,
    translatorName: raw.translatorName,
    synopsis: raw.synopsis,
    coverImageUrl: raw.coverImageUrl,
    fbPageUrl: raw.fbPageUrl,
    tgUsername: raw.tgUsername,
    tgGroupUrl: raw.tgGroupUrl,
    tgChannelUrl: raw.tgChannelUrl,
    novelStatus: raw.novelStatus,
    chaptersCount: raw.chaptersCount,
    sourceUrl: raw.sourceUrl,
    translationStatus: raw.translationStatus,
    translationNote: raw.translationNote,
    translatedChapters: raw.translatedChapters,
    lastTranslatedAt: raw.lastTranslatedAt?.toISOString() ?? null,
    createdAt: raw.createdAt.toISOString(),
    updatedAt: raw.updatedAt.toISOString(),
    novelGenres: raw.novelGenres.map((ng) => ({
      genreId: ng.genreId,
      genre: { id: ng.genre.id, name: ng.genre.name, nameMm: ng.genre.nameMm },
    })),
  };
}
