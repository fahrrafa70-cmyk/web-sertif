"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabase/client";
import {
  getUserRoleAndSubscription,
  signInWithEmailPassword,
  signInWithGoogle,
  signInWithGitHub,
  createOrUpdateUserFromOAuth,
} from "@/features/auth/service";
import type { Role, AuthState } from "@/features/auth/types";

// ── 1. Context ────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthState | undefined>(undefined);

// ── 2. Shared storage helpers ─────────────────────────────────────────────────
function clearAuthStorage() {
  try {
    window.localStorage.removeItem("ecert-role");
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key?.startsWith("sb-")) keysToRemove.push(key);
    }
    keysToRemove.forEach((k) => window.localStorage.removeItem(k));
    console.log("Cleared auth storage keys:", keysToRemove);
  } catch (err) {
    console.error("Error clearing auth storage:", err);
  }
}

// ── 3. Provider ───────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [role, setRole] = useState<Role>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openLogin, setOpenLogin] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // ── Auth initialization + listener ─────────────────────────────────────────
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Skip session restore if no Supabase auth keys in localStorage
        let hasSupabaseAuth = false;
        try {
          for (let i = 0; i < window.localStorage.length; i++) {
            const key = window.localStorage.key(i);
            if (key?.startsWith("sb-") && key.includes("auth-token")) {
              hasSupabaseAuth = true;
              break;
            }
          }
        } catch { /* ignore */ }

        if (!hasSupabaseAuth) {
          console.log("No auth tokens found in storage, skipping session restoration");
          setIsInitialized(true);
          return;
        }

        const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
        console.log("Initializing auth state:", { session: !!session, error: sessionError });

        if (sessionError) {
          console.error("Session initialization error:", sessionError);
          setIsInitialized(true);
          return;
        }

        if (session?.user?.email) {
          const normalized = session.user.email.toLowerCase().trim();
          setEmail(normalized);
          try {
            const { role: fetchedRole, hasSubscription: fetchedSub } = await getUserRoleAndSubscription(normalized);
            setRole(fetchedRole);
            setHasSubscription(fetchedSub);
            setError(null);
            console.log("🔍 [AUTH INIT] Restored from session:", { email: normalized, role: fetchedRole, hasSubscription: fetchedSub });
          } catch (err) {
            console.error("Error fetching user role on init:", err);
            setRole(null);
            setHasSubscription(false);
            setError("Failed to fetch user role. Please try signing in again.");
          }
        }
      } catch (err) {
        console.error("Auth initialization failed:", err);
      } finally {
        setIsInitialized(true);
      }
    };

    void initializeAuth();

    const { data: authListener } = supabaseClient.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state change:", event, session?.user?.email);

      if (event === "SIGNED_OUT" || !session) {
        clearAuthStorage();
        setRole(null);
        setEmail(null);
        setHasSubscription(false);
        setError(null);
        setLoading(false);
        return;
      }

      if (event === "SIGNED_IN" && session.user?.email) {
        const normalized = session.user.email.toLowerCase().trim();
        setEmail(normalized);

        void (async () => {
          try {
            const identity = session.user.identities?.[0];
            const authProvider = identity?.provider as "google" | "github" | "email" | undefined;

            if (authProvider === "google" || authProvider === "github") {
              createOrUpdateUserFromOAuth(session.user, authProvider)
                .then(() => console.log(`OAuth user processed: ${normalized} via ${authProvider}`))
                .catch((err) => console.error("Error creating/updating OAuth user:", err));
            }

            // Ensure user record exists for email/password logins
            try {
              const { data: existingUser } = await supabaseClient
                .from("users").select("id").eq("id", session.user.id).maybeSingle();
              if (!existingUser) {
                const meta = (session.user.user_metadata || {}) as { full_name?: string };
                await fetch("/api/users/upsert", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    id: session.user.id,
                    email: normalized,
                    full_name: meta.full_name || normalized.split("@")[0],
                    avatar_url: null,
                    auth_provider: "email",
                    role: "user",
                  }),
                }).catch(() => {});
              }
            } catch (err) { console.error("Error ensuring user record:", err); }

            // Ensure whitelist row exists
            try {
              const { data: existingWl } = await supabaseClient
                .from("email_whitelist").select("role").eq("email", normalized).maybeSingle();
              if (!existingWl) {
                await supabaseClient.from("email_whitelist").insert({ email: normalized, role: "user" });
              }
            } catch (err) { console.error("Error ensuring whitelist record:", err); }

            // Fetch role with retry
            let fetchedRole: Role = null;
            let retries = 3;
            while (retries > 0 && fetchedRole === null) {
              try {
                const { role: r, hasSubscription: sub } = await getUserRoleAndSubscription(normalized);
                fetchedRole = r;
                setHasSubscription(sub);
                if (fetchedRole === null && retries > 1) await new Promise((res) => setTimeout(res, 500));
              } catch (err) { console.error(`Role fetch attempt ${4 - retries}:`, err); }
              retries--;
            }

            setRole(fetchedRole);
            try { window.localStorage.setItem("ecert-role", fetchedRole || "public"); } catch { /* ignore */ }

            // Clear data cache on auth change
            try {
              const { dataCache } = await import("@/lib/cache/data-cache");
              dataCache.clear();
            } catch { /* ignore */ }

            setError(null);
            setLoading(false);
          } catch (err) {
            console.error("Error processing auth state:", err);
            setRole(null);
            setError("Failed to fetch user role. Please try signing in again.");
            setLoading(false);
          }
        })();
      }
      // TOKEN_REFRESHED — no state change needed
    });

    return () => { authListener.subscription.unsubscribe(); };
  }, []);

  // ── signIn ──────────────────────────────────────────────────────────────────
  const signIn = useCallback(async (rawEmail: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        throw new Error("Supabase is not configured. Please check your environment variables.");
      }
      const normalized = rawEmail.toLowerCase().trim();
      const { user } = await signInWithEmailPassword(normalized, password);
      console.log("Auth success", user?.id);

      if (user?.email) {
        try {
          await fetch("/api/email-whitelist/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: user.email,
              full_name: (user.user_metadata as { full_name?: string } | null)?.full_name,
            }),
          });
        } catch (err) { console.error("Failed to sync whitelist after login:", err); }
      }

      await new Promise((res) => setTimeout(res, 100));
      setLoading(false);
      setOpenLogin(false);
    } catch (err: unknown) {
      console.error("Sign in error:", err);
      let message = "An unexpected error occurred";
      if (typeof err === "object" && err && "message" in err) {
        const msg = String((err as { message?: string }).message);
        if (msg.includes("Invalid login credentials")) message = "Invalid email or password";
        else if (msg.includes("Email not confirmed")) message = "Please check your email and confirm your account";
        else if (msg.includes("Too many requests")) message = "Too many login attempts. Please try again later";
        else if (msg.includes("Supabase is not configured")) message = "Authentication service is not configured. Please contact support";
        else message = msg;
      }
      setError(message);
      setLoading(false);
      throw new Error(message);
    }
  }, []);

  // ── signInWithOAuth ─────────────────────────────────────────────────────────
  const signInWithOAuth = useCallback(async (provider: "google" | "github") => {
    setLoading(true);
    setError(null);
    try {
      setOpenLogin(false);
      if (provider === "google") await signInWithGoogle();
      else await signInWithGitHub();
      // Loading stays true — OAuth redirects away
    } catch (err: unknown) {
      console.error("OAuth sign in error:", err);
      let message = "Failed to initiate OAuth login";
      if (typeof err === "object" && err && "message" in err) {
        message = String((err as { message?: string }).message);
      }
      setError(message);
      setLoading(false);
      setOpenLogin(true);
      throw new Error(message);
    }
  }, []);

  // ── signOut / localSignOut (identical behaviour, kept for API compat) ────────
  const performSignOut = useCallback(async () => {
    setRole(null);
    setEmail(null);
    setError(null);
    clearAuthStorage();
    await supabaseClient.auth.signOut({ scope: "global" });
    await new Promise((res) => setTimeout(res, 100));
    router.push("/");
    console.log("Sign out completed");
  }, [router]);

  const signOut = useCallback(async () => {
    try { await performSignOut(); }
    catch (err) {
      console.error("Error during sign out:", err);
      setRole(null); setEmail(null); setError(null);
      router.push("/");
    }
  }, [performSignOut, router]);

  // localSignOut is intentionally kept as a separate exported function so
  // existing call sites don't need to change, but internally delegates.
  const localSignOut = signOut;

  // ── refreshRole ─────────────────────────────────────────────────────────────
  const refreshRole = useCallback(async () => {
    if (!email) return;
    try {
      const normalized = email.toLowerCase().trim();
      const { role: fetchedRole, hasSubscription: fetchedSub } = await getUserRoleAndSubscription(normalized);
      setRole(fetchedRole);
      setHasSubscription(fetchedSub);
      try { window.localStorage.setItem("ecert-role", fetchedRole || "public"); } catch { /* ignore */ }
      console.log("🔄 [REFRESH] Role refreshed:", { email: normalized, role: fetchedRole, hasSubscription: fetchedSub });
    } catch (err) {
      console.error("Error refreshing user role:", err);
    }
  }, [email]);

  // ── Context value ───────────────────────────────────────────────────────────
  const value = useMemo<AuthState>(() => ({
    role, email,
    isAuthenticated: !!email,
    hasSubscription, loading, error, openLogin,
    initialized: isInitialized,
    setOpenLogin, signIn, signInWithOAuth, signOut, localSignOut, refreshRole,
  }), [role, email, hasSubscription, loading, error, openLogin, isInitialized, signIn, signInWithOAuth, signOut, localSignOut, refreshRole]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ── 4. Hook ───────────────────────────────────────────────────────────────────
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
