import { supabaseClient } from "./client";
import { getUserRoleByEmail } from "./auth";

export type TenantStatus = "active" | "archived";

export interface Tenant {
  id: string;
  name: string;
  slug: string | null;
  owner_user_id: string;
  status: TenantStatus | string;
  tenant_type?: string | null;
  description?: string | null;
  logo_url?: string | null;
  cover_url?: string | null;
  member_count?: number;
  created_at: string;
  updated_at: string;
}

export type TenantRole = "owner" | "manager" | "staff";

export interface TenantMember {
  id: string;
  tenant_id: string;
  user_id: string;
  role: TenantRole | string;
  status: string;
  created_at: string;
  user?: {
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export interface TenantInvite {
  id: string;
  tenant_id: string;
  token: string;
  role: TenantRole | string;
  status: string;
  created_by_user_id: string;
  expires_at: string | null;
  created_at: string;
}

export async function getTenantsForCurrentUser(): Promise<Tenant[]> {
  const {
    data: { session },
    error: sessionError,
  } = await supabaseClient.auth.getSession();

  if (sessionError) {
    throw new Error(`Failed to get session: ${sessionError.message}`);
  }

  const userId = session?.user?.id;
  if (!userId) {
    return [];
  }

  const { data, error } = await supabaseClient
    .from("tenant_members")
    .select(
      `
      tenants:tenant_id (
        id,
        name,
        slug,
        owner_user_id,
        status,
        tenant_type,
        description,
        logo_url,
        cover_url,
        created_at,
        updated_at
      )
    `,
    )
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch tenants: ${error.message}`);
  }

  type TenantRowData = { tenants: Tenant | Tenant[] | null };
  const tenants: Tenant[] = [];

  (data as unknown as TenantRowData[] | null | undefined)?.forEach((row) => {
    if (row?.tenants) {
      // Handle both single tenant and array of tenants
      if (Array.isArray(row.tenants)) {
        tenants.push(...row.tenants);
      } else {
        tenants.push(row.tenants);
      }
    }
  });

  const unique = new Map<string, Tenant>();
  tenants.forEach((t) => {
    if (!unique.has(t.id)) {
      unique.set(t.id, t);
    }
  });

  const tenantList = Array.from(unique.values());

  if (tenantList.length === 0) {
    return tenantList;
  }

  const tenantIds = tenantList.map((t) => t.id);

  const { data: memberRows, error: memberError } = await supabaseClient
    .from("tenant_members")
    .select("tenant_id")
    .in("tenant_id", tenantIds)
    .eq("status", "active");

  if (memberError) {
    throw new Error(
      `Failed to fetch tenant member counts: ${memberError.message}`,
    );
  }

  type TenantMemberRow = { tenant_id: string | null };
  const counts = new Map<string, number>();
  (memberRows as TenantMemberRow[] | null | undefined)?.forEach((row) => {
    const id = row.tenant_id ?? undefined;
    if (!id) return;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  });

  return tenantList.map((t) => ({
    ...t,
    member_count: counts.get(t.id) ?? 0,
  }));
}

export async function getTenantById(id: string): Promise<Tenant | null> {
  if (!id) {
    throw new Error("Tenant ID is required");
  }

  const { data, error } = await supabaseClient
    .from("tenants")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch tenant: ${error.message}`);
  }

  return (data as Tenant) ?? null;
}

export async function getTenantMembers(
  tenantId: string,
): Promise<TenantMember[]> {
  if (!tenantId) {
    throw new Error("Tenant ID is required");
  }

  const { data, error } = await supabaseClient
    .from("tenant_members")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch tenant members: ${error.message}`);
  }

  return (data as TenantMember[]) || [];
}

async function assertTenantOwner(tenantId: string): Promise<string> {
  const {
    data: { session },
    error: sessionError,
  } = await supabaseClient.auth.getSession();

  if (sessionError) {
    throw new Error(`Failed to get session: ${sessionError.message}`);
  }

  const userId = session?.user?.id;
  if (!userId) {
    throw new Error("User is not authenticated");
  }

  const { data, error } = await supabaseClient
    .from("tenant_members")
    .select("id, role, status")
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to check tenant membership: ${error.message}`);
  }

  const role = (data?.role as string | null)?.toLowerCase();
  if (!data || role !== "owner") {
    throw new Error("Only tenant owner can perform this action");
  }

  return userId;
}

export async function getCurrentUserTenantRole(
  tenantId: string,
): Promise<TenantRole | null> {
  if (!tenantId) return null;

  const {
    data: { session },
    error: sessionError,
  } = await supabaseClient.auth.getSession();

  if (sessionError) {
    throw new Error(`Failed to get session: ${sessionError.message}`);
  }

  const userId = session?.user?.id;
  if (!userId) {
    return null;
  }

  const { data, error } = await supabaseClient
    .from("tenant_members")
    .select("role, status")
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to get tenant role: ${error.message}`);
  }

  const role = (data?.role as string | null)?.toLowerCase() as TenantRole | null;
  return (role === "owner" || role === "manager" || role === "staff")
    ? role
    : null;
}

export async function createTenant(
  name: string,
  ownerUserId: string,
  tenantType?: string,
  description?: string | null,
  logoUrl?: string | null,
  coverUrl?: string | null,
): Promise<Tenant> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Tenant name is required");
  }
  if (!ownerUserId) {
    throw new Error("Owner user id is required");
  }

  const baseSlug = trimmed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const slug = baseSlug || `tenant-${Date.now()}`;

  const { data, error } = await supabaseClient
    .from("tenants")
    .insert([
      {
        name: trimmed,
        slug,
        owner_user_id: ownerUserId,
        tenant_type: tenantType ?? "company",
        description: description ?? null,
        logo_url: logoUrl ?? null,
        cover_url: coverUrl ?? null,
      },
    ])
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to create tenant: ${error.message}`);
  }

  return data as Tenant;
}

export async function createTenantForCurrentUser(
  name: string,
  tenantType?: string,
  description?: string | null,
  logoUrl?: string | null,
  coverUrl?: string | null,
): Promise<Tenant> {
  const {
    data: { session },
    error: sessionError,
  } = await supabaseClient.auth.getSession();

  if (sessionError) {
    throw new Error(`Failed to get session: ${sessionError.message}`);
  }

  const userId = session?.user?.id;
  if (!userId) {
    throw new Error("User is not authenticated");
  }

  // Only allow users with global role 'owner' to create new tenants.
  // Global role is resolved via email_whitelist/users using getUserRoleByEmail.
  const userEmail = session.user.email;
  const globalRole = userEmail ? await getUserRoleByEmail(userEmail) : null;
  if (globalRole !== "owner") {
    throw new Error("Only owner users can create new tenants");
  }

  const tenant = await createTenant(
    name,
    userId,
    tenantType,
    description,
    logoUrl,
    coverUrl,
  );

  const { error: memberError } = await supabaseClient
    .from("tenant_members")
    .insert([
      {
        tenant_id: tenant.id,
        user_id: userId,
        role: "owner",
        status: "active",
      },
    ]);

  if (memberError) {
    throw new Error(`Failed to add owner to tenant: ${memberError.message}`);
  }

  return tenant;
}

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
  if (!id) {
    throw new Error("Tenant ID is required");
  }

  await assertTenantOwner(id);

  type PayloadType = {
    name?: string;
    tenant_type?: string | null;
    status?: string;
    description?: string | null;
    logo_url?: string | null;
    cover_url?: string | null;
  };

  const payload: PayloadType = {};
  if (typeof updates.name === "string") {
    const trimmed = updates.name.trim();
    if (!trimmed) {
      throw new Error("Tenant name is required");
    }
    payload.name = trimmed;
  }
  if (updates.tenant_type !== undefined) {
    payload.tenant_type = updates.tenant_type;
  }
  if (updates.status !== undefined) {
    payload.status = updates.status;
  }
  if (updates.description !== undefined) {
    payload.description = updates.description;
  }
  if (updates.logo_url !== undefined) {
    payload.logo_url = updates.logo_url;
  }
  if (updates.cover_url !== undefined) {
    payload.cover_url = updates.cover_url;
  }

  const { data, error } = await supabaseClient
    .from("tenants")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to update tenant: ${error.message}`);
  }

  return data as Tenant;
}

export async function deleteTenant(id: string): Promise<void> {
  if (!id) {
    throw new Error("Tenant ID is required");
  }

  await assertTenantOwner(id);

  const { error } = await supabaseClient.from("tenants").delete().eq("id", id);

  if (error) {
    throw new Error(`Failed to delete tenant: ${error.message}`);
  }
}

export async function getTenantInvites(
  tenantId: string,
): Promise<TenantInvite[]> {
  if (!tenantId) {
    throw new Error("Tenant ID is required");
  }

  const { data, error } = await supabaseClient
    .from("tenant_invites")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch tenant invites: ${error.message}`);
  }

  return (data as TenantInvite[]) || [];
}

export async function getTenantInviteByToken(token: string): Promise<TenantInvite | null> {
  if (!token) {
    throw new Error("Invite token is required");
  }

  const { data, error } = await supabaseClient
    .from("tenant_invites")
    .select("*")
    .eq("token", token)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch tenant invite: ${error.message}`);
  }

  return (data as TenantInvite) ?? null;
}

export async function createTenantInvite(
  tenantId: string,
  role: TenantRole | string = "staff",
): Promise<TenantInvite> {
  if (!tenantId) {
    throw new Error("Tenant ID is required");
  }

  const userId = await assertTenantOwner(tenantId);

  // Generate a simple unique token for the invite
  const token =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${tenantId}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  const { data, error } = await supabaseClient
    .from("tenant_invites")
    .insert([
      {
        tenant_id: tenantId,
        invited_by_user_id: userId,
        token,
        role,
        status: "pending",
        created_by_user_id: userId,
        expires_at: null,
      },
    ])
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to create tenant invite: ${error.message}`);
  }

  return data as TenantInvite;
}

export async function updateTenantMemberRole(
  tenantId: string,
  memberId: string,
  role: TenantRole | string,
): Promise<TenantMember> {
  if (!tenantId || !memberId) {
    throw new Error("Tenant ID and member ID are required");
  }

  // Only tenant owner is allowed to change roles inside the tenant
  await assertTenantOwner(tenantId);

  const { data, error } = await supabaseClient
    .from("tenant_members")
    .update({ role })
    .eq("id", memberId)
    .eq("tenant_id", tenantId)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to update tenant member role: ${error.message}`);
  }

  return data as TenantMember;
}

export async function checkTenantHasData(tenantId: string): Promise<boolean> {
  if (!tenantId) {
    throw new Error("Tenant ID is required");
  }

  try {
    // Check if tenant has any templates
    const { count: templatesCount } = await supabaseClient
      .from("templates")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", tenantId);

    if (templatesCount && templatesCount > 0) {
      return true;
    }

    // Check if tenant has any certificates
    const { count: certificatesCount } = await supabaseClient
      .from("certificates")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", tenantId);

    if (certificatesCount && certificatesCount > 0) {
      return true;
    }

    // Check if tenant has any members (data)
    const { count: membersCount } = await supabaseClient
      .from("members")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", tenantId);

    if (membersCount && membersCount > 0) {
      return true;
    }

    return false;
  } catch (error) {
    console.error("Error checking tenant data:", error);
    // Return true as safe default - don't allow deletion if we can't check
    return true;
  }
}
