"use server";

import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { SupabaseClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabaseAdmin = {
  get auth() { return getSupabaseAdmin().auth; },
  from(table: string) { return getSupabaseAdmin().from(table); }
} as unknown as SupabaseClient;

/**
 * Retrieves or generates a secure team invite link for a specific organization.
 * Only owners or mentors of the organization are authorized to obtain this link.
 * 
 * @param orgId The organization's UUID
 * @returns Fully formatted invite URL: https://[domain]/invite/[invite_token]
 */
export async function getOrGenerateInviteLink(orgId: string): Promise<string> {
  if (!orgId) {
    throw new Error("Organization ID is required.");
  }

  // 1. Retrieve the session token from cookies
  const cookieStore = await cookies();
  const token = cookieStore.get("sb-access-token")?.value;

  if (!token) {
    throw new Error("Authentication session not found.");
  }

  // 2. Validate the user session securely
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

  if (authError || !user) {
    throw new Error("Invalid or expired session.");
  }

  // 3. Verify user's role inside this organization
  const { data: membership, error: memberError } = await supabaseAdmin
    .from("organization_users")
    .select("role")
    .eq("organization_id", orgId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (memberError || !membership) {
    throw new Error("You are not a member of this organization.");
  }

  // Only OWNER or MENTOR can manage invitations
  if (membership.role !== "OWNER" && membership.role !== "MENTOR") {
    throw new Error("Unauthorized to access invite links. Must be OWNER or MENTOR.");
  }

  // 4. Retrieve the organization invite token
  const { data: org, error: orgError } = await supabaseAdmin
    .from("organizations")
    .select("invite_token")
    .eq("id", orgId)
    .single();

  if (orgError || !org) {
    throw new Error("Organization not found.");
  }

  let inviteToken = org.invite_token;

  // 5. Generate one if it doesn't exist (fallback safety check)
  if (!inviteToken) {
    inviteToken = crypto.randomUUID();
    const { error: updateError } = await supabaseAdmin
      .from("organizations")
      .update({ invite_token: inviteToken })
      .eq("id", orgId);

    if (updateError) {
      throw new Error("Failed to generate organization invite token.");
    }
  }

  // 6. Return the fully qualified invite URL
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return `${siteUrl}/invite/${inviteToken}`;
}

/**
 * Joins a user to an organization using its share/invite token.
 * Maps the authenticated user with a 'MEMBER' role.
 * 
 * @param inviteToken The unique team invitation token (UUID)
 * @returns The joined workspace object: { id, name }
 */
export async function joinTeamWithToken(inviteToken: string): Promise<{ id: string; name: string }> {
  if (!inviteToken || !inviteToken.trim()) {
    throw new Error("Invitation token is required.");
  }

  // 1. Retrieve the session token from cookies
  const cookieStore = await cookies();
  const token = cookieStore.get("sb-access-token")?.value;

  if (!token) {
    throw new Error("Authentication session not found.");
  }

  // 2. Validate user session
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

  if (authError || !user) {
    throw new Error("Invalid or expired session.");
  }

  // 3. Find the organization matching this invite_token
  const { data: org, error: orgError } = await supabaseAdmin
    .from("organizations")
    .select("id, name")
    .eq("invite_token", inviteToken.trim())
    .maybeSingle();

  if (orgError || !org) {
    throw new Error("Invalid invitation token. Team not found.");
  }

  // 4. Check if the user is already a member of this organization
  const { data: existingMembership } = await supabaseAdmin
    .from("organization_users")
    .select("id")
    .eq("organization_id", org.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existingMembership) {
    // 5. Join user as MEMBER
    const { error: joinError } = await supabaseAdmin
      .from("organization_users")
      .insert({
        organization_id: org.id,
        user_id: user.id,
        role: "MEMBER"
      });

    if (joinError) {
      console.error("Error joining team:", joinError);
      throw new Error("Failed to join the team. Please try again.");
    }
  }

  return {
    id: org.id,
    name: org.name
  };
}
