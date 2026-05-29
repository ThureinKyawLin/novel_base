"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import { uuidSchema } from "@/lib/validations";
import { revalidatePath } from "next/cache";
import type { Role } from "@/lib/types";

// Super admin account — cannot be modified or deleted by anyone
const PROTECTED_EMAIL = "feloz1308@pm.me";

async function isProtectedAccount(memberId: string): Promise<boolean> {
  const profile = await prisma.profile.findUnique({
    where: { id: memberId },
    select: { email: true },
  });
  return profile?.email === PROTECTED_EMAIL;
}

/**
 * Change a member's role (admin ↔ mod).
 * Cannot change own role or super admin.
 */
export async function changeRole(memberId: string, newRole: Role) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return { error: "Not authorized" };
  if (!uuidSchema.safeParse(memberId).success) return { error: "Invalid ID" };
  if (!["admin", "mod"].includes(newRole)) return { error: "Invalid role" };
  if (memberId === user.id) return { error: "Cannot change your own role" };
  if (await isProtectedAccount(memberId)) return { error: "This account is protected" };

  try {
    await prisma.profile.update({
      where: { id: memberId },
      data: { role: newRole },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "update",
        entityType: "member",
        entityId: memberId,
        details: { field: "role", new_value: newRole },
      },
    });

    revalidatePath("/admin/mods");
    return { success: true };
  } catch {
    return { error: "Failed to change role" };
  }
}

/**
 * Update a member's display name.
 */
export async function updateMemberName(memberId: string, displayName: string) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return { error: "Not authorized" };
  if (!uuidSchema.safeParse(memberId).success) return { error: "Invalid ID" };
  if (await isProtectedAccount(memberId)) return { error: "This account is protected" };

  const name = displayName.trim();
  if (!name || name.length > 100) return { error: "Display name must be 1-100 characters" };

  try {
    await prisma.profile.update({
      where: { id: memberId },
      data: { displayName: name },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "update",
        entityType: "member",
        entityId: memberId,
        details: { field: "display_name", new_value: name },
      },
    });

    revalidatePath("/admin/mods");
    return { success: true };
  } catch {
    return { error: "Failed to update name" };
  }
}

/**
 * Reset a member's password. Returns the new temporary password.
 * Cannot reset own password here (use profile settings instead).
 */
export async function resetMemberPassword(memberId: string) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return { error: "Not authorized" };
  if (!uuidSchema.safeParse(memberId).success) return { error: "Invalid ID" };
  if (memberId === user.id) return { error: "Cannot reset your own password here" };
  if (await isProtectedAccount(memberId)) return { error: "This account is protected" };

  // Generate a random temporary password
  const tempPassword =
    Array.from(crypto.getRandomValues(new Uint8Array(12)))
      .map((b) => "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789"[b % 54])
      .join("");

  try {
    const passwordHash = await hashPassword(tempPassword);

    await prisma.user.update({
      where: { id: memberId },
      data: { passwordHash },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "update",
        entityType: "member",
        entityId: memberId,
        details: { field: "password", action: "reset" },
      },
    });

    revalidatePath("/admin/mods");
    return { tempPassword };
  } catch {
    return { error: "Failed to reset password" };
  }
}

/**
 * Delete a member (user + profile, cascade).
 * Cannot delete yourself.
 */
export async function deleteMember(memberId: string) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return { error: "Not authorized" };
  if (!uuidSchema.safeParse(memberId).success) return { error: "Invalid ID" };
  if (memberId === user.id) return { error: "Cannot delete yourself" };
  if (await isProtectedAccount(memberId)) return { error: "This account is protected" };

  try {
    const profile = await prisma.profile.findUnique({
      where: { id: memberId },
      select: { displayName: true, email: true },
    });

    // Delete user (profile cascades via onDelete: Cascade)
    await prisma.user.delete({ where: { id: memberId } });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "delete",
        entityType: "member",
        entityId: memberId,
        details: {
          display_name: profile?.displayName,
          email: profile?.email,
        },
      },
    });

    revalidatePath("/admin/mods");
    return { success: true };
  } catch {
    return { error: "Failed to delete member" };
  }
}
