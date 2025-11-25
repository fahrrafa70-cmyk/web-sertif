import { supabaseClient } from "./client";

export type UserRole = "admin" | "team" | "user" | "member";
export type Gender = "male" | "female" | "other" | "prefer_not_to_say";
export type AuthProvider = "email" | "google" | "github";

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  username?: string | null;
  gender?: Gender | null;
  avatar_url?: string | null;
  organization?: string | null;
  phone?: string | null;
  role: UserRole;
  auth_provider: AuthProvider;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface UpdateProfileInput {
  full_name?: string;
  username?: string;
  gender?: Gender;
  avatar_url?: string;
  organization?: string;
  phone?: string;
}

export async function getUserProfileByEmail(
  email: string,
): Promise<UserProfile | null> {
  console.log("🔍 getUserProfileByEmail: Looking up email:", email);

  const { data, error } = await supabaseClient
    .from("email_whitelist")
    .select(
      `
      id, 
      email, 
      full_name, 
      username, 
      gender, 
      avatar_url, 
      organization, 
      phone, 
      role, 
      auth_provider, 
      is_active, 
      is_verified, 
      created_at, 
      updated_at
    `,
    )
    .eq("email", email.trim().toLowerCase())
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.error("❌ getUserProfileByEmail: Database error:", error);
    throw new Error(`Failed to fetch user profile: ${error.message}`);
  }

  console.log("✅ getUserProfileByEmail: Result:", data);
  return data as UserProfile | null;
}

export async function checkUsernameAvailability(
  username: string,
  currentUserId?: string,
): Promise<boolean> {
  console.log(
    "🔍 checkUsernameAvailability: Starting check for username:",
    username,
  );
  console.log("👤 checkUsernameAvailability: Current user ID:", currentUserId);

  if (!username || username.trim().length < 3) {
    console.log("🚫 checkUsernameAvailability: Username too short:", username);
    return false;
  }

  const normalizedUsername = username.trim().toLowerCase();
  console.log(
    "🔄 checkUsernameAvailability: Normalized username:",
    normalizedUsername,
  );

  let query = supabaseClient
    .from("email_whitelist")
    .select("id, username")
    .eq("username", normalizedUsername)
    .eq("is_active", true);

  // If checking for current user, exclude their own record
  if (currentUserId) {
    console.log(
      "👤 checkUsernameAvailability: Excluding current user:",
      currentUserId,
    );
    query = query.neq("id", currentUserId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("❌ checkUsernameAvailability: Database error:", error);
    throw new Error(`Failed to check username availability: ${error.message}`);
  }

  console.log("📊 checkUsernameAvailability: Query result:", data);
  console.log(
    "📊 checkUsernameAvailability: Found records count:",
    data?.length || 0,
  );

  // Username is available if no records found
  const isAvailable = !data || data.length === 0;
  console.log(
    "✅ checkUsernameAvailability: Final result for",
    normalizedUsername,
    ":",
    isAvailable,
  );

  return isAvailable;
}

export async function updateUserProfile(
  userId: string,
  updates: UpdateProfileInput,
): Promise<UserProfile> {
  // Validate username if provided
  if (updates.username) {
    const normalizedUsername = updates.username.trim().toLowerCase();

    // Basic username validation
    if (normalizedUsername.length < 3) {
      throw new Error("Username must be at least 3 characters long");
    }

    if (normalizedUsername.length > 50) {
      throw new Error("Username must be less than 50 characters");
    }

    // Username format validation (alphanumeric + underscore only)
    if (!/^[a-z0-9_]+$/.test(normalizedUsername)) {
      throw new Error(
        "Username can only contain lowercase letters, numbers, and underscores",
      );
    }

    // Check availability
    const isAvailable = await checkUsernameAvailability(
      normalizedUsername,
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
  if (updates.full_name !== undefined) {
    const trimmed = updates.full_name.trim();
    if (!trimmed) {
      throw new Error("Full name is required");
    }
    if (trimmed.length < 2) {
      throw new Error("Full name must be at least 2 characters long");
    }
    payload.full_name = trimmed;
  }

  if (updates.username !== undefined) {
    payload.username = updates.username.trim().toLowerCase();
  }

  if (updates.gender !== undefined) {
    payload.gender = updates.gender;
  }

  if (updates.avatar_url !== undefined) {
    payload.avatar_url = updates.avatar_url;
  }

  if (updates.organization !== undefined) {
    payload.organization = updates.organization?.trim() || null;
  }

  if (updates.phone !== undefined) {
    payload.phone = updates.phone?.trim() || null;
  }

  const { data, error } = await supabaseClient
    .from("email_whitelist")
    .update(payload)
    .eq("id", userId)
    .eq("is_active", true)
    .select(
      `
      id, 
      email, 
      full_name, 
      username, 
      gender, 
      avatar_url, 
      organization, 
      phone, 
      role, 
      auth_provider, 
      is_active, 
      is_verified, 
      created_at, 
      updated_at
    `,
    )
    .single();

  if (error) {
    throw new Error(`Failed to update user profile: ${error.message}`);
  }

  return data as UserProfile;
}
