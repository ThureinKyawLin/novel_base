"use server";

import { prisma } from "@/lib/prisma";
import { submissionFormSchema } from "@/lib/validations";
import { headers } from "next/headers";
import { rateLimitAsync } from "@/lib/rate-limit";

function clean(val: string | undefined | null): string | null {
  if (val == null) return null;
  return val.trim() === "" ? null : val;
}

export async function createSubmission(formData: {
  title_en: string;
  title_mm?: string;
  author_pen_name?: string;
  translator_name?: string;
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
  // Bot protection fields
  _hp?: string; // honeypot — must be empty
  _ts?: number; // timestamp — must be at least 3 seconds ago
}) {
  // Bot protection: honeypot field must be empty
  if (formData._hp) {
    // Bot filled the hidden field — silently reject
    return { success: true }; // fake success so bot doesn't retry
  }

  // Bot protection: submission must take at least 3 seconds
  if (formData._ts && Date.now() - formData._ts < 3000) {
    return { error: "Please slow down and try again." };
  }

  // Rate limit: 5 submissions per 10 minutes per IP
  const headersList = await headers();
  const ip =
    headersList.get("cf-connecting-ip") ??
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  const limiter = await rateLimitAsync(`submission:${ip}`, {
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

  try {
    await prisma.submission.create({
      data: {
        titleEn: data.title_en,
        titleMm: clean(data.title_mm),
        authorPenName: clean(data.author_pen_name),
        translatorName: clean(data.translator_name),
        synopsis: clean(data.synopsis),
        coverImageUrl: clean(data.cover_image_url),
        fbPageUrl: clean(data.fb_page_url),
        tgUsername: clean(data.tg_username),
        tgGroupUrl: clean(data.tg_group_url),
        tgChannelUrl: clean(data.tg_channel_url),
        novelStatus: data.novel_status as "ongoing" | "completed" | "dropped",
        chaptersCount: data.chapters_count ?? null,
        sourceUrl: clean(data.source_url),
        sourceLinks: data.source_links?.filter((l) => l.platform_name && l.url) ?? [],
        genreIds: data.genre_ids,
        submitterName: data.submitter_name,
        submitterContact: clean(data.submitter_contact),
        status: "pending",
      },
    });

    return { success: true };
  } catch (e) {
    console.error("Submission insert error:", e);
    return { error: "Failed to submit. Please try again." };
  }
}
