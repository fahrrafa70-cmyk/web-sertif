"use client";

import { useEffect } from "react";
import { getCurrentSession, getUserRoleByEmail } from "@/lib/supabase/auth";

export default function RoleSync() {
  useEffect(() => {
    (async () => {
      try {
        const session = await getCurrentSession();
        const email = session?.user?.email;
        if (!email) return;
        const role = await getUserRoleByEmail(email);
        const uiRole = role === "admin" ? "Admin" : role === "team" ? "Team" : "User";
        if (typeof window !== "undefined") {
          const current = window.localStorage.getItem("ecert-role");
          if (current !== uiRole) {
            window.localStorage.setItem("ecert-role", uiRole);
            window.dispatchEvent(new CustomEvent("ecert-role-changed", { detail: uiRole }));
          }
        }
      } catch {}
    })();
  }, []);

  return null;
}


