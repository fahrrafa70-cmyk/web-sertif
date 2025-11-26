import { supabaseClient } from "./client";

export async function signInWithEmailPassword(email: string, password: string) {
  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    
    if (error) {
      console.error('Supabase auth error:', error);
      
      // Handle specific error cases
      if (error.message.toLowerCase().includes("invalid login") || 
          error.message.toLowerCase().includes("invalid credentials")) {
        throw new Error("Invalid email or password.");
      } else if (error.message.toLowerCase().includes("email not confirmed")) {
        throw new Error("Please check your email and confirm your account before signing in.");
      } else if (error.message.toLowerCase().includes("too many requests")) {
        throw new Error("Too many login attempts. Please try again later.");
      } else if (error.message.toLowerCase().includes("refresh token")) {
        throw new Error("Session expired. Please sign in again.");
      }
      
      throw new Error(error.message);
    }
    
    return { user: data.user, session: data.session };
  } catch (err) {
    // Re-throw our custom errors, but wrap unexpected errors
    if (err instanceof Error) {
      throw err;
    }
    throw new Error("An unexpected authentication error occurred.");
  }
}

/**
 * Sign in with Google OAuth
 * Redirects user to Google OAuth page
 */
export async function signInWithGoogle() {
  try {
    // Auto-detect environment and set appropriate redirect URL
    let redirectUrl: string | undefined;
    
    if (typeof window !== 'undefined') {
      const isLocalhost = window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1' ||
                         window.location.hostname.includes('localhost');

      const currentUrl = window.location.href;
      const callbackBase = isLocalhost
        ? `${window.location.origin}/auth/callback`
        : (process.env.NEXT_PUBLIC_AUTH_REDIRECT_URL || `${window.location.origin}/auth/callback`);

      // Always include `next` so auth/callback can return user to the page they started from
      redirectUrl = `${callbackBase}?next=${encodeURIComponent(currentUrl)}`;

      console.log(isLocalhost
        ? '🔧 Development mode: OAuth will redirect to localhost with next param'
        : '🚀 Production mode: OAuth will redirect to production URL with next param');
    }
    
    console.log('Google OAuth redirect URL:', redirectUrl);
    
    const { data, error } = await supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          prompt: 'select_account', // Force Google to always show account selection
        },
      },
    });

    if (error) {
      console.error('Google OAuth error:', error);
      throw new Error(error.message);
    }

    // OAuth will redirect, so we don't return data here
    return data;
  } catch (err) {
    if (err instanceof Error) {
      throw err;
    }
    throw new Error("Failed to initiate Google login.");
  }
}

/**
 * Sign in with GitHub OAuth
 * Redirects user to GitHub OAuth page
 */
export async function signInWithGitHub() {
  try {
    // Auto-detect environment and set appropriate redirect URL
    let redirectUrl: string | undefined;
    
    if (typeof window !== 'undefined') {
      const isLocalhost = window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1' ||
                         window.location.hostname.includes('localhost');
      
      if (isLocalhost) {
        // Localhost: Force redirect to localhost
        redirectUrl = `${window.location.origin}/auth/callback`;
        console.log('🔧 Development mode: OAuth will redirect to localhost');
      } else {
        // Production: Use environment variable or current origin
        redirectUrl = process.env.NEXT_PUBLIC_AUTH_REDIRECT_URL || `${window.location.origin}/auth/callback`;
        console.log('🚀 Production mode: OAuth will redirect to production URL');
      }
    }
    
    console.log('GitHub OAuth redirect URL:', redirectUrl);
    
    const { data, error } = await supabaseClient.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          prompt: 'select_account', // Force GitHub to always show account selection
        },
      },
    });

    if (error) {
      console.error('GitHub OAuth error:', error);
      throw new Error(error.message);
    }

    // OAuth will redirect, so we don't return data here
    return data;
  } catch (err) {
    if (err instanceof Error) {
      throw err;
    }
    throw new Error("Failed to initiate GitHub login.");
  }
}

/**
 * Check if email exists in whitelist and return assigned role
 * Returns null if email is not whitelisted
 */
export async function checkEmailWhitelist(email: string): Promise<"admin" | "team" | "user" | "member" | null> {
  try {
    const normalizedEmail = email.toLowerCase().trim();
    
    const { data, error } = await supabaseClient
      .from("email_whitelist")
      .select("role")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (error) {
      console.error('Whitelist check error:', error);
      // If table doesn't exist or error, return null (will default to member)
      return null;
    }

    if (!data || !data.role) {
      return null;
    }

    const role = data.role.toLowerCase();
    if (role === "admin" || role === "team") {
      return role;
    }

    if (role === "member") {
      return "member";
    }

    if (role === "user" || role === "public") {
      return "user";
    }
    
    return null;
  } catch (err) {
    console.error('Error checking whitelist:', err);
    return null;
  }
}

/**
 * Create or update user from OAuth login
 * Checks whitelist for role assignment
 */
export async function createOrUpdateUserFromOAuth(
  user: { id: string; email?: string; user_metadata?: Record<string, unknown> },
  provider: 'google' | 'github'
): Promise<void> {
  try {
    if (!user.email) {
      throw new Error("User email is required");
    }

    const normalizedEmail = user.email.toLowerCase().trim();
    const meta = user.user_metadata || {};
    const fullName = (typeof meta.full_name === 'string' && meta.full_name) ||
                     (typeof meta.name === 'string' && meta.name) ||
                     (typeof meta.preferred_username === 'string' && meta.preferred_username) ||
                     normalizedEmail.split('@')[0];
    const avatarUrl = (typeof meta.avatar_url === 'string' && meta.avatar_url) ||
                     (typeof meta.picture === 'string' && meta.picture) ||
                     null;

    const { data: existingUser, error: checkError } = await supabaseClient
      .from("users")
      .select("id, role, auth_provider, avatar_url, full_name")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking existing user:', checkError);
      throw new Error(checkError.message);
    }

    // Check whitelist first
    let whitelistRole = await checkEmailWhitelist(normalizedEmail);

    // If not in whitelist, add with default 'member' role
    if (!whitelistRole) {
      console.log(`📝 Email not in whitelist, adding: ${normalizedEmail} with role 'member'`);
      try {
        const { error: insertError } = await supabaseClient
          .from('email_whitelist')
          .insert([{ email: normalizedEmail, role: 'member' }]);
        
        if (insertError && insertError.code !== '23505') { // 23505 = unique violation (already exists)
          console.error('Error adding to whitelist:', insertError);
        } else {
          console.log(`✅ Added ${normalizedEmail} to whitelist with role 'member'`);
          whitelistRole = 'member';
        }
      } catch (err) {
        console.error('Error adding to whitelist:', err);
      }
    }

    let roleToPersist: "admin" | "team" | "user" | "member" = "user";
    if (whitelistRole) {
      roleToPersist = whitelistRole;
    } else if (existingUser) {
      const currentRole = (existingUser.role as string | null)?.toLowerCase();
      if (currentRole === 'admin' || currentRole === 'team') {
        roleToPersist = currentRole;
      } else {
        roleToPersist = 'user';
      }
    }

    const upsertPayload = {
      id: existingUser?.id || user.id,
      email: normalizedEmail,
      full_name: fullName,
      avatar_url: avatarUrl,
      auth_provider: provider,
      role: roleToPersist,
    };

    const response = await fetch('/api/users/upsert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(upsertPayload),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      console.error('Error upserting user via API:', errorBody);
      throw new Error(errorBody.error || 'Failed to upsert user');
    }

    const result = await response.json();
    console.log(`✅ User upserted via API: ${normalizedEmail} role=${roleToPersist}`, result?.data);
 
  } catch (err) {
    console.error('Error in createOrUpdateUserFromOAuth:', err);
    if (err instanceof Error) {
      throw err;
    }
    throw new Error("Failed to create or update user from OAuth.");
  }
}

export async function getUserRoleByEmail(email: string): Promise<"admin" | "team" | "user" | null> {
  const { data, error } = await supabaseClient
    .from("users")
    .select("role")
    .eq("email", email)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    // Role data missing for an authenticated account
    return null;
  }

  const role = (data.role as string | null)?.toLowerCase();
  if (role === "member") return "user";
  if (role === "public") return "user";
  if (role === "admin" || role === "team" || role === "user") return role;
  return null;
}


