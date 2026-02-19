import { supabaseClient } from "@/lib/supabase/client";
import type { Tenant, TenantMember, TenantInvite, TenantRole } from "./types";
import { getTenantById } from "./queries";
import { getUserRoleByEmail } from "@/lib/supabase/auth";

// ─── Assertions ───────────────────────────────────────────────────────────────

export async function assertTenantOwner(tenantId: string): Promise<string> {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session?.user) throw new Error("Not authenticated");

  const tenant = await getTenantById(tenantId);
  if (!tenant) throw new Error("Tenant not found");
  if (tenant.owner_user_id !== session.user.id)
    throw new Error("You are not the owner of this tenant");
  return session.user.id;
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createTenant(
  name: string,
  ownerUserId: string,
  tenantType?: string,
  description?: string | null,
  logoUrl?: string | null,
  coverUrl?: string | null,
): Promise<Tenant> {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const { data, error } = await supabaseClient
    .from("tenants")
    .insert([{ name, slug, owner_user_id: ownerUserId, tenant_type: tenantType || null, description: description || null, logo_url: logoUrl || null, cover_url: coverUrl || null, status: "active" }])
    .select("*")
    .single();
  if (error) throw new Error(`Failed to create tenant: ${error.message}`);
  return data as Tenant;
}

export async function createTenantForCurrentUser(
  name: string,
  tenantType?: string,
  description?: string | null,
  logoUrl?: string | null,
  coverUrl?: string | null,
): Promise<Tenant> {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session?.user) throw new Error("Not authenticated");
  return createTenant(name, session.user.id, tenantType, description, logoUrl, coverUrl);
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateTenant(
  id: string,
  updates: {
    name?: string;
    tenant_type?: string | null;
    status?: string;
    description?: string | null;
    logo_url?: string | null;
    cover_url?: string | null;
  },
): Promise<Tenant> {
  type PayloadType = {
    name?: string;
    tenant_type?: string | null;
    status?: string;
    description?: string | null;
    logo_url?: string | null;
    cover_url?: string | null;
    updated_at: string;
  };
  const payload: PayloadType = { ...updates, updated_at: new Date().toISOString() };
  Object.keys(payload).forEach((k) => {
    if (payload[k as keyof PayloadType] === undefined)
      delete payload[k as keyof PayloadType];
  });
  const { data, error } = await supabaseClient
    .from("tenants")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(`Failed to update tenant: ${error.message}`);
  return data as Tenant;
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteTenant(id: string): Promise<void> {
  const { error } = await supabaseClient.from("tenants").delete().eq("id", id);
  if (error) throw new Error(`Failed to delete tenant: ${error.message}`);
}

// ─── Team management ──────────────────────────────────────────────────────────

export async function createTenantInvite(
  tenantId: string,
  role: TenantRole | string = "staff",
): Promise<TenantInvite> {
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: { session } } = await supabaseClient.auth.getSession();

  const { data, error } = await supabaseClient
    .from("tenant_invites")
    .insert([{ tenant_id: tenantId, token, role, status: "pending", expires_at: expiresAt, invited_by_user_id: session?.user?.id || null, created_by_user_id: session?.user?.id || null }])
    .select("*")
    .single();
  if (error) throw new Error(`Failed to create invite: ${error.message}`);
  return data as TenantInvite;
}

export async function updateTenantMemberRole(
  tenantId: string,
  memberId: string,
  role: TenantRole | string,
): Promise<TenantMember> {
  const { data, error } = await supabaseClient
    .from("tenant_members")
    .update({ role })
    .eq("tenant_id", tenantId)
    .eq("id", memberId)
    .select("*")
    .single();
  if (error) throw new Error(`Failed to update member role: ${error.message}`);
  return data as TenantMember;
}

export async function removeTenantMember(
  tenantId: string,
  memberId: string,
): Promise<void> {
  const { error } = await supabaseClient
    .from("tenant_members")
    .delete()
    .eq("tenant_id", tenantId)
    .eq("id", memberId);
  if (error) throw new Error(`Failed to remove member: ${error.message}`);
}
