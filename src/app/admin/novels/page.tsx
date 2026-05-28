import { createClient } from "@/lib/supabase/server";
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
  const supabase = await createClient();

  const { data: novels } = await supabase
    .from("novels")
    .select(`
      *,
      novel_genres(genre_id, genres(id, name)),
      created_by_profile:profiles!novels_created_by_fkey(display_name)
    `)
    .order("created_at", { ascending: false });

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

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title (EN)</TableHead>
              <TableHead>Title (MM)</TableHead>
              <TableHead>Author</TableHead>
              <TableHead>Genres</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Added By</TableHead>
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
                      {novel.title_mm || "—"}
                    </TableCell>
                    <TableCell>{novel.author_pen_name || "—"}</TableCell>
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
                    <TableCell className="text-sm text-muted-foreground">
                      {(novel.created_by_profile as { display_name: string } | null)?.display_name ?? "—"}
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
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
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
