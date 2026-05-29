"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { uuidSchema } from "@/lib/validations";
import { invalidateNovelCaches } from "@/lib/redis";

export async function approveSubmission(id: string) {
  if (!uuidSchema.safeParse(id).success) return { error: "Invalid ID" };

  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated" };

  // Get submission
  const sub = await prisma.submission.findFirst({
    where: { id, status: "pending" },
  });

  if (!sub) return { error: "Submission not found or already reviewed" };

  try {
    // Create novel from submission
    const novel = await prisma.novel.create({
      data: {
        titleEn: sub.titleEn,
        titleMm: sub.titleMm,
        authorPenName: sub.authorPenName,
        translatorName: sub.translatorName,
        synopsis: sub.synopsis,
        coverImageUrl: sub.coverImageUrl,
        fbPageUrl: sub.fbPageUrl,
        tgUsername: sub.tgUsername,
        tgGroupUrl: sub.tgGroupUrl,
        tgChannelUrl: sub.tgChannelUrl,
        novelStatus: sub.novelStatus || "ongoing",
        chaptersCount: sub.chaptersCount,
        sourceUrl: sub.sourceUrl,
        createdBy: user.id,
        updatedBy: user.id,
      },
    });

    // Insert genre associations (validate genre IDs exist first)
    const rawGenreIds = (sub.genreIds as string[]) ?? [];
    let genreIds: string[] = [];
    if (rawGenreIds.length > 0) {
      const existingGenres = await prisma.genre.findMany({
        where: { id: { in: rawGenreIds } },
        select: { id: true },
      });
      genreIds = existingGenres.map((g) => g.id);
    }
    if (genreIds.length > 0) {
      await prisma.novelGenre.createMany({
        data: genreIds.map((gid: string) => ({ novelId: novel.id, genreId: gid })),
      });
    }

    // Create reading_links from source_links + legacy source_url
    const sourceLinks = (sub.sourceLinks as { platform_name: string; url: string }[] | null) ?? [];
    const allLinks = [...sourceLinks];
    if (sub.sourceUrl && !allLinks.some((l) => l.url === sub.sourceUrl)) {
      const hostname = (() => { try { return new URL(sub.sourceUrl!).hostname; } catch { return ""; } })();
      const platformName = hostname.replace(/^www\./, "").split(".")[0] || "Source";
      allLinks.push({ platform_name: platformName.charAt(0).toUpperCase() + platformName.slice(1), url: sub.sourceUrl! });
    }
    if (allLinks.length > 0) {
      await prisma.readingLink.createMany({
        data: allLinks.map((link) => ({
          novelId: novel.id,
          platformName: link.platform_name,
          url: link.url,
        })),
      });
    }

    // Mark submission as approved
    await prisma.submission.update({
      where: { id },
      data: {
        status: "approved",
        reviewedBy: user.id,
        reviewedAt: new Date(),
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "create",
        entityType: "novel",
        entityId: novel.id,
        details: { title_en: novel.titleEn, source: "submission", submission_id: id },
      },
    });

    await invalidateNovelCaches();
    revalidatePath("/admin/submissions");
    revalidatePath("/admin/novels");
    revalidatePath("/");
    return { success: true };
  } catch (e) {
    console.error("Approve submission error:", e);
    return { error: "Failed to approve submission" };
  }
}

export async function checkDuplicates(titleEn: string, titleMm?: string | null) {
  const user = await getCurrentUser();
  if (!user) return { duplicates: [] };

  const searchTerm = titleEn.trim();
  if (!searchTerm) return { duplicates: [] };

  const byEnTitle = await prisma.novel.findMany({
    where: { titleEn: { contains: searchTerm, mode: "insensitive" } },
    select: { id: true, titleEn: true, titleMm: true, authorPenName: true, translatorName: true, novelStatus: true },
    take: 10,
  });

  let byMmTitle: typeof byEnTitle = [];
  if (titleMm?.trim()) {
    byMmTitle = await prisma.novel.findMany({
      where: { titleMm: { contains: titleMm.trim(), mode: "insensitive" } },
      select: { id: true, titleEn: true, titleMm: true, authorPenName: true, translatorName: true, novelStatus: true },
      take: 10,
    });
  }

  // Deduplicate by id and map to snake_case
  const seen = new Set<string>();
  const duplicates = [...byEnTitle, ...byMmTitle]
    .filter((n) => {
      if (seen.has(n.id)) return false;
      seen.add(n.id);
      return true;
    })
    .map((n) => ({
      id: n.id,
      title_en: n.titleEn,
      title_mm: n.titleMm,
      author_pen_name: n.authorPenName,
      translator_name: n.translatorName,
      novel_status: n.novelStatus,
    }));

  return { duplicates };
}

export async function rejectSubmission(id: string, note?: string) {
  if (!uuidSchema.safeParse(id).success) return { error: "Invalid ID" };

  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated" };

  try {
    await prisma.submission.update({
      where: { id, status: "pending" },
      data: {
        status: "rejected",
        reviewedBy: user.id,
        reviewedAt: new Date(),
        reviewNote: note?.slice(0, 500) || null,
      },
    });

    revalidatePath("/admin/submissions");
    return { success: true };
  } catch {
    return { error: "Failed to reject submission" };
  }
}
