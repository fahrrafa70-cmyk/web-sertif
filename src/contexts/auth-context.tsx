"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
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
  const [role, setRole] = useState<Role>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openLogin, setOpenLogin] = useState(false);

  useEffect(() => {
    const { data: authListener } = supabaseClient.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        setRole(null);
        setEmail(null);
      } else if (session?.user?.email) {
        const normalized = session.user.email.toLowerCase().trim();
        setEmail(normalized);
        try {
          const fetchedRole = await getUserRoleByEmail(normalized);
          setRole(fetchedRole);
        } catch {
          setRole(null);
        }
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
      const { user } = await signInWithEmailPassword(normalized, password);
      console.log("Auth success", user?.id);
      setEmail(normalized);
      const fetchedRole = await getUserRoleByEmail(normalized);
      console.log("Role fetch success", fetchedRole);
      if (!fetchedRole) {
        setRole(null);
        setError("Account exists but role data is missing.");
        return;
      }
      setRole(fetchedRole);
      console.log("Role:", fetchedRole.charAt(0).toUpperCase() + fetchedRole.slice(1));
      setOpenLogin(false);
    } catch (err: unknown) {
      const message = typeof err === 'object' && err && 'message' in err ? String((err as { message?: string }).message) : 'Unexpected error';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    await supabaseClient.auth.signOut();
    setRole(null);
    setEmail(null);
  }, []);

  const localSignOut = useCallback(async () => {
    // Sign out of Supabase to clear persisted session and then clear UI state
    try {
      await supabaseClient.auth.signOut();
    } catch {}
    try {
      window.localStorage.removeItem("ecert-role");
    } catch {}
    setRole(null);
    setEmail(null);
  }, []);

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


