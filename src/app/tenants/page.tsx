"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ModernLayout from "@/components/modern-layout";
import { useLanguage } from "@/contexts/language-context";
import { getTenantsForCurrentUser, createTenantForCurrentUser, updateTenant, deleteTenant, type Tenant } from "@/lib/supabase/tenants";
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

export default function TenantsPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTenantName, setNewTenantName] = useState("");
  const [newTenantType, setNewTenantType] = useState("company");

  const handleEditTenant = async (tenant: Tenant) => {
    const newName = window.prompt("Nama tenant", tenant.name);
    if (newName === null) return;

    const newType = window.prompt(
      "Tipe tenant (company, school, organization, personal, other)",
      tenant.tenant_type || "company",
    );

    try {
      setError(null);
      const updated = await updateTenant(tenant.id, {
        name: newName,
        tenant_type: newType || null,
      });
      setTenants((prev) => prev.map((t) => (t.id === tenant.id ? updated : t)));
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to update tenant";
      setError(message);
    }
  };

  const handleDeleteTenant = async (tenant: Tenant) => {
    const confirmed = window.confirm(
      `Yakin ingin menghapus tenant "${tenant.name}"? Pastikan semua data sudah tidak diperlukan.`,
    );
    if (!confirmed) return;

    try {
      setError(null);
      await deleteTenant(tenant.id);
      setTenants((prev) => prev.filter((t) => t.id !== tenant.id));
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to delete tenant";
      setError(message);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getTenantsForCurrentUser();
        setTenants(data);
      } catch (e) {
        const message = e instanceof Error ? e.message : "Failed to load tenants";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);
  const handleOpenTenant = (tenantId: string) => {
    router.push(`/tenants/${tenantId}`);
  };

  const handleCreateTenant = async () => {
    const trimmed = newTenantName.trim();
    if (!trimmed) return;

    try {
      setCreating(true);
      const tenant = await createTenantForCurrentUser(trimmed, newTenantType);
      setTenants((prev) => [...prev, tenant]);
      setCreateOpen(false);
      setNewTenantName("");
      setNewTenantType("company");
      router.push(`/tenants/${tenant.id}`);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to create tenant";
      setError(message);
    } finally {
      setCreating(false);
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

            <Button
              onClick={() => setCreateOpen(true)}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>New tenant</span>
            </Button>
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
                <Button
                  onClick={() => setCreateOpen(true)}
                  className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create tenant</span>
                </Button>
              </div>
            )}

            {!loading && !error && tenants.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {tenants.map((tenant) => (
                  <div
                    key={tenant.id}
                    className="group rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/60 hover:bg-white dark:hover:bg-gray-900 transition-colors shadow-sm hover:shadow-md transform hover:-translate-y-0.5 duration-150 p-4 flex flex-col justify-between min-h-[150px]"
                  >
                    <button
                      type="button"
                      onClick={() => handleOpenTenant(tenant.id)}
                      className="text-left flex-1"
                    >
                      <div>
                        <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-0.5 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                          {tenant.name}
                        </h2>
                        <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2">
                          {tenant.tenant_type === "company" && "Perusahaan atau organisasi bisnis."}
                          {tenant.tenant_type === "school" && "Sekolah, kampus, atau lembaga pendidikan."}
                          {tenant.tenant_type === "organization" && "Organisasi, komunitas, atau asosiasi."}
                          {tenant.tenant_type === "personal" && "Tenant pribadi untuk individu atau freelancer."}
                          {!tenant.tenant_type && "Tenant untuk mengelola data, templates, dan certificates."}
                        </p>
                      </div>
                      <div className="flex items-center justify-between mt-4 text-xs text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-2">
                          {tenant.tenant_type && (
                            <span className="uppercase tracking-wide text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                              {tenant.tenant_type}
                            </span>
                          )}
                          <span className="uppercase tracking-wide text-[10px] px-2 py-0.5 rounded-full bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                            {tenant.status || "active"}
                          </span>
                        </div>
                        <span>
                          {new Date(tenant.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </button>
                    <div className="flex items-center justify-end gap-2 mt-3">
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
                        className="bg-red-500 hover:bg-red-600 text-white border-none shadow-sm"
                        onClick={() => handleDeleteTenant(tenant)}
                      >
                        Delete
                      </Button>
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
      </section>
    </ModernLayout>
  );
}
