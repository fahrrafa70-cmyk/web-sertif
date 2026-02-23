import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { confirmToast } from "@/lib/ui/confirm";
import { supabaseClient } from "@/lib/supabase/client";
import {
  getTenantById,
  getTenantMembers,
  createTenantInvite,
  updateTenant,
  deleteTenant,
  updateTenantMemberRole,
  removeTenantMember,
  type Tenant,
  type TenantMember,
} from "@/lib/supabase/tenants";

export function useTenantDetail(tenantId: string | undefined) {
  const router = useRouter();

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [members, setMembers] = useState<TenantMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  
  const [editTenantName, setEditTenantName] = useState("");
  const [editTenantType, setEditTenantType] = useState("company");
  const [editTenantDescription, setEditTenantDescription] = useState("");
  
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!tenantId) return;
      try {
        setLoading(true);
        setError(null);
        const [tenantData, memberData] = await Promise.all([
          getTenantById(tenantId),
          getTenantMembers(tenantId),
        ]);
        setTenant(tenantData);
        setMembers(memberData);
      } catch (e) {
        const message = e instanceof Error ? e.message : "Failed to load tenant";
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [tenantId]);

  useEffect(() => {
    const setTitle = () => {
      if (typeof document !== "undefined") {
        const tenantName = tenant?.name || "Tenant";
        document.title = `${tenantName} | Certify - Certificate Platform`;
      }
    };
    setTitle();
  }, [tenant]);

  useEffect(() => {
    const loadUser = async () => {
      const { data: { session } } = await supabaseClient.auth.getSession();
      setCurrentUserId(session?.user?.id ?? null);
    };
    void loadUser();
  }, []);

  const handleEditTenant = () => {
    if (!tenant) return;
    setEditTenantName(tenant.name || "");
    setEditTenantType(tenant.tenant_type || "company");
    setEditTenantDescription(tenant.description || "");
    setEditOpen(true);
  };

  const handleChangeMemberRole = async (member: TenantMember, newRole: string) => {
    if (!tenant || !tenant.id || !newRole) return;
    if (member.user_id && currentUserId && member.user_id === currentUserId) {
      toast.error("Owner tidak dapat mengubah role miliknya sendiri.");
      return;
    }

    try {
      setUpdatingMemberId(member.id);
      const updated = await updateTenantMemberRole(tenant.id, member.id, newRole);
      setMembers((prev) => prev.map((m) => (m.id === member.id ? { ...m, role: updated.role } : m)));
      toast.success("Role member berhasil diperbarui.");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to update member role";
      setError(message);
      toast.error(message);
    } finally {
      setUpdatingMemberId(null);
    }
  };

  const handleRemoveMember = async (member: TenantMember) => {
    if (!tenant || !tenant.id || !member.id) return;
    if (member.role.toLowerCase() === "owner") {
      toast.error("Owner tidak dapat dihapus dari tenant.");
      return;
    }

    const ok = await confirmToast(
      `Keluarkan ${member.user?.full_name || member.user?.email || "member"} dari tenant?`,
      { confirmText: "Kick", cancelText: "Batal", tone: "destructive" },
    );
    if (!ok) return;

    try {
      setRemovingMemberId(member.id);
      await removeTenantMember(tenant.id, member.id);
      setMembers((prev) => prev.filter((m) => m.id !== member.id));
      toast.success("Member berhasil dikeluarkan dari tenant.");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to remove member";
      setError(message);
      toast.error(message);
    } finally {
      setRemovingMemberId(null);
    }
  };

  const handleSubmitEditTenant = async () => {
    if (!tenant || !tenant.id) return;
    const trimmed = editTenantName.trim();
    if (!trimmed) {
      toast.error("Nama tenant tidak boleh kosong.");
      return;
    }

    try {
      setEditing(true);
      setError(null);
      const updated = await updateTenant(tenant.id, {
        name: trimmed,
        tenant_type: editTenantType || null,
        description: editTenantDescription.trim() || null,
      });
      setTenant(updated);
      setEditOpen(false);
      setEditTenantDescription("");
      toast.success("Tenant berhasil diperbarui.");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to update tenant";
      setError(message);
      toast.error(message);
    } finally {
      setEditing(false);
    }
  };

  const handleDeleteTenant = async () => {
    if (!tenant) return;
    const ok = await confirmToast(
      "Yakin ingin menghapus tenant ini? Pastikan semua data sudah tidak diperlukan.",
      { confirmText: "Hapus", cancelText: "Batal", tone: "destructive" },
    );
    if (!ok) return;

    try {
      setError(null);
      await deleteTenant(tenant.id);
      toast.success("Tenant berhasil dihapus.");
      router.push("/tenants");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to delete tenant";
      setError(message);
      toast.error(message);
    }
  };

  const baseInviteUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/invite`;
  }, []);

  const handleCreateInvite = async () => {
    if (!tenantId) return;
    try {
      setCreatingInvite(true);
      const invite = await createTenantInvite(tenantId, "staff");
      const url = `${baseInviteUrl}/${invite.token}`;
      try {
        await navigator.clipboard.writeText(url);
        toast.success("Invite link berhasil dibuat dan disalin ke clipboard.");
      } catch {
        toast.success("Invite link berhasil dibuat. Silakan salin dari address bar browser.");
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to create invite";
      setError(message);
      toast.error(message);
    } finally {
      setCreatingInvite(false);
    }
  };

  return {
    tenant,
    members,
    loading,
    error,
    currentUserId,
    creatingInvite,
    editOpen, setEditOpen,
    editing,
    editTenantName, setEditTenantName,
    editTenantType, setEditTenantType,
    editTenantDescription, setEditTenantDescription,
    updatingMemberId,
    removingMemberId,
    handleEditTenant,
    handleChangeMemberRole,
    handleRemoveMember,
    handleSubmitEditTenant,
    handleDeleteTenant,
    handleCreateInvite,
    router,
  };
}
