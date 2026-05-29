import { prisma } from "@/lib/prisma";
import { GenresManager } from "@/components/admin/genres-manager";

export default async function AdminGenresPage() {
  const genresRaw = await prisma.genre.findMany({ orderBy: { name: "asc" } });
  const genres = genresRaw.map((g) => ({
    id: g.id,
    name: g.name,
    name_mm: g.nameMm,
    created_at: g.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Genres</h1>
      <GenresManager initialGenres={genres ?? []} />
    </div>
  );
}
