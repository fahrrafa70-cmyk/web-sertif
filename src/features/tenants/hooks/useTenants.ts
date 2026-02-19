"use client";

import { useCallback, useEffect, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import {
  getTenantsForCurrentUser,
  createTenantForCurrentUser,
  updateTenant,
  deleteTenant,
  checkTenantHasData,
} from "@/lib/supabase/tenants";
import type { Tenant } from "@/lib/supabase/tenants";
import { supabaseClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { confirmToast } from "@/lib/ui/confirm";

// ── helpers ──────────────────────────────────────────────────────────────────
export function formatTenantDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

function getDescriptionFallback(tenantType?: string | null) {
  if (tenantType === "company") return "Perusahaan atau organisasi bisnis.";
  if (tenantType === "school") return "Sekolah, kampus, atau lembaga pendidikan.";
  if (tenantType === "organization") return "Organisasi, komunitas, atau asosiasi.";
  if (tenantType === "personal") return "Tenant pribadi untuk individu atau freelancer.";
  return "Tenant untuk mengelola data, templates, dan certificates.";
}

// ── hook ──────────────────────────────────────────────────────────────────────
export function useTenants() {
  const router = useRouter();

  // list state
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [tenantsWithData, setTenantsWithData] = useState<Set<string>>(new Set());

  // create-dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTenantName, setNewTenantName] = useState("");
  const [newTenantType, setNewTenantType] = useState("company");
  const [newTenantDescription, setNewTenantDescription] = useState("");
  const [newTenantLogoUrl, setNewTenantLogoUrl] = useState("");
  const [newTenantCoverUrl, setNewTenantCoverUrl] = useState("");
  const [uploadingNewLogo, setUploadingNewLogo] = useState(false);
  const [uploadingNewCover, setUploadingNewCover] = useState(false);

  // edit-dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [editTenantName, setEditTenantName] = useState("");
  const [editTenantType, setEditTenantType] = useState("company");
  const [editTenantDescription, setEditTenantDescription] = useState("");
  const [editTenantLogoUrl, setEditTenantLogoUrl] = useState("");
  const [editTenantCoverUrl, setEditTenantCoverUrl] = useState("");
  const [uploadingEditLogo, setUploadingEditLogo] = useState(false);
  const [uploadingEditCover, setUploadingEditCover] = useState(false);

  // ── helpers ────────────────────────────────────────────────────────────────
  const checkTenantsData = useCallback(async (list: Tenant[]) => {
    const withData = new Set<string>();
    await Promise.all(
      list.map(async (t) => {
        try {
          if (await checkTenantHasData(t.id)) withData.add(t.id);
        } catch {
          withData.add(t.id); // safe default
        }
      }),
    );
    setTenantsWithData(withData);
  }, []);

  // ── upload image ───────────────────────────────────────────────────────────
  const handleUploadImage = useCallback(
    async (
      event: ChangeEvent<HTMLInputElement>,
      folder: "profile" | "cover",
      setUrl: (url: string) => void,
      setUploading: (v: boolean) => void,
    ) => {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        setUploading(true);
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${folder}/${folder}-${Date.now()}.${ext}`;
        const { error: uploadError } = await supabaseClient.storage
          .from("tenants")
          .upload(path, file, { upsert: true });
        if (uploadError) { toast.error(`Gagal mengunggah gambar: ${uploadError.message}`); return; }
        const { data } = supabaseClient.storage.from("tenants").getPublicUrl(path);
        if (data?.publicUrl) setUrl(data.publicUrl);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Gagal mengunggah gambar");
      } finally {
        setUploading(false);
        event.target.value = "";
      }
    },
    [],
  );

  // ── open edit dialog ───────────────────────────────────────────────────────
  const handleEditTenant = useCallback((tenant: Tenant) => {
    setEditingTenant(tenant);
    setEditTenantName(tenant.name || "");
    setEditTenantType(tenant.tenant_type || "company");
    setEditTenantDescription(
      tenant.description?.trim() ? tenant.description : getDescriptionFallback(tenant.tenant_type),
    );
    setEditTenantLogoUrl(tenant.logo_url || "");
    setEditTenantCoverUrl(tenant.cover_url || "");
    setEditOpen(true);
  }, []);

  // ── delete ─────────────────────────────────────────────────────────────────
  const handleDeleteTenant = useCallback(
    async (tenant: Tenant) => {
      if (tenantsWithData.has(tenant.id)) {
        toast.error(`Tidak dapat menghapus tenant "${tenant.name}" karena masih memiliki data (templates, sertifikat, atau member). Hapus semua data terlebih dahulu.`);
        return;
      }
      const ok = await confirmToast(
        `Yakin ingin menghapus tenant "${tenant.name}"? Pastikan semua data sudah tidak diperlukan.`,
        { confirmText: "Hapus", cancelText: "Batal", tone: "destructive" },
      );
      if (!ok) return;
      try {
        setError(null);
        await deleteTenant(tenant.id);
        const next = tenants.filter((t) => t.id !== tenant.id);
        setTenants(next);
        setTenantsWithData((prev) => { const s = new Set(prev); s.delete(tenant.id); return s; });
        toast.success(`Tenant "${tenant.name}" berhasil dihapus.`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to delete tenant";
        setError(msg); toast.error(msg);
      }
    },
    [tenants, tenantsWithData],
  );

  // ── create ─────────────────────────────────────────────────────────────────
  const handleCreateTenant = useCallback(async () => {
    const trimmed = newTenantName.trim();
    if (!trimmed) return;
    try {
      setCreating(true);
      const tenant = await createTenantForCurrentUser(
        trimmed,
        newTenantType,
        newTenantDescription.trim() || null,
        newTenantLogoUrl.trim() || null,
        newTenantCoverUrl.trim() || null,
      );
      const next = [...tenants, tenant];
      setTenants(next);
      await checkTenantsData(next);
      setCreateOpen(false);
      setNewTenantName(""); setNewTenantType("company"); setNewTenantDescription("");
      setNewTenantLogoUrl(""); setNewTenantCoverUrl("");
      router.push(`/tenants/${tenant.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create tenant");
    } finally {
      setCreating(false);
    }
  }, [newTenantName, newTenantType, newTenantDescription, newTenantLogoUrl, newTenantCoverUrl, tenants, checkTenantsData, router]);

  // ── save edit ──────────────────────────────────────────────────────────────
  const handleSubmitEditTenant = useCallback(async () => {
    if (!editingTenant) return;
    const trimmed = editTenantName.trim();
    if (!trimmed) { toast.error("Nama tenant tidak boleh kosong."); return; }
    try {
      setEditing(true); setError(null);
      const updated = await updateTenant(editingTenant.id, {
        name: trimmed,
        tenant_type: editTenantType || null,
        description: editTenantDescription.trim() || null,
        logo_url: editTenantLogoUrl.trim() || null,
        cover_url: editTenantCoverUrl.trim() || null,
      });
      const next = tenants.map((t) => (t.id === editingTenant.id ? updated : t));
      setTenants(next);
      await checkTenantsData(next);
      setEditingTenant(null); setEditOpen(false);
      setEditTenantDescription(""); setEditTenantLogoUrl(""); setEditTenantCoverUrl("");
      toast.success("Tenant berhasil diperbarui.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to update tenant";
      setError(msg); toast.error(msg);
    } finally {
      setEditing(false);
    }
  }, [editingTenant, editTenantName, editTenantType, editTenantDescription, editTenantLogoUrl, editTenantCoverUrl, tenants, checkTenantsData]);

  // ── navigate to tenant ─────────────────────────────────────────────────────
  const handleOpenTenant = useCallback((id: string) => router.push(`/tenants/${id}`), [router]);

  // ── close edit dialog ──────────────────────────────────────────────────────
  const handleCloseEditDialog = useCallback((open: boolean) => {
    setEditOpen(open);
    if (!open) setEditingTenant(null);
  }, []);

  // ── on mount: load tenants + current user ─────────────────────────────────
  useEffect(() => {
    void (async () => {
      try {
        setLoading(true); setError(null);
        const data = await getTenantsForCurrentUser();
        setTenants(data);
        await checkTenantsData(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load tenants");
      } finally {
        setLoading(false);
      }
    })();
  }, [checkTenantsData]);

  useEffect(() => {
    void supabaseClient.auth.getSession().then(({ data: { session } }) => {
      setCurrentUserId(session?.user?.id ?? null);
    });
  }, []);

  return {
    // list
    tenants, loading, error, currentUserId, tenantsWithData,
    handleOpenTenant, handleEditTenant, handleDeleteTenant,
    // create dialog
    createOpen, setCreateOpen, creating,
    newTenantName, setNewTenantName,
    newTenantType, setNewTenantType,
    newTenantDescription, setNewTenantDescription,
    newTenantLogoUrl, setNewTenantLogoUrl,
    newTenantCoverUrl, setNewTenantCoverUrl,
    uploadingNewLogo, uploadingNewCover,
    handleCreateTenant,
    // edit dialog
    editOpen, handleCloseEditDialog, editing, editingTenant,
    editTenantName, setEditTenantName,
    editTenantType, setEditTenantType,
    editTenantDescription, setEditTenantDescription,
    editTenantLogoUrl, setEditTenantLogoUrl,
    editTenantCoverUrl, setEditTenantCoverUrl,
    uploadingEditLogo, uploadingEditCover,
    handleSubmitEditTenant,
    // shared
    handleUploadImage,
    setUploadingNewLogo, setNewTenantLogoUrlSetter: setNewTenantLogoUrl,
    setUploadingNewCover, setNewTenantCoverUrlSetter: setNewTenantCoverUrl,
    setUploadingEditLogo, setEditTenantLogoUrlSetter: setEditTenantLogoUrl,
    setUploadingEditCover, setEditTenantCoverUrlSetter: setEditTenantCoverUrl,
  };
}
