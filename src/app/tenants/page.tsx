"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import ModernLayout from "@/components/modern-layout";
import { useLanguage } from "@/contexts/language-context";
import { getTenantsForCurrentUser, createTenantForCurrentUser, updateTenant, deleteTenant, checkTenantHasData, type Tenant } from "@/lib/supabase/tenants";
import { supabaseClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Plus, Building2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { confirmToast } from "@/lib/ui/confirm";

export default function TenantsPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const { role: authRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTenantName, setNewTenantName] = useState("");
  const [newTenantType, setNewTenantType] = useState("company");
  const [newTenantDescription, setNewTenantDescription] = useState("");
  const [newTenantLogoUrl, setNewTenantLogoUrl] = useState("");
  const [newTenantCoverUrl, setNewTenantCoverUrl] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [editTenantName, setEditTenantName] = useState("");
  const [editTenantType, setEditTenantType] = useState("company");
  const [editTenantDescription, setEditTenantDescription] = useState("");
  const [editTenantLogoUrl, setEditTenantLogoUrl] = useState("");
  const [editTenantCoverUrl, setEditTenantCoverUrl] = useState("");
  const [uploadingNewLogo, setUploadingNewLogo] = useState(false);
  const [uploadingNewCover, setUploadingNewCover] = useState(false);
  const [uploadingEditLogo, setUploadingEditLogo] = useState(false);
  const [uploadingEditCover, setUploadingEditCover] = useState(false);
  const [tenantsWithData, setTenantsWithData] = useState<Set<string>>(new Set());

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const handleEditTenant = async (tenant: Tenant) => {
    setEditingTenant(tenant);
    setEditTenantName(tenant.name || "");
    setEditTenantType(tenant.tenant_type || "company");
    if (tenant.description && tenant.description.trim().length > 0) {
      setEditTenantDescription(tenant.description);
    } else {
      let fallback = "";
      if (tenant.tenant_type === "company") {
        fallback = "Perusahaan atau organisasi bisnis.";
      } else if (tenant.tenant_type === "school") {
        fallback = "Sekolah, kampus, atau lembaga pendidikan.";
      } else if (tenant.tenant_type === "organization") {
        fallback = "Organisasi, komunitas, atau asosiasi.";
      } else if (tenant.tenant_type === "personal") {
        fallback = "Tenant pribadi untuk individu atau freelancer.";
      } else if (!tenant.tenant_type) {
        fallback = "Tenant untuk mengelola data, templates, dan certificates.";
      }
      setEditTenantDescription(fallback);
    }
    setEditTenantLogoUrl(tenant.logo_url || "");
    setEditTenantCoverUrl(tenant.cover_url || "");
    setEditOpen(true);
  };

  const checkTenantsData = async (tenantsList: Tenant[]) => {
    const tenantsWithDataSet = new Set<string>();
    
    // Check each tenant for data in parallel
    await Promise.all(
      tenantsList.map(async (tenant) => {
        try {
          const hasData = await checkTenantHasData(tenant.id);
          if (hasData) {
            tenantsWithDataSet.add(tenant.id);
          }
        } catch (error) {
          console.error(`Error checking data for tenant ${tenant.id}:`, error);
          // Add to set as safe default
          tenantsWithDataSet.add(tenant.id);
        }
      })
    );
    
    setTenantsWithData(tenantsWithDataSet);
  };

  const handleDeleteTenant = async (tenant: Tenant) => {
    // Check if tenant has data
    const hasData = tenantsWithData.has(tenant.id);
    
    if (hasData) {
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
      setTenants((prev) => prev.filter((t) => t.id !== tenant.id));
      
      // Remove from tenantsWithData set
      setTenantsWithData((prev) => {
        const newSet = new Set(prev);
        newSet.delete(tenant.id);
        return newSet;
      });
      
      toast.success(`Tenant "${tenant.name}" berhasil dihapus.`);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to delete tenant";
      setError(message);
      toast.error(message);
    }
  };

  const handleUploadImage = async (
    event: ChangeEvent<HTMLInputElement>,
    folder: "profile" | "cover",
    setUrl: (url: string) => void,
    setUploading: (uploading: boolean) => void,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const ext = file.name.split(".").pop() || "jpg";
      const fileName = `${folder}-${Date.now()}.${ext}`;
      const path = `${folder}/${fileName}`;

      const { error: uploadError } = await supabaseClient.storage
        .from("tenants")
        .upload(path, file, { upsert: true });

      if (uploadError) {
        toast.error(`Gagal mengunggah gambar: ${uploadError.message}`);
        return;
      }

      const { data } = supabaseClient.storage.from("tenants").getPublicUrl(path);
      if (data?.publicUrl) {
        setUrl(data.publicUrl);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Gagal mengunggah gambar";
      toast.error(message);
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  useEffect(() => {
    const setTitle = () => {
      if (typeof document !== 'undefined') {
        document.title = "Tenants | Certify - Certificate Platform";
      }
    };
    
    setTitle();
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getTenantsForCurrentUser();
        setTenants(data);
        
        // Check which tenants have data
        await checkTenantsData(data);
      } catch (e) {
        const message = e instanceof Error ? e.message : "Failed to load tenants";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  useEffect(() => {
    const loadUser = async () => {
      const {
        data: { session },
      } = await supabaseClient.auth.getSession();
      const userId = session?.user?.id ?? null;
      setCurrentUserId(userId);
    };

    void loadUser();
  }, []);
  const handleOpenTenant = (tenantId: string) => {
    router.push(`/tenants/${tenantId}`);
  };

  const handleCreateTenant = async () => {
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
      const updatedTenants = [...tenants, tenant];
      setTenants(updatedTenants);
      
      // Check data for the new tenant list
      await checkTenantsData(updatedTenants);
      
      setCreateOpen(false);
      setNewTenantName("");
      setNewTenantType("company");
      setNewTenantDescription("");
      setNewTenantLogoUrl("");
      setNewTenantCoverUrl("");
      router.push(`/tenants/${tenant.id}`);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to create tenant";
      setError(message);
    } finally {
      setCreating(false);
    }
  };

  const handleSubmitEditTenant = async () => {
    if (!editingTenant) return;
    const trimmed = editTenantName.trim();
    if (!trimmed) {
      toast.error("Nama tenant tidak boleh kosong.");
      return;
    }

    try {
      setEditing(true);
      setError(null);
      const updated = await updateTenant(editingTenant.id, {
        name: trimmed,
        tenant_type: editTenantType || null,
        description: editTenantDescription.trim() || null,
        logo_url: editTenantLogoUrl.trim() || null,
        cover_url: editTenantCoverUrl.trim() || null,
      });
      const updatedTenants = tenants.map((t) => (t.id === editingTenant.id ? updated : t));
      setTenants(updatedTenants);
      
      // Check data for updated tenant list
      await checkTenantsData(updatedTenants);
      
      setEditingTenant(null);
      setEditOpen(false);
      setEditTenantDescription("");
      setEditTenantLogoUrl("");
      setEditTenantCoverUrl("");
      toast.success("Tenant berhasil diperbarui.");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to update tenant";
      setError(message);
      toast.error(message);
    } finally {
      setEditing(false);
    }
  };

  return (
    <ModernLayout>
      <section className="relative -mt-4 pb-6 sm:-mt-5 sm:pb-8" style={{ backgroundColor: "var(--background, #0b1120)" }}>
        <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full shadow-md flex-shrink-0 gradient-primary">
                <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-3xl md:text-4xl font-bold text-[#2563eb] dark:text-blue-400">
                  Tenants
                </h1>
              </div>
            </div>
            {currentUserId && authRole === "owner" && (
              <Button
                onClick={() => setCreateOpen(true)}
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>New tenant</span>
              </Button>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-md dark:shadow-lg p-4 sm:p-6 min-h-[200px]">
            {loading && (
              <div className="flex items-center justify-center min-h-[160px]">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 border-b-2 border-blue-600 rounded-full animate-spin" />
                  <p className="text-sm text-gray-600 dark:text-gray-300">Loading tenants...</p>
                </div>
              </div>
            )}

            {!loading && error && (
              <div className="flex items-center justify-center min-h-[160px]">
                <p className="text-sm text-red-500">{error}</p>
              </div>
            )}

            {!loading && !error && tenants.length === 0 && (
              <div className="flex flex-col items-center justify-center min-h-[160px] text-center gap-3">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Kamu belum memiliki tenant. Buat tenant pertama untuk mulai mengelola data dan sertifikat.
                </p>
                {currentUserId && authRole === "owner" && (
                  <Button
                    onClick={() => setCreateOpen(true)}
                    className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create tenant</span>
                  </Button>
                )}
              </div>
            )}

            {!loading && !error && tenants.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {tenants.map((tenant) => (
                  <div
                    key={tenant.id}
                    className="group rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/80 hover:shadow-lg transition-shadow transform hover:-translate-y-0.5 duration-150 overflow-hidden flex flex-col"
                  >
                    <button
                      type="button"
                      onClick={() => handleOpenTenant(tenant.id)}
                      className="text-left flex-1 flex flex-col"
                    >
                      {/* Cover section */}
                      <div
                        className="relative h-28 sm:h-32 w-full overflow-hidden"
                        style={{
                          backgroundImage: tenant.cover_url
                            ? `url(${tenant.cover_url})`
                            : undefined,
                          backgroundSize: tenant.cover_url ? "cover" : undefined,
                          backgroundPosition: tenant.cover_url ? "center" : undefined,
                        }}
                      >
                        {!tenant.cover_url && (
                          <div className="absolute inset-0 bg-gradient-to-r from-slate-800 via-slate-900 to-slate-800" />
                        )}
                        <div className="absolute inset-0 bg-black/20" />
                        <div className="absolute top-2 right-3 flex items-center gap-1">
                          {tenant.tenant_type && (
                            <span className="inline-flex items-center rounded-full bg-emerald-500/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm">
                              {tenant.tenant_type}
                            </span>
                          )}
                        </div>
                        <div className="absolute inset-y-0 left-4 flex items-center gap-3">
                          <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-full border-2 border-white bg-gray-200 dark:bg-gray-800 overflow-hidden flex items-center justify-center text-sm font-semibold text-gray-800 dark:text-gray-100 shadow-md">
                            {tenant.logo_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={tenant.logo_url}
                                alt={tenant.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              (tenant.name || "?").charAt(0).toUpperCase()
                            )}
                          </div>
                          <div className="pb-0.5 text-right max-w-[140px] sm:max-w-[160px]">
                            <h2 className="text-sm sm:text-base font-semibold text-white mb-0.5 truncate">
                              {tenant.name}
                            </h2>
                          </div>
                        </div>
                      </div>

                      {/* Body section */}
                      <div className="pt-8 px-4 pb-2 flex flex-col gap-1.5">
                        <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 mb-0.5">
                          <span>{formatDate(tenant.created_at)}</span>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 min-h-[28px]">
                          {tenant.description && tenant.description.trim().length > 0
                            ? tenant.description
                            : "Tidak ada deskripsi"}
                        </p>
                      </div>
                    </button>
                    <div className="flex items-center justify-between px-4 pb-2 pt-1 text-[11px] text-gray-500 dark:text-gray-400">
                      <span>
                        {(tenant.member_count ?? 0).toString()} Anggota
                      </span>
                      <div className="flex items-center justify-end gap-2 text-[12px] text-inherit">
                        {currentUserId && tenant.owner_user_id === currentUserId && (
                          <>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditTenant(tenant)}
                            >
                              Edit
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="bg-red-500 hover:bg-red-600 text-white border-none shadow-sm disabled:bg-red-300 disabled:text-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                              onClick={() => handleDeleteTenant(tenant)}
                              disabled={tenantsWithData.has(tenant.id)}
                              title={tenantsWithData.has(tenant.id) ? "Tidak dapat menghapus tenant yang masih memiliki data" : "Hapus tenant"}
                            >
                              Delete
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Buat tenant baru</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1">
                <Label htmlFor="tenant-name">Nama tenant / organisasi</Label>
                <Input
                  id="tenant-name"
                  value={newTenantName}
                  onChange={(e) => setNewTenantName(e.target.value)}
                  placeholder="Misal: PT. Contoh Jaya"
                  autoFocus
                  disabled={creating}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="tenant-description">Deskripsi</Label>
                <textarea
                  id="tenant-description"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 dark:focus-visible:ring-blue-400 min-h-[80px] resize-y"
                  value={newTenantDescription}
                  onChange={(e) => setNewTenantDescription(e.target.value)}
                  placeholder="Contoh: Tenant untuk mengelola kerjasama dan sertifikat pelatihan."
                  disabled={creating}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="tenant-logo-file">Logo</Label>
                <div className="flex items-center gap-2">
                  <input
                    id="tenant-logo-file"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleUploadImage(e, "profile", setNewTenantLogoUrl, setUploadingNewLogo)}
                    disabled={creating || uploadingNewLogo}
                  />
                  <Label
                    htmlFor="tenant-logo-file"
                    className="inline-flex items-center px-3 py-1.5 rounded-md border cursor-pointer text-xs sm:text-sm bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    {uploadingNewLogo ? "Mengunggah..." : "Upload logo"}
                  </Label>
                  {newTenantLogoUrl && (
                    <span className="text-[11px] text-gray-500 dark:text-gray-400 truncate max-w-[140px]">
                      Logo terpilih
                    </span>
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="tenant-cover-file">Cover</Label>
                <div className="flex items-center gap-2">
                  <input
                    id="tenant-cover-file"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleUploadImage(e, "cover", setNewTenantCoverUrl, setUploadingNewCover)}
                    disabled={creating || uploadingNewCover}
                  />
                  <Label
                    htmlFor="tenant-cover-file"
                    className="inline-flex items-center px-3 py-1.5 rounded-md border cursor-pointer text-xs sm:text-sm bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    {uploadingNewCover ? "Mengunggah..." : "Upload cover"}
                  </Label>
                  {newTenantCoverUrl && (
                    <span className="text-[11px] text-gray-500 dark:text-gray-400 truncate max-w-[140px]">
                      Cover terpilih
                    </span>
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="tenant-type">Tipe tenant</Label>
                <select
                  id="tenant-type"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 dark:focus-visible:ring-blue-400"
                  value={newTenantType}
                  onChange={(e) => setNewTenantType(e.target.value)}
                  disabled={creating}
                >
                  <option value="company">Perusahaan / Industri</option>
                  <option value="school">Sekolah / Kampus</option>
                  <option value="organization">Organisasi / Komunitas</option>
                  <option value="personal">Pribadi / Freelancer</option>
                  <option value="other">Lainnya</option>
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setCreateOpen(false)}
                disabled={creating}
              >
                Batal
              </Button>
              <Button
                onClick={handleCreateTenant}
                disabled={creating || !newTenantName.trim()}
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
              >
                {creating ? "Membuat..." : "Buat tenant"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog open={editOpen} onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) {
            setEditingTenant(null);
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit tenant</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1">
                <Label htmlFor="edit-tenant-name">Nama tenant / organisasi</Label>
                <Input
                  id="edit-tenant-name"
                  value={editTenantName}
                  onChange={(e) => setEditTenantName(e.target.value)}
                  placeholder="Misal: PT. Contoh Jaya"
                  autoFocus
                  disabled={editing}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-tenant-description">Deskripsi</Label>
                <textarea
                  id="edit-tenant-description"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 dark:focus-visible:ring-blue-400 min-h-[80px] resize-y"
                  value={editTenantDescription}
                  onChange={(e) => setEditTenantDescription(e.target.value)}
                  placeholder="Contoh: Tenant untuk mengelola kerjasama dan sertifikat pelatihan."
                  disabled={editing}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-tenant-logo-file">Logo</Label>
                <div className="flex items-center gap-2">
                  <input
                    id="edit-tenant-logo-file"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleUploadImage(e, "profile", setEditTenantLogoUrl, setUploadingEditLogo)}
                    disabled={editing || uploadingEditLogo}
                  />
                  <Label
                    htmlFor="edit-tenant-logo-file"
                    className="inline-flex items-center px-3 py-1.5 rounded-md border cursor-pointer text-xs sm:text-sm bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    {uploadingEditLogo ? "Mengunggah..." : "Ganti logo"}
                  </Label>
                  {editTenantLogoUrl && (
                    <span className="text-[11px] text-gray-500 dark:text-gray-400 truncate max-w-[140px]">
                      Logo terpilih
                    </span>
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-tenant-cover-file">Cover</Label>
                <div className="flex items-center gap-2">
                  <input
                    id="edit-tenant-cover-file"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleUploadImage(e, "cover", setEditTenantCoverUrl, setUploadingEditCover)}
                    disabled={editing || uploadingEditCover}
                  />
                  <Label
                    htmlFor="edit-tenant-cover-file"
                    className="inline-flex items-center px-3 py-1.5 rounded-md border cursor-pointer text-xs sm:text-sm bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    {uploadingEditCover ? "Mengunggah..." : "Ganti cover"}
                  </Label>
                  {editTenantCoverUrl && (
                    <span className="text-[11px] text-gray-500 dark:text-gray-400 truncate max-w-[140px]">
                      Cover terpilih
                    </span>
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-tenant-type">Tipe tenant</Label>
                <select
                  id="edit-tenant-type"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 dark:focus-visible:ring-blue-400"
                  value={editTenantType}
                  onChange={(e) => setEditTenantType(e.target.value)}
                  disabled={editing}
                >
                  <option value="company">Perusahaan / Industri</option>
                  <option value="school">Sekolah / Kampus</option>
                  <option value="organization">Organisasi / Komunitas</option>
                  <option value="personal">Pribadi / Freelancer</option>
                  <option value="other">Lainnya</option>
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setEditOpen(false);
                  setEditingTenant(null);
                }}
                disabled={editing}
              >
                Batal
              </Button>
              <Button
                onClick={handleSubmitEditTenant}
                disabled={editing || !editTenantName.trim()}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
              >
                {editing ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </section>
    </ModernLayout>
  );
}
