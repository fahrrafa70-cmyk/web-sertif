import { useCallback, useEffect, useState, useMemo } from "react";
import { useAuth } from "@/contexts/auth-context";
import { getTenantsForCurrentUser, type Tenant } from "@/lib/supabase/tenants";
import { useTemplates } from "@/hooks/use-templates";

export type PageRole = "owner" | "manager" | "staff" | "user" | "public";

export function useTemplatesCore() {
  const { role: authRole } = useAuth();
  
  const [role, setRole] = useState<PageRole>("public");
  
  useEffect(() => {
    if (authRole) {
      const n = authRole.toLowerCase();
      const mapped: PageRole =
        n === "owner" || n === "manager" || n === "staff"
          ? (n as "owner" | "manager" | "staff")
          : n === "user" ? "user" : "public";
      setRole(mapped);
    }
  }, [authRole]);

  useEffect(() => {
    const set = () => { if (typeof document !== "undefined") document.title = "Templates | Certify - Certificate Platform"; };
    set();
    const ts = [setTimeout(set, 50), setTimeout(set, 200), setTimeout(set, 500)];
    return () => ts.forEach(clearTimeout);
  }, []);

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState("");
  const [loadingTenants, setLoadingTenants] = useState(true);

  useEffect(() => {
    const run = async () => {
      try {
        setLoadingTenants(true);
        const data = await getTenantsForCurrentUser();
        setTenants(data);
        let initialId = "";
        try {
          const stored = window.localStorage.getItem("ecert-selected-tenant-id") || "";
          if (stored && data.some((t) => t.id === stored)) initialId = stored;
        } catch { /* ignore */ }
        if (!initialId && data.length === 1) initialId = data[0].id;
        setSelectedTenantId(initialId);
      } finally {
        setLoadingTenants(false);
      }
    };
    void run();
  }, []);

  const handleTenantChange = useCallback((id: string) => {
    setSelectedTenantId(id);
    try { window.localStorage.setItem("ecert-selected-tenant-id", id); } catch { /* ignore */ }
  }, []);

  const selectedTenant = useMemo(
    () => tenants.find((t) => t.id === selectedTenantId) || null,
    [tenants, selectedTenantId]
  );

  const { templates, loading, error, create, update, delete: deleteTemplate, refresh } = useTemplates();

  const canDelete = role === "owner" || role === "manager";

  return {
    role, canDelete,
    tenants, selectedTenantId, loadingTenants, selectedTenant, handleTenantChange,
    templates, loading, error, create, update, deleteTemplate, refresh
  };
}
