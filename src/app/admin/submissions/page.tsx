import { prisma } from "@/lib/prisma";
import { SubmissionsTable } from "./submissions-table";
import type { Submission, Genre } from "@/lib/types";

export default async function AdminSubmissionsPage() {
  const [submissionsRaw, genresRaw] = await Promise.all([
    prisma.submission.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.genre.findMany({ orderBy: { name: "asc" } }),
  ]);

  const submissions = submissionsRaw.map((s) => ({
    id: s.id,
    title_en: s.titleEn,
    title_mm: s.titleMm,
    author_pen_name: s.authorPenName,
    synopsis: s.synopsis,
    cover_image_url: s.coverImageUrl,
    fb_page_url: s.fbPageUrl,
    tg_username: s.tgUsername,
    tg_group_url: s.tgGroupUrl,
    tg_channel_url: s.tgChannelUrl,
    novel_status: s.novelStatus,
    chapters_count: s.chaptersCount,
    source_url: s.sourceUrl,
    source_links: s.sourceLinks as { platform_name: string; url: string }[],
    genre_ids: s.genreIds as string[],
    submitter_name: s.submitterName,
    submitter_contact: s.submitterContact,
    status: s.status,
    reviewed_by: s.reviewedBy,
    reviewed_at: s.reviewedAt?.toISOString() ?? null,
    review_note: s.reviewNote,
    created_at: s.createdAt.toISOString(),
  }));

  const genres = genresRaw.map((g) => ({
    id: g.id,
    name: g.name,
    name_mm: g.nameMm,
    created_at: g.createdAt.toISOString(),
  }));

  const pendingCount =
    submissions?.filter((s) => s.status === "pending").length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Submissions</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {pendingCount > 0
              ? `${pendingCount} pending review`
              : "No pending submissions"}
          </p>
        </div>
      </div>

      <SubmissionsTable
        submissions={(submissions ?? []) as Submission[]}
        genres={(genres ?? []) as Genre[]}
      />
    </div>
  );
}
