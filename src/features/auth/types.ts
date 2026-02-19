/**
 * Auth feature – domain types
 *
 * Extracted from contexts/auth-context.tsx so that types can be imported
 * independently from the React context and business logic.
 */

export type Role = "owner" | "manager" | "staff" | "user" | null;

export type AuthState = {
  role: Role;
  email: string | null;
  isAuthenticated: boolean;
  hasSubscription: boolean;
  loading: boolean;
  error: string | null;
  openLogin: boolean;
  initialized: boolean;
  setOpenLogin: (open: boolean) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithOAuth: (provider: "google" | "github") => Promise<void>;
  signOut: () => Promise<void>;
  localSignOut: () => Promise<void>;
  refreshRole: () => Promise<void>;
};
