import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { NovelForm } from "@/components/admin/novel-form";

export default async function EditNovelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [novelRaw, genresRaw, linksRaw] = await Promise.all([
    prisma.novel.findUnique({
      where: { id },
      include: { novelGenres: { select: { genreId: true } } },
    }),
    prisma.genre.findMany({ orderBy: { name: "asc" } }),
    prisma.readingLink.findMany({
      where: { novelId: id },
      orderBy: { createdAt: "asc" },
      select: { platformName: true, url: true },
    }),
  ]);

  if (!novelRaw) {
    notFound();
  }

  // Map to snake_case format expected by NovelForm
  const novel = {
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
    extra_info: novelRaw.extraInfo as Record<string, unknown>,
    created_by: novelRaw.createdBy,
    updated_by: novelRaw.updatedBy,
    created_at: novelRaw.createdAt.toISOString(),
    updated_at: novelRaw.updatedAt.toISOString(),
  };

  const initialGenreIds = novelRaw.novelGenres.map((ng) => ng.genreId);

  const genres = genresRaw.map((g) => ({
    id: g.id,
    name: g.name,
    name_mm: g.nameMm,
    created_at: g.createdAt.toISOString(),
  }));

  const initialReadingLinks = linksRaw.map((l) => ({
    platform_name: l.platformName,
    url: l.url,
  }));

  return (
    <NovelForm
      novel={novel}
      genres={genres}
      initialGenreIds={initialGenreIds}
      initialReadingLinks={initialReadingLinks}
    />
  );
}
