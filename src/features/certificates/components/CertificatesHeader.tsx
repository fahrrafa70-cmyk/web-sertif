"use client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FileText, Filter, Search, X } from "lucide-react";

interface Tenant {
  id: string;
  name: string;
}

interface CertificatesHeaderProps {
  tenants: Tenant[];
  selectedTenantId: string;
  setSelectedTenantId: (id: string) => void;
  loadingTenants: boolean;
  tenantRole: string | null;
  searchInput: string;
  setSearchInput: (v: string) => void;
  categoryFilter: string;
  dateFilter: string;
  openFilterModal: () => void;
  handleOpenWizardGenerate: () => void;
  t: (key: string) => string;
}

export function CertificatesHeader({
  tenants, selectedTenantId, setSelectedTenantId, loadingTenants, tenantRole,
  searchInput, setSearchInput, categoryFilter, dateFilter,
  openFilterModal, handleOpenWizardGenerate, t,
}: CertificatesHeaderProps) {
  return (
    <div className="mb-3">
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-2">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full shadow-md flex-shrink-0 gradient-primary">
              <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-3xl md:text-4xl font-bold text-[#2563eb] dark:text-blue-400">
                {t("certificates.title")}
              </h1>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
            {tenants.length > 1 && (
              <div className="w-full sm:w-56">
                <select
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-xs sm:text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 dark:focus-visible:ring-blue-400"
                  value={selectedTenantId}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSelectedTenantId(value);
                    try { window.localStorage.setItem("ecert-selected-tenant-id", value); } catch { /* ignore */ }
                  }}
                  disabled={loadingTenants || tenants.length === 0}
                >
                  {loadingTenants && <option value="">Memuat tenant...</option>}
                  {!loadingTenants && tenants.length > 0 && !selectedTenantId && (
                    <option value="">Pilih tenant...</option>
                  )}
                  {!loadingTenants && tenants.map((tenant) => (
                    <option key={tenant.id} value={tenant.id}>{tenant.name}</option>
                  ))}
                </select>
              </div>
            )}

            <Button
              onClick={handleOpenWizardGenerate}
              className="gradient-primary text-white shadow-lg hover:shadow-xl flex items-center justify-center gap-2 w-full sm:w-auto disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={!tenantRole}
            >
              <span>{t("certificates.generate")}</span>
            </Button>
          </div>
        </div>

        {/* Search and Filter Row */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
            <Input
              placeholder={t("certificates.search")}
              className="h-10 pl-10 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 text-sm sm:text-base flex items-center"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            {searchInput && (
              <button
                onClick={() => setSearchInput("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex items-center justify-center"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Button
            onClick={openFilterModal}
            variant="outline"
            size="icon"
            className={`flex-shrink-0 h-10 w-10 ${
              categoryFilter || dateFilter
                ? "bg-green-500 hover:bg-green-600 text-white border-green-500"
                : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
            }`}
          >
            <Filter className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
