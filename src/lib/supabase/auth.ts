/**
 * lib/supabase/auth.ts  ←  BARREL (backward-compat re-export)
 *
 * All auth logic has moved to @/features/auth/service.ts.
 * This file keeps existing import sites working without changes.
 */
export {
  signInWithEmailPassword,
  signInWithGoogle,
  signInWithGitHub,
  checkEmailWhitelist,
  createOrUpdateUserFromOAuth,
  getUserRoleByEmail,
  getUserSubscriptionStatus,
  getUserRoleAndSubscription,
} from "@/features/auth/service";
