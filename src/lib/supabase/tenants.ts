/**
 * @deprecated Barrel re-export — import directly from feature modules:
 *   - Types:     @/features/tenants/types
 *   - Queries:   @/features/tenants/queries
 *   - Mutations: @/features/tenants/mutations
 *
 * This file exists only to preserve backwards compatibility.
 */

// Types
export type { Tenant, TenantMember, TenantInvite, TenantRole, TenantStatus } from "@/features/tenants/types";

// Queries
export {
  getTenantsForCurrentUser,
  getTenantById,
  getTenantMembers,
  getCurrentUserTenantRole,
  getTenantInvites,
  getTenantInviteByToken,
  checkTenantHasData,
} from "@/features/tenants/queries";

// Mutations
export {
  assertTenantOwner,
  createTenant,
  createTenantForCurrentUser,
  updateTenant,
  deleteTenant,
  createTenantInvite,
  updateTenantMemberRole,
  removeTenantMember,
} from "@/features/tenants/mutations";
