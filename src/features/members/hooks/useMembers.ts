"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { Member, createMember, getMembers, updateMember, deleteMember as deleteMemberService } from "@/lib/supabase/members";
import { getTenantsForCurrentUser, type Tenant } from "@/lib/supabase/tenants";
import { useAuth } from "@/contexts/auth-context";
import { useLanguage } from "@/contexts/language-context";
import { useDebounce } from "@/hooks/use-debounce";
import { confirmToast } from "@/lib/ui/confirm";

const ITEMS_PER_PAGE = 10;

const EMPTY_FORM = {
  name: "", email: "", organization: "", phone: "",
  job: "", date_of_birth: "", address: "", city: "", notes: "",
};

type MemberRole = "owner" | "manager" | "staff" | "user" | "public";

function validateMemberForm(form: typeof EMPTY_FORM, language: string): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!form.name.trim()) {
    errors.name = language === "id" ? "Nama harus diisi" : "Name is required";
  } else if (form.name.trim().length < 3) {
    errors.name = language === "id" ? "Nama minimal 3 karakter" : "Name must be at least 3 characters";
  }
  if (form.email?.trim()) {
    if (!form.email.includes("@")) {
      errors.email = language === "id" ? "Email harus mengandung @" : "Email must contain @";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errors.email = language === "id" ? "Format email tidak valid" : "Invalid email format";
    }
  }
  if (form.phone?.trim()) {
    if (!/^[0-9+\-\s()]+$/.test(form.phone.trim())) {
      errors.phone = language === "id" ? "Nomor telepon tidak valid" : "Invalid phone number";
    } else if (form.phone.replace(/[^0-9]/g, "").length < 8) {
      errors.phone = language === "id" ? "Nomor telepon minimal 8 digit" : "Phone must be at least 8 digits";
    }
  }
  if (form.organization?.trim() && form.organization.trim().length < 2) {
    errors.organization = language === "id" ? "Organisasi minimal 2 karakter" : "Organization must be at least 2 characters";
  }
  return errors;
}

export function useMembers() {
  const { role: authRole, hasSubscription } = useAuth();
  const { t, language } = useLanguage();

  // ── role ──────────────────────────────────────────────────────────────────
  const [role, setRole] = useState<MemberRole>("public");
  const [initialized, setInitialized] = useState(false);

  // ── tenants ───────────────────────────────────────────────────────────────
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState("");
  const [loadingTenants, setLoadingTenants] = useState(true);

  // ── members ───────────────────────────────────────────────────────────────
  const [membersData, setMembersData] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── search & filter ───────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [organizationFilter, setOrganizationFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [jobFilter, setJobFilter] = useState("");
  const [tempOrganizationFilter, setTempOrganizationFilter] = useState("");
  const [tempCityFilter, setTempCityFilter] = useState("");
  const [tempJobFilter, setTempJobFilter] = useState("");
  const [filterModalOpen, setFilterModalOpen] = useState(false);

  // ── pagination ────────────────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);

  // ── add form ──────────────────────────────────────────────────────────────
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [adding, setAdding] = useState(false);

  // ── edit form ─────────────────────────────────────────────────────────────
  const [editOpen, setEditOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [editForm, setEditForm] = useState({ ...EMPTY_FORM });
  const [editFormErrors, setEditFormErrors] = useState<Record<string, string>>({});
  const [editSaving, setEditSaving] = useState(false);

  // ── detail modal ──────────────────────────────────────────────────────────
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailMember, setDetailMember] = useState<Member | null>(null);

  // ── excel import ──────────────────────────────────────────────────────────
  const [showExcelInfoModal, setShowExcelInfoModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const excelInputRef = useRef<HTMLInputElement>(null);

  // ── deleting ──────────────────────────────────────────────────────────────
  const [deleting, setDeleting] = useState<string | null>(null);

  // ── loadMembers ───────────────────────────────────────────────────────────
  const loadMembers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getMembers();
      setMembersData(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : t("members.loadMembersFailed");
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [t]);

  // ── load tenants ──────────────────────────────────────────────────────────
  useEffect(() => {
    const run = async () => {
      try {
        setLoadingTenants(true);
        const data = await getTenantsForCurrentUser();
        setTenants(data);
        let initialId = "";
        try {
          const stored = window.localStorage.getItem("ecert-selected-tenant-id") || "";
          if (stored && data.some((t) => t.id === stored)) initialId = stored;
        } catch { /* ignore */ }
        if (!initialId && data.length === 1) initialId = data[0].id;
        setSelectedTenantId(initialId);
      } finally {
        setLoadingTenants(false);
      }
    };
    void run();
  }, []);

  // ── initialize role and load members ─────────────────────────────────────
  useEffect(() => {
    const run = async () => {
      try {
        const normalized = (authRole || "user").toLowerCase();
        const mapped: MemberRole =
          normalized === "owner" || normalized === "manager" || normalized === "staff"
            ? (normalized as "owner" | "manager" | "staff")
            : normalized === "user" ? "user" : "public";
        setRole(mapped);
        const hasAccess =
          mapped === "owner" || mapped === "manager" || mapped === "staff" ||
          (mapped === "user" && hasSubscription);
        if (hasAccess) await loadMembers();
        else setLoading(false);
      } catch {
        setRole("public");
        setLoading(false);
      } finally {
        setInitialized(true);
      }
    };
    void run();
  }, [authRole, hasSubscription, loadMembers]);

  // ── set document title ────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof document !== "undefined") document.title = "Data | Certify - Certificate Platform";
  }, []);

  // ── reset page on search ──────────────────────────────────────────────────
  useEffect(() => { setCurrentPage(1); }, [searchQuery]);

  // ── derived values ────────────────────────────────────────────────────────
  const uniqueOrganizations = useMemo(() => {
    const s = new Set<string>();
    membersData.forEach((m) => { if (m.organization) s.add(m.organization); });
    return [...s].sort();
  }, [membersData]);

  const uniqueCities = useMemo(() => {
    const s = new Set<string>();
    membersData.forEach((m) => { if (m.city) s.add(m.city); });
    return [...s].sort();
  }, [membersData]);

  const uniqueJobs = useMemo(() => {
    const s = new Set<string>();
    membersData.forEach((m) => { if (m.job) s.add(m.job); });
    return [...s].sort();
  }, [membersData]);

  const filteredMembers = useMemo(() => {
    if (!selectedTenantId) return [];
    let result = membersData.filter((m) => m.tenant_id === selectedTenantId);
    if (organizationFilter) result = result.filter((m) => m.organization === organizationFilter);
    if (cityFilter) result = result.filter((m) => m.city === cityFilter);
    if (jobFilter) result = result.filter((m) => m.job === jobFilter);
    if (!debouncedSearchQuery.trim()) return result;
    const q = debouncedSearchQuery.toLowerCase();
    return result.filter((m) =>
      m.name.toLowerCase().includes(q) ||
      (m.email?.toLowerCase().includes(q)) ||
      (m.organization?.toLowerCase().includes(q)) ||
      (m.phone?.toLowerCase().includes(q)) ||
      (m.job?.toLowerCase().includes(q)) ||
      (m.city?.toLowerCase().includes(q))
    );
  }, [membersData, debouncedSearchQuery, organizationFilter, cityFilter, jobFilter, selectedTenantId]);

  const indexOfLastItem = currentPage * ITEMS_PER_PAGE;
  const indexOfFirstItem = indexOfLastItem - ITEMS_PER_PAGE;
  const currentMembers = useMemo(
    () => filteredMembers.slice(indexOfFirstItem, indexOfLastItem),
    [filteredMembers, indexOfFirstItem, indexOfLastItem]
  );
  const totalPages = Math.ceil(filteredMembers.length / ITEMS_PER_PAGE);

  // ── tenant selector ───────────────────────────────────────────────────────
  const handleTenantChange = useCallback((id: string) => {
    setSelectedTenantId(id);
    try { window.localStorage.setItem("ecert-selected-tenant-id", id); } catch { /* ignore */ }
  }, []);

  // ── filter handlers ───────────────────────────────────────────────────────
  const openFilterModal = useCallback(() => {
    setTempOrganizationFilter(organizationFilter);
    setTempCityFilter(cityFilter);
    setTempJobFilter(jobFilter);
    setFilterModalOpen(true);
  }, [organizationFilter, cityFilter, jobFilter]);

  const applyFilters = useCallback(() => {
    setOrganizationFilter(tempOrganizationFilter);
    setCityFilter(tempCityFilter);
    setJobFilter(tempJobFilter);
    setFilterModalOpen(false);
    setCurrentPage(1);
  }, [tempOrganizationFilter, tempCityFilter, tempJobFilter]);

  const cancelFilters = useCallback(() => {
    setTempOrganizationFilter(organizationFilter);
    setTempCityFilter(cityFilter);
    setTempJobFilter(jobFilter);
    setFilterModalOpen(false);
  }, [organizationFilter, cityFilter, jobFilter]);

  // ── delete ────────────────────────────────────────────────────────────────
  const deleteMember = useCallback(async (id: string) => {
    if (role !== "owner" && role !== "manager") {
      toast.error(t("members.deleteNoPermission")); return;
    }
    const member = membersData.find((m) => m.id === id);
    if (!member) return;
    const msg = language === "id"
      ? `Apakah Anda yakin ingin menghapus data "${member.name}"?`
      : `Are you sure you want to delete data "${member.name}"? This action cannot be undone.`;
    const confirmed = await confirmToast(msg, { confirmText: t("common.delete"), tone: "destructive" });
    if (!confirmed) return;
    try {
      setDeleting(id);
      await deleteMemberService(id);
      setMembersData((prev) => prev.filter((m) => m.id !== id));
      toast.success(t("members.deleteSuccess"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("members.deleteFailed"));
    } finally {
      setDeleting(null);
    }
  }, [role, membersData, t, language]);

  // ── add submit ────────────────────────────────────────────────────────────
  const onSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenantId) {
      toast.error(language === "id" ? "Pilih tenant terlebih dahulu" : "Please select a tenant"); return;
    }
    setFormErrors({});
    const errors = validateMemberForm(form, language);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error(Object.values(errors)[0]);
      return;
    }
    try {
      setAdding(true);
      const added = await createMember({
        name: form.name, tenant_id: selectedTenantId,
        email: form.email || undefined, organization: form.organization || undefined,
        phone: form.phone || undefined, job: form.job || undefined,
        date_of_birth: form.date_of_birth || undefined, address: form.address || undefined,
        city: form.city || undefined, notes: form.notes || undefined,
      });
      toast.success(t("members.addSuccess"));
      setAddModalOpen(false);
      setForm({ ...EMPTY_FORM });
      setMembersData((prev) => [added, ...prev]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("members.addFailed"));
    } finally {
      setAdding(false);
    }
  }, [form, selectedTenantId, language, t]);

  // ── edit ──────────────────────────────────────────────────────────────────
  const openEdit = useCallback((member: Member) => {
    setEditingMember(member);
    setEditForm({
      name: member.name || "", email: member.email || "",
      organization: member.organization || "", phone: member.phone || "",
      job: member.job || "", date_of_birth: member.date_of_birth || "",
      address: member.address || "", city: member.city || "",
      notes: member.notes || "",
    });
    setEditOpen(true);
  }, []);

  const submitEdit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;
    setEditFormErrors({});
    const errors = validateMemberForm(editForm, language);
    if (Object.keys(errors).length > 0) {
      setEditFormErrors(errors);
      toast.error(Object.values(errors)[0]);
      return;
    }
    try {
      setEditSaving(true);
      const updated = await updateMember(editingMember.id, {
        name: editForm.name, email: editForm.email || undefined,
        organization: editForm.organization || undefined, phone: editForm.phone || undefined,
        job: editForm.job || undefined, date_of_birth: editForm.date_of_birth || undefined,
        address: editForm.address || undefined, city: editForm.city || undefined,
        notes: editForm.notes || undefined,
      });
      setMembersData((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      toast.success(t("members.updateSuccess"));
      setEditOpen(false);
      setEditingMember(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("members.updateFailed"));
    } finally {
      setEditSaving(false);
    }
  }, [editingMember, editForm, language, t]);

  // ── excel import ──────────────────────────────────────────────────────────
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

  // ── detail modal ──────────────────────────────────────────────────────────
  const openDetailModal = useCallback((member: Member) => {
    setDetailMember(member);
    setDetailModalOpen(true);
  }, []);

  const canDelete = role === "owner" || role === "manager";

  return {
    // role & init
    role, initialized, canDelete,
    // tenants
    tenants, selectedTenantId, loadingTenants, handleTenantChange,
    // members
    membersData, loading, error, loadMembers, deleting, deleteMember,
    // search & filter
    searchQuery, setSearchQuery,
    organizationFilter, cityFilter, jobFilter,
    tempOrganizationFilter, setTempOrganizationFilter,
    tempCityFilter, setTempCityFilter,
    tempJobFilter, setTempJobFilter,
    filterModalOpen, setFilterModalOpen,
    openFilterModal, applyFilters, cancelFilters,
    uniqueOrganizations, uniqueCities, uniqueJobs,
    // paginated data
    filteredMembers, currentMembers, currentPage, setCurrentPage,
    totalPages, indexOfFirstItem, indexOfLastItem,
    // add form
    addModalOpen, setAddModalOpen, form, setForm, formErrors, setFormErrors, adding, onSubmit,
    // edit form
    editOpen, setEditOpen, editingMember,
    editForm, setEditForm, editFormErrors, setEditFormErrors, editSaving,
    openEdit, submitEdit,
    // detail
    detailModalOpen, setDetailModalOpen, detailMember, openDetailModal,
    // excel
    showExcelInfoModal, setShowExcelInfoModal, importing,
    excelInputRef, handleExcelImport,
    // i18n
    t, language,
  };
}
