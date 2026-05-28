"use client";

import { useState } from "react";
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
import { Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { approveSubmission, rejectSubmission } from "./actions";

export function SubmissionActions({
  id,
  title,
}: {
  id: string;
  title: string;
}) {
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);

  async function handleApprove() {
    setLoading("approve");
    const result = await approveSubmission(id);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`"${title}" approved and added to novels`);
    }
    setLoading(null);
  }

  async function handleReject() {
    setLoading("reject");
    const result = await rejectSubmission(id, rejectNote);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Submission rejected");
    }
    setRejectOpen(false);
    setLoading(null);
  }

  return (
    <>
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleApprove}
          disabled={loading !== null}
          className="text-green-600 hover:text-green-700"
        >
          {loading === "approve" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setRejectOpen(true)}
          disabled={loading !== null}
          className="text-destructive hover:text-destructive"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Submission</DialogTitle>
            <DialogDescription>
              Reject &quot;{title}&quot;? You can add an optional note.
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
