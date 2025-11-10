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

type Role = "admin" | "team" | "user" | null;

type AuthState = {
  role: Role;
  email: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  openLogin: boolean;
  setOpenLogin: (open: boolean) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithOAuth: (provider: 'google' | 'github') => Promise<void>;
  signOut: () => Promise<void>;
  localSignOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [role, setRole] = useState<Role>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openLogin, setOpenLogin] = useState(false);

  useEffect(() => {
    // DIAG: Fix 1 - Initialize auth state on app startup using getSession()
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        console.log('Initializing auth state:', { session: !!session, error });
        
        if (error) {
          console.error('Session initialization error:', error);
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
      }
    };

    // Initialize auth state immediately
    initializeAuth();

    // Set up auth state change listener
    const { data: authListener } = supabaseClient.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event, session?.user?.email);
      
      if (event === "SIGNED_OUT" || !session) {
        // Clear localStorage when signed out
        try {
          window.localStorage.removeItem("ecert-role");
        } catch {}
        
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
            let fetchedRole: "admin" | "team" | "user" | null = null;
            let retries = 3;
            while (retries > 0 && fetchedRole === null) {
              try {
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
      
      // Clear local storage
      try {
        window.localStorage.removeItem("ecert-role");
      } catch {}
      
      // Clear Supabase session
      await supabaseClient.auth.signOut();
      
      // Small delay to ensure state updates are reflected in UI
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Redirect to home
      router.push("/");
    } catch (error) {
      console.error("Error during sign out:", error);
      // Even if there's an error, clear local state and redirect
      setRole(null);
      setEmail(null);
      setError(null);
      router.push("/");
    }
  }, [router]);

  const localSignOut = useCallback(async () => {
    try {
      // Clear state immediately first
      setRole(null);
      setEmail(null);
      setError(null);
      
      // Clear local storage
      try {
        window.localStorage.removeItem("ecert-role");
      } catch {}
      
      // Sign out of Supabase to clear persisted session
      await supabaseClient.auth.signOut();
      
      // Small delay to ensure state updates are reflected in UI
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Redirect to home
      router.push("/");
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
    setOpenLogin,
    signIn,
    signInWithOAuth,
    signOut,
    localSignOut,
  }), [role, email, loading, error, openLogin, signIn, signInWithOAuth, signOut, localSignOut]);

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}


