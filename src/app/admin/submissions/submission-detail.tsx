"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Check,
  X,
  Loader2,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { approveSubmission, rejectSubmission, checkDuplicates } from "./actions";
import type { Submission, Genre } from "@/lib/types";
import Link from "next/link";

interface DuplicateNovel {
  id: string;
  title_en: string;
  title_mm: string | null;
  author_pen_name: string | null;
  novel_status: string;
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  if (!children) return null;
  return (
    <div className="grid grid-cols-[120px_1fr] gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="break-all">{children}</span>
    </div>
  );
}

function LinkValue({ href, label }: { href: string; label?: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-primary hover:underline"
    >
      {label || href}
      <ExternalLink className="h-3 w-3 shrink-0" />
    </a>
  );
}

export function SubmissionDetail({
  submission,
  genres,
  open,
  onOpenChange,
}: {
  submission: Submission;
  genres: Genre[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [duplicates, setDuplicates] = useState<DuplicateNovel[]>([]);
  const [dupLoading, setDupLoading] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);

  const sub = submission;
  const isPending = sub.status === "pending";

  // Resolve genre names
  const genreMap = new Map(genres.map((g) => [g.id, g]));
  const subGenres = (sub.genre_ids ?? [])
    .map((id) => genreMap.get(id))
    .filter(Boolean) as Genre[];

  const loadDuplicates = useCallback(async () => {
    setDupLoading(true);
    const result = await checkDuplicates(sub.title_en, sub.title_mm);
    setDuplicates(result.duplicates);
    setDupLoading(false);
  }, [sub.title_en, sub.title_mm]);

  useEffect(() => {
    if (open) {
      loadDuplicates();
    }
  }, [open, loadDuplicates]);

  async function handleApprove() {
    setLoading("approve");
    const result = await approveSubmission(sub.id);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`"${sub.title_en}" approved and added to novels`);
      onOpenChange(false);
    }
    setLoading(null);
  }

  async function handleReject() {
    setLoading("reject");
    const result = await rejectSubmission(sub.id, rejectNote);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Submission rejected");
      onOpenChange(false);
    }
    setRejectOpen(false);
    setRejectNote("");
    setLoading(null);
  }

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    approved: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-full sm:!max-w-2xl overflow-y-auto"
        >
          <SheetHeader>
            <SheetTitle className="pr-8">{sub.title_en}</SheetTitle>
            {sub.title_mm && (
              <SheetDescription>{sub.title_mm}</SheetDescription>
            )}
          </SheetHeader>

          <div className="flex-1 space-y-6 px-4 pb-4">
            {/* Duplicate Warning */}
            {dupLoading ? (
              <div className="flex items-center gap-2 rounded-md border border-muted p-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Checking for duplicates…
              </div>
            ) : duplicates.length > 0 ? (
              <div className="rounded-md border border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20 p-3 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-yellow-700 dark:text-yellow-400">
                  <AlertTriangle className="h-4 w-4" />
                  {duplicates.length} possible duplicate{duplicates.length > 1 ? "s" : ""} found
                </div>
                <div className="space-y-1.5">
                  {duplicates.map((dup) => (
                    <div
                      key={dup.id}
                      className="flex items-center justify-between rounded border bg-background p-2 text-sm"
                    >
                      <div>
                        <span className="font-medium">{dup.title_en}</span>
                        {dup.title_mm && (
                          <span className="text-muted-foreground ml-1">
                            ({dup.title_mm})
                          </span>
                        )}
                        {dup.author_pen_name && (
                          <span className="text-muted-foreground text-xs ml-2">
                            by {dup.author_pen_name}
                          </span>
                        )}
                      </div>
                      <Link
                        href={`/admin/novels/${dup.id}/edit`}
                        target="_blank"
                        className="text-primary hover:underline text-xs whitespace-nowrap ml-2"
                      >
                        View
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Status */}
            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className={statusColors[sub.status] || ""}
              >
                {sub.status}
              </Badge>
              {sub.review_note && (
                <span className="text-xs text-muted-foreground">
                  {sub.review_note}
                </span>
              )}
            </div>

            {/* Novel Info */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Novel Info
              </h3>
              <DetailRow label="Author">{sub.author_pen_name || "—"}</DetailRow>
              <DetailRow label="Status">
                <Badge variant="outline" className="text-xs capitalize">
                  {sub.novel_status || "ongoing"}
                </Badge>
              </DetailRow>
              {sub.chapters_count && (
                <DetailRow label="Chapters">{sub.chapters_count}</DetailRow>
              )}
              {sub.source_url && (
                <DetailRow label="Source">
                  <LinkValue href={sub.source_url} />
                </DetailRow>
              )}
              {/* Multiple source/reading links */}
              {sub.source_links?.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-sm text-muted-foreground">Reading Links</span>
                  {sub.source_links.map((link, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground min-w-[80px]">{link.platform_name}</span>
                      <LinkValue href={link.url} />
                    </div>
                  ))}
                </div>
              )}
              {sub.cover_image_url && (
                <div className="space-y-2">
                  <span className="text-sm text-muted-foreground">Cover</span>
                  <a
                    href={sub.cover_image_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={sub.cover_image_url}
                      alt={`Cover: ${sub.title_en}`}
                      className="rounded-lg border object-cover max-h-72 w-auto"
                    />
                  </a>
                </div>
              )}
            </div>

            {/* Synopsis */}
            {sub.synopsis && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Synopsis
                </h3>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {sub.synopsis}
                </p>
              </div>
            )}

            {/* Genres */}
            {subGenres.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Genres
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {subGenres.map((g) => (
                    <Badge key={g.id} variant="secondary" className="text-xs">
                      {g.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Social Links */}
            {(sub.fb_page_url || sub.tg_username || sub.tg_group_url || sub.tg_channel_url) && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Social Links
                </h3>
                {sub.fb_page_url && (
                  <DetailRow label="Facebook">
                    <LinkValue href={sub.fb_page_url} />
                  </DetailRow>
                )}
                {sub.tg_username && (
                  <DetailRow label="Telegram">@{sub.tg_username}</DetailRow>
                )}
                {sub.tg_group_url && (
                  <DetailRow label="TG Group">
                    <LinkValue href={sub.tg_group_url} />
                  </DetailRow>
                )}
                {sub.tg_channel_url && (
                  <DetailRow label="TG Channel">
                    <LinkValue href={sub.tg_channel_url} />
                  </DetailRow>
                )}
              </div>
            )}

            {/* Submitter */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Submitted By
              </h3>
              <DetailRow label="Name">{sub.submitter_name}</DetailRow>
              {sub.submitter_contact && (
                <DetailRow label="Contact">{sub.submitter_contact}</DetailRow>
              )}
              <DetailRow label="Date">
                {new Date(sub.created_at).toLocaleString()}
              </DetailRow>
            </div>
          </div>

          {/* Footer Actions */}
          {isPending && (
            <SheetFooter className="border-t">
              <div className="flex gap-2 w-full">
                <Button
                  variant="outline"
                  className="flex-1 text-destructive hover:text-destructive"
                  onClick={() => setRejectOpen(true)}
                  disabled={loading !== null}
                >
                  <X className="mr-2 h-4 w-4" />
                  Reject
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleApprove}
                  disabled={loading !== null}
                >
                  {loading === "approve" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="mr-2 h-4 w-4" />
                  )}
                  Approve
                </Button>
              </div>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>

      {/* Reject Dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Submission</DialogTitle>
            <DialogDescription>
              Reject &quot;{sub.title_en}&quot;? You can add an optional note.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <Label>Reason (optional)</Label>
            <Input
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="e.g. Duplicate entry"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={loading === "reject"}
            >
              {loading === "reject" && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
