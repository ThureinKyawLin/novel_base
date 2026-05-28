"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { uuidSchema } from "@/lib/validations";

export async function approveSubmission(id: string) {
  if (!uuidSchema.safeParse(id).success) return { error: "Invalid ID" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Get submission
  const { data: sub, error: fetchErr } = await supabase
    .from("submissions")
    .select("*")
    .eq("id", id)
    .eq("status", "pending")
    .single();

  if (fetchErr || !sub) return { error: "Submission not found or already reviewed" };

  // Create novel from submission
  const { data: novel, error: novelErr } = await supabase
    .from("novels")
    .insert({
      title_en: sub.title_en,
      title_mm: sub.title_mm,
      author_pen_name: sub.author_pen_name,
      synopsis: sub.synopsis,
      cover_image_url: sub.cover_image_url,
      fb_page_url: sub.fb_page_url,
      tg_username: sub.tg_username,
      tg_group_url: sub.tg_group_url,
      tg_channel_url: sub.tg_channel_url,
      novel_status: sub.novel_status || "ongoing",
      chapters_count: sub.chapters_count,
      source_url: sub.source_url,
      created_by: user.id,
      updated_by: user.id,
    })
    .select()
    .single();

  if (novelErr || !novel) return { error: "Failed to create novel" };

  // Insert genre associations
  const genreIds = (sub.genre_ids as string[]) ?? [];
  if (genreIds.length > 0) {
    await supabase.from("novel_genres").insert(
      genreIds.map((gid: string) => ({ novel_id: novel.id, genre_id: gid }))
    );
  }

  // Create reading_links from source_links + legacy source_url
  const sourceLinks = (sub.source_links as { platform_name: string; url: string }[] | null) ?? [];
  const allLinks = [...sourceLinks];
  // Include legacy source_url as a reading link if not already in source_links
  if (sub.source_url && !allLinks.some((l) => l.url === sub.source_url)) {
    // Auto-detect platform name from URL
    const hostname = (() => { try { return new URL(sub.source_url).hostname; } catch { return ""; } })();
    const platformName = hostname.replace(/^www\./, "").split(".")[0] || "Source";
    allLinks.push({ platform_name: platformName.charAt(0).toUpperCase() + platformName.slice(1), url: sub.source_url });
  }
  if (allLinks.length > 0) {
    await supabase.from("reading_links").insert(
      allLinks.map((link) => ({
        novel_id: novel.id,
        platform_name: link.platform_name,
        url: link.url,
      }))
    );
  }

  // Mark submission as approved
  await supabase
    .from("submissions")
    .update({
      status: "approved",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id);

  // Audit log
  await supabase.from("audit_logs").insert({
    user_id: user.id,
    action: "create",
    entity_type: "novel",
    entity_id: novel.id,
    details: { title_en: novel.title_en, source: "submission", submission_id: id },
  });

  revalidatePath("/admin/submissions");
  revalidatePath("/admin/novels");
  revalidatePath("/");
  return { success: true };
}

export async function checkDuplicates(titleEn: string, titleMm?: string | null) {
  const supabase = await createClient();

  // Search by similar English title (case-insensitive)
  const searchTerm = titleEn.trim();
  if (!searchTerm) return { duplicates: [] };

  // Use ILIKE for fuzzy matching — search for titles that contain the search term
  // or where the search term contains the title
  const { data: byEnTitle } = await supabase
    .from("novels")
    .select("id, title_en, title_mm, author_pen_name, novel_status")
    .ilike("title_en", `%${searchTerm}%`)
    .limit(10);

  let byMmTitle: typeof byEnTitle = [];
  if (titleMm?.trim()) {
    const { data } = await supabase
      .from("novels")
      .select("id, title_en, title_mm, author_pen_name, novel_status")
      .ilike("title_mm", `%${titleMm.trim()}%`)
      .limit(10);
    byMmTitle = data ?? [];
  }

  // Deduplicate by id
  const seen = new Set<string>();
  const duplicates = [...(byEnTitle ?? []), ...byMmTitle].filter((n) => {
    if (seen.has(n.id)) return false;
    seen.add(n.id);
    return true;
  });

  return { duplicates };
}

export async function rejectSubmission(id: string, note?: string) {
  if (!uuidSchema.safeParse(id).success) return { error: "Invalid ID" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("submissions")
    .update({
      status: "rejected",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      review_note: note?.slice(0, 500) || null,
    })
    .eq("id", id)
    .eq("status", "pending");

  if (error) return { error: "Failed to reject submission" };

  revalidatePath("/admin/submissions");
  return { success: true };
}
