import { supabaseClient } from "@/lib/supabase/client";
import type { Tenant, TenantMember, TenantInvite, TenantRole } from "./types";

// ─── Tenant queries ───────────────────────────────────────────────────────────

export async function getTenantsForCurrentUser(): Promise<Tenant[]> {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session?.user) return [];

  const userId = session.user.id;
  const userEmail = session.user.email;

  // Check if user is a global owner/manager via users table
  const { data: userData } = await supabaseClient
    .from("users")
    .select("role")
    .eq("id", userId)
    .single();

  const globalRole = (userData?.role as string | null)?.toLowerCase();

  if (globalRole === "owner" || globalRole === "manager") {
    // Global admins see all tenants they own
    const { data, error } = await supabaseClient
      .from("tenants")
      .select("*")
      .eq("owner_user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(`Failed to fetch tenants: ${error.message}`);
    return (data as Tenant[]) || [];
  }

  // For other roles: fetch through tenant_members
  const { data: memberRows, error: memberError } = await supabaseClient
    .from("tenant_members")
    .select("tenant_id")
    .eq("user_id", userId)
    .eq("status", "active");
  if (memberError) throw new Error(`Failed to fetch tenant memberships: ${memberError.message}`);

  const tenantIds = (memberRows || [])
    .map((r) => (r as { tenant_id: string | null }).tenant_id)
    .filter(Boolean) as string[];

  if (tenantIds.length === 0) return [];

  const { data, error } = await supabaseClient
    .from("tenants")
    .select("*")
    .in("id", tenantIds)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to fetch tenants: ${error.message}`);
  return (data as Tenant[]) || [];
}

export async function getTenantById(id: string): Promise<Tenant | null> {
  const { data, error } = await supabaseClient
    .from("tenants")
    .select("*")
    .eq("id", id)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to fetch tenant: ${error.message}`);
  }
  return data as Tenant;
}

export async function getTenantMembers(tenantId: string): Promise<TenantMember[]> {
  const { data, error } = await supabaseClient
    .from("tenant_members")
    .select(`
      *,
      user:users(id, email, full_name, username, avatar_url)
    `)
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to fetch tenant members: ${error.message}`);
  return (data as TenantMember[]) || [];
}

export async function getCurrentUserTenantRole(
  tenantId: string,
): Promise<TenantRole | null> {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session?.user) return null;

  const { data, error } = await supabaseClient
    .from("tenant_members")
    .select("role, status")
    .eq("tenant_id", tenantId)
    .eq("user_id", session.user.id)
    .eq("status", "active")
    .maybeSingle();
  if (error) throw new Error(`Failed to check tenant role: ${error.message}`);

  const role = (data?.role as string | null)?.toLowerCase() as TenantRole | null;
  return role === "owner" || role === "manager" || role === "staff" ? role : null;
}

export async function getTenantInvites(tenantId: string): Promise<TenantInvite[]> {
  const { data, error } = await supabaseClient
    .from("tenant_invites")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to fetch tenant invites: ${error.message}`);
  return (data as TenantInvite[]) || [];
}

export async function getTenantInviteByToken(token: string): Promise<TenantInvite | null> {
  const { data, error } = await supabaseClient
    .from("tenant_invites")
    .select("*")
    .eq("token", token)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to fetch invite: ${error.message}`);
  }
  return data as TenantInvite;
}

export async function checkTenantHasData(tenantId: string): Promise<boolean> {
  const checks = await Promise.all([
    supabaseClient.from("certificates").select("id").eq("tenant_id", tenantId).limit(1),
    supabaseClient.from("templates").select("id").eq("tenant_id", tenantId).limit(1),
    supabaseClient.from("members").select("id").eq("tenant_id", tenantId).limit(1),
  ]);
  return checks.some((r) => (r.data?.length ?? 0) > 0);
}
