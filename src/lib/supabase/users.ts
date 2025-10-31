import { supabaseClient } from './client';

export type UserRole = 'admin' | 'team' | 'user';

export interface AppUser {
  id: string;
  email: string;
  password?: string | null;
  full_name: string;
  organization?: string | null;
  phone?: string | null;
  role: UserRole | string; // keep flexible if DB uses enum text with case variants
  auth_provider?: 'email' | 'google' | 'github' | null;
  avatar_url?: string | null;
  provider_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CreateAppUserInput {
  email: string;
  password?: string;
  full_name: string;
  organization?: string;
  phone?: string;
  role?: UserRole | string; // will be forced to 'team' by caller
}

export async function getUsers(opts?: { role?: string }): Promise<AppUser[]> {
  const roleFilter = (opts?.role ?? 'Team');
  let query = supabaseClient.from('users').select('*').order('created_at', { ascending: false });
  if (roleFilter) {
    query = query.eq('role', roleFilter);
  }
  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch users: ${error.message}`);
  return (data as AppUser[]) || [];
}

export async function createUser(input: CreateAppUserInput): Promise<AppUser> {
  const email = input.email.trim().toLowerCase();
  const full_name = input.full_name.trim();
  const organization = input.organization?.trim() || null;
  const phone = input.phone?.trim() || null;
  const password = input.password?.trim() || null;
  const role = (input.role ?? 'Team').toString();

  if (!email || !full_name) {
    throw new Error('Full name and email are required');
  }

  // Prevent duplicates by email
  const { data: existing, error: existErr } = await supabaseClient
    .from('users')
    .select('id')
    .eq('email', email)
    .limit(1);
  if (existErr) throw new Error(`Failed checking existing user: ${existErr.message}`);
  if (existing && existing.length > 0) {
    throw new Error('A user with this email already exists');
  }

  // Attempt insert with role as provided; if enum case mismatch, try fallback Title-case
  const insertPayload: {
    email: string;
    full_name: string;
    organization: string | null;
    phone: string | null;
    password: string | null;
    role: string;
  } = { email, full_name, organization, phone, password, role };

  let { data, error } = await supabaseClient
    .from('users')
    .insert([insertPayload])
    .select()
    .single();

  if (error) {
    // Fallback: try lowercase 'team' if enum expects it
    const lower = role.toLowerCase();
    if (lower !== role) {
      insertPayload.role = lower;
      ({ data, error } = await supabaseClient
        .from('users')
        .insert([insertPayload])
        .select()
        .single());
    }
    if (error) throw new Error(`Failed to add user: ${error.message}`);
  }

  return data as AppUser;
}
