import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";

export async function POST() {
  await clearSessionCookie();

  // Return JSON instead of redirect — client-side fetch handles the navigation
  return NextResponse.json({ success: true });
}
