import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SubmitForm } from "./submit-form";
import { getCachedGenres } from "@/lib/cached-queries";

export const metadata = {
  title: "Submit a Novel | NovelBase",
  description: "Submit a novel to the Myanmar Novelbase for review.",
};

export default async function SubmitPage() {
  const genresRaw = await getCachedGenres();
  const genres = genresRaw.map((g) => ({
    id: g.id,
    name: g.name,
    name_mm: g.nameMm,
    created_at: "", // not used by SubmitForm
  }));

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteHeader active="submit" />

      <div className="container mx-auto px-4 py-8 sm:py-12 max-w-2xl flex-1">
        <SubmitForm genres={genres ?? []} />
      </div>

      <SiteFooter />
    </div>
  );
}
