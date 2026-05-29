"use client";

import React, { useState } from "react";
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
import { Loader2, CheckCircle2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/components/language-context";
import { createSubmission } from "./actions";
import { CoverUpload } from "@/components/cover-upload";
import type { Genre } from "@/lib/types";

export function SubmitForm({ genres }: { genres: Genre[] }) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [sourceLinks, setSourceLinks] = useState<{ platform_name: string; url: string }[]>([]);
  const [honeypot, setHoneypot] = useState("");
  const [formLoadedAt] = useState(() => Date.now());

  const [form, setForm] = useState({
    title_en: "",
    title_mm: "",
    author_pen_name: "",
    translator_name: "",
    synopsis: "",
    cover_image_url: "",
    fb_page_url: "",
    tg_username: "",
    tg_group_url: "",
    tg_channel_url: "",
    novel_status: "ongoing",
    chapters_count: undefined as number | undefined,
    submitter_name: "",
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
    if (!form.submitter_name.trim()) {
      toast.error("Your name is required");
      return;
    }

    setLoading(true);

    const validLinks = sourceLinks.filter((l) => l.platform_name.trim() && l.url.trim());

    const result = await createSubmission({
      ...form,
      title_mm: form.title_mm || undefined,
      author_pen_name: form.author_pen_name || undefined,
      translator_name: form.translator_name || undefined,
      synopsis: form.synopsis || undefined,
      cover_image_url: form.cover_image_url || undefined,
      fb_page_url: form.fb_page_url || undefined,
      tg_username: form.tg_username || undefined,
      tg_group_url: form.tg_group_url || undefined,
      tg_channel_url: form.tg_channel_url || undefined,
      chapters_count: form.chapters_count ? Number(form.chapters_count) : undefined,
      novel_status: form.novel_status as "ongoing" | "completed" | "dropped",
      source_links: validLinks.length > 0 ? validLinks : undefined,
      genre_ids: selectedGenres,
      _hp: honeypot,
      _ts: formLoadedAt,
    });

    if (result.error) {
      toast.error(result.error);
      setLoading(false);
      return;
    }

    setSubmitted(true);
    setLoading(false);
  }

  if (submitted) {
    return (
      <Card className="text-center py-12">
        <CardContent className="space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-xl font-semibold">{t.submit.successTitle}</h2>
          <p className="text-muted-foreground max-w-sm mx-auto">
            {t.submit.successDescription}
          </p>
          <Button onClick={() => { setSubmitted(false); setForm({ title_en: "", title_mm: "", author_pen_name: "", translator_name: "", synopsis: "", cover_image_url: "", fb_page_url: "", tg_username: "", tg_group_url: "", tg_channel_url: "", novel_status: "ongoing", chapters_count: undefined, submitter_name: "" }); setSelectedGenres([]); setSourceLinks([]); }}>
            {t.submit.submitAnother}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Novel info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t.submit.titleEn.split(" ")[0] === "English" ? "Novel Information" : "ဝတ္ထုအချက်အလက်"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="title_en">{t.submit.titleEn} *</Label>
              <Input
                id="title_en"
                value={form.title_en}
                onChange={(e) => updateField("title_en", e.target.value)}
                placeholder="Novel title in English"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="title_mm">{t.submit.titleMm}</Label>
              <Input
                id="title_mm"
                value={form.title_mm}
                onChange={(e) => updateField("title_mm", e.target.value)}
                placeholder="ဝတ္ထုအမည်"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="author_pen_name">Original Author / Pen Name</Label>
              <Input
                id="author_pen_name"
                value={form.author_pen_name}
                onChange={(e) => updateField("author_pen_name", e.target.value)}
                placeholder="မူရင်းစာရေးဆရာ"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="translator_name">Translator</Label>
              <Input
                id="translator_name"
                value={form.translator_name}
                onChange={(e) => updateField("translator_name", e.target.value)}
                placeholder="ဘာသာပြန်သူ"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="novel_status">{t.submit.status}</Label>
              <Select
                value={form.novel_status}
                onValueChange={(v) => updateField("novel_status", v ?? "ongoing")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ongoing">{t.submit.ongoing}</SelectItem>
                  <SelectItem value="completed">{t.submit.completed}</SelectItem>
                  <SelectItem value="dropped">{t.submit.dropped}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="synopsis">{t.submit.synopsisLabel}</Label>
            <Textarea
              id="synopsis"
              rows={3}
              value={form.synopsis}
              onChange={(e) => updateField("synopsis", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="chapters_count">{t.submit.chaptersCount}</Label>
            <Input
              id="chapters_count"
              type="number"
              value={form.chapters_count ?? ""}
              onChange={(e) =>
                updateField("chapters_count", e.target.value ? Number(e.target.value) : undefined)
              }
              className="max-w-[200px]"
            />
          </div>

          {/* Cover image upload with crop */}
          <CoverUpload
            value={form.cover_image_url}
            onChange={(url) => updateField("cover_image_url", url)}
            label={t.submit.coverImageUrl}
            isPublic
          />
        </CardContent>
      </Card>

      {/* Reading/Source Links */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            Reading Links
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSourceLinks((prev) => [...prev, { platform_name: "", url: "" }])}
            >
              <Plus className="mr-1 h-3 w-3" /> Add Link
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Add links where this novel can be read (e.g. LabMyanmar, Wunzinn, MMXianxia)
          </p>
          {sourceLinks.map((link, i) => (
            <div key={i} className="flex gap-2">
              <Input
                placeholder="e.g. LabMyanmar"
                value={link.platform_name}
                onChange={(e) => {
                  const updated = [...sourceLinks];
                  updated[i] = { ...updated[i], platform_name: e.target.value };
                  setSourceLinks(updated);
                }}
                className="flex-1"
              />
              <Input
                placeholder="https://..."
                value={link.url}
                onChange={(e) => {
                  const updated = [...sourceLinks];
                  updated[i] = { ...updated[i], url: e.target.value };
                  setSourceLinks(updated);
                }}
                className="flex-[2]"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setSourceLinks((prev) => prev.filter((_, j) => j !== i))}
                className="shrink-0"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
          {sourceLinks.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-2">
              No reading links added yet
            </p>
          )}
        </CardContent>
      </Card>

      {/* Genres */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t.submit.genres}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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

      {/* Social links */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Social Links</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fb_page_url">{t.submit.facebookPageUrl}</Label>
              <Input
                id="fb_page_url"
                value={form.fb_page_url}
                onChange={(e) => updateField("fb_page_url", e.target.value)}
                placeholder="https://facebook.com/..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tg_username">{t.submit.telegramUsername}</Label>
              <Input
                id="tg_username"
                value={form.tg_username}
                onChange={(e) => updateField("tg_username", e.target.value)}
                placeholder="@username"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tg_group_url">{t.submit.telegramGroupUrl}</Label>
              <Input
                id="tg_group_url"
                value={form.tg_group_url}
                onChange={(e) => updateField("tg_group_url", e.target.value)}
                placeholder="https://t.me/..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tg_channel_url">{t.submit.telegramChannelUrl}</Label>
              <Input
                id="tg_channel_url"
                value={form.tg_channel_url}
                onChange={(e) => updateField("tg_channel_url", e.target.value)}
                placeholder="https://t.me/..."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submitter info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t.submit.yourName.split(" ")[0] === "Your" ? "Your Information" : "သင့်အချက်အလက်"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="submitter_name">{t.submit.yourName} *</Label>
            <Input
              id="submitter_name"
              value={form.submitter_name}
              onChange={(e) => updateField("submitter_name", e.target.value)}
              required
              className="max-w-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Honeypot — hidden from real users, bots will fill it */}
      <div className="absolute opacity-0 h-0 overflow-hidden" aria-hidden="true" tabIndex={-1}>
        <label htmlFor="_hp_website">Website</label>
        <input
          id="_hp_website"
          name="_hp_website"
          type="text"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
          autoComplete="off"
          tabIndex={-1}
        />
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t.submit.submitting}</>
        ) : (
          t.submit.submitButton
        )}
      </Button>
    </form>
  );
}
