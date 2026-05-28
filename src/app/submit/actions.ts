"use server";

import { createClient } from "@/lib/supabase/server";
import { submissionFormSchema } from "@/lib/validations";
import { headers } from "next/headers";
import { rateLimit } from "@/lib/rate-limit";

export async function createSubmission(formData: {
  title_en: string;
  title_mm?: string;
  author_pen_name?: string;
  synopsis?: string;
  cover_image_url?: string;
  fb_page_url?: string;
  tg_username?: string;
  tg_group_url?: string;
  tg_channel_url?: string;
  novel_status: string;
  chapters_count?: number;
  source_url?: string;
  source_links?: { platform_name: string; url: string }[];
  genre_ids: string[];
  submitter_name: string;
  submitter_contact?: string;
}) {
  // Rate limit: 5 submissions per 10 minutes per IP
  const headersList = await headers();
  const ip =
    headersList.get("cf-connecting-ip") ??
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  const limiter = rateLimit(`submission:${ip}`, {
    maxRequests: 5,
    windowMs: 600_000,
  });
  if (!limiter.success) {
    return { error: "Too many submissions. Please try again later." };
  }

  // Validate input
  const parsed = submissionFormSchema.safeParse(formData);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Invalid input";
    return { error: firstError };
  }

  const data = parsed.data;

  // Strip empty strings
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    cleaned[key] =
      typeof value === "string" && value.trim() === "" ? null : value;
  }

  const supabase = await createClient();

  const { error } = await supabase.from("submissions").insert({
    title_en: cleaned.title_en as string,
    title_mm: cleaned.title_mm || null,
    author_pen_name: cleaned.author_pen_name || null,
    synopsis: cleaned.synopsis || null,
    cover_image_url: cleaned.cover_image_url || null,
    fb_page_url: cleaned.fb_page_url || null,
    tg_username: cleaned.tg_username || null,
    tg_group_url: cleaned.tg_group_url || null,
    tg_channel_url: cleaned.tg_channel_url || null,
    novel_status: data.novel_status,
    chapters_count: data.chapters_count ?? null,
    source_url: cleaned.source_url || null,
    source_links: data.source_links?.filter((l) => l.platform_name && l.url) ?? [],
    genre_ids: data.genre_ids,
    submitter_name: data.submitter_name,
    submitter_contact: cleaned.submitter_contact || null,
    status: "pending",
  });

  if (error) {
    console.error("Submission insert error:", error);
    return { error: "Failed to submit. Please try again." };
  }

  return { success: true };
}
