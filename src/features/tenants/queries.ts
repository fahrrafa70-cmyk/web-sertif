import { supabaseClient } from "@/lib/supabase/client";
import type { Tenant, TenantMember, TenantInvite, TenantRole } from "./types";

// ─── Tenant queries ───────────────────────────────────────────────────────────

export async function getTenantsForCurrentUser(): Promise<Tenant[]> {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session?.user) return [];

  const userId = session.user.id;

  // Check if user is a global owner/manager via users table
  const { data: userData } = await supabaseClient
    .from("users")
    .select("role")
    .eq("id", userId)
    .single();

  const globalRole = (userData?.role as string | null)?.toLowerCase();

  let tenants: Tenant[] = [];

  if (globalRole === "owner" || globalRole === "manager") {
    // Global admins see all tenants they own
    const { data, error } = await supabaseClient
      .from("tenants")
      .select("*")
      .eq("owner_user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(`Failed to fetch tenants: ${error.message}`);
    tenants = (data as Tenant[]) || [];
  } else {
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
    tenants = (data as Tenant[]) || [];
  }

  if (tenants.length === 0) return [];

  // Attach member_count for each tenant
  const tenantIds = tenants.map((t) => t.id);
  const { data: memberCounts } = await supabaseClient
    .from("tenant_members")
    .select("tenant_id")
    .in("tenant_id", tenantIds)
    .eq("status", "active");

  const countMap = new Map<string, number>();
  (memberCounts || []).forEach((row) => {
    const tid = (row as { tenant_id: string }).tenant_id;
    countMap.set(tid, (countMap.get(tid) ?? 0) + 1);
  });

  return tenants.map((t) => ({ ...t, member_count: countMap.get(t.id) ?? 0 }));
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
  // Step 1: fetch tenant_members rows (no join — avoids schema cache error)
  const { data, error } = await supabaseClient
    .from("tenant_members")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to fetch tenant members: ${error.message}`);
  if (!data || data.length === 0) return [];

  // Step 2: fetch user profiles from email_whitelist for each member
  const userIds = [...new Set(data.map((m) => m.user_id as string).filter(Boolean))];

  // Get session to look up profiles — use email_whitelist table
  const { data: profilesData } = await supabaseClient
    .from("email_whitelist")
    .select("id, email, full_name, username, avatar_url")
    .in("id", userIds);

  const profilesMap = new Map(
    (profilesData || []).map((p) => [p.id as string, p])
  );

  return data.map((m) => {
    const profile = profilesMap.get(m.user_id as string) ?? null;
    return {
      ...m,
      user: profile
        ? {
            id: profile.id as string,
            email: profile.email as string,
            full_name: profile.full_name as string | null,
            username: profile.username as string | null,
            avatar_url: profile.avatar_url as string | null,
          }
        : null,
    } as TenantMember;
  });
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
