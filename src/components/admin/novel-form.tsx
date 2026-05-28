"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createNovel, updateNovel } from "@/app/admin/novels/actions";
import { ImageUpload } from "@/components/admin/image-upload";
import type { Novel, Genre, NovelFormData } from "@/lib/types";
import Link from "next/link";

interface NovelFormProps {
  novel?: Novel;
  genres: Genre[];
  initialGenreIds?: string[];
  initialReadingLinks?: { platform_name: string; url: string }[];
}

export function NovelForm({ novel, genres, initialGenreIds = [], initialReadingLinks = [] }: NovelFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedGenres, setSelectedGenres] = useState<string[]>(initialGenreIds);
  const [readingLinks, setReadingLinks] = useState<{ platform_name: string; url: string }[]>(initialReadingLinks);

  const [form, setForm] = useState({
    title_en: novel?.title_en ?? "",
    title_mm: novel?.title_mm ?? "",
    author_pen_name: novel?.author_pen_name ?? "",
    synopsis: novel?.synopsis ?? "",
    cover_image_url: novel?.cover_image_url ?? "",
    fb_page_url: novel?.fb_page_url ?? "",
    tg_username: novel?.tg_username ?? "",
    tg_group_url: novel?.tg_group_url ?? "",
    tg_channel_url: novel?.tg_channel_url ?? "",
    novel_status: novel?.novel_status ?? "ongoing",
    chapters_count: novel?.chapters_count ?? undefined,
    source_url: novel?.source_url ?? "",
    translation_status: novel?.translation_status ?? "translating",
    translation_note: novel?.translation_note ?? "",
    translated_chapters: novel?.translated_chapters ?? undefined,
    last_translated_at: novel?.last_translated_at?.split("T")[0] ?? "",
  });

  function updateField(field: string, value: string | number | undefined) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function toggleGenre(genreId: string) {
    setSelectedGenres((prev) =>
      prev.includes(genreId)
        ? prev.filter((id) => id !== genreId)
        : [...prev, genreId]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title_en.trim()) {
      toast.error("English title is required");
      return;
    }
    setLoading(true);

    const data: NovelFormData = {
      ...form,
      title_mm: form.title_mm || undefined,
      author_pen_name: form.author_pen_name || undefined,
      synopsis: form.synopsis || undefined,
      cover_image_url: form.cover_image_url || undefined,
      fb_page_url: form.fb_page_url || undefined,
      tg_username: form.tg_username || undefined,
      tg_group_url: form.tg_group_url || undefined,
      tg_channel_url: form.tg_channel_url || undefined,
      source_url: form.source_url || undefined,
      chapters_count: form.chapters_count ? Number(form.chapters_count) : undefined,
      novel_status: form.novel_status as "ongoing" | "completed" | "dropped",
      translation_status: form.translation_status as "translating" | "paused" | "completed" | "dropped" | undefined,
      translation_note: form.translation_note || undefined,
      translated_chapters: form.translated_chapters ? Number(form.translated_chapters) : undefined,
      last_translated_at: form.last_translated_at || undefined,
      genre_ids: selectedGenres,
      reading_links: readingLinks.filter((l) => l.platform_name && l.url),
    };

    const result = novel
      ? await updateNovel(novel.id, data)
      : await createNovel(data);

    if ("error" in result && result.error) {
      toast.error(result.error);
      setLoading(false);
      return;
    }

    toast.success(novel ? "Novel updated!" : "Novel created!");
    router.push("/admin/novels");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" render={<Link href="/admin/novels" />}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">
          {novel ? "Edit Novel" : "Add Novel"}
        </h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main info */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Novel Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="title_en">English Title *</Label>
                <Input
                  id="title_en"
                  value={form.title_en}
                  onChange={(e) => updateField("title_en", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="title_mm">Myanmar Title</Label>
                <Input
                  id="title_mm"
                  value={form.title_mm}
                  onChange={(e) => updateField("title_mm", e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="author_pen_name">Author / Pen Name</Label>
                <Input
                  id="author_pen_name"
                  value={form.author_pen_name}
                  onChange={(e) => updateField("author_pen_name", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="novel_status">Status</Label>
                <Select
                  value={form.novel_status}
                  onValueChange={(v) => updateField("novel_status", v ?? "ongoing")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ongoing">Ongoing</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="dropped">Dropped</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="synopsis">Synopsis</Label>
              <Textarea
                id="synopsis"
                rows={4}
                value={form.synopsis}
                onChange={(e) => updateField("synopsis", e.target.value)}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="chapters_count">Chapters Count</Label>
                <Input
                  id="chapters_count"
                  type="number"
                  value={form.chapters_count ?? ""}
                  onChange={(e) =>
                    updateField("chapters_count", e.target.value ? Number(e.target.value) : undefined)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="source_url">Source URL</Label>
                <Input
                  id="source_url"
                  type="url"
                  value={form.source_url}
                  onChange={(e) => updateField("source_url", e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </div>

            <ImageUpload
              value={form.cover_image_url}
              onChange={(url) => updateField("cover_image_url", url)}
            />
          </CardContent>
        </Card>

        {/* Translation info */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Translation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="translation_status">Translation Status</Label>
                <Select
                  value={form.translation_status}
                  onValueChange={(v) => updateField("translation_status", v ?? "translating")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="translating">Translating</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="dropped">Dropped</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="translated_chapters">Translated Chapters</Label>
                <Input
                  id="translated_chapters"
                  type="number"
                  value={form.translated_chapters ?? ""}
                  onChange={(e) =>
                    updateField("translated_chapters", e.target.value ? Number(e.target.value) : undefined)
                  }
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="last_translated_at">Last Translated Date</Label>
                <Input
                  id="last_translated_at"
                  type="date"
                  value={form.last_translated_at}
                  onChange={(e) => updateField("last_translated_at", e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="translation_note">Translation Note</Label>
              <Textarea
                id="translation_note"
                rows={2}
                value={form.translation_note}
                onChange={(e) => updateField("translation_note", e.target.value)}
                placeholder="e.g. ရပ်ထားတာ ၃ လရှိပြီ"
              />
            </div>
          </CardContent>
        </Card>

        {/* Social links + genres */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Social Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fb_page_url">Facebook Page</Label>
                <Input
                  id="fb_page_url"
                  value={form.fb_page_url}
                  onChange={(e) => updateField("fb_page_url", e.target.value)}
                  placeholder="https://facebook.com/..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tg_username">Telegram Username</Label>
                <Input
                  id="tg_username"
                  value={form.tg_username}
                  onChange={(e) => updateField("tg_username", e.target.value)}
                  placeholder="@username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tg_group_url">Telegram Group</Label>
                <Input
                  id="tg_group_url"
                  value={form.tg_group_url}
                  onChange={(e) => updateField("tg_group_url", e.target.value)}
                  placeholder="https://t.me/..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tg_channel_url">Telegram Channel</Label>
                <Input
                  id="tg_channel_url"
                  value={form.tg_channel_url}
                  onChange={(e) => updateField("tg_channel_url", e.target.value)}
                  placeholder="https://t.me/..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Reading links */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Reading Links
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setReadingLinks((prev) => [...prev, { platform_name: "", url: "" }])}
                >
                  <Plus className="mr-1 h-3 w-3" /> Add
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {readingLinks.length === 0 && (
                <p className="text-sm text-muted-foreground">No reading links yet.</p>
              )}
              {readingLinks.map((link, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    placeholder="Platform name"
                    value={link.platform_name}
                    onChange={(e) => {
                      const updated = [...readingLinks];
                      updated[i] = { ...updated[i], platform_name: e.target.value };
                      setReadingLinks(updated);
                    }}
                    className="flex-1"
                  />
                  <Input
                    placeholder="https://..."
                    value={link.url}
                    onChange={(e) => {
                      const updated = [...readingLinks];
                      updated[i] = { ...updated[i], url: e.target.value };
                      setReadingLinks(updated);
                    }}
                    className="flex-[2]"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setReadingLinks((prev) => prev.filter((_, j) => j !== i))}
                    className="shrink-0"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Genres</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {genres.map((genre) => (
                  <label
                    key={genre.id}
                    className="flex items-center gap-2 rounded-md border p-2 text-sm cursor-pointer hover:bg-muted transition-colors"
                  >
                    <Checkbox
                      checked={selectedGenres.includes(genre.id)}
                      onCheckedChange={() => toggleGenre(genre.id)}
                    />
                    <span>{genre.name}</span>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex justify-end gap-4">
        <Button variant="outline" render={<Link href="/admin/novels" />}>Cancel</Button>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {novel ? "Update Novel" : "Create Novel"}
        </Button>
      </div>
    </form>
  );
}
