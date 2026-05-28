"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Copy, Loader2, Check } from "lucide-react";
import { toast } from "sonner";

interface InvitationRow {
  id: string;
  token: string;
  role: string;
  status: string;
  expires_at: string | null;
  used_at: string | null;
  created_at: string;
  created_by_profile: { display_name: string } | null;
  used_by_profile: { display_name: string } | null;
}

export function InvitationsManager({
  initialInvitations,
}: {
  initialInvitations: InvitationRow[];
}) {
  const [invitations, setInvitations] = useState(initialInvitations);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generatedLink, setGeneratedLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [expiryHours, setExpiryHours] = useState("72");
  const router = useRouter();

  async function generateInvite() {
    setLoading(true);
    const supabase = createClient();

    const token = crypto.randomUUID().replace(/-/g, "");
    const expiresAt = expiryHours
      ? new Date(Date.now() + Number(expiryHours) * 3600000).toISOString()
      : null;

    const { data, error } = await supabase
      .from("invitations")
      .insert({
        token,
        role: "mod",
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    const link = `${window.location.origin}/invite/${token}`;
    setGeneratedLink(link);
    setLoading(false);
  }

  async function copyLink() {
    await navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 2000);
  }

  function openDialog() {
    setGeneratedLink("");
    setCopied(false);
    setExpiryHours("72");
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    if (generatedLink) {
      router.refresh();
    }
  }

  async function copyTokenLink(token: string) {
    const link = `${window.location.origin}/invite/${token}`;
    await navigator.clipboard.writeText(link);
    toast.success("Link copied!");
  }

  const statusColors: Record<string, string> = {
    active: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    used: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
    expired: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={openDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Generate Invite Link
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Token</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created By</TableHead>
              <TableHead>Used By</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invitations.length > 0 ? (
              invitations.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs">{inv.token.slice(0, 12)}...</span>
                      {inv.status === "active" && (
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => copyTokenLink(inv.token)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={statusColors[inv.status] || ""}
                    >
                      {inv.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {inv.created_by_profile?.display_name ?? "—"}
                  </TableCell>
                  <TableCell>
                    {inv.used_by_profile?.display_name ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {inv.expires_at
                      ? new Date(inv.expires_at).toLocaleDateString()
                      : "Never"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(inv.created_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-8 text-muted-foreground"
                >
                  No invitations yet
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={closeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Invite Link</DialogTitle>
          </DialogHeader>
          {!generatedLink ? (
            <>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Expiry (hours)</Label>
                  <Input
                    type="number"
                    value={expiryHours}
                    onChange={(e) => setExpiryHours(e.target.value)}
                    placeholder="72 (leave empty for no expiry)"
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave empty for no expiry. Default: 72 hours.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={generateInvite} disabled={loading}>
                  {loading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Generate
                </Button>
              </DialogFooter>
            </>
          ) : (
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                Share this link with the moderator. It can only be used once.
              </p>
              <div className="flex gap-2">
                <Input value={generatedLink} readOnly className="font-mono text-xs" />
                <Button variant="outline" onClick={copyLink}>
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <DialogFooter>
                <Button onClick={() => setDialogOpen(false)}>Done</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
