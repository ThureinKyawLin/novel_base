import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, PlusCircle, BookMarked } from "lucide-react";
import Script from "next/script";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { HomeHero } from "@/components/home-hero";
import { NovelCard } from "@/components/novel-card";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export default async function HomePage() {
  const supabase = await createClient();

  const [novelsResult, genresResult, countResult] = await Promise.all([
    supabase
      .from("novels")
      .select("*, novel_genres(genre_id, genres(id, name))")
      .order("created_at", { ascending: false })
      .limit(12),
    supabase.from("genres").select("*").order("name"),
    supabase.from("novels").select("*", { count: "exact", head: true }),
  ]);

  const novels = novelsResult.data ?? [];
  const genres = genresResult.data ?? [];
  const totalNovels = countResult.count ?? 0;
  const hasNovels = novels.length > 0;

  // WebSite structured data for Google sitelinks search box
  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "NovelBase",
    alternateName: "NovelBase Myanmar Novelbase",
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/novels?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* JSON-LD */}
      <Script
        id="website-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />

      <SiteHeader active="home" showAdmin />
      <HomeHero totalNovels={totalNovels} />

      {/* Genre filters */}
      {genres.length > 0 && (
        <section className="border-b">
          <div className="container mx-auto px-4 py-5">
            <div className="flex flex-wrap gap-2 justify-center">
              {genres.map((genre) => (
                <Link key={genre.id} href={`/novels?genre=${genre.id}`}>
                  <Badge
                    variant="outline"
                    className="cursor-pointer hover:bg-primary/10 transition-colors px-3 py-1"
                  >
                    {genre.name}
                  </Badge>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Recent novels or empty state */}
      <section className="container mx-auto px-4 py-10 sm:py-14 flex-1">
        {hasNovels ? (
          <>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl sm:text-2xl font-bold">Recent Novels</h2>
              <Button variant="ghost" size="sm" render={<Link href="/novels" />}>
                View All
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </div>
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
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 sm:py-24 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-6">
              <BookMarked className="h-10 w-10 text-muted-foreground" />
            </div>
            <h2 className="text-xl sm:text-2xl font-semibold">No novels yet</h2>
            <p className="mt-2 text-muted-foreground max-w-md">
              The directory is waiting for its first novel. Be the first to
              contribute!
            </p>
            <Button className="mt-6" render={<Link href="/submit" />}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Submit a Novel
            </Button>
          </div>
        )}
      </section>

      <SiteFooter />
    </div>
  );
}
