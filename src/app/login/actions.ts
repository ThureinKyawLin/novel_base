"use server";

import { prisma } from "@/lib/prisma";
import {
  verifyPassword,
  createSessionToken,
  setSessionCookie,
} from "@/lib/auth";
import { headers } from "next/headers";
import { rateLimitAsync } from "@/lib/rate-limit";

export async function login(email: string, password: string) {
  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  // Rate limit: 10 login attempts per 15 minutes per IP
  const headersList = await headers();
  const ip =
    headersList.get("cf-connecting-ip") ??
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  const limiter = await rateLimitAsync(`login:${ip}`, {
    maxRequests: 10,
    windowMs: 900_000, // 15 minutes
  });
  if (!limiter.success) {
    return { error: "Too many login attempts. Please try again later." };
  }

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  });

  if (!user) {
    return { error: "Invalid email or password" };
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return { error: "Invalid email or password" };
  }

  // Check if user has a profile (authorized)
  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
  });

  if (!profile) {
    return { error: "Account not authorized. Contact admin for access." };
  }

  const token = await createSessionToken(user.id);
  await setSessionCookie(token);

  return { success: true };
}
