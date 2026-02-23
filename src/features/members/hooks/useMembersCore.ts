import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { getMembers, deleteMember as deleteMemberService, type Member } from "@/lib/supabase/members";
import { getTenantsForCurrentUser, type Tenant } from "@/lib/supabase/tenants";
import { useAuth } from "@/contexts/auth-context";
import { useLanguage } from "@/contexts/language-context";
import { confirmToast } from "@/lib/ui/confirm";

export type MemberRole = "owner" | "manager" | "staff" | "user" | "public";

export function useMembersCore() {
  const { role: authRole, hasSubscription } = useAuth();
  const { t, language } = useLanguage();

  const [role, setRole] = useState<MemberRole>("public");
  const [initialized, setInitialized] = useState(false);

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState("");
  const [loadingTenants, setLoadingTenants] = useState(true);

  const [membersData, setMembersData] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [deleting, setDeleting] = useState<string | null>(null);

  const loadMembers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getMembers();
      setMembersData(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : t("members.loadMembersFailed");
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [t]);

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

  useEffect(() => {
    const run = async () => {
      try {
        const normalized = (authRole || "user").toLowerCase();
        const mapped: MemberRole =
          normalized === "owner" || normalized === "manager" || normalized === "staff"
            ? (normalized as "owner" | "manager" | "staff")
            : normalized === "user" ? "user" : "public";
        setRole(mapped);
        const hasAccess =
          mapped === "owner" || mapped === "manager" || mapped === "staff" ||
          (mapped === "user" && hasSubscription);
        if (hasAccess) await loadMembers();
        else setLoading(false);
      } catch {
        setRole("public");
        setLoading(false);
      } finally {
        setInitialized(true);
      }
    };
    void run();
  }, [authRole, hasSubscription, loadMembers]);

  const handleTenantChange = useCallback((id: string) => {
    setSelectedTenantId(id);
    try { window.localStorage.setItem("ecert-selected-tenant-id", id); } catch { /* ignore */ }
  }, []);

  const deleteMember = useCallback(async (id: string) => {
    if (role !== "owner" && role !== "manager") {
      toast.error(t("members.deleteNoPermission")); return;
    }
    const member = membersData.find((m) => m.id === id);
    if (!member) return;
    const msg = language === "id"
      ? `Apakah Anda yakin ingin menghapus data "${member.name}"?`
      : `Are you sure you want to delete data "${member.name}"? This action cannot be undone.`;
    const confirmed = await confirmToast(msg, { confirmText: t("common.delete"), tone: "destructive" });
    if (!confirmed) return;
    try {
      setDeleting(id);
      await deleteMemberService(id);
      setMembersData((prev) => prev.filter((m) => m.id !== id));
      toast.success(t("members.deleteSuccess"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("members.deleteFailed"));
    } finally {
      setDeleting(null);
    }
  }, [role, membersData, t, language]);

  const canDelete = role === "owner" || role === "manager";

  return {
    role, initialized, canDelete,
    tenants, selectedTenantId, loadingTenants, handleTenantChange,
    membersData, setMembersData, loading, error, loadMembers,
    deleting, deleteMember,
    t, language
  };
}
