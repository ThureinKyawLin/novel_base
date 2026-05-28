import { SignJWT, jwtVerify } from "jose";
import { hash, compare } from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const SESSION_COOKIE = "session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days in seconds

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET environment variable is required");
  return new TextEncoder().encode(secret);
}

// ============================================
// Password hashing
// ============================================

export async function hashPassword(password: string): Promise<string> {
  return hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return compare(password, hashedPassword);
}

// ============================================
// JWT token management
// ============================================

export async function createSessionToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getJwtSecret());
}

export async function verifySessionToken(
  token: string
): Promise<{ userId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    if (!payload.sub) return null;
    return { userId: payload.sub };
  } catch {
    return null;
  }
}

/**
 * Lightweight JWT verification for Edge middleware.
 * Only verifies the token — does NOT hit the database.
 */
export async function verifySessionTokenEdge(
  token: string
): Promise<{ userId: string } | null> {
  return verifySessionToken(token);
}

// ============================================
// Cookie helpers (server actions / route handlers)
// ============================================

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSessionToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value;
}

// ============================================
// Get current user (for server components & actions)
// ============================================

export async function getCurrentUser() {
  const token = await getSessionToken();
  if (!token) return null;

  const session = await verifySessionToken(token);
  if (!session) return null;

  const profile = await prisma.profile.findUnique({
    where: { id: session.userId },
  });

  if (!profile) return null;

  return {
    id: profile.id,
    email: profile.email,
    displayName: profile.displayName,
    role: profile.role,
    createdAt: profile.createdAt.toISOString(),
  };
}

/**
 * Ensure a profile exists for the user. Creates one if missing.
 * Replaces the Supabase ensure_profile() RPC.
 */
export async function ensureProfile(userId: string) {
  let profile = await prisma.profile.findUnique({
    where: { id: userId },
  });

  if (!profile) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return null;

    profile = await prisma.profile.create({
      data: {
        id: user.id,
        email: user.email,
        displayName: user.email.split("@")[0],
        role: "mod",
      },
    });
  }

  return {
    id: profile.id,
    email: profile.email,
    displayName: profile.displayName,
    role: profile.role,
    createdAt: profile.createdAt.toISOString(),
  };
}
