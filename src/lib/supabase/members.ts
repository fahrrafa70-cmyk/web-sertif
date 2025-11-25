import { supabaseClient } from './client';

export interface Member {
  id: string;
  name: string;
  tenant_id?: string | null;
  organization?: string | null;
  phone?: string | null;
  email?: string | null;
  job?: string | null;
  date_of_birth?: string | null; // ISO date string
  address?: string | null;
  city?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CreateMemberInput {
  name: string;
  organization?: string;
  phone?: string;
  email?: string;
  job?: string;
  date_of_birth?: string; // YYYY-MM-DD
  address?: string;
  city?: string;
  notes?: string;
}

export type UpdateMemberInput = Partial<CreateMemberInput>;

function sanitize(input: string | undefined | null): string | null {
  const v = (input ?? '').trim();
  return v.length ? v : null;
}

export async function getMembers(useCache: boolean = true): Promise<Member[]> {
  if (useCache && typeof window !== 'undefined') {
    const { dataCache, CACHE_KEYS } = await import('@/lib/cache/data-cache');
    
    // Use getOrFetch for automatic deduplication and caching
    return dataCache.getOrFetch<Member[]>(
      CACHE_KEYS.MEMBERS,
      async () => {
        const { data, error } = await supabaseClient
          .from('members')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) throw new Error(`Failed to fetch members: ${error.message}`);
        
        return (data as Member[]) || [];
      },
      10 * 60 * 1000 // 10 minutes cache
    );
  }

  // If cache is disabled, fetch directly
  const { data, error } = await supabaseClient
    .from('members')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw new Error(`Failed to fetch members: ${error.message}`);
  
  return (data as Member[]) || [];
}

export async function getMember(id: string): Promise<Member> {
  const { data, error } = await supabaseClient
    .from('members')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw new Error(`Failed to fetch member: ${error.message}`);
  if (!data) throw new Error('Member not found');
  return data as Member;
}

export async function createMember(input: CreateMemberInput): Promise<Member> {
  const name = (input.name || '').trim();
  if (!name) throw new Error('Name is required');

  const insertData = {
    name,
    organization: sanitize(input.organization),
    phone: sanitize(input.phone),
    email: sanitize(input.email)?.toLowerCase() ?? null,
    job: sanitize(input.job),
    date_of_birth: sanitize(input.date_of_birth),
    address: sanitize(input.address),
    city: sanitize(input.city),
    notes: sanitize(input.notes),
  } as Record<string, unknown>;

  // Optional: prevent duplicate email if provided
  if (insertData.email) {
    const { data: existing, error: existErr } = await supabaseClient
      .from('members')
      .select('id')
      .eq('email', insertData.email)
      .limit(1);
    if (existErr) throw new Error(`Failed checking existing member: ${existErr.message}`);
    if (existing && existing.length > 0) {
      throw new Error('A member with this email already exists');
    }
  }

  const { data, error } = await supabaseClient
    .from('members')
    .insert([insertData])
    .select('*')
    .single();

  if (error) throw new Error(`Failed to add member: ${error.message}`);
  
  // Invalidate cache
  if (typeof window !== 'undefined') {
    try {
      const { dataCache, CACHE_KEYS } = await import('@/lib/cache/data-cache');
      dataCache.delete(CACHE_KEYS.MEMBERS);
    } catch {
      // Ignore
    }
  }
  
  return data as Member;
}

export async function updateMember(id: string, input: UpdateMemberInput): Promise<Member> {
  const updateData: Record<string, unknown> = {};
  if (input.name !== undefined) updateData.name = (input.name || '').trim();
  if (input.organization !== undefined) updateData.organization = sanitize(input.organization);
  if (input.phone !== undefined) updateData.phone = sanitize(input.phone);
  if (input.email !== undefined) updateData.email = sanitize(input.email)?.toLowerCase() ?? null;
  if (input.job !== undefined) updateData.job = sanitize(input.job);
  if (input.date_of_birth !== undefined) updateData.date_of_birth = sanitize(input.date_of_birth);
  if (input.address !== undefined) updateData.address = sanitize(input.address);
  if (input.city !== undefined) updateData.city = sanitize(input.city);
  if (input.notes !== undefined) updateData.notes = sanitize(input.notes);

  // Always update updated_at timestamp
  updateData.updated_at = new Date().toISOString();

  // Remove undefined keys
  Object.keys(updateData).forEach((k) => updateData[k] === undefined && delete updateData[k]);

  const { data, error } = await supabaseClient
    .from('members')
    .update(updateData)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw new Error(`Failed to update member: ${error.message}`);
  
  // Invalidate cache
  if (typeof window !== 'undefined') {
    try {
      const { dataCache, CACHE_KEYS } = await import('@/lib/cache/data-cache');
      dataCache.delete(CACHE_KEYS.MEMBERS);
    } catch {
      // Ignore
    }
  }
  
  return data as Member;
}

export async function deleteMember(id: string): Promise<void> {
  if (!id) throw new Error('Member ID is required');
  
  const { error } = await supabaseClient
    .from('members')
    .delete()
    .eq('id', id);
    
  if (error) throw new Error(`Failed to delete member: ${error.message}`);
  
  // Invalidate cache
  if (typeof window !== 'undefined') {
    try {
      const { dataCache, CACHE_KEYS } = await import('@/lib/cache/data-cache');
      dataCache.delete(CACHE_KEYS.MEMBERS);
    } catch {
      // Ignore
    }
  }
}
