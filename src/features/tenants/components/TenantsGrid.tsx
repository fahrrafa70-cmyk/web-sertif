"use client";

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { formatTenantDate } from "@/features/tenants/hooks/useTenants";
import type { Tenant } from "@/lib/supabase/tenants";

interface TenantsGridProps {
  tenants: Tenant[];
  loading: boolean;
  error: string | null;
  currentUserId: string | null;
  isOwner: boolean;
  tenantsWithData: Set<string>;
  setCreateOpen: (open: boolean) => void;
  handleOpenTenant: (id: string) => void;
  handleEditTenant: (tenant: Tenant) => void;
  handleDeleteTenant: (tenant: Tenant) => void;
}

export function TenantsGrid({
  tenants, loading, error, currentUserId, isOwner, tenantsWithData,
  setCreateOpen, handleOpenTenant, handleEditTenant, handleDeleteTenant
}: TenantsGridProps) {
  return (
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
                        ? <img src={tenant.logo_url} alt={tenant.name || "?"} className="h-full w-full object-cover" />
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
  );
}
