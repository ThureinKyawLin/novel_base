import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MembersManager } from "@/components/admin/members-manager";
import type { Profile } from "@/lib/types";

export default async function AdminModsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") redirect("/admin");

  const membersRaw = await prisma.profile.findMany({
    orderBy: { createdAt: "desc" },
  });

  const members: Profile[] = membersRaw.map((m) => ({
    id: m.id,
    display_name: m.displayName,
    email: m.email,
    role: m.role as "admin" | "mod",
    created_at: m.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Team Members</h1>
      <MembersManager members={members} currentUserId={user.id} protectedEmail="feloz1308@pm.me" />
    </div>
  );
}
