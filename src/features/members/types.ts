/**
 * Member feature – domain types
 *
 * Extracted from lib/supabase/members.ts so that types can be imported
 * independently from database query logic.
 */

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
  tenant_id?: string;
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
