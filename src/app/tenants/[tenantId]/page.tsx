"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ModernLayout from "@/components/modern-layout";
import { useLanguage } from "@/contexts/language-context";
import {
  getTenantById,
  getTenantMembers,
  getTenantInvites,
  createTenantInvite,
  updateTenant,
  deleteTenant,
  type Tenant,
  type TenantMember,
  type TenantInvite,
} from "@/lib/supabase/tenants";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Copy, Link2, Users, UserPlus, Building2, ArrowLeft } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { confirmToast } from "@/lib/ui/confirm";

export default function TenantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { t } = useLanguage();
  const tenantId = params?.tenantId as string | undefined;

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

  const handleEditTenant = async () => {
    if (!tenant) return;

    setEditTenantName(tenant.name || "");
    setEditTenantType(tenant.tenant_type || "company");
    setEditTenantDescription(tenant.description || "");
    setEditOpen(true);
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

  if (loading) {
    return (
      <ModernLayout>
        <section className="relative -mt-4 pb-6 sm:-mt-5 sm:pb-8">
          <div className="min-h-[calc(100vh-80px)] flex items-center justify-center px-4 -mt-8">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-b-2 border-blue-600 rounded-full animate-spin" />
              <p className="text-sm text-gray-600 dark:text-gray-300">Loading tenant...</p>
            </div>
          </div>
        </section>
      </ModernLayout>
    );
  }

  if (error || !tenant) {
    return (
      <ModernLayout>
        <section className="relative -mt-4 pb-6 sm:-mt-5 sm:pb-8">
          <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-center min-h-[240px]">
            <p className="text-sm text-red-500">{error || "Tenant tidak ditemukan"}</p>
          </div>
        </section>
      </ModernLayout>
    );
  }

  return (
    <ModernLayout>
      <section className="relative -mt-4 pb-6 sm:-mt-5 sm:pb-8" style={{ backgroundColor: "var(--background, #0b1120)" }}>
        <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full shadow-md flex-shrink-0 gradient-primary">
                <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center flex-wrap gap-2">
                    <h1 className="text-xl sm:text-3xl md:text-4xl font-bold text-[#2563eb] dark:text-blue-400">
                      {tenant.name}
                    </h1>
                    {tenant.tenant_type && (
                      <span className="uppercase tracking-wide text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                        {tenant.tenant_type}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 px-3 text-xs border-gray-300 dark:border-gray-700 flex items-center gap-1.5"
              onClick={() => router.push("/tenants")}
            >
              <ArrowLeft className="w-3 h-3" />
              <span>Kembali</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[2fr_1.3fr] gap-4 sm:gap-6">
            <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-md dark:shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Users className="w-4 h-4" />
                  <span>Team members</span>
                </CardTitle>
                <Button
                  size="sm"
                  onClick={handleCreateInvite}
                  disabled={creatingInvite}
                  className="h-8 px-3 text-xs bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white flex items-center gap-1.5"
                >
                  <UserPlus className="w-3 h-3" />
                  <span>{creatingInvite ? "Generating..." : "Generate invite"}</span>
                </Button>
              </CardHeader>
              <CardContent className="pt-0">
                {members.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 py-4">
                    Belum ada member di tenant ini.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between gap-3 rounded-md border border-gray-100 dark:border-gray-700/70 bg-gray-50 dark:bg-gray-900/50 px-3 py-2.5"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={member.user?.avatar_url || undefined} />
                            <AvatarFallback>
                              {member.user?.full_name?.[0]?.toUpperCase() || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                              {member.user?.full_name || member.user?.email || "User"}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {member.user?.email}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge variant="outline" className="text-[11px] uppercase tracking-wide">
                            {member.role}
                          </Badge>
                          <span className="text-[11px] text-gray-500 dark:text-gray-400">
                            {member.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-md dark:shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Link2 className="w-4 h-4" />
                  <span>Activity log</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {members.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 py-4">
                    Belum ada aktivitas pada tenant ini.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {members
                      .slice()
                      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                      .map((member) => (
                        <div
                          key={member.id}
                          className="flex items-start gap-3 rounded-md border border-gray-100 dark:border-gray-700/70 bg-gray-50 dark:bg-gray-900/50 px-3 py-2.5"
                        >
                          <div className="mt-1 h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />
                          <div className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
                            <p>
                              <span className="font-medium">
                                {member.user?.full_name || member.user?.email || "Seorang user"}
                              </span>{" "}
                              bergabung sebagai
                              {" "}
                              <span className="uppercase font-semibold">{member.role}</span>
                              {" "}
                              dengan status
                              {" "}
                              <span className="font-medium">{member.status}</span>.
                            </p>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400">
                              {new Date(member.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit tenant</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1">
                <Label htmlFor="edit-tenant-name-detail">Nama tenant / organisasi</Label>
                <Input
                  id="edit-tenant-name-detail"
                  value={editTenantName}
                  onChange={(e) => setEditTenantName(e.target.value)}
                  placeholder="Misal: PT. Contoh Jaya"
                  autoFocus
                  disabled={editing}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-tenant-description-detail">Deskripsi (opsional)</Label>
                <textarea
                  id="edit-tenant-description-detail"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 dark:focus-visible:ring-blue-400 min-h-[80px] resize-y"
                  value={editTenantDescription}
                  onChange={(e) => setEditTenantDescription(e.target.value)}
                  placeholder="Contoh: Tenant untuk mengelola kerjasama dan sertifikat pelatihan."
                  disabled={editing}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-tenant-type-detail">Tipe tenant</Label>
                <select
                  id="edit-tenant-type-detail"
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
                onClick={() => setEditOpen(false)}
                disabled={editing}
              >
                Batal
              </Button>
              <Button
                onClick={handleSubmitEditTenant}
                disabled={editing || !editTenantName.trim()}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
              >
                {editing ? "Menyimpan..." : "Simpan perubahan"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </section>
    </ModernLayout>
  );
}
