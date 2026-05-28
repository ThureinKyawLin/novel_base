import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { NovelForm } from "@/components/admin/novel-form";

export default async function EditNovelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [novelResult, genresResult, linksResult] = await Promise.all([
    supabase
      .from("novels")
      .select("*, novel_genres(genre_id)")
      .eq("id", id)
      .single(),
    supabase.from("genres").select("*").order("name"),
    supabase
      .from("reading_links")
      .select("platform_name, url")
      .eq("novel_id", id)
      .order("created_at"),
  ]);

  if (!novelResult.data) {
    notFound();
  }

  const initialGenreIds = (
    novelResult.data.novel_genres as { genre_id: string }[]
  ).map((ng) => ng.genre_id);

  return (
    <NovelForm
      novel={novelResult.data}
      genres={genresResult.data ?? []}
      initialGenreIds={initialGenreIds}
      initialReadingLinks={linksResult.data ?? []}
    />
  );
}
