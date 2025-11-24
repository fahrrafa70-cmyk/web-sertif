import { supabaseClient } from './client';

export type TenantStatus = 'active' | 'archived';

export interface Tenant {
  id: string;
  name: string;
  slug: string | null;
  owner_user_id: string;
  status: TenantStatus | string;
  tenant_type?: string | null;
  created_at: string;
  updated_at: string;
}

export type TenantRole = 'owner' | 'manager' | 'staff';

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
  const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();

  if (sessionError) {
    throw new Error(`Failed to get session: ${sessionError.message}`);
  }

  const userId = session?.user?.id;
  if (!userId) {
    return [];
  }

  const { data, error } = await supabaseClient
    .from('tenant_members')
    .select(
      `
      tenants:tenant_id (
        id,
        name,
        slug,
        owner_user_id,
        status,
        created_at,
        updated_at
      )
    `,
    )
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch tenants: ${error.message}`);
  }

  const tenants: Tenant[] = [];

  (data || []).forEach((row: any) => {
    if (row && row.tenants) {
      tenants.push(row.tenants as Tenant);
    }
  });

  const unique = new Map<string, Tenant>();
  tenants.forEach((t) => {
    if (!unique.has(t.id)) {
      unique.set(t.id, t);
    }
  });

  return Array.from(unique.values());
}

export async function getTenantById(id: string): Promise<Tenant | null> {
  if (!id) {
    throw new Error('Tenant ID is required');
  }

  const { data, error } = await supabaseClient
    .from('tenants')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch tenant: ${error.message}`);
  }

  return (data as Tenant) ?? null;
}

export async function getTenantMembers(tenantId: string): Promise<TenantMember[]> {
  if (!tenantId) {
    throw new Error('Tenant ID is required');
  }

  const { data, error } = await supabaseClient
    .from('tenant_members')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch tenant members: ${error.message}`);
  }

  return (data as TenantMember[]) || [];
}

export async function createTenant(
  name: string,
  ownerUserId: string,
  tenantType?: string,
): Promise<Tenant> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error('Tenant name is required');
  }
  if (!ownerUserId) {
    throw new Error('Owner user id is required');
  }

  const baseSlug = trimmed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const slug = baseSlug || `tenant-${Date.now()}`;

  const { data, error } = await supabaseClient
    .from('tenants')
    .insert([
      {
        name: trimmed,
        slug,
        owner_user_id: ownerUserId,
        tenant_type: tenantType ?? 'company',
      },
    ])
    .select('*')
    .single();

  if (error) {
    throw new Error(`Failed to create tenant: ${error.message}`);
  }

  return data as Tenant;
}

export async function createTenantForCurrentUser(
  name: string,
  tenantType?: string,
): Promise<Tenant> {
  const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();

  if (sessionError) {
    throw new Error(`Failed to get session: ${sessionError.message}`);
  }

  const userId = session?.user?.id;
  if (!userId) {
    throw new Error('User is not authenticated');
  }

  const tenant = await createTenant(name, userId, tenantType);

  const { error: memberError } = await supabaseClient
    .from('tenant_members')
    .insert([
      {
        tenant_id: tenant.id,
        user_id: userId,
        role: 'owner',
        status: 'active',
      },
    ]);

  if (memberError) {
    throw new Error(`Failed to add owner to tenant: ${memberError.message}`);
  }

  return tenant;
}

export async function updateTenant(
  id: string,
  updates: { name?: string; tenant_type?: string | null; status?: string },
): Promise<Tenant> {
  if (!id) {
    throw new Error('Tenant ID is required');
  }

  const payload: Record<string, any> = {};
  if (typeof updates.name === 'string') {
    const trimmed = updates.name.trim();
    if (!trimmed) {
      throw new Error('Tenant name is required');
    }
    payload.name = trimmed;
  }
  if (updates.tenant_type !== undefined) {
    payload.tenant_type = updates.tenant_type;
  }
  if (updates.status !== undefined) {
    payload.status = updates.status;
  }

  const { data, error } = await supabaseClient
    .from('tenants')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    throw new Error(`Failed to update tenant: ${error.message}`);
  }

  return data as Tenant;
}

export async function deleteTenant(id: string): Promise<void> {
  if (!id) {
    throw new Error('Tenant ID is required');
  }

  const { error } = await supabaseClient.from('tenants').delete().eq('id', id);

  if (error) {
    throw new Error(`Failed to delete tenant: ${error.message}`);
  }
}

export async function getTenantInvites(tenantId: string): Promise<TenantInvite[]> {
  if (!tenantId) {
    throw new Error('Tenant ID is required');
  }

  const { data, error } = await supabaseClient
    .from('tenant_invites')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch tenant invites: ${error.message}`);
  }

  return (data as TenantInvite[]) || [];
}

export async function createTenantInvite(
  tenantId: string,
  role: TenantRole | string = 'staff',
): Promise<TenantInvite> {
  if (!tenantId) {
    throw new Error('Tenant ID is required');
  }

  const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();

  if (sessionError) {
    throw new Error(`Failed to get session: ${sessionError.message}`);
  }

  const userId = session?.user?.id;
  if (!userId) {
    throw new Error('User is not authenticated');
  }

  // Generate a simple unique token for the invite
  const token =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${tenantId}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  const { data, error } = await supabaseClient
    .from('tenant_invites')
    .insert([
      {
        tenant_id: tenantId,
        invited_by_user_id: userId,
        token,
      },
    ])
    .select('*')
    .single();

  if (error) {
    throw new Error(`Failed to create tenant invite: ${error.message}`);
  }

  return data as TenantInvite;
}
