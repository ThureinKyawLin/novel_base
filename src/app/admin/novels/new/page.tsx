import { prisma } from "@/lib/prisma";
import { NovelForm } from "@/components/admin/novel-form";

export default async function NewNovelPage() {
  const genresRaw = await prisma.genre.findMany({ orderBy: { name: "asc" } });
  const genres = genresRaw.map((g) => ({
    id: g.id,
    name: g.name,
    name_mm: g.nameMm,
    created_at: g.createdAt.toISOString(),
  }));

  return <NovelForm genres={genres} />;
}
