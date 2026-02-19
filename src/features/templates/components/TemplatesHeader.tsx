"use client";
import { Button } from "@/components/ui/button";
import { Layout, Plus } from "lucide-react";
import type { Tenant } from "@/features/tenants/types";

interface TemplatesHeaderProps {
  tenants: Tenant[];
  selectedTenantId: string;
  loadingTenants: boolean;
  role: string | null;
  handleTenantChange: (id: string) => void;
  openCreate: () => void;
  t: (key: string) => string;
}

export function TemplatesHeader({
  tenants, selectedTenantId, loadingTenants, role, handleTenantChange, openCreate, t,
}: TemplatesHeaderProps) {
  return (
    <div className="mb-3 space-y-2">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-2 w-full">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-lg shadow-md flex-shrink-0 bg-blue-500">
            <Layout className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <h1 className="text-xl sm:text-3xl md:text-4xl font-bold text-[#2563eb] dark:text-blue-400">{t("templates.title")}</h1>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
          {tenants.length > 0 && (
            <div className="w-full sm:w-56">
              <select
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-xs sm:text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                value={selectedTenantId} onChange={(e) => handleTenantChange(e.target.value)}
                disabled={loadingTenants || tenants.length === 0}
              >
                {loadingTenants && <option value="">Memuat tenant...</option>}
                {!loadingTenants && tenants.length > 0 && !selectedTenantId && <option value="">Pilih tenant...</option>}
                {!loadingTenants && tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
              </select>
            </div>
          )}
          {(role === "owner" || role === "manager") && (
            <Button onClick={openCreate} className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" /><span>{t("templates.create")}</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
