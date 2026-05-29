import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus } from "lucide-react";
import { NovelDeleteButton } from "@/components/admin/novel-delete-button";

export default async function AdminNovelsPage() {
  const novelsRaw = await prisma.novel.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      novelGenres: { include: { genre: { select: { id: true, name: true } } } },
      createdByProfile: { select: { displayName: true } },
    },
  });

  const novels = novelsRaw.map((n) => ({
    id: n.id,
    title_en: n.titleEn,
    title_mm: n.titleMm,
    author_pen_name: n.authorPenName,
    novel_status: n.novelStatus,
    novel_genres: n.novelGenres.map((ng) => ({ genre_id: ng.genreId, genres: { id: ng.genre.id, name: ng.genre.name } })),
    created_by_profile: n.createdByProfile ? { display_name: n.createdByProfile.displayName } : null,
  }));

  const statusColors: Record<string, string> = {
    ongoing: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    completed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    dropped: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Novels</h1>
        <Button render={<Link href="/admin/novels/new" />}>
          <Plus className="mr-2 h-4 w-4" />
          Add Novel
        </Button>
      </div>

      {/* Mobile: card layout */}
      <div className="space-y-3 md:hidden">
        {novels && novels.length > 0 ? (
          novels.map((novel) => {
            const genres = (novel.novel_genres as { genre_id: string; genres: { id: string; name: string } }[])
              ?.map((ng) => ng.genres)
              .filter(Boolean) ?? [];
            return (
              <div key={novel.id} className="rounded-lg border p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{novel.title_en}</p>
                    {novel.title_mm && (
                      <p className="text-sm text-muted-foreground truncate mt-0.5">{novel.title_mm}</p>
                    )}
                  </div>
                  <span
                    className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      statusColors[novel.novel_status] || ""
                    }`}
                  >
                    {novel.novel_status}
                  </span>
                </div>
                {novel.author_pen_name && (
                  <p className="text-sm text-muted-foreground">{novel.author_pen_name}</p>
                )}
                {genres.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {genres.slice(0, 3).map((g) => (
                      <Badge key={g.id} variant="secondary" className="text-xs">
                        {g.name}
                      </Badge>
                    ))}
                    {genres.length > 3 && (
                      <Badge variant="outline" className="text-xs">+{genres.length - 3}</Badge>
                    )}
                  </div>
                )}
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" size="sm" className="flex-1" render={<Link href={`/admin/novels/${novel.id}/edit`} />}>
                    Edit
                  </Button>
                  <NovelDeleteButton id={novel.id} title={novel.title_en} />
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-center py-8 text-muted-foreground">No novels yet. Add your first novel!</p>
        )}
      </div>

      {/* Desktop: table layout */}
      <div className="rounded-md border hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title (EN)</TableHead>
              <TableHead>Title (MM)</TableHead>
              <TableHead>Author</TableHead>
              <TableHead>Genres</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {novels && novels.length > 0 ? (
              novels.map((novel) => {
                const genres = (novel.novel_genres as { genre_id: string; genres: { id: string; name: string } }[])
                  ?.map((ng) => ng.genres)
                  .filter(Boolean) ?? [];
                return (
                  <TableRow key={novel.id}>
                    <TableCell className="font-medium max-w-[200px] truncate">
                      {novel.title_en}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {novel.title_mm || "\u2014"}
                    </TableCell>
                    <TableCell>{novel.author_pen_name || "\u2014"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {genres.slice(0, 3).map((g) => (
                          <Badge key={g.id} variant="secondary" className="text-xs">
                            {g.name}
                          </Badge>
                        ))}
                        {genres.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{genres.length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          statusColors[novel.novel_status] || ""
                        }`}
                      >
                        {novel.novel_status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" render={<Link href={`/admin/novels/${novel.id}/edit`} />}>
                          Edit
                        </Button>
                        <NovelDeleteButton id={novel.id} title={novel.title_en} />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No novels yet. Add your first novel!
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
