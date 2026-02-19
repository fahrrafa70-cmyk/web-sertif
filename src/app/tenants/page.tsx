"use client";

import ModernLayout from "@/components/modern-layout";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Plus, Building2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTenants, formatTenantDate } from "@/features/tenants/hooks/useTenants";

const TENANT_TYPE_OPTIONS = [
  { value: "company",      label: "Perusahaan / Industri" },
  { value: "school",       label: "Sekolah / Kampus" },
  { value: "organization", label: "Organisasi / Komunitas" },
  { value: "personal",     label: "Pribadi / Freelancer" },
  { value: "other",        label: "Lainnya" },
];

const SELECT_CLS = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 dark:focus-visible:ring-blue-400";
const TEXTAREA_CLS = `${SELECT_CLS} min-h-[80px] resize-y`;
const UPLOAD_LABEL_CLS = "inline-flex items-center px-3 py-1.5 rounded-md border cursor-pointer text-xs sm:text-sm bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800";

export default function TenantsPage() {
  const { role: authRole } = useAuth();
  const {
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
    handleCreateTenant, handleUploadImage,
    setUploadingNewLogo, setUploadingNewCover,
    // edit dialog
    editOpen, handleCloseEditDialog, editing,
    editTenantName, setEditTenantName,
    editTenantType, setEditTenantType,
    editTenantDescription, setEditTenantDescription,
    editTenantLogoUrl, setEditTenantLogoUrl,
    editTenantCoverUrl, setEditTenantCoverUrl,
    uploadingEditLogo, uploadingEditCover,
    handleSubmitEditTenant,
    setUploadingEditLogo, setUploadingEditCover,
  } = useTenants();

  const isOwner = authRole === "owner";

  return (
    <ModernLayout>
      <section className="relative -mt-4 pb-6 sm:-mt-5 sm:pb-8" style={{ backgroundColor: "var(--background, #0b1120)" }}>
        <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">

          {/* ── Header ── */}
          <div className="flex items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full shadow-md flex-shrink-0 gradient-primary">
                <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <h1 className="text-xl sm:text-3xl md:text-4xl font-bold text-[#2563eb] dark:text-blue-400">Tenants</h1>
            </div>
            {currentUserId && isOwner && (
              <Button onClick={() => setCreateOpen(true)} className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white flex items-center gap-2">
                <Plus className="w-4 h-4" /><span>New tenant</span>
              </Button>
            )}
          </div>

          {/* ── Content ── */}
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
                {currentUserId && isOwner && (
                  <Button onClick={() => setCreateOpen(true)} className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white flex items-center gap-2">
                    <Plus className="w-4 h-4" /><span>Create tenant</span>
                  </Button>
                )}
              </div>
            )}
            {!loading && !error && tenants.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {tenants.map((tenant) => (
                  <div key={tenant.id} className="group rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/80 hover:shadow-lg transition-shadow transform hover:-translate-y-0.5 duration-150 overflow-hidden flex flex-col">
                    <button type="button" onClick={() => handleOpenTenant(tenant.id)} className="text-left flex-1 flex flex-col">
                      {/* Cover */}
                      <div className="relative h-28 sm:h-32 w-full overflow-hidden"
                        style={{ backgroundImage: tenant.cover_url ? `url(${tenant.cover_url})` : undefined, backgroundSize: "cover", backgroundPosition: "center" }}>
                        {!tenant.cover_url && <div className="absolute inset-0 bg-gradient-to-r from-slate-800 via-slate-900 to-slate-800" />}
                        <div className="absolute inset-0 bg-black/20" />
                        <div className="absolute top-2 right-3">
                          {tenant.tenant_type && (
                            <span className="inline-flex items-center rounded-full bg-emerald-500/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm">
                              {tenant.tenant_type}
                            </span>
                          )}
                        </div>
                        <div className="absolute inset-y-0 left-4 flex items-center gap-3">
                          <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-full border-2 border-white bg-gray-200 dark:bg-gray-800 overflow-hidden flex items-center justify-center text-sm font-semibold text-gray-800 dark:text-gray-100 shadow-md">
                            {tenant.logo_url
                              // eslint-disable-next-line @next/next/no-img-element
                              ? <img src={tenant.logo_url} alt={tenant.name} className="h-full w-full object-cover" />
                              : (tenant.name || "?").charAt(0).toUpperCase()}
                          </div>
                          <h2 className="text-sm sm:text-base font-semibold text-white mb-0.5 truncate max-w-[140px] sm:max-w-[160px]">{tenant.name}</h2>
                        </div>
                      </div>
                      {/* Body */}
                      <div className="pt-8 px-4 pb-2 flex flex-col gap-1.5">
                        <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 mb-0.5">
                          <span>{formatTenantDate(tenant.created_at)}</span>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 min-h-[28px]">
                          {tenant.description?.trim() || "Tidak ada deskripsi"}
                        </p>
                      </div>
                    </button>
                    <div className="flex items-center justify-between px-4 pb-2 pt-1 text-[11px] text-gray-500 dark:text-gray-400">
                      <span>{(tenant.member_count ?? 0).toString()} Anggota</span>
                      <div className="flex items-center gap-2">
                        {currentUserId && tenant.owner_user_id === currentUserId && (
                          <>
                            <Button type="button" variant="outline" size="sm" onClick={() => handleEditTenant(tenant)}>Edit</Button>
                            <Button type="button" variant="destructive" size="sm"
                              className="bg-red-500 hover:bg-red-600 text-white border-none shadow-sm disabled:bg-red-300 disabled:text-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                              onClick={() => handleDeleteTenant(tenant)}
                              disabled={tenantsWithData.has(tenant.id)}
                              title={tenantsWithData.has(tenant.id) ? "Tidak dapat menghapus tenant yang masih memiliki data" : "Hapus tenant"}>
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

        {/* ── Create Dialog ── */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Buat tenant baru</DialogTitle></DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1">
                <Label htmlFor="tenant-name">Nama tenant / organisasi</Label>
                <Input id="tenant-name" value={newTenantName} onChange={(e) => setNewTenantName(e.target.value)}
                  placeholder="Misal: PT. Contoh Jaya" autoFocus disabled={creating} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="tenant-description">Deskripsi</Label>
                <textarea id="tenant-description" className={TEXTAREA_CLS} value={newTenantDescription}
                  onChange={(e) => setNewTenantDescription(e.target.value)}
                  placeholder="Contoh: Tenant untuk mengelola kerjasama dan sertifikat pelatihan." disabled={creating} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="tenant-logo-file">Logo</Label>
                <div className="flex items-center gap-2">
                  <input id="tenant-logo-file" type="file" accept="image/*" className="hidden"
                    onChange={(e) => handleUploadImage(e, "profile", setNewTenantLogoUrl, setUploadingNewLogo)}
                    disabled={creating || uploadingNewLogo} />
                  <Label htmlFor="tenant-logo-file" className={UPLOAD_LABEL_CLS}>{uploadingNewLogo ? "Mengunggah..." : "Upload logo"}</Label>
                  {newTenantLogoUrl && <span className="text-[11px] text-gray-500 dark:text-gray-400 truncate max-w-[140px]">Logo terpilih</span>}
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="tenant-cover-file">Cover</Label>
                <div className="flex items-center gap-2">
                  <input id="tenant-cover-file" type="file" accept="image/*" className="hidden"
                    onChange={(e) => handleUploadImage(e, "cover", setNewTenantCoverUrl, setUploadingNewCover)}
                    disabled={creating || uploadingNewCover} />
                  <Label htmlFor="tenant-cover-file" className={UPLOAD_LABEL_CLS}>{uploadingNewCover ? "Mengunggah..." : "Upload cover"}</Label>
                  {newTenantCoverUrl && <span className="text-[11px] text-gray-500 dark:text-gray-400 truncate max-w-[140px]">Cover terpilih</span>}
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="tenant-type">Tipe tenant</Label>
                <select id="tenant-type" className={SELECT_CLS} value={newTenantType} onChange={(e) => setNewTenantType(e.target.value)} disabled={creating}>
                  {TENANT_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>Batal</Button>
              <Button onClick={handleCreateTenant} disabled={creating || !newTenantName.trim()} className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white">
                {creating ? "Membuat..." : "Buat tenant"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Edit Dialog ── */}
        <Dialog open={editOpen} onOpenChange={handleCloseEditDialog}>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit tenant</DialogTitle></DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1">
                <Label htmlFor="edit-tenant-name">Nama tenant / organisasi</Label>
                <Input id="edit-tenant-name" value={editTenantName} onChange={(e) => setEditTenantName(e.target.value)}
                  placeholder="Misal: PT. Contoh Jaya" autoFocus disabled={editing} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-tenant-description">Deskripsi</Label>
                <textarea id="edit-tenant-description" className={TEXTAREA_CLS} value={editTenantDescription}
                  onChange={(e) => setEditTenantDescription(e.target.value)}
                  placeholder="Contoh: Tenant untuk mengelola kerjasama dan sertifikat pelatihan." disabled={editing} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-tenant-logo-file">Logo</Label>
                <div className="flex items-center gap-2">
                  <input id="edit-tenant-logo-file" type="file" accept="image/*" className="hidden"
                    onChange={(e) => handleUploadImage(e, "profile", setEditTenantLogoUrl, setUploadingEditLogo)}
                    disabled={editing || uploadingEditLogo} />
                  <Label htmlFor="edit-tenant-logo-file" className={UPLOAD_LABEL_CLS}>{uploadingEditLogo ? "Mengunggah..." : "Ganti logo"}</Label>
                  {editTenantLogoUrl && <span className="text-[11px] text-gray-500 dark:text-gray-400 truncate max-w-[140px]">Logo terpilih</span>}
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-tenant-cover-file">Cover</Label>
                <div className="flex items-center gap-2">
                  <input id="edit-tenant-cover-file" type="file" accept="image/*" className="hidden"
                    onChange={(e) => handleUploadImage(e, "cover", setEditTenantCoverUrl, setUploadingEditCover)}
                    disabled={editing || uploadingEditCover} />
                  <Label htmlFor="edit-tenant-cover-file" className={UPLOAD_LABEL_CLS}>{uploadingEditCover ? "Mengunggah..." : "Ganti cover"}</Label>
                  {editTenantCoverUrl && <span className="text-[11px] text-gray-500 dark:text-gray-400 truncate max-w-[140px]">Cover terpilih</span>}
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-tenant-type">Tipe tenant</Label>
                <select id="edit-tenant-type" className={SELECT_CLS} value={editTenantType} onChange={(e) => setEditTenantType(e.target.value)} disabled={editing}>
                  {TENANT_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => handleCloseEditDialog(false)} disabled={editing}>Batal</Button>
              <Button onClick={handleSubmitEditTenant} disabled={editing || !editTenantName.trim()} className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white">
                {editing ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </section>
    </ModernLayout>
  );
}
