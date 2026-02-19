"use client";
import type { RefObject } from "react";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, Users } from "lucide-react";
import type { Tenant } from "@/features/tenants/types";

interface MembersHeaderProps {
  tenants: Tenant[];
  selectedTenantId: string;
  loadingTenants: boolean;
  role: string | null;
  importing: boolean;
  language: string;
  excelInputRef: RefObject<HTMLInputElement | null>;
  handleTenantChange: (id: string) => void;
  setShowExcelInfoModal: (v: boolean) => void;
  setAddModalOpen: (v: boolean) => void;
  setFormErrors: (e: Record<string, string>) => void;
  handleExcelImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  t: (key: string) => string;
}

export function MembersHeader({
  tenants, selectedTenantId, loadingTenants, role, importing, language,
  excelInputRef, handleTenantChange, setShowExcelInfoModal, setAddModalOpen,
  setFormErrors, handleExcelImport, t,
}: MembersHeaderProps) {

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-2 mb-6">
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full shadow-md flex-shrink-0 gradient-primary">
          <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>
        <h1 className="text-xl sm:text-3xl md:text-4xl font-bold text-[#2563eb] dark:text-blue-400">{t("members.title")}</h1>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
        {tenants.length > 0 && (
          <div className="w-full sm:w-56">
            <select
              className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-xs sm:text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
              value={selectedTenantId}
              onChange={(e) => handleTenantChange(e.target.value)}
              disabled={loadingTenants || tenants.length === 0}
            >
              {loadingTenants && <option value="">Memuat tenant...</option>}
              {!loadingTenants && tenants.length > 0 && !selectedTenantId && <option value="">Pilih tenant...</option>}
              {!loadingTenants && tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>{tenant.name}</option>
              ))}
            </select>
          </div>
        )}

        {(role === "owner" || role === "manager" || role === "staff") && (
          <div className="grid grid-cols-2 gap-2 w-full sm:flex sm:w-auto">
            <Button
              onClick={() => setShowExcelInfoModal(true)}
              disabled={importing}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              <FileSpreadsheet className="w-4 h-4 flex-shrink-0" />
              <span className="whitespace-nowrap">
                {importing ? (language === "id" ? "Mengimpor..." : "Importing...") : (language === "id" ? "Impor Excel" : "Import Excel")}
              </span>
            </Button>
            <input ref={excelInputRef} type="file" accept=".xlsx,.xls" onChange={handleExcelImport} className="hidden" />
            <Button
              onClick={() => { setAddModalOpen(true); setFormErrors({}); }}
              className="gradient-primary text-white shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              <span className="whitespace-nowrap">{language === "id" ? "Tambah Data" : "Add Data"}</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
