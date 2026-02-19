/**
 * features/auth/index.ts  — public barrel
 */
export type { Role, AuthState } from "./types";
export {
  signInWithEmailPassword, signInWithGoogle, signInWithGitHub,
  checkEmailWhitelist, createOrUpdateUserFromOAuth,
  getUserRoleByEmail, getUserSubscriptionStatus, getUserRoleAndSubscription,
} from "./service";
