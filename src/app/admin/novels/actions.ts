"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import type { NovelFormData } from "@/lib/types";
import { novelFormSchema, uuidSchema } from "@/lib/validations";
import { invalidateNovelCaches } from "@/lib/redis";

/** Strip empty strings to null so they become NULL in DB */
function clean(val: string | undefined | null): string | null {
  if (val == null) return null;
  return val.trim() === "" ? null : val;
}

export async function createNovel(data: NovelFormData) {
  const parsed = novelFormSchema.safeParse(data);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Invalid input";
    return { error: firstError };
  }

  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated" };

  const d = parsed.data;

  try {
    const novel = await prisma.novel.create({
      data: {
        titleEn: d.title_en,
        titleMm: clean(d.title_mm),
        authorPenName: clean(d.author_pen_name),
        translatorName: clean(d.translator_name),
        synopsis: clean(d.synopsis),
        coverImageUrl: clean(d.cover_image_url),
        fbPageUrl: clean(d.fb_page_url),
        tgUsername: clean(d.tg_username),
        tgGroupUrl: clean(d.tg_group_url),
        tgChannelUrl: clean(d.tg_channel_url),
        novelStatus: d.novel_status as "ongoing" | "completed" | "dropped",
        chaptersCount: d.chapters_count ?? null,
        sourceUrl: clean(d.source_url),
        translationStatus: d.translation_status as "translating" | "paused" | "completed" | "dropped" | undefined,
        translationNote: clean(d.translation_note),
        translatedChapters: d.translated_chapters ?? null,
        lastTranslatedAt: d.last_translated_at ? new Date(d.last_translated_at) : null,
        extraInfo: (d.extra_info ?? {}) as object,
        createdBy: user.id,
        updatedBy: user.id,
        novelGenres: d.genre_ids.length > 0 ? {
          create: d.genre_ids.map((gid) => ({ genreId: gid })),
        } : undefined,
        readingLinks: d.reading_links && d.reading_links.length > 0 ? {
          create: d.reading_links.map((l) => ({ platformName: l.platform_name, url: l.url })),
        } : undefined,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "create",
        entityType: "novel",
        entityId: novel.id,
        details: { title_en: novel.titleEn },
      },
    });

    await invalidateNovelCaches();
    revalidatePath("/admin/novels");
    revalidatePath("/");
    return { data: novel };
  } catch (e) {
    console.error("Create novel error:", e);
    return { error: "Failed to create novel" };
  }
}

export async function updateNovel(id: string, data: NovelFormData) {
  const idParsed = uuidSchema.safeParse(id);
  if (!idParsed.success) return { error: "Invalid novel ID" };

  const parsed = novelFormSchema.safeParse(data);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Invalid input";
    return { error: firstError };
  }

  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated" };

  const d = parsed.data;

  try {
    // Update novel + replace genre associations and reading links in a transaction
    const novel = await prisma.$transaction(async (tx) => {
      const updated = await tx.novel.update({
        where: { id },
        data: {
          titleEn: d.title_en,
          titleMm: clean(d.title_mm),
          authorPenName: clean(d.author_pen_name),
        translatorName: clean(d.translator_name),
          synopsis: clean(d.synopsis),
          coverImageUrl: clean(d.cover_image_url),
          fbPageUrl: clean(d.fb_page_url),
          tgUsername: clean(d.tg_username),
          tgGroupUrl: clean(d.tg_group_url),
          tgChannelUrl: clean(d.tg_channel_url),
          novelStatus: d.novel_status as "ongoing" | "completed" | "dropped",
          chaptersCount: d.chapters_count ?? null,
          sourceUrl: clean(d.source_url),
          translationStatus: d.translation_status as "translating" | "paused" | "completed" | "dropped" | undefined,
          translationNote: clean(d.translation_note),
          translatedChapters: d.translated_chapters ?? null,
          lastTranslatedAt: d.last_translated_at ? new Date(d.last_translated_at) : null,
          extraInfo: (d.extra_info ?? {}) as object,
          updatedBy: user.id,
        },
      });

      // Replace genre associations
      await tx.novelGenre.deleteMany({ where: { novelId: id } });
      if (d.genre_ids.length > 0) {
        await tx.novelGenre.createMany({
          data: d.genre_ids.map((gid) => ({ novelId: id, genreId: gid })),
        });
      }

      // Replace reading links
      await tx.readingLink.deleteMany({ where: { novelId: id } });
      if (d.reading_links && d.reading_links.length > 0) {
        await tx.readingLink.createMany({
          data: d.reading_links.map((l) => ({
            novelId: id,
            platformName: l.platform_name,
            url: l.url,
          })),
        });
      }

      return updated;
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "update",
        entityType: "novel",
        entityId: id,
        details: { title_en: novel.titleEn },
      },
    });

    await invalidateNovelCaches(id);
    revalidatePath("/admin/novels");
    revalidatePath("/");
    return { data: novel };
  } catch (e) {
    console.error("Update novel error:", e);
    return { error: "Failed to update novel" };
  }
}

export async function deleteNovel(id: string) {
  const idParsed = uuidSchema.safeParse(id);
  if (!idParsed.success) return { error: "Invalid novel ID" };

  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated" };

  try {
    // Get novel title for audit log
    const novel = await prisma.novel.findUnique({
      where: { id },
      select: { titleEn: true },
    });

    await prisma.novel.delete({ where: { id } });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "delete",
        entityType: "novel",
        entityId: id,
        details: { title_en: novel?.titleEn },
      },
    });

    await invalidateNovelCaches(id);
    revalidatePath("/admin/novels");
    revalidatePath("/");
    return { success: true };
  } catch (e) {
    console.error("Delete novel error:", e);
    return { error: "Failed to delete novel" };
  }
}
