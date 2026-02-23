"use client";

import { useEffect } from "react";
import { useMembersCore } from "./useMembersCore";
import { useMembersFilter } from "./useMembersFilter";
import { useMembersForm } from "./useMembersForm";
import { useMembersExcel } from "./useMembersExcel";

export function useMembers() {
  const core = useMembersCore();
  
  const filter = useMembersFilter(
    core.membersData,
    core.selectedTenantId
  );
  
  const form = useMembersForm(
    core.membersData,
    core.setMembersData,
    core.selectedTenantId,
    core.language,
    core.t
  );
  
  const excel = useMembersExcel(
    core.selectedTenantId,
    core.language,
    core.loadMembers
  );

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.title = "Data | Certify - Certificate Platform";
    }
  }, []);

  return {
    ...core,
    ...filter,
    ...form,
    ...excel,
  };
}
