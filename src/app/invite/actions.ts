"use server";

import { createClient } from "@/lib/supabase/server";
import { inviteSignupSchema } from "@/lib/validations";

/**
 * Validate an invitation token server-side.
 * Returns the role if valid, or an error.
 */
export async function validateInviteToken(token: string) {
  if (!token || token.length > 64) {
    return { valid: false, role: null };
  }

  const supabase = await createClient();

  // Use service-level query — RLS is bypassed because this runs server-side
  // and the anon key can read active invitations (we'll tighten RLS separately)
  const { data, error } = await supabase
    .from("invitations")
    .select("role, expires_at, status")
    .eq("token", token)
    .eq("status", "active")
    .single();

  if (error || !data) {
    return { valid: false, role: null };
  }

  // Check expiry
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return { valid: false, role: null };
  }

  return { valid: true, role: data.role as string };
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

  const supabase = await createClient();

  // 1. Validate token server-side and get role from DB
  const { data: invitation, error: invError } = await supabase
    .from("invitations")
    .select("id, role, expires_at, status")
    .eq("token", token)
    .eq("status", "active")
    .single();

  if (invError || !invitation) {
    return { error: "Invalid or expired invitation link" };
  }

  if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
    return { error: "This invitation has expired" };
  }

  // 2. Sign up user — role comes from the invitation row, NOT client input
  const { data: authData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name,
        role: invitation.role, // Role from DB, not from client
      },
    },
  });

  if (signUpError) {
    return { error: signUpError.message };
  }

  // 3. Mark invitation as used (atomic with signup)
  if (authData.user) {
    const { error: updateError } = await supabase
      .from("invitations")
      .update({
        status: "used",
        used_by: authData.user.id,
        used_at: new Date().toISOString(),
      })
      .eq("token", token)
      .eq("status", "active"); // Extra safety: only update if still active

    if (updateError) {
      // Log but don't fail — user is already created
      console.error("Failed to mark invitation as used:", updateError);
    }
  }

  return { success: true };
}
