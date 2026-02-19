/**
 * @deprecated Barrel re-export — import directly from @/features/members
 *
 * This file exists only to preserve backwards compatibility.
 */

export type { Member, CreateMemberInput, UpdateMemberInput } from "@/features/members/types";

export {
  getMembers,
  getMembersForTenant,
  getMember,
  createMember,
  updateMember,
  deleteMember,
} from "@/features/members/index";
