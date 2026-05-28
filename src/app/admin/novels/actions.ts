"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { NovelFormData } from "@/lib/types";
import { novelFormSchema, uuidSchema } from "@/lib/validations";

/** Strip empty strings to undefined so they become NULL in DB */
function cleanOptionalStrings(
  data: Record<string, unknown>
): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    cleaned[key] =
      typeof value === "string" && value.trim() === "" ? undefined : value;
  }
  return cleaned;
}

export async function createNovel(data: NovelFormData) {
  // Validate input
  const parsed = novelFormSchema.safeParse(data);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Invalid input";
    return { error: firstError };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { genre_ids, reading_links, ...novelData } = cleanOptionalStrings(
    parsed.data
  ) as typeof parsed.data;

  const { data: novel, error } = await supabase
    .from("novels")
    .insert({ ...novelData, created_by: user.id, updated_by: user.id })
    .select()
    .single();

  if (error) return { error: error.message };

  // Insert genre associations
  if (genre_ids.length > 0) {
    await supabase.from("novel_genres").insert(
      genre_ids.map((gid) => ({ novel_id: novel.id, genre_id: gid }))
    );
  }

  // Insert reading links
  if (reading_links && reading_links.length > 0) {
    await supabase.from("reading_links").insert(
      reading_links.map((l) => ({ novel_id: novel.id, platform_name: l.platform_name, url: l.url }))
    );
  }

  // Audit log
  await supabase.from("audit_logs").insert({
    user_id: user.id,
    action: "create",
    entity_type: "novel",
    entity_id: novel.id,
    details: { title_en: novel.title_en },
  });

  revalidatePath("/admin/novels");
  revalidatePath("/");
  return { data: novel };
}

export async function updateNovel(id: string, data: NovelFormData) {
  // Validate ID and input
  const idParsed = uuidSchema.safeParse(id);
  if (!idParsed.success) return { error: "Invalid novel ID" };

  const parsed = novelFormSchema.safeParse(data);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Invalid input";
    return { error: firstError };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { genre_ids, reading_links, ...novelData } = cleanOptionalStrings(
    parsed.data
  ) as typeof parsed.data;

  const { data: novel, error } = await supabase
    .from("novels")
    .update({ ...novelData, updated_by: user.id })
    .eq("id", id)
    .select()
    .single();

  if (error) return { error: error.message };

  // Replace genre associations
  await supabase.from("novel_genres").delete().eq("novel_id", id);
  if (genre_ids.length > 0) {
    await supabase.from("novel_genres").insert(
      genre_ids.map((gid) => ({ novel_id: id, genre_id: gid }))
    );
  }

  // Replace reading links
  await supabase.from("reading_links").delete().eq("novel_id", id);
  if (reading_links && reading_links.length > 0) {
    await supabase.from("reading_links").insert(
      reading_links.map((l) => ({ novel_id: id, platform_name: l.platform_name, url: l.url }))
    );
  }

  // Audit log
  await supabase.from("audit_logs").insert({
    user_id: user.id,
    action: "update",
    entity_type: "novel",
    entity_id: id,
    details: { title_en: novel.title_en },
  });

  revalidatePath("/admin/novels");
  revalidatePath("/");
  return { data: novel };
}

export async function deleteNovel(id: string) {
  const idParsed = uuidSchema.safeParse(id);
  if (!idParsed.success) return { error: "Invalid novel ID" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Get novel title for audit log
  const { data: novel } = await supabase
    .from("novels")
    .select("title_en")
    .eq("id", id)
    .single();

  const { error } = await supabase.from("novels").delete().eq("id", id);
  if (error) return { error: error.message };

  // Audit log
  await supabase.from("audit_logs").insert({
    user_id: user.id,
    action: "delete",
    entity_type: "novel",
    entity_id: id,
    details: { title_en: novel?.title_en },
  });

  revalidatePath("/admin/novels");
  revalidatePath("/");
  return { success: true };
}
