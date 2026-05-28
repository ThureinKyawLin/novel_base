import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/sidebar";
import { AdminHeader } from "@/components/admin/header";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { SignOutButton } from "@/components/admin/sign-out-button";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Use RPC to ensure profile exists (bypasses RLS, handles first admin bootstrap)
  // .single() is required because ensure_profile returns SETOF — without it,
  // the client returns an array and profile.role would be undefined.
  const { data: rpcProfile } = await supabase
    .rpc("ensure_profile")
    .single();

  const profile = rpcProfile as {
    id: string;
    email: string | null;
    display_name: string | null;
    role: "admin" | "mod";
    created_at: string;
  } | null;

  if (!profile || !['admin', 'mod'].includes(profile.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <ShieldAlert className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground">
            Your account does not have admin or moderator access.
            Contact an administrator to get access.
          </p>
          <div className="flex gap-3 justify-center pt-2">
            <Link href="/" className="text-sm text-primary hover:underline">
              Go to Home
            </Link>
            <SignOutButton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar role={profile.role} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminHeader profile={profile} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
