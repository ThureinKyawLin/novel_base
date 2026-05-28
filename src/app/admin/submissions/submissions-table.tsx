"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SubmissionDetail } from "./submission-detail";
import type { Submission, Genre } from "@/lib/types";

export function SubmissionsTable({
  submissions,
  genres,
}: {
  submissions: Submission[];
  genres: Genre[];
}) {
  const [selected, setSelected] = useState<Submission | null>(null);

  const statusColors: Record<string, string> = {
    pending:
      "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    approved:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    rejected:
      "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead className="hidden sm:table-cell">Author</TableHead>
              <TableHead className="hidden md:table-cell">
                Submitted By
              </TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {submissions.length > 0 ? (
              submissions.map((sub) => (
                <TableRow
                  key={sub.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelected(sub)}
                >
                  <TableCell>
                    <div className="font-medium max-w-[250px] truncate">
                      {sub.title_en}
                    </div>
                    {sub.title_mm && (
                      <div className="text-xs text-muted-foreground truncate">
                        {sub.title_mm}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm">
                    {sub.author_pen_name || "—"}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm">
                    <div>{sub.submitter_name}</div>
                    {sub.submitter_contact && (
                      <div className="text-xs text-muted-foreground">
                        {sub.submitter_contact}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={statusColors[sub.status] || ""}
                    >
                      {sub.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground whitespace-nowrap">
                    {new Date(sub.created_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center py-12 text-muted-foreground"
                >
                  No submissions yet
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {selected && (
        <SubmissionDetail
          submission={selected}
          genres={genres}
          open={!!selected}
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
        />
      )}
    </>
  );
}
