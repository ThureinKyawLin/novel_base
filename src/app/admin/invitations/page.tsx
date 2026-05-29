import { redirect } from "next/navigation";
import { InvitationsManager } from "@/components/admin/invitations-manager";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AdminInvitationsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") redirect("/admin");

  const invitationsRaw = await prisma.invitation.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      createdByProfile: { select: { displayName: true } },
      usedByProfile: { select: { displayName: true } },
    },
  });

  const invitations = invitationsRaw.map((inv) => ({
    id: inv.id,
    token: inv.token,
    role: inv.role,
    status: inv.status,
    expires_at: inv.expiresAt?.toISOString() ?? null,
    used_at: inv.usedAt?.toISOString() ?? null,
    created_at: inv.createdAt.toISOString(),
    created_by_profile: inv.createdByProfile
      ? { display_name: inv.createdByProfile.displayName ?? "" }
      : null,
    used_by_profile: inv.usedByProfile
      ? { display_name: inv.usedByProfile.displayName ?? "" }
      : null,
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Invitations</h1>
      <InvitationsManager initialInvitations={invitations ?? []} />
    </div>
  );
}
