/**
 * Tenant feature – domain types
 *
 * Extracted from lib/supabase/tenants.ts so that types can be imported
 * independently from database query logic.
 */

export type TenantStatus = "active" | "archived";
export type TenantRole = "owner" | "manager" | "staff";

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
    username?: string | null;
    avatar_url: string | null;
  } | null;
}

export interface TenantInvite {
  id: string;
  tenant_id: string;
  token: string;
  // Role is no longer a dedicated column – kept optional for backward compat
  role?: TenantRole | string;
  status: string;
  // Current schema stores this as invited_by_user_id
  invited_by_user_id?: string;
  // Keep created_by_user_id optional for backward compat
  created_by_user_id?: string;
  expires_at: string | null;
  created_at: string;
}
