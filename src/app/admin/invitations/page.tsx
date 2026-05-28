import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { InvitationsManager } from "@/components/admin/invitations-manager";

export default async function AdminInvitationsPage() {
  const supabase = await createClient();
  const { data: profile } = await supabase.rpc("ensure_profile").single();
  if (!profile || (profile as { role: string }).role !== "admin") redirect("/admin");

  const { data: invitations } = await supabase
    .from("invitations")
    .select(
      "*, created_by_profile:profiles!invitations_created_by_fkey(display_name), used_by_profile:profiles!invitations_used_by_fkey(display_name)"
    )
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Invitations</h1>
      <InvitationsManager initialInvitations={invitations ?? []} />
    </div>
  );
}
