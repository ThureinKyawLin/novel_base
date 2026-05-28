import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  SearchX,
  PlusCircle,
} from "lucide-react";
import { sanitizePostgrestValue } from "@/lib/validations";
import { SiteHeader } from "@/components/site-header";
import { NovelCard } from "@/components/novel-card";

const PER_PAGE = 24;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; genre?: string; status?: string }>;
}): Promise<Metadata> {
  const params = await searchParams;
  const parts: string[] = [];
  if (params.q) parts.push(`"${params.q}"`);
  if (params.status) parts.push(params.status);

  const title = parts.length > 0
    ? `Browse Novels - ${parts.join(" • ")}` 
    : "Browse Myanmar Novels - ဝတ္ထုများ ရှာဖွေပါ";

  const description = params.q
    ? `Search results for "${params.q}" in Myanmar novel data.`
    : "Browse and search Myanmar novels by title, author, genre, and status. မြန်မာ ဝတ္ထုများ ရှာဖွေပါ။";

  return {
    title,
    description,
    alternates: {
      canonical: `${SITE_URL}/novels`,
    },
    openGraph: {
      title: `${title} | NovelBase`,
      description,
      url: `${SITE_URL}/novels`,
    },
  };
}

export default async function NovelsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; genre?: string; page?: string; status?: string }>;
}) {
  const params = await searchParams;
  const query = params.q || "";
  const genreFilter = params.genre || "";
  const statusFilter = params.status || "";
  const page = Math.max(1, Number(params.page) || 1);

  const supabase = await createClient();

  // Get genres for filter
  const { data: genres } = await supabase.from("genres").select("*").order("name");

  // Build query
  let novelsQuery = supabase
    .from("novels")
    .select("*, novel_genres(genre_id, genres(id, name))", { count: "exact" });

  if (query) {
    const sanitized = sanitizePostgrestValue(query.slice(0, 200));
    if (sanitized) {
      novelsQuery = novelsQuery.or(
        `title_en.ilike.%${sanitized}%,title_mm.ilike.%${sanitized}%,author_pen_name.ilike.%${sanitized}%`
      );
    }
  }

  if (statusFilter) {
    novelsQuery = novelsQuery.eq("novel_status", statusFilter);
  }

  const { data: allNovels, count: totalCount } = await novelsQuery
    .order("created_at", { ascending: false })
    .range((page - 1) * PER_PAGE, page * PER_PAGE - 1);

  // Filter by genre client-side (Supabase doesn't support filtering on nested relations easily)
  let novels = allNovels ?? [];
  if (genreFilter) {
    novels = novels.filter((n) =>
      (n.novel_genres as { genre_id: string }[])?.some(
        (ng) => ng.genre_id === genreFilter
      )
    );
  }

  const total = totalCount ?? 0;
  const totalPages = Math.ceil(total / PER_PAGE);
  const activeGenre = genres?.find((g) => g.id === genreFilter);

  function buildUrl(overrides: Record<string, string>) {
    const p = new URLSearchParams();
    if (query) p.set("q", query);
    if (genreFilter) p.set("genre", genreFilter);
    if (statusFilter) p.set("status", statusFilter);
    Object.entries(overrides).forEach(([k, v]) => {
      if (v) p.set(k, v);
      else p.delete(k);
    });
    return `/novels?${p.toString()}`;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteHeader active="browse" />

      <div className="container mx-auto px-4 py-6 sm:py-8 flex-1">
        {/* Search bar */}
        <form className="flex max-w-lg gap-2 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              name="q"
              defaultValue={query}
              placeholder="Search by title or author..."
              className="pl-10"
            />
          </div>
          {genreFilter && <input type="hidden" name="genre" value={genreFilter} />}
          <Button type="submit">Search</Button>
        </form>

        {/* Genre + status filters */}
        <div className="flex flex-wrap gap-2 mb-4 sm:mb-6 overflow-x-auto pb-1">
          <Link href={buildUrl({ genre: "", page: "" })}>
            <Badge
              variant={!genreFilter ? "default" : "outline"}
              className="cursor-pointer px-3 py-1"
            >
              All
            </Badge>
          </Link>
          {genres?.map((genre) => (
            <Link key={genre.id} href={buildUrl({ genre: genre.id, page: "" })}>
              <Badge
                variant={genreFilter === genre.id ? "default" : "outline"}
                className="cursor-pointer px-3 py-1"
              >
                {genre.name}
              </Badge>
            </Link>
          ))}
        </div>

        {/* Status filter */}
        <div className="flex gap-2 mb-6 sm:mb-8 overflow-x-auto pb-1">
          {["", "ongoing", "completed", "dropped"].map((s) => (
            <Link key={s} href={buildUrl({ status: s, page: "" })}>
              <Badge
                variant={statusFilter === s ? "default" : "outline"}
                className="cursor-pointer capitalize px-3 py-1"
              >
                {s || "All Status"}
              </Badge>
            </Link>
          ))}
        </div>

        {/* Results info */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted-foreground">
            {total} novel{total !== 1 ? "s" : ""} found
            {query && ` for "${query}"`}
            {activeGenre && ` in ${activeGenre.name}`}
          </p>
        </div>

        {/* Novel grid */}
        <div className="grid gap-5 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {novels.map((novel) => {
            const novelGenres = (
              novel.novel_genres as {
                genre_id: string;
                genres: { id: string; name: string };
              }[]
            )
              ?.map((ng) => ng.genres)
              .filter(Boolean) ?? [];

            return (
              <NovelCard
                key={novel.id}
                novel={{
                  id: novel.id,
                  title_en: novel.title_en,
                  title_mm: novel.title_mm,
                  author_pen_name: novel.author_pen_name,
                  cover_image_url: novel.cover_image_url,
                  novel_status: novel.novel_status,
                  chapters_count: novel.chapters_count,
                  genres: novelGenres,
                }}
              />
            );
          })}
        </div>

        {novels.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 sm:py-24 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-5">
              <SearchX className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">No novels found</h3>
            <p className="mt-1.5 text-muted-foreground max-w-sm">
              {query
                ? `No results for "${query}". Try a different search term.`
                : "No novels match the current filters."}
            </p>
            <div className="flex gap-3 mt-5">
              <Button variant="outline" size="sm" render={<Link href="/novels" />}>
                Clear Filters
              </Button>
              <Button size="sm" render={<Link href="/submit" />}>
                <PlusCircle className="mr-1.5 h-4 w-4" />
                Submit Novel
              </Button>
            </div>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            {page > 1 && (
              <Button variant="outline" size="sm" render={<Link href={buildUrl({ page: String(page - 1) })} />}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
            )}
            <span className="text-sm text-muted-foreground px-4">
              Page {page} of {totalPages}
            </span>
            {page < totalPages && (
              <Button variant="outline" size="sm" render={<Link href={buildUrl({ page: String(page + 1) })} />}>
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
