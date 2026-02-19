/**
 * features/auth/service.ts
 *
 * All Supabase auth service functions, moved here from lib/supabase/auth.ts.
 * The old path (lib/supabase/auth.ts) is now a thin re-export barrel.
 *
 * Exports:
 *  - signInWithEmailPassword
 *  - signInWithGoogle
 *  - signInWithGitHub
 *  - checkEmailWhitelist
 *  - createOrUpdateUserFromOAuth
 *  - getUserRoleByEmail
 *  - getUserSubscriptionStatus
 *  - getUserRoleAndSubscription
 */

import { supabaseClient } from "@/lib/supabase/client";
import type { Role } from "@/features/auth/types";

export async function signInWithEmailPassword(email: string, password: string) {
  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("Supabase auth error:", error);
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
    if (err instanceof Error) throw err;
    throw new Error("An unexpected authentication error occurred.");
  }
}

export async function signInWithGoogle() {
  try {
    let redirectUrl: string | undefined;
    if (typeof window !== "undefined") {
      const isLocalhost =
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1" ||
        window.location.hostname.includes("localhost");
      const currentUrl = window.location.href;
      const callbackBase = isLocalhost
        ? `${window.location.origin}/auth/callback`
        : process.env.NEXT_PUBLIC_AUTH_REDIRECT_URL || `${window.location.origin}/auth/callback`;
      redirectUrl = `${callbackBase}?next=${encodeURIComponent(currentUrl)}`;
      console.log(isLocalhost
        ? "🔧 Development mode: OAuth will redirect to localhost with next param"
        : "🚀 Production mode: OAuth will redirect to production URL with next param");
    }
    console.log("Google OAuth redirect URL:", redirectUrl);
    const { data, error } = await supabaseClient.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirectUrl, queryParams: { prompt: "select_account" } },
    });
    if (error) { console.error("Google OAuth error:", error); throw new Error(error.message); }
    return data;
  } catch (err) {
    if (err instanceof Error) throw err;
    throw new Error("Failed to initiate Google login.");
  }
}

export async function signInWithGitHub() {
  try {
    let redirectUrl: string | undefined;
    if (typeof window !== "undefined") {
      const isLocalhost =
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1" ||
        window.location.hostname.includes("localhost");
      redirectUrl = isLocalhost
        ? `${window.location.origin}/auth/callback`
        : process.env.NEXT_PUBLIC_AUTH_REDIRECT_URL || `${window.location.origin}/auth/callback`;
      console.log(isLocalhost
        ? "🔧 Development mode: OAuth will redirect to localhost"
        : "🚀 Production mode: OAuth will redirect to production URL");
    }
    console.log("GitHub OAuth redirect URL:", redirectUrl);
    const { data, error } = await supabaseClient.auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo: redirectUrl, queryParams: { prompt: "select_account" } },
    });
    if (error) { console.error("GitHub OAuth error:", error); throw new Error(error.message); }
    return data;
  } catch (err) {
    if (err instanceof Error) throw err;
    throw new Error("Failed to initiate GitHub login.");
  }
}

export async function checkEmailWhitelist(email: string): Promise<Role> {
  try {
    const normalizedEmail = email.toLowerCase().trim();
    const { data, error } = await supabaseClient
      .from("email_whitelist")
      .select("role")
      .eq("email", normalizedEmail)
      .maybeSingle();
    if (error) { console.error("Whitelist check error:", error); return null; }
    if (!data?.role) return null;
    const role = data.role.toLowerCase();
    if (role === "owner" || role === "manager" || role === "staff" || role === "user") return role;
    if (role === "admin") return "owner";
    if (role === "team" || role === "member") return "manager";
    if (role === "public") return "user";
    return null;
  } catch (err) {
    console.error("Error checking whitelist:", err);
    return null;
  }
}

export async function createOrUpdateUserFromOAuth(
  user: { id: string; email?: string; user_metadata?: Record<string, unknown> },
  provider: "google" | "github",
): Promise<void> {
  try {
    if (!user.email) throw new Error("User email is required");
    const normalizedEmail = user.email.toLowerCase().trim();
    const meta = user.user_metadata || {};
    const fullName =
      (typeof meta.full_name === "string" && meta.full_name) ||
      (typeof meta.name === "string" && meta.name) ||
      (typeof meta.preferred_username === "string" && meta.preferred_username) ||
      normalizedEmail.split("@")[0];
    const avatarUrl =
      (typeof meta.avatar_url === "string" && meta.avatar_url) ||
      (typeof meta.picture === "string" && meta.picture) ||
      null;

    const { data: existingUser, error: checkError } = await supabaseClient
      .from("users")
      .select("id, role, auth_provider, avatar_url, full_name")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (checkError && checkError.code !== "PGRST116") {
      console.error("Error checking existing user:", checkError);
      throw new Error(checkError.message);
    }

    const whitelistRole = await checkEmailWhitelist(normalizedEmail);
    console.log("🔍 [OAUTH] createOrUpdateUserFromOAuth for:", normalizedEmail);
    console.log("🔍 [OAUTH] Whitelist role:", whitelistRole);
    console.log("🔍 [OAUTH] Existing user role:", existingUser?.role);

    let roleToPersist: "owner" | "manager" | "staff" | "user" = "user";
    if (whitelistRole) {
      roleToPersist = whitelistRole;
    } else if (existingUser) {
      const currentRole = (existingUser.role as string | null)?.toLowerCase();
      if (currentRole === "owner" || currentRole === "manager" || currentRole === "staff" || currentRole === "user") {
        roleToPersist = currentRole as typeof roleToPersist;
      } else if (currentRole === "admin") {
        roleToPersist = "owner";
      } else if (currentRole === "team" || currentRole === "member") {
        roleToPersist = "manager";
      }
    }

    console.log("🔍 [OAUTH] Final role to persist:", roleToPersist);
    const response = await fetch("/api/users/upsert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: existingUser?.id || user.id,
        email: normalizedEmail,
        full_name: fullName,
        avatar_url: avatarUrl,
        auth_provider: provider,
        role: roleToPersist,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      console.error("Error upserting user via API:", errorBody);
      throw new Error(errorBody.error || "Failed to upsert user");
    }

    const result = await response.json();
    console.log(`✅ User upserted via API: ${normalizedEmail} role=${roleToPersist}`, result?.data);
  } catch (err) {
    console.error("Error in createOrUpdateUserFromOAuth:", err);
    if (err instanceof Error) throw err;
    throw new Error("Failed to create or update user from OAuth.");
  }
}

export async function getUserRoleByEmail(email: string): Promise<Role> {
  const normalizedEmail = email.toLowerCase().trim();
  try {
    const whitelistRole = await checkEmailWhitelist(normalizedEmail);
    if (whitelistRole) return whitelistRole;
  } catch (err) {
    console.error("Error checking whitelist in getUserRoleByEmail:", err);
  }
  const { data, error } = await supabaseClient
    .from("users")
    .select("role")
    .eq("email", normalizedEmail)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const role = (data.role as string | null)?.toLowerCase();
  if (role === "owner" || role === "manager" || role === "staff" || role === "user") return role;
  if (role === "admin") return "owner";
  if (role === "team" || role === "member") return "manager";
  return null;
}

export async function getUserSubscriptionStatus(email: string): Promise<boolean> {
  try {
    const normalizedEmail = email.toLowerCase().trim();
    const { data, error } = await supabaseClient
      .from("email_whitelist")
      .select("subscription")
      .eq("email", normalizedEmail)
      .maybeSingle();
    if (error) { console.error("Subscription status check error:", error); return false; }
    return data?.subscription === true;
  } catch (err) {
    console.error("Error checking subscription status:", err);
    return false;
  }
}

export async function getUserRoleAndSubscription(email: string): Promise<{ role: Role; hasSubscription: boolean }> {
  const normalizedEmail = email.toLowerCase().trim();
  console.log("🔍 [AUTH] Getting role and subscription for:", normalizedEmail);
  try {
    const { data, error } = await supabaseClient
      .from("email_whitelist")
      .select("role, subscription")
      .eq("email", normalizedEmail)
      .maybeSingle();
    console.log("🔍 [AUTH] Whitelist query result:", { data, error });
    if (!error && data) {
      const role = data.role?.toLowerCase();
      const hasSubscription = data.subscription === true;
      let mappedRole: Role = null;
      if (role === "owner" || role === "manager" || role === "staff" || role === "user") {
        mappedRole = role;
      } else if (role === "admin") {
        mappedRole = "owner";
      } else if (role === "team" || role === "member") {
        mappedRole = "manager";
      } else if (role === "public") {
        mappedRole = "user";
      }
      console.log("🔍 [AUTH] Final result from whitelist:", { role: mappedRole, hasSubscription });
      return { role: mappedRole, hasSubscription };
    }
    console.log("🔍 [AUTH] No data found in whitelist or error occurred, error:", error);
  } catch (err) {
    console.error("Error checking whitelist in getUserRoleAndSubscription:", err);
  }
  console.log("🔍 [AUTH] Falling back to users table");
  const role = await getUserRoleByEmail(normalizedEmail);
  console.log("🔍 [AUTH] Fallback result:", { role, hasSubscription: false });
  return { role, hasSubscription: false };
}
