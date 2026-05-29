import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Send,
  Users,
  Radio,
  ExternalLink,
  Pen,
  BookMarked,
  Hash,
  Languages,
  Clock,
  PlayCircle,
} from "lucide-react";
import Script from "next/script";
import { SiteHeader } from "@/components/site-header";
import { getCachedNovelDetail } from "@/lib/cached-queries";
import { SynopsisFontSizeControl, SynopsisText } from "@/components/synopsis-font-size";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

const translationStatusLabels: Record<string, { label: string; labelMm: string; color: string }> = {
  translating: { label: "Translating", labelMm: "ဘာသာပြန်ဆဲ", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  paused: { label: "Paused", labelMm: "ရပ်ထားတယ်", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
  completed: { label: "Completed", labelMm: "ပြီးပြီ", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  dropped: { label: "Dropped", labelMm: "ရပ်ပြီ", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
};

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return "today";
  if (days < 30) return `${days} day${days > 1 ? "s" : ""} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months > 1 ? "s" : ""} ago`;
  const years = Math.floor(months / 12);
  return `${years} year${years > 1 ? "s" : ""} ago`;
}

// Dynamic SEO metadata
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  if (!UUID_RE.test(id)) return { title: "Novel Not Found" };
  const novelMeta = await prisma.novel.findUnique({
    where: { id },
    select: { titleEn: true, titleMm: true, authorPenName: true, synopsis: true, novelStatus: true },
  });
  const novel = novelMeta ? {
    title_en: novelMeta.titleEn,
    title_mm: novelMeta.titleMm,
    author_pen_name: novelMeta.authorPenName,
    synopsis: novelMeta.synopsis,
    novel_status: novelMeta.novelStatus,
  } : null;

  if (!novel) return { title: "Novel Not Found" };

  const title = novel.title_mm
    ? `${novel.title_en} (${novel.title_mm}) | NovelBase`
    : `${novel.title_en} | NovelBase`;

  const description = novel.synopsis?.slice(0, 160) ||
    `${novel.title_en}${novel.author_pen_name ? ` by ${novel.author_pen_name}` : ""} - Myanmar Novelbase`;

  return {
    title,
    description,
    keywords: [
      novel.title_en,
      novel.title_mm,
      novel.author_pen_name,
      "myanmar novel",
      "မြန်မာ ဝတ္ထု",
      "novel",
      "ဘာသာပြန်",
    ].filter(Boolean) as string[],
    openGraph: {
      title,
      description,
      type: "book",
      url: `${SITE_URL}/novels/${id}`,
    },
    alternates: {
      canonical: `${SITE_URL}/novels/${id}`,
    },
  };
}

export default async function NovelDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const cached = await getCachedNovelDetail(id);
  if (!cached) notFound();

  const { novel: novelRaw, readingLinks: linksRaw } = cached;

  const readingLinks = linksRaw.map((l) => ({
    id: l.id,
    platform_name: l.platformName,
    url: l.url,
  }));

  // Map to snake_case for template compatibility
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
    last_translated_at: novelRaw.lastTranslatedAt,
    created_at: novelRaw.createdAt,
    updated_at: novelRaw.updatedAt,
    novel_genres: novelRaw.novelGenres.map((ng) => ({
      genre_id: ng.genreId,
      genres: { id: ng.genre.id, name: ng.genre.name, name_mm: ng.genre.nameMm },
    })),
  };

  const genres = (
    novel.novel_genres as {
      genre_id: string;
      genres: { id: string; name: string; name_mm: string | null };
    }[]
  )
    ?.map((ng) => ng.genres)
    .filter(Boolean) ?? [];

  const socialLinks = [
    { label: "Facebook Page", value: novel.fb_page_url, icon: ExternalLink },
    { label: "Telegram", value: novel.tg_username ? `https://t.me/${novel.tg_username.replace("@", "")}` : null, icon: Send, display: novel.tg_username },
    { label: "Telegram Group", value: novel.tg_group_url, icon: Users },
    { label: "Telegram Channel", value: novel.tg_channel_url, icon: Radio },
    { label: "Source", value: novel.source_url, icon: ExternalLink },
  ].filter((l) => l.value);

  const tStatus = novel.translation_status
    ? translationStatusLabels[novel.translation_status]
    : null;

  // JSON-LD structured data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Book",
    name: novel.title_en,
    alternateName: novel.title_mm || undefined,
    author: novel.author_pen_name
      ? { "@type": "Person", name: novel.author_pen_name }
      : undefined,
    description: novel.synopsis || undefined,
    genre: genres.map((g) => g.name),
    inLanguage: "my",
    url: `${SITE_URL}/novels/${id}`,
  };

  return (
    <div className="min-h-screen bg-background">
      {/* JSON-LD */}
      <Script
        id="novel-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <SiteHeader />

      <div className="container mx-auto px-4 py-6 sm:py-8 max-w-4xl">
        <Button variant="ghost" size="sm" render={<Link href="/novels" />} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Browse
        </Button>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Cover + Title */}
            <div className="flex gap-5">
              {novel.cover_image_url && (
                <div className="shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={novel.cover_image_url}
                    alt={`${novel.title_en} cover`}
                    className="w-28 sm:w-36 rounded-lg border object-cover shadow-sm"
                  />
                </div>
              )}
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold line-clamp-3">{novel.title_en}</h1>
                {novel.title_mm && (
                  <p className="text-lg sm:text-xl text-muted-foreground mt-1 font-mm line-clamp-2">
                    {novel.title_mm}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {novel.author_pen_name && (
                <div className="flex items-center gap-2 text-sm">
                  <Pen className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{novel.author_pen_name}</span>
                </div>
              )}
              {novel.translator_name && (
                <div className="flex items-center gap-2 text-sm">
                  <Languages className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Translated by</span>
                  <span className="font-medium">{novel.translator_name}</span>
                </div>
              )}
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                  novel.novel_status === "completed"
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : novel.novel_status === "ongoing"
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                    : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                }`}
              >
                {novel.novel_status}
              </span>
              {novel.chapters_count != null && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Hash className="h-4 w-4" />
                  {novel.chapters_count} chapters
                </div>
              )}
            </div>

            {genres.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {genres.map((g) => (
                  <Link key={g.id} href={`/novels?genre=${g.id}`}>
                    <Badge
                      variant="secondary"
                      className="cursor-pointer hover:bg-primary/10"
                    >
                      {g.name}
                      {g.name_mm && (
                        <span className="ml-1 text-muted-foreground">
                          ({g.name_mm})
                        </span>
                      )}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}

            {/* Translation status */}
            {tStatus && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Languages className="h-5 w-5" />
                    Translation
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${tStatus.color}`}>
                      {tStatus.label} / {tStatus.labelMm}
                    </span>
                    {novel.translated_chapters != null && (
                      <span className="text-sm text-muted-foreground">
                        {novel.translated_chapters} chapters translated
                        {novel.chapters_count ? ` / ${novel.chapters_count} total` : ""}
                      </span>
                    )}
                  </div>
                  {novel.last_translated_at && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      Last updated {timeAgo(novel.last_translated_at)}
                    </div>
                  )}
                  {novel.translation_note && (
                    <p className="text-sm text-muted-foreground bg-muted rounded-md p-3">
                      {novel.translation_note}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {novel.synopsis && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BookMarked className="h-5 w-5" />
                    Synopsis
                    <SynopsisFontSizeControl />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <SynopsisText text={novel.synopsis} />
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Where to Read */}
            {readingLinks.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <PlayCircle className="h-5 w-5" />
                    Where to Read
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {readingLinks.map((link) => (
                    <a
                      key={link.id}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between rounded-md border p-3 text-sm hover:bg-muted transition-colors"
                    >
                      <span className="font-medium">{link.platform_name}</span>
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                    </a>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Social Links */}
            {socialLinks.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Social Links</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {socialLinks.map((link, i) => (
                    <a
                      key={i}
                      href={link.value!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-md border p-3 text-sm hover:bg-muted transition-colors"
                    >
                      <link.icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium">{link.label}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {link.display || link.value}
                        </div>
                      </div>
                      <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    </a>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Added</span>
                  <span>{new Date(novel.created_at).toLocaleDateString()}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Updated</span>
                  <span>{new Date(novel.updated_at).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
