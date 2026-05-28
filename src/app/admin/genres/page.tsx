import { createClient } from "@/lib/supabase/server";
import { GenresManager } from "@/components/admin/genres-manager";

export default async function AdminGenresPage() {
  const supabase = await createClient();
  const { data: genres } = await supabase
    .from("genres")
    .select("*")
    .order("name");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Genres</h1>
      <GenresManager initialGenres={genres ?? []} />
    </div>
  );
}
