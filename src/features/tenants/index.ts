/**
 * features/tenants/index.ts  — public barrel
 */
export type { Tenant, TenantMember, TenantInvite, TenantRole, TenantStatus } from "./types";
export {
  getTenantsForCurrentUser, getTenantById, getTenantMembers,
  getCurrentUserTenantRole, getTenantInvites,
  getTenantInviteByToken, checkTenantHasData,
} from "./queries";
export {
  createTenantForCurrentUser, updateTenant, deleteTenant,
  createTenantInvite, updateTenantMemberRole, removeTenantMember,
} from "./mutations";
