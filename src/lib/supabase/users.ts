import { supabaseClient } from "./client";

export type UserRole = "admin" | "team" | "user" | "member";
export type Gender = "male" | "female" | "other" | "prefer_not_to_say";

export interface AppUser {
  id: string;
  email: string;
  password?: string | null;
  full_name: string;
  username?: string | null;
  gender?: Gender | null;
  organization?: string | null;
  phone?: string | null;
  role: UserRole | string; // keep flexible if DB uses enum text with case variants
  auth_provider?: "email" | "google" | "github" | null;
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

export interface UpdateProfileInput {
  full_name?: string;
  username?: string;
  gender?: Gender;
  avatar_url?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  username?: string | null;
  gender?: Gender | null;
  avatar_url?: string | null;
  auth_provider?: "email" | "google" | "github" | null;
  created_at?: string;
  updated_at?: string;
}

export async function getUsers(opts?: { role?: string }): Promise<AppUser[]> {
  const roleFilter = opts?.role ?? "Team";
  let query = supabaseClient
    .from("users")
    .select("*")
    .order("created_at", { ascending: false });
  if (roleFilter) {
    query = query.eq("role", roleFilter);
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
  const role = (input.role ?? "Team").toString();

  if (!email || !full_name) {
    throw new Error("Full name and email are required");
  }

  // Prevent duplicates by email
  const { data: existing, error: existErr } = await supabaseClient
    .from("users")
    .select("id")
    .eq("email", email)
    .limit(1);
  if (existErr)
    throw new Error(`Failed checking existing user: ${existErr.message}`);
  if (existing && existing.length > 0) {
    throw new Error("A user with this email already exists");
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
    .from("users")
    .insert([insertPayload])
    .select()
    .single();

  if (error) {
    // Fallback: try lowercase 'team' if enum expects it
    const lower = role.toLowerCase();
    if (lower !== role) {
      insertPayload.role = lower;
      ({ data, error } = await supabaseClient
        .from("users")
        .insert([insertPayload])
        .select()
        .single());
    }
    if (error) throw new Error(`Failed to add user: ${error.message}`);
  }

  return data as AppUser;
}

export async function getUserProfile(
  userId: string,
): Promise<UserProfile | null> {
  const { data, error } = await supabaseClient
    .from("users")
    .select(
      "id, email, full_name, username, gender, avatar_url, auth_provider, created_at, updated_at",
    )
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch user profile: ${error.message}`);
  }

  return data as UserProfile | null;
}

export async function checkUsernameAvailability(
  username: string,
  currentUserId?: string,
): Promise<boolean> {
  try {
    let query = supabaseClient
      .from("users")
      .select("id")
      .eq("username", username.toLowerCase())
      .not("username", "is", null)
      .limit(1);

    // If checking for current user, exclude their own record
    if (currentUserId) {
      query = query.neq("id", currentUserId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("checkUsernameAvailability error:", error);
      // Return true on error to avoid blocking user
      return true;
    }

    // Username is available if no records found
    return !data || data.length === 0;
  } catch (err) {
    console.error("checkUsernameAvailability unexpected error:", err);
    return true;
  }
}

export async function updateUserProfile(
  userId: string,
  updates: UpdateProfileInput,
): Promise<UserProfile> {
  // Validate username if provided
  if (updates.username) {
    const isAvailable = await checkUsernameAvailability(
      updates.username,
      userId,
    );
    if (!isAvailable) {
      throw new Error("Username is already taken");
    }
  }

  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  // Add only provided fields to payload
  if (updates.full_name !== undefined)
    payload.full_name = updates.full_name.trim();
  if (updates.username !== undefined)
    payload.username = updates.username.toLowerCase().trim();
  if (updates.gender !== undefined) payload.gender = updates.gender;
  if (updates.avatar_url !== undefined) payload.avatar_url = updates.avatar_url;

  const { data, error } = await supabaseClient
    .from("users")
    .update(payload)
    .eq("id", userId)
    .select(
      "id, email, full_name, username, gender, avatar_url, auth_provider, created_at, updated_at",
    )
    .single();

  if (error) {
    throw new Error(`Failed to update user profile: ${error.message}`);
  }

  return data as UserProfile;
}
