import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/sidebar";
import { AdminHeader } from "@/components/admin/header";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { SignOutButton } from "@/components/admin/sign-out-button";
import { getCurrentUser, ensureProfile, clearSessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    // Clear invalid session to prevent redirect loop
    await clearSessionCookie();
    redirect("/login");
  }

  // Ensure profile exists (handles first admin bootstrap)
  const ensured = await ensureProfile(user.id);
  if (!ensured) {
    await clearSessionCookie();
    redirect("/login");
  }

  // Map camelCase from ensureProfile() to snake_case expected by components
  const profile = {
    id: ensured.id,
    email: ensured.email,
    display_name: ensured.displayName,
    role: ensured.role as "admin" | "mod",
    created_at: ensured.createdAt,
  };

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

  // Get pending submission count for sidebar badge
  const pendingCount = await prisma.submission.count({ where: { status: "pending" } });

  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar role={profile.role} pendingSubmissions={pendingCount} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminHeader profile={profile} pendingSubmissions={pendingCount} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
