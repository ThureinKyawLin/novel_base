"use server";

import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { inviteSignupSchema } from "@/lib/validations";
import { headers } from "next/headers";
import { rateLimitAsync } from "@/lib/rate-limit";

/** Get client IP for rate limiting */
async function getIp() {
  const h = await headers();
  return h.get("cf-connecting-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

/**
 * Validate an invitation token server-side.
 * Returns the role if valid, or an error.
 */
export async function validateInviteToken(token: string) {
  if (!token || token.length > 64) {
    return { valid: false, role: null };
  }

  // Rate limit: prevent token brute-force (20 attempts per 15 min per IP)
  const ip = await getIp();
  const limiter = await rateLimitAsync(`invite-validate:${ip}`, { maxRequests: 20, windowMs: 900_000 });
  if (!limiter.success) {
    return { valid: false, role: null };
  }

  const invitation = await prisma.invitation.findFirst({
    where: { token, status: "active" },
    select: { role: true, expiresAt: true },
  });

  if (!invitation) {
    return { valid: false, role: null };
  }

  // Check expiry
  if (invitation.expiresAt && invitation.expiresAt < new Date()) {
    return { valid: false, role: null };
  }

  return { valid: true, role: invitation.role as string };
}

/**
 * Handle invite signup entirely server-side.
 * The role comes from the DB invitation, NOT from the client.
 */
export async function inviteSignup(formData: {
  token: string;
  email: string;
  password: string;
  display_name: string;
}) {
  // Validate input
  const parsed = inviteSignupSchema.safeParse(formData);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Invalid input";
    return { error: firstError };
  }

  const { token, email, password, display_name } = parsed.data;

  // Rate limit: 5 signups per 15 min per IP
  const ip = await getIp();
  const limiter = await rateLimitAsync(`invite-signup:${ip}`, { maxRequests: 5, windowMs: 900_000 });
  if (!limiter.success) {
    return { error: "Too many attempts. Please try again later." };
  }

  // 1. Validate token server-side and get role from DB
  const invitation = await prisma.invitation.findFirst({
    where: { token, status: "active" },
    select: { id: true, role: true, expiresAt: true },
  });

  if (!invitation) {
    return { error: "Invalid or expired invitation link" };
  }

  if (invitation.expiresAt && invitation.expiresAt < new Date()) {
    return { error: "This invitation has expired" };
  }

  // Check if email already exists
  const existingUser = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (existingUser) {
    return { error: "An account with this email already exists" };
  }

  try {
    // 2. Create user + profile in a transaction
    const passwordHash = await hashPassword(password);

    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: email.toLowerCase().trim(),
          passwordHash,
        },
      });

      await tx.profile.create({
        data: {
          id: newUser.id,
          email: newUser.email,
          displayName: display_name,
          role: invitation.role, // Role from DB, not from client
        },
      });

      // 3. Mark invitation as used
      await tx.invitation.update({
        where: { id: invitation.id, status: "active" },
        data: {
          status: "used",
          usedBy: newUser.id,
          usedAt: new Date(),
        },
      });

      return newUser;
    });

    return { success: true };
  } catch (e) {
    console.error("Invite signup error:", e);
    return { error: "Failed to create account. Please try again." };
  }
}
