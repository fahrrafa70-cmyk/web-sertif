/**
 * Custom hook for member selection functionality
 * Extracted from src/app/templates/generate/page.tsx
 * Date: October 29, 2025
 */

import { useState, useEffect, useCallback } from "react";
import { getMembers, Member } from "@/lib/supabase/members";
import { toast } from "sonner";

interface UseMembersSelectionOptions {
  role: "Admin" | "Team" | "Public";
  onMemberSelect?: (member: Member) => void;
}

interface UseMembersSelectionReturn {
  members: Member[];
  membersLoading: boolean;
  selectedMemberId: string;
  selectedMember: Member | undefined;
  handleSelectMember: (memberId: string) => void;
  setSelectedMemberId: (id: string) => void;
}

/**
 * Hook for managing member selection with automatic data fetching
 * Only fetches members for Admin and Team roles
 * 
 * @param options - Configuration options
 * @returns Member selection state and handlers
 * 
 * @example
 * ```tsx
 * const { members, selectedMemberId, handleSelectMember } = useMembersSelection({
 *   role: "Admin",
 *   onMemberSelect: (member) => {
 *     setCertificateData(prev => ({ ...prev, name: member.name }));
 *   }
 * });
 * ```
 */
export function useMembersSelection({
  role,
  onMemberSelect,
}: UseMembersSelectionOptions): UseMembersSelectionReturn {
  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");

  // Load members for selection (Admin/Team only)
  useEffect(() => {
    const load = async () => {
      if (role === "Admin" || role === "Team") {
        try {
          setMembersLoading(true);
          const data = await getMembers();
          setMembers(data);
        } catch (e) {
          console.error(e);
          toast.error(e instanceof Error ? e.message : "Failed to load members");
        } finally {
          setMembersLoading(false);
        }
      } else {
        // Reset members for Public role
        setMembers([]);
        setSelectedMemberId("");
      }
    };
    load();
  }, [role]);

  // Get currently selected member
  const selectedMember = members.find((m) => m.id === selectedMemberId);

  // Handle member selection
  const handleSelectMember = useCallback(
    (memberId: string) => {
      setSelectedMemberId(memberId);
      const selected = members.find((m) => m.id === memberId);
      if (selected && onMemberSelect) {
        onMemberSelect(selected);
      }
    },
    [members, onMemberSelect]
  );

  return {
    members,
    membersLoading,
    selectedMemberId,
    selectedMember,
    handleSelectMember,
    setSelectedMemberId,
  };
}

