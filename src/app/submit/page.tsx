import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SubmitForm } from "./submit-form";

export const metadata = {
  title: "Submit a Novel | NovelBase",
  description: "Submit a novel to the Myanmar Novelbasefor review.",
};

export default async function SubmitPage() {
  const supabase = await createClient();
  const { data: genres } = await supabase
    .from("genres")
    .select("*")
    .order("name");

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
