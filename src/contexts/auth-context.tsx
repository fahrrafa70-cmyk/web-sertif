"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabase/client";
import { getUserRoleByEmail, signInWithEmailPassword } from "@/lib/supabase/auth";

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
      } else if (event === "SIGNED_IN" && session?.user?.email) {
        const normalized = session.user.email.toLowerCase().trim();
        setEmail(normalized);
        try {
          const fetchedRole = await getUserRoleByEmail(normalized);
          setRole(fetchedRole);
          
          // Update localStorage with role
          try {
            window.localStorage.setItem("ecert-role", fetchedRole || "public");
          } catch {}
          
          setError(null);
        } catch (err) {
          console.error('Error fetching user role:', err);
          setRole(null);
          setError("Failed to fetch user role. Please try signing in again.");
        }
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
      
      // The auth state change listener will handle setting email and role
      // We just need to close the login modal
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
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      // Clear Supabase session
      await supabaseClient.auth.signOut();
      
      // Clear local storage
      try {
        window.localStorage.removeItem("ecert-role");
      } catch {}
      
      // Clear state
      setRole(null);
      setEmail(null);
      setError(null);
      
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
      // Sign out of Supabase to clear persisted session
      await supabaseClient.auth.signOut();
      
      // Clear local storage
      try {
        window.localStorage.removeItem("ecert-role");
      } catch {}
      
      // Clear state
      setRole(null);
      setEmail(null);
      setError(null);
      
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
    signOut,
    localSignOut,
  }), [role, email, loading, error, openLogin, signIn, signOut, localSignOut]);

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}


