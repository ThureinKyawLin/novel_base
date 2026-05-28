import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { LOCALE_COOKIE, DEFAULT_LOCALE, isLocale } from "@/lib/i18n";

const SESSION_COOKIE = "session";

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET environment variable is required");
  return new TextEncoder().encode(secret);
}

async function verifyToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });

  // Set default language cookie if absent
  const localeCookie = request.cookies.get(LOCALE_COOKIE)?.value;
  if (!localeCookie || !isLocale(localeCookie)) {
    response.cookies.set(LOCALE_COOKIE, DEFAULT_LOCALE, {
      path: "/",
      maxAge: 31536000,
      sameSite: "lax",
    });
  }

  // Check auth from session cookie
  const sessionToken = request.cookies.get(SESSION_COOKIE)?.value;
  const userId = sessionToken ? await verifyToken(sessionToken) : null;

  // Protect admin routes — check auth only
  if (request.nextUrl.pathname.startsWith("/admin")) {
    if (!userId) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      const redirectPath = request.nextUrl.pathname;
      if (redirectPath.startsWith("/") && !redirectPath.startsWith("//")) {
        url.searchParams.set("redirect", redirectPath);
      }
      return NextResponse.redirect(url);
    }
  }

  // Redirect logged-in users away from login page
  // Skip redirect if user explicitly navigated here to sign out
  if (
    request.nextUrl.pathname === "/login" &&
    userId &&
    !request.nextUrl.searchParams.has("signout")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/login", "/", "/novels/:path*", "/submit", "/api-docs"],
};
