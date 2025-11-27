"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabase/client";
import { 
  getUserRoleByEmail, 
  signInWithEmailPassword,
  signInWithGoogle,
  signInWithGitHub,
  createOrUpdateUserFromOAuth
} from "@/lib/supabase/auth";

type Role = "owner" | "manager" | "staff" | "user" | null;

type AuthState = {
  role: Role;
  email: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  openLogin: boolean;
  /**
   * True ketika proses inisialisasi auth pertama (restore session + fetch role)
   * sudah selesai. Bisa digunakan komponen UI untuk mencegah flicker antara
   * tampilan guest vs logged-in saat halaman pertama kali dimuat.
   */
  initialized: boolean;
  setOpenLogin: (open: boolean) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithOAuth: (provider: 'google' | 'github') => Promise<void>;
  signOut: () => Promise<void>;
  localSignOut: () => Promise<void>;
  refreshRole: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [role, setRole] = useState<Role>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openLogin, setOpenLogin] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Check if there are any Supabase auth keys in localStorage
        let hasSupabaseAuth = false;
        try {
          for (let i = 0; i < window.localStorage.length; i++) {
            const key = window.localStorage.key(i);
            if (key && key.startsWith('sb-') && key.includes('auth-token')) {
              hasSupabaseAuth = true;
              break;
            }
          }
        } catch {}
        
        // If no auth keys found, skip session restoration
        if (!hasSupabaseAuth) {
          console.log('No auth tokens found in storage, skipping session restoration');
          setIsInitialized(true);
          return;
        }
        
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        console.log('Initializing auth state:', { session: !!session, error });
        
        if (error) {
          console.error('Session initialization error:', error);
          setIsInitialized(true);
          return;
        }
        
        if (session?.user?.email) {
          const normalized = session.user.email.toLowerCase().trim();
          setEmail(normalized);
          try {
            const fetchedRole = await getUserRoleByEmail(normalized);
            setRole(fetchedRole);
            setError(null);
            console.log('Auth state restored from session:', { email: normalized, role: fetchedRole });
          } catch (err) {
            console.error('Error fetching user role on init:', err);
            setRole(null);
            setError("Failed to fetch user role. Please try signing in again.");
          }
        }
      } catch (err) {
        console.error('Auth initialization failed:', err);
      } finally {
        setIsInitialized(true);
      }
    };

    void initializeAuth();

    // Set up auth state change listener
    const { data: authListener } = supabaseClient.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event, session?.user?.email);
      
      if (event === "SIGNED_OUT" || !session) {
        // Clear ALL storage when signed out
        try {
          window.localStorage.removeItem("ecert-role");
          
          // Remove all Supabase auth storage keys
          const keysToRemove = [];
          for (let i = 0; i < window.localStorage.length; i++) {
            const key = window.localStorage.key(i);
            if (key && key.startsWith('sb-')) {
              keysToRemove.push(key);
            }
          }
          keysToRemove.forEach(key => window.localStorage.removeItem(key));
          
          console.log('Auth state cleared on SIGNED_OUT event');
        } catch (err) {
          console.error('Error clearing storage on sign out:', err);
        }
        
        setRole(null);
        setEmail(null);
        setError(null);
        setLoading(false); // Ensure loading is reset on sign out
      } else if (event === "SIGNED_IN" && session?.user?.email) {
        const normalized = session.user.email.toLowerCase().trim();
        setEmail(normalized);
        
        // Process auth state asynchronously without blocking
        (async () => {
          try {
            // Check if this is an OAuth user (not email/password)
            // Get provider from identities array (most reliable way)
            const identity = session.user.identities?.[0];
            const authProvider = identity?.provider as 'google' | 'github' | 'email' | undefined;
            
            // If OAuth user (google or github), create/update user in users table
            // Do this in parallel with role fetch for better performance
            if (authProvider === 'google' || authProvider === 'github') {
              // Start user creation/update but don't wait for it
              createOrUpdateUserFromOAuth(session.user, authProvider)
                .then(() => {
                  console.log(`OAuth user processed: ${normalized} via ${authProvider}`);
                })
                .catch((oauthErr) => {
                  console.error('Error creating/updating OAuth user:', oauthErr);
                  // Continue anyway - user might already exist
                });
            }
            
            // Fetch role with retry logic (user might be created async)
            let fetchedRole: Role = null;
            let retries = 3;
            while (retries > 0 && fetchedRole === null) {
              try {
                // Ensure user exists in users table for email/password logins
                try {
                  const { data: existingUser } = await supabaseClient
                    .from("users")
                    .select("id")
                    .eq("id", session.user.id)
                    .maybeSingle();

                  if (!existingUser) {
                    const meta = (session.user.user_metadata || {}) as { full_name?: string };
                    const fullName = meta.full_name || normalized.split("@")[0];

                    await fetch("/api/users/upsert", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        id: session.user.id,
                        email: normalized,
                        full_name: fullName,
                        avatar_url: null,
                        auth_provider: "email",
                        role: "user",
                      }),
                    }).catch(() => {});
                  }
                } catch (ensureUserErr) {
                  console.error("Error ensuring user record exists:", ensureUserErr);
                }

                // Ensure whitelist row exists with default user role if none
                try {
                  const { data: existingWhitelist } = await supabaseClient
                    .from("email_whitelist")
                    .select("role")
                    .eq("email", normalized)
                    .maybeSingle();

                  if (!existingWhitelist) {
                    await supabaseClient
                      .from("email_whitelist")
                      .insert({ email: normalized, role: "user" });
                  }
                } catch (ensureWhitelistErr) {
                  console.error("Error ensuring email_whitelist record exists:", ensureWhitelistErr);
                }

                fetchedRole = await getUserRoleByEmail(normalized);
                if (fetchedRole === null && retries > 1) {
                  // Wait a bit before retrying (user might still be created)
                  await new Promise(resolve => setTimeout(resolve, 500));
                }
              } catch (err) {
                console.error(`Error fetching user role (attempt ${4 - retries}):`, err);
              }
              retries--;
            }
            
            setRole(fetchedRole);
            
            // Update localStorage with role
            try {
              window.localStorage.setItem("ecert-role", fetchedRole || "public");
            } catch {}
            
            // Clear cache on auth change to ensure fresh data
            try {
              const { dataCache } = await import('@/lib/cache/data-cache');
              dataCache.clear();
            } catch {
              // Ignore if cache not available
            }
            
            setError(null);
            setLoading(false); // Ensure loading is reset after successful sign in
          } catch (err) {
            console.error('Error processing auth state:', err);
            setRole(null);
            setError("Failed to fetch user role. Please try signing in again.");
            setLoading(false); // Ensure loading is reset even on error
          }
        })();
      } else if (event === "TOKEN_REFRESHED" && session?.user?.email) {
        // Handle token refresh - just update the session without changing state
        console.log('Token refreshed for:', session.user.email);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (rawEmail: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const normalized = rawEmail.toLowerCase().trim();
      
      // Check if Supabase is properly configured
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        throw new Error("Supabase is not configured. Please check your environment variables.");
      }
      
      const { user } = await signInWithEmailPassword(normalized, password);
      console.log("Auth success", user?.id);

      // After a successful email/password login, sync to email_whitelist so
      // only confirmed and authenticated users are stored there.
      if (user?.email) {
        try {
          await fetch('/api/email-whitelist/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: user.email,
              full_name: (user.user_metadata as { full_name?: string } | null)?.full_name,
            }),
          });
        } catch (syncErr) {
          console.error('Failed to sync email_whitelist after login:', syncErr);
        }
      }
      
      // Wait for auth state to be updated before closing modal
      // Give the auth state listener time to process the SIGNED_IN event
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Reset loading state before closing modal to prevent freeze
      setLoading(false);
      
      // Close the login modal after auth state is updated
      setOpenLogin(false);
    } catch (err: unknown) {
      console.error('Sign in error:', err);
      let message = 'An unexpected error occurred';
      
      if (typeof err === 'object' && err && 'message' in err) {
        const errorMessage = String((err as { message?: string }).message);
        
        // Handle specific Supabase auth errors
        if (errorMessage.includes('Invalid login credentials')) {
          message = 'Invalid email or password';
        } else if (errorMessage.includes('Email not confirmed')) {
          message = 'Please check your email and confirm your account';
        } else if (errorMessage.includes('Too many requests')) {
          message = 'Too many login attempts. Please try again later';
        } else if (errorMessage.includes('Supabase is not configured')) {
          message = 'Authentication service is not configured. Please contact support';
        } else {
          message = errorMessage;
        }
      }
      
      setError(message);
      setLoading(false); // Reset loading on error
      throw new Error(message); // Re-throw error so it can be caught by login modal
    }
  }, []);

  const signInWithOAuth = useCallback(async (provider: 'google' | 'github') => {
    setLoading(true);
    setError(null);
    try {
      // Close modal immediately as OAuth will redirect
      setOpenLogin(false);
      
      if (provider === 'google') {
        await signInWithGoogle();
      } else if (provider === 'github') {
        await signInWithGitHub();
      }
      
      // Note: We don't reset loading here because OAuth redirects away
      // Loading will be reset when user returns and auth state changes
    } catch (err: unknown) {
      console.error('OAuth sign in error:', err);
      let message = 'Failed to initiate OAuth login';
      
      if (typeof err === 'object' && err && 'message' in err) {
        message = String((err as { message?: string }).message);
      }
      
      setError(message);
      setLoading(false);
      setOpenLogin(true); // Reopen modal on error
      throw new Error(message);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      // Clear state immediately first
      setRole(null);
      setEmail(null);
      setError(null);
      
      // Clear ALL Supabase storage keys
      try {
        // Remove custom storage
        window.localStorage.removeItem("ecert-role");
        
        // Remove all Supabase auth storage keys
        const keysToRemove = [];
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          if (key && key.startsWith('sb-')) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => window.localStorage.removeItem(key));
        
        console.log('Cleared storage keys:', keysToRemove);
      } catch (err) {
        console.error('Error clearing storage:', err);
      }
      
      // Sign out from Supabase with scope: 'global' to clear all sessions
      await supabaseClient.auth.signOut({ scope: 'global' });
      
      // Small delay to ensure state updates are reflected in UI
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Redirect to home
      router.push("/");
      
      console.log('Sign out completed successfully');
    } catch (error) {
      console.error("Error during sign out:", error);
      // Even if there's an error, clear local state and redirect
      setRole(null);
      setEmail(null);
      setError(null);
      router.push("/");
    }
  }, [router]);

  const refreshRole = useCallback(async () => {
    if (!email) return;
    try {
      const normalized = email.toLowerCase().trim();
      const fetchedRole = await getUserRoleByEmail(normalized);
      setRole(fetchedRole);

      try {
        window.localStorage.setItem("ecert-role", fetchedRole || "public");
      } catch {}
    } catch (err) {
      console.error("Error refreshing user role:", err);
    }
  }, [email]);

  const localSignOut = useCallback(async () => {
    try {
      // Clear state immediately first
      setRole(null);
      setEmail(null);
      setError(null);
      
      // Clear ALL Supabase storage keys
      try {
        // Remove custom storage
        window.localStorage.removeItem("ecert-role");
        
        // Remove all Supabase auth storage keys
        const keysToRemove = [];
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          if (key && key.startsWith('sb-')) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => window.localStorage.removeItem(key));
        
        console.log('Cleared storage keys:', keysToRemove);
      } catch (err) {
        console.error('Error clearing storage:', err);
      }
      
      // Sign out of Supabase with scope: 'global' to clear all sessions
      await supabaseClient.auth.signOut({ scope: 'global' });
      
      // Small delay to ensure state updates are reflected in UI
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Redirect to home
      router.push("/");
      
      console.log('Local sign out completed successfully');
    } catch (error) {
      console.error("Error during local sign out:", error);
      // Even if there's an error, clear local state and redirect
      setRole(null);
      setEmail(null);
      setError(null);
      router.push("/");
    }
  }, [router]);

  const value = useMemo<AuthState>(() => ({
    role,
    email,
    isAuthenticated: !!email,
    loading,
    error,
    openLogin,
    initialized: isInitialized,
    setOpenLogin,
    signIn,
    signInWithOAuth,
    signOut,
    localSignOut,
    refreshRole,
  }), [role, email, loading, error, openLogin, isInitialized, signIn, signInWithOAuth, signOut, localSignOut, refreshRole]);

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}


