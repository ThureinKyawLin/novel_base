"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  changeRole,
  updateMemberName,
  resetMemberPassword,
  deleteMember,
} from "@/app/admin/mods/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Label } from "@/components/ui/label";
import {
  ShieldCheck,
  ShieldMinus,
  KeyRound,
  Pencil,
  Trash2,
  Loader2,
  Copy,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import type { Profile, Role } from "@/lib/types";

interface Props {
  members: Profile[];
  currentUserId: string;
  protectedEmail?: string;
}

export function MembersManager({ members: initialMembers, currentUserId, protectedEmail }: Props) {
  const [members, setMembers] = useState(initialMembers);
  const [loading, setLoading] = useState<string | null>(null);
  const router = useRouter();

  // Edit name dialog
  const [editDialog, setEditDialog] = useState(false);
  const [editingMember, setEditingMember] = useState<Profile | null>(null);
  const [editName, setEditName] = useState("");

  // Password reset dialog
  const [passwordDialog, setPasswordDialog] = useState(false);
  const [tempPassword, setTempPassword] = useState("");
  const [passwordMember, setPasswordMember] = useState<Profile | null>(null);
  const [copied, setCopied] = useState(false);

  const isSelf = (id: string) => id === currentUserId;
  const isProtected = (member: Profile) => !!protectedEmail && member.email === protectedEmail;

  async function handleRoleChange(member: Profile) {
    const newRole: Role = member.role === "admin" ? "mod" : "admin";
    const action = newRole === "admin" ? "promote to Admin" : "demote to Mod";
    if (!confirm(`${action} "${member.display_name || member.email}"?`)) return;

    setLoading(member.id);
    const result = await changeRole(member.id, newRole);
    setLoading(null);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    setMembers((prev) =>
      prev.map((m) => (m.id === member.id ? { ...m, role: newRole } : m))
    );
    toast.success(`Role changed to ${newRole}`);
    router.refresh();
  }

  function openEditName(member: Profile) {
    setEditingMember(member);
    setEditName(member.display_name || "");
    setEditDialog(true);
  }

  async function handleSaveName() {
    if (!editingMember || !editName.trim()) return;
    setLoading(editingMember.id);
    const result = await updateMemberName(editingMember.id, editName.trim());
    setLoading(null);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    setMembers((prev) =>
      prev.map((m) =>
        m.id === editingMember.id ? { ...m, display_name: editName.trim() } : m
      )
    );
    toast.success("Name updated");
    setEditDialog(false);
    router.refresh();
  }

  async function handleResetPassword(member: Profile) {
    if (!confirm(`Reset password for "${member.display_name || member.email}"?`)) return;

    setLoading(member.id);
    const result = await resetMemberPassword(member.id);
    setLoading(null);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    setPasswordMember(member);
    setTempPassword(result.tempPassword!);
    setCopied(false);
    setPasswordDialog(true);
  }

  async function handleDelete(member: Profile) {
    if (
      !confirm(
        `Delete "${member.display_name || member.email}"?\n\nThis will permanently remove the user and all their data. This cannot be undone.`
      )
    )
      return;

    setLoading(member.id);
    const result = await deleteMember(member.id);
    setLoading(null);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    setMembers((prev) => prev.filter((m) => m.id !== member.id));
    toast.success("Member deleted");
    router.refresh();
  }

  function copyPassword() {
    navigator.clipboard.writeText(tempPassword);
    setCopied(true);
    toast.success("Password copied");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.length > 0 ? (
              members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">
                    {member.display_name || "—"}
                    {isSelf(member.id) && (
                      <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                    )}
                  </TableCell>
                  <TableCell>{member.email}</TableCell>
                  <TableCell>
                    <Badge
                      variant={member.role === "admin" ? "default" : "secondary"}
                      className="capitalize"
                    >
                      {member.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(member.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {isProtected(member) ? (
                      <Badge variant="outline" className="text-xs">Protected</Badge>
                    ) : (
                      <div className="flex justify-end gap-1">
                        {/* Edit name */}
                        <Button
                          variant="outline"
                          size="icon-sm"
                          title="Edit name"
                          onClick={() => openEditName(member)}
                          disabled={loading === member.id}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>

                        {/* Toggle role */}
                        {!isSelf(member.id) && (
                          <Button
                            variant="outline"
                            size="icon-sm"
                            title={member.role === "admin" ? "Demote to Mod" : "Promote to Admin"}
                            onClick={() => handleRoleChange(member)}
                            disabled={loading === member.id}
                          >
                            {loading === member.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : member.role === "admin" ? (
                              <ShieldMinus className="h-3.5 w-3.5" />
                            ) : (
                              <ShieldCheck className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        )}

                        {/* Reset password */}
                        {!isSelf(member.id) && (
                          <Button
                            variant="outline"
                            size="icon-sm"
                            title="Reset password"
                            onClick={() => handleResetPassword(member)}
                            disabled={loading === member.id}
                          >
                            <KeyRound className="h-3.5 w-3.5" />
                          </Button>
                        )}

                        {/* Delete */}
                        {!isSelf(member.id) && (
                          <Button
                            variant="outline"
                            size="icon-sm"
                            title="Delete member"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDelete(member)}
                            disabled={loading === member.id}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No team members
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit name dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Display Name</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Display Name</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Display name"
                onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveName} disabled={!editName.trim() || loading !== null}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password reset result dialog */}
      <Dialog open={passwordDialog} onOpenChange={setPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Password Reset</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              New temporary password for{" "}
              <strong>{passwordMember?.display_name || passwordMember?.email}</strong>:
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-md border bg-muted px-3 py-2 text-sm font-mono select-all">
                {tempPassword}
              </code>
              <Button variant="outline" size="sm" onClick={copyPassword}>
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-destructive">
              ⚠️ This password will NOT be shown again. Copy it now and share it with the user securely.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setPasswordDialog(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
