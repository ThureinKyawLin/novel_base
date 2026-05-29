"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createGenre, updateGenre, deleteGenre } from "@/app/admin/genres/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Genre } from "@/lib/types";

export function GenresManager({ initialGenres }: { initialGenres: Genre[] }) {
  const [genres, setGenres] = useState(initialGenres);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Genre | null>(null);
  const [name, setName] = useState("");
  const [nameMm, setNameMm] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  function openAdd() {
    setEditing(null);
    setName("");
    setNameMm("");
    setDialogOpen(true);
  }

  function openEdit(genre: Genre) {
    setEditing(genre);
    setName(genre.name);
    setNameMm(genre.name_mm ?? "");
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!name.trim()) return;
    setLoading(true);

    if (editing) {
      const result = await updateGenre(editing.id, { name: name.trim(), name_mm: nameMm.trim() || null });
      if (result.error) {
        toast.error(result.error);
        setLoading(false);
        return;
      }
      setGenres((prev) => prev.map((g) => (g.id === editing.id ? result.data! : g)));
      toast.success("Genre updated");
    } else {
      const result = await createGenre({ name: name.trim(), name_mm: nameMm.trim() || null });
      if (result.error) {
        toast.error(result.error);
        setLoading(false);
        return;
      }
      setGenres((prev) => [...prev, result.data!].sort((a, b) => a.name.localeCompare(b.name)));
      toast.success("Genre added");
    }

    setDialogOpen(false);
    setLoading(false);
    router.refresh();
  }

  async function handleDelete(genre: Genre) {
    if (!confirm(`Delete "${genre.name}"?`)) return;
    const result = await deleteGenre(genre.id);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    setGenres((prev) => prev.filter((g) => g.id !== genre.id));
    toast.success("Genre deleted");
    router.refresh();
  }

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={openAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Add Genre
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name (EN)</TableHead>
              <TableHead>Name (MM)</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {genres.map((genre) => (
              <TableRow key={genre.id}>
                <TableCell className="font-medium">{genre.name}</TableCell>
                <TableCell>{genre.name_mm || "—"}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEdit(genre)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(genre)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Genre" : "Add Genre"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name (English)</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Fantasy"
              />
            </div>
            <div className="space-y-2">
              <Label>Name (Myanmar)</Label>
              <Input
                value={nameMm}
                onChange={(e) => setNameMm(e.target.value)}
                placeholder="e.g. ဖန်တစီ"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading || !name.trim()}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
