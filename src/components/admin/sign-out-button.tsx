"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LogOut } from "lucide-react";

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login?signout");
    router.refresh();
  }

  return (
    <button
      onClick={handleSignOut}
      className="inline-flex items-center gap-1.5 text-sm text-destructive hover:underline"
    >
      <LogOut className="h-3.5 w-3.5" />
      Sign Out
    </button>
  );
}
