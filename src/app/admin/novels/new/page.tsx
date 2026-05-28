import { createClient } from "@/lib/supabase/server";
import { NovelForm } from "@/components/admin/novel-form";

export default async function NewNovelPage() {
  const supabase = await createClient();
  const { data: genres } = await supabase
    .from("genres")
    .select("*")
    .order("name");

  return <NovelForm genres={genres ?? []} />;
}
