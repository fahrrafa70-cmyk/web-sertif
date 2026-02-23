import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { createMember } from "@/lib/supabase/members";

export function useMembersExcel(
  selectedTenantId: string,
  language: string,
  loadMembers: () => Promise<void>
) {
  const [showExcelInfoModal, setShowExcelInfoModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const excelInputRef = useRef<HTMLInputElement>(null);

  const handleExcelImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!selectedTenantId) {
      toast.error(language === "id" ? "Pilih tenant terlebih dahulu sebelum impor Excel" : "Please select a tenant before importing Excel");
      return;
    }
    try {
      setImporting(true);
      toast.info("Reading Excel file...");
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const data = event.target?.result;
          const workbook = XLSX.read(data, { type: "binary" });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(worksheet) as Array<Record<string, unknown>>;
          if (rows.length === 0) { toast.error("Excel file is empty"); return; }
          let ok = 0, fail = 0;
          for (const row of rows) {
            try {
              const memberData = {
                name: String(row.Name || row.name || "").trim(),
                tenant_id: selectedTenantId,
                email: String(row.Email || row.email || "").trim() || undefined,
                organization: String(row.Organization || row.organization || "").trim() || undefined,
                phone: String(row.Phone || row.phone || "").trim() || undefined,
                job: String(row.Job || row.job || "").trim() || undefined,
                date_of_birth: String(row["Date of Birth"] || row.date_of_birth || "").trim() || undefined,
                address: String(row.Address || row.address || "").trim() || undefined,
                city: String(row.City || row.city || "").trim() || undefined,
                notes: String(row.Notes || row.notes || "").trim() || undefined,
              };
              if (!memberData.name) { fail++; continue; }
              await createMember(memberData);
              ok++;
            } catch { fail++; }
          }
          await loadMembers();
          if (ok > 0) toast.success(`Imported ${ok} data${fail > 0 ? `, ${fail} failed` : ""}`);
          else toast.error(`Failed to import. ${fail} error(s)`);
        } catch { toast.error("Failed to process Excel file"); }
        finally { setImporting(false); }
      };
      reader.onerror = () => { toast.error("Failed to read Excel file"); setImporting(false); };
      reader.readAsBinaryString(file);
    } catch { toast.error("Failed to import Excel file"); setImporting(false); }
    if (excelInputRef.current) excelInputRef.current.value = "";
  }, [selectedTenantId, language, loadMembers]);

  return {
    showExcelInfoModal, setShowExcelInfoModal, importing, excelInputRef, handleExcelImport
  };
}
