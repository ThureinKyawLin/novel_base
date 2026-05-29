"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function generateInvitation(expiryHours: string | null) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return { error: "Not authorized" };

  const token = crypto.randomUUID().replace(/-/g, "");
  const expiresAt = expiryHours
    ? new Date(Date.now() + Number(expiryHours) * 3600000)
    : null;

  try {
    const invitation = await prisma.invitation.create({
      data: {
        token,
        role: "mod",
        expiresAt,
        createdBy: user.id,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "create",
        entityType: "invitation",
        entityId: invitation.id,
        details: { role: "mod", expires_at: expiresAt?.toISOString() ?? null },
      },
    });

    revalidatePath("/admin/invitations");
    return {
      data: {
        id: invitation.id,
        token: invitation.token,
      },
    };
  } catch {
    return { error: "Failed to generate invitation" };
  }
}
