"use client";

import ModernLayout from "@/components/modern-layout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { Member, createMember, getMembers, updateMember, deleteMember as deleteMemberService } from "@/lib/supabase/members";
import { toast, Toaster } from "sonner";
import { useLanguage } from "@/contexts/language-context";
import { formatReadableDate } from "@/lib/utils/certificate-formatters";
import { useDebounce } from "@/hooks/use-debounce";
import * as XLSX from "xlsx";
import { FileSpreadsheet, Info, ChevronLeft, ChevronRight, Search, X, Users } from "lucide-react";
import { LoadingButton } from "@/components/ui/loading-button";
import { confirmToast } from "@/lib/ui/confirm";

export default function MembersPage() {
  const { t, language } = useLanguage();
  const [role, setRole] = useState<"Admin" | "Team" | "Public">("Public");
  const [membersData, setMembersData] = useState<Member[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState<boolean>(false);
  const [addModalOpen, setAddModalOpen] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [initialized, setInitialized] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(10);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [form, setForm] = useState({
    name: "",
    email: "",
    organization: "",
    phone: "",
    job: "",
    date_of_birth: "",
    address: "",
    city: "",
    notes: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Detail modal state
  const [detailModalOpen, setDetailModalOpen] = useState<boolean>(false);
  const [detailMember, setDetailMember] = useState<Member | null>(null);

  // Edit modal state
  const [editOpen, setEditOpen] = useState<boolean>(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [editSaving, setEditSaving] = useState<boolean>(false);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    organization: "",
    phone: "",
    job: "",
    date_of_birth: "",
    address: "",
    city: "",
    notes: "",
  });
  const [editFormErrors, setEditFormErrors] = useState<Record<string, string>>({});

  // Excel import state
  const [importing, setImporting] = useState<boolean>(false);
  const [showExcelInfoModal, setShowExcelInfoModal] = useState<boolean>(false);
  const excelInputRef = useRef<HTMLInputElement>(null);

  function openDetailModal(member: Member) {
    setDetailMember(member);
    setDetailModalOpen(true);
  }

  const loadMembers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getMembers();
      setMembersData(data);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : t('members.loadMembersFailed');
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [t]);

  // Handle Excel import
  const handleExcelImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setImporting(true);
      toast.info("Reading Excel file...");

      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const data = event.target?.result;
          const workbook = XLSX.read(data, { type: "binary" });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet) as Array<Record<string, unknown>>;

          // Excel data parsed successfully

          if (jsonData.length === 0) {
            toast.error("Excel file is empty");
            return;
          }

          let successCount = 0;
          let errorCount = 0;

          for (const row of jsonData) {
            try {
              // Map Excel columns to member fields
              const memberData = {
                name: String(row.Name || row.name || "").trim(),
                email: String(row.Email || row.email || "").trim() || undefined,
                organization: String(row.Organization || row.organization || "").trim() || undefined,
                phone: String(row.Phone || row.phone || "").trim() || undefined,
                job: String(row.Job || row.job || "").trim() || undefined,
                date_of_birth: String(row["Date of Birth"] || row.date_of_birth || "").trim() || undefined,
                address: String(row.Address || row.address || "").trim() || undefined,
                city: String(row.City || row.city || "").trim() || undefined,
                notes: String(row.Notes || row.notes || "").trim() || undefined,
              };

              if (!memberData.name) {
                console.warn("Skipping row without name:", row);
                errorCount++;
                continue;
              }

              await createMember(memberData);
              successCount++;
            } catch (error) {
              console.error("Error creating member:", error);
              errorCount++;
            }
          }

          await loadMembers();
          
          if (successCount > 0) {
            toast.success(`Successfully imported ${successCount} data${errorCount > 0 ? `, ${errorCount} failed` : ""}`);
          } else {
            toast.error(`Failed to import data. ${errorCount} error(s)`);
          }
        } catch (error) {
          console.error("Error processing Excel:", error);
          toast.error("Failed to process Excel file");
        } finally {
          setImporting(false);
        }
      };

      reader.onerror = () => {
        toast.error("Failed to read Excel file");
        setImporting(false);
      };

      reader.readAsBinaryString(file);
    } catch (error) {
      console.error("Error importing Excel:", error);
      toast.error("Failed to import Excel file");
      setImporting(false);
    }

    // Reset input
    if (excelInputRef.current) {
      excelInputRef.current.value = "";
    }
  }, [loadMembers]);

  // Load role from localStorage and initialize
  useEffect(() => {
    const initializeComponent = async () => {
      try {
        // Load role from localStorage
        const raw = window.localStorage.getItem("ecert-role") || "";
        const normalized = raw.toLowerCase();
        const mapped = normalized === "admin" ? "Admin" : normalized === "team" ? "Team" : normalized === "public" ? "Public" : "Public";
        setRole(mapped);
        
        // Load members if authorized
        if (mapped === "Admin" || mapped === "Team") {
          await loadMembers();
        } else {
          setLoading(false);
        }
        
        setInitialized(true);
      } catch (error) {
        console.error("❌ Error initializing component:", error);
        setRole("Public");
        setLoading(false);
        setInitialized(true);
      }
    };
    
    initializeComponent();
  }, [loadMembers]);

  // Handle keyboard events for edit modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editOpen) {
        if (e.key === "Escape") {
          setEditOpen(false);
        }
      }
    };

    if (editOpen) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [editOpen]);

  // Handle keyboard events for detail modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (detailModalOpen && e.key === "Escape") {
        setDetailModalOpen(false);
      }
    };

    if (detailModalOpen) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [detailModalOpen]);

  // Handle keyboard events for add modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (addModalOpen && e.key === "Escape") {
        setAddModalOpen(false);
      }
    };

    if (addModalOpen) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [addModalOpen]);

  function openEdit(member: Member) {
    setEditingMember(member);
    setEditForm({
      name: member.name || "",
      email: member.email || "",
      organization: member.organization || "",
      phone: member.phone || "",
      job: member.job || "",
      date_of_birth: member.date_of_birth || "",
      address: member.address || "",
      city: member.city || "",
      notes: member.notes || "",
    });
    setEditOpen(true);
  }

  async function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingMember) return;
    
    // Clear previous errors
    setEditFormErrors({});
    
    // Validate
    const errors: Record<string, string> = {};
    
    // Name is required
    if (!editForm.name.trim()) {
      errors.name = language === 'id' ? 'Nama harus diisi' : 'Name is required';
    } else if (editForm.name.trim().length < 3) {
      errors.name = language === 'id' ? 'Nama minimal 3 karakter' : 'Name must be at least 3 characters';
    }
    
    // Email validation
    if (editForm.email && editForm.email.trim()) {
      if (!editForm.email.includes('@')) {
        errors.email = language === 'id' ? 'Email harus mengandung @' : 'Email must contain @';
      } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(editForm.email.trim())) {
          errors.email = language === 'id' ? 'Format email tidak valid (contoh: nama@domain.com)' : 'Invalid email format (example: name@domain.com)';
        }
      }
    }
    
    // Phone validation if provided
    if (editForm.phone && editForm.phone.trim()) {
      const phoneRegex = /^[0-9+\-\s()]+$/;
      if (!phoneRegex.test(editForm.phone.trim())) {
        errors.phone = language === 'id' ? 'Nomor telepon hanya boleh berisi angka, +, -, (, ), dan spasi' : 'Phone number can only contain numbers, +, -, (, ), and spaces';
      } else if (editForm.phone.replace(/[^0-9]/g, '').length < 8) {
        errors.phone = language === 'id' ? 'Nomor telepon minimal 8 digit' : 'Phone number must be at least 8 digits';
      }
    }
    
    // Organization validation if provided
    if (editForm.organization && editForm.organization.trim() && editForm.organization.trim().length < 2) {
      errors.organization = language === 'id' ? 'Organisasi minimal 2 karakter' : 'Organization must be at least 2 characters';
    }
    
    if (Object.keys(errors).length > 0) {
      setEditFormErrors(errors);
      const firstError = Object.values(errors)[0];
      toast.error(firstError);
      return;
    }
    try {
      setEditSaving(true);
      const updated = await updateMember(editingMember.id, {
        name: editForm.name,
        email: editForm.email || undefined,
        organization: editForm.organization || undefined,
        phone: editForm.phone || undefined,
        job: editForm.job || undefined,
        date_of_birth: editForm.date_of_birth || undefined,
        address: editForm.address || undefined,
        city: editForm.city || undefined,
        notes: editForm.notes || undefined,
      });
      // Update local list
      setMembersData((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      toast.success(t('members.updateSuccess'));
      setEditOpen(false);
      setEditingMember(null);
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : t('members.updateFailed'));
    } finally {
      setEditSaving(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    // Clear previous errors
    setFormErrors({});
    
    // Validate all required fields
    const errors: Record<string, string> = {};
    
    // Name is required
    if (!form.name.trim()) {
      errors.name = language === 'id' ? 'Nama harus diisi' : 'Name is required';
    } else if (form.name.trim().length < 3) {
      errors.name = language === 'id' ? 'Nama minimal 3 karakter' : 'Name must be at least 3 characters';
    }
    
    // Email validation
    if (form.email && form.email.trim()) {
      if (!form.email.includes('@')) {
        errors.email = language === 'id' ? 'Email harus mengandung @' : 'Email must contain @';
      } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(form.email.trim())) {
          errors.email = language === 'id' ? 'Format email tidak valid (contoh: nama@domain.com)' : 'Invalid email format (example: name@domain.com)';
        }
      }
    }
    
    // Phone validation if provided
    if (form.phone && form.phone.trim()) {
      const phoneRegex = /^[0-9+\-\s()]+$/;
      if (!phoneRegex.test(form.phone.trim())) {
        errors.phone = language === 'id' ? 'Nomor telepon hanya boleh berisi angka, +, -, (, ), dan spasi' : 'Phone number can only contain numbers, +, -, (, ), and spaces';
      } else if (form.phone.replace(/[^0-9]/g, '').length < 8) {
        errors.phone = language === 'id' ? 'Nomor telepon minimal 8 digit' : 'Phone number must be at least 8 digits';
      }
    }
    
    // Organization validation if provided
    if (form.organization && form.organization.trim() && form.organization.trim().length < 2) {
      errors.organization = language === 'id' ? 'Organisasi minimal 2 karakter' : 'Organization must be at least 2 characters';
    }
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      const firstError = Object.values(errors)[0];
      toast.error(firstError);
      return;
    }
    try {
      setAdding(true);
      const added = await createMember({
        name: form.name,
        email: form.email || undefined,
        organization: form.organization || undefined,
        phone: form.phone || undefined,
        job: form.job || undefined,
        date_of_birth: form.date_of_birth || undefined,
        address: form.address || undefined,
        city: form.city || undefined,
        notes: form.notes || undefined,
      });
      toast.success(t('members.addSuccess'));
      setAddModalOpen(false);
      setForm({ name: "", email: "", organization: "", phone: "", job: "", date_of_birth: "", address: "", city: "", notes: "" });
      // optimistic update
      setMembersData((prev) => [added, ...prev]);
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : t('members.addFailed'));
    } finally {
      setAdding(false);
    }
  }

  // Delete member function (only for Admin)
  async function deleteMember(id: string) {
    if (role !== "Admin") {
      toast.error(t('members.deleteNoPermission'));
      return;
    }
    
    const member = membersData.find(m => m.id === id);
    if (!member) return;
    
    const deleteMessage = language === 'id' 
      ? `Apakah Anda yakin ingin menghapus data "${member.name}"? Tindakan ini tidak dapat dibatalkan.`
      : `Are you sure you want to delete data "${member.name}"? This action cannot be undone.`;
    
    const confirmed = await confirmToast(
      deleteMessage,
      { confirmText: t("common.delete"), tone: "destructive" }
    );
    
    if (!confirmed) return;
    
    try {
      setDeleting(id);
      // Call the actual delete function from members service
      await deleteMemberService(id);
      
      // Remove from local state after successful deletion
      setMembersData(prev => prev.filter(m => m.id !== id));
      toast.success(t('members.deleteSuccess'));
    } catch (error) {
      console.error("Failed to delete data:", error);
      toast.error(error instanceof Error ? error.message : t('members.deleteFailed'));
    } finally {
      setDeleting(null);
    }
  }

  // Filter members based on search query
  // Use debounced search query for filtering
  const filteredMembers = useMemo(() => {
    if (!debouncedSearchQuery.trim()) {
      return membersData;
    }
    
    const query = debouncedSearchQuery.toLowerCase();
    return membersData.filter(member => 
      member.name.toLowerCase().includes(query) ||
      (member.email && member.email.toLowerCase().includes(query)) ||
      (member.organization && member.organization.toLowerCase().includes(query)) ||
      (member.phone && member.phone.toLowerCase().includes(query)) ||
      (member.job && member.job.toLowerCase().includes(query)) ||
      (member.city && member.city.toLowerCase().includes(query))
    );
  }, [membersData, debouncedSearchQuery]);

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentMembers = useMemo(() => 
    filteredMembers.slice(indexOfFirstItem, indexOfLastItem), 
    [filteredMembers, indexOfFirstItem, indexOfLastItem]
  );
  const totalPages = useMemo(() => 
    Math.ceil(filteredMembers.length / itemsPerPage), 
    [filteredMembers, itemsPerPage]
  );

  // Reset to first page when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);
  
  const canDelete = role === "Admin";

  // Show loading while initializing
  if (!initialized) {
    return (
      <ModernLayout>
        <div className="min-h-[calc(100vh-80px)] flex items-center justify-center px-4">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {t('members.loading')}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              {t('members.loadingMessage')}
            </p>
          </div>
        </div>
      </ModernLayout>
    );
  }

  // Redirect if not authorized
  if (role === "Public") {
    return (
      <ModernLayout>
        <div className="min-h-[calc(100vh-80px)] flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-3xl">🔒</span>
            </div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {t('members.accessDenied.title')}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              {t('members.accessDenied.message')}
            </p>
          </div>
        </div>
      </ModernLayout>
    );
  }

  return (
    <ModernLayout>
        <section className="relative -mt-4 pb-6 sm:-mt-5 sm:pb-8 bg-gray-50 dark:bg-gray-900">
          <div className="w-full max-w-[1280px] mx-auto px-2 sm:px-3 lg:px-0 relative">
            {/* Header */}
            <div className="mb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-2 w-full">
                {/* Title */}
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-lg shadow-md flex-shrink-0 bg-blue-500">
                    <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <h1 className="text-xl sm:text-3xl md:text-4xl font-bold text-[#2563eb] dark:text-blue-400">{t('members.title')}</h1>
                </div>
                
                {/* Action Buttons */}
                {(role === "Admin" || role === "Team") && (
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button 
                      onClick={() => setShowExcelInfoModal(true)} 
                      disabled={importing}
                      className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white flex-1 sm:flex-none"
                    >
                      <FileSpreadsheet className="w-4 h-4 mr-2" />
                      {importing ? (language === 'id' ? 'Mengimpor...' : 'Importing...') : (language === 'id' ? 'Impor Excel' : 'Import Excel')}
                    </Button>
                    <input
                      ref={excelInputRef}
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleExcelImport}
                      className="hidden"
                    />
                    <Button onClick={() => {
                      setAddModalOpen(true);
                      setFormErrors({});
                    }} className="gradient-primary text-white flex-1 sm:flex-none">
                      {language === 'id' ? 'Tambah Data' : 'Add Data'}
                    </Button>
                  </div>
                )}
              </div>
              
              {/* Search Bar */}
              <div className="relative max-w-md mt-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search data by name, email, organization..."
                  className="pl-10 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 text-sm placeholder:text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>


            {/* Loading State */}
            {loading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="min-h-[400px] flex items-center justify-center"
              >
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    {t("members.loading")}
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    {t("members.loadingMessage")}
                  </p>
                </div>
              </motion.div>
            )}

            {/* Error State */}
            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="min-h-[400px] flex items-center justify-center"
              >
                <div className="text-center max-w-md">
                  <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <span className="text-3xl">⚠️</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    {t("members.errorLoading")}
                  </h3>
                  <p className="text-gray-500 text-sm mb-6">{error}</p>
                  <Button
                    onClick={() => loadMembers()}
                    className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white"
                  >
                    {t("members.tryAgain")}
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Desktop Table View */}
            {!loading && !error && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              whileInView={{ opacity: 1, y: 0 }} 
              viewport={{ once: true }} 
              transition={{ duration: 0.4 }} 
              className="hidden xl:block bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-md dark:shadow-lg overflow-hidden"
            >
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50/50 dark:bg-gray-800/50">
                      <TableHead className="w-10 text-center px-2">#</TableHead>
                      <TableHead className="min-w-[120px] px-2">{t('members.table.name')}</TableHead>
                      <TableHead className="min-w-[130px] px-2">{t('members.table.organization')}</TableHead>
                      <TableHead className="min-w-[150px] px-2">{t('members.table.contact')}</TableHead>
                      <TableHead className="min-w-[80px] px-2">{t('members.table.job')}</TableHead>
                      <TableHead className="min-w-[100px] px-2">{t('members.table.city')}</TableHead>
                      <TableHead className="text-right min-w-[140px] px-2">{t('members.table.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentMembers.map((m, index) => (
                      <TableRow 
                        key={m.id} 
                        onClick={() => openDetailModal(m)}
                        className="cursor-pointer hover:bg-blue-50/50 transition-colors border-b border-gray-100 last:border-0"
                      >
                        <TableCell className="text-gray-500 text-center px-2 py-1.5">{indexOfFirstItem + index + 1}</TableCell>
                        <TableCell className="font-medium text-gray-900 dark:text-gray-100 px-2 py-1.5 break-words min-w-[120px]">{m.name}</TableCell>
                        <TableCell className="text-gray-700 dark:text-gray-300 px-2 py-1.5 break-words min-w-[130px]">{m.organization || "—"}</TableCell>
                        <TableCell className="text-gray-700 dark:text-gray-300 px-2 py-1.5 min-w-[150px]">
                          <div className="flex flex-col">
                            <span className="text-gray-900 dark:text-gray-100 break-words">{m.email || "—"}</span>
                            {m.phone && (
                              <span className="text-xs text-gray-500 mt-0.5 break-words">{m.phone}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-700 dark:text-gray-300 px-2 py-1.5 break-words min-w-[80px]">{m.job || "—"}</TableCell>
                        <TableCell className="text-gray-700 dark:text-gray-300 px-2 py-1.5 break-words min-w-[100px]">{m.city || "—"}</TableCell>
                        <TableCell className="text-right px-2 py-1.5" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-1.5">
                            {(role === "Admin" || role === "Team") && (
                              <Button variant="outline" size="sm" className="border-gray-300" onClick={() => openEdit(m)}>{t('common.edit')}</Button>
                            )}
                            {canDelete && (
                              <LoadingButton 
                                size="sm"
                                className="bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700" 
                                onClick={() => deleteMember(m.id)}
                                isLoading={deleting === m.id}
                                loadingText={language === 'id' ? 'Menghapus...' : 'Deleting...'}
                                variant="destructive"
                              >
                                {t('common.delete')}
                              </LoadingButton>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredMembers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-gray-500 dark:text-gray-400 py-16">
                          <div className="text-center">
                            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                              <span className="text-2xl text-gray-400 dark:text-gray-500">👥</span>
                            </div>
                            {searchQuery ? (
                              <>
                                <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-300 mb-2">{t('members.search.noResults')}</h3>
                                <p className="text-gray-500 dark:text-gray-400 mb-4">{t('members.search.noMatch')} &quot;{searchQuery}&quot;</p>
                                <button
                                  onClick={() => setSearchQuery("")}
                                  className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-500 font-medium"
                                >
                                  {t('members.search.clearSearch')}
                                </button>
                              </>
                            ) : (
                              <>
                                <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-300 mb-2">{t('members.noMembersTitle')}</h3>
                                <p className="text-gray-500 dark:text-gray-400 mb-4">{t('members.noMembersMessage')}</p>
                                {(role === "Admin" || role === "Team") && (
                                  <button
                                    onClick={() => {
                                      setAddModalOpen(true);
                                      setFormErrors({});
                                    }}
                                    className="text-blue-600 hover:text-blue-700 font-medium"
                                  >
                                    {language === 'id' ? 'Tambah Data' : 'Add Data'}
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </motion.div>
            )}

            {/* Mobile & Tablet Card View */}
            {!loading && !error && (
              <div className="xl:hidden grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                {currentMembers.map((m, index) => (
                  <div
                    key={m.id}
                    onClick={() => openDetailModal(m)}
                    className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 shadow-md dark:shadow-lg cursor-pointer hover:bg-blue-50/50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    {/* Member Details - Compact Vertical Layout */}
                    <div className="space-y-2 mb-3">
                      {/* Name */}
                      <div>
                        <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-0.5">
                          {t('members.table.name')}
                        </div>
                        <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                          {m.name}
                        </div>
                      </div>

                      {/* Organization & Job */}
                      <div className="grid grid-cols-2 gap-x-3">
                        <div>
                          <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-0.5">
                            {t('members.table.organization')}
                          </div>
                          <div className="text-gray-700 dark:text-gray-300 text-xs">
                            {m.organization || "—"}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-0.5">
                            {t('members.table.job')}
                          </div>
                          <div className="text-gray-700 dark:text-gray-300 text-xs">
                            {m.job || "—"}
                          </div>
                        </div>
                      </div>

                      {/* Email & Phone */}
                      <div className="grid grid-cols-2 gap-x-3">
                        <div>
                          <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-0.5">
                            Email
                          </div>
                          <div className="text-gray-700 dark:text-gray-300 text-xs break-words">
                            {m.email || "—"}
                          </div>
                        </div>
                        {m.phone && (
                          <div>
                            <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-0.5">
                              Phone
                            </div>
                            <div className="text-gray-700 dark:text-gray-300 text-xs">
                              {m.phone}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* City */}
                      {m.city && (
                        <div>
                          <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-0.5">
                            {t('members.table.city')}
                          </div>
                          <div className="text-gray-700 dark:text-gray-300 text-xs">
                            {m.city}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-3 border-t border-gray-200 dark:border-gray-700" onClick={(e) => e.stopPropagation()}>
                      {(role === "Admin" || role === "Team") && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1 border-gray-300" 
                          onClick={() => openEdit(m)}
                        >
                          {t('common.edit')}
                        </Button>
                      )}
                      {canDelete && (
                        <LoadingButton 
                          size="sm"
                          className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700" 
                          onClick={() => deleteMember(m.id)}
                          isLoading={deleting === m.id}
                          loadingText={language === 'id' ? 'Menghapus...' : 'Deleting...'}
                          variant="destructive"
                        >
                          {t('common.delete')}
                        </LoadingButton>
                      )}
                    </div>
                  </div>
                ))}

                {/* Empty State for Card View */}
                {filteredMembers.length === 0 && (
                  <div className="col-span-full bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl text-gray-400 dark:text-gray-500">👥</span>
                    </div>
                    {searchQuery ? (
                      <>
                        <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-300 mb-2">{t('members.search.noResults')}</h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-4">{t('members.search.noMatch')} &quot;{searchQuery}&quot;</p>
                        <button
                          onClick={() => setSearchQuery("")}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-500 font-medium"
                        >
                          {t('members.search.clearSearch')}
                        </button>
                      </>
                    ) : (
                      <>
                        <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-300 mb-2">{t('members.noMembersTitle')}</h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-4">{t('members.noMembersMessage')}</p>
                        {(role === "Admin" || role === "Team") && (
                          <button
                            onClick={() => {
                              setAddModalOpen(true);
                              setFormErrors({});
                            }}
                            className="text-blue-600 hover:text-blue-700 font-medium"
                          >
                            {language === 'id' ? 'Tambah Data' : 'Add Data'}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
            
            {/* Pagination Controls */}
            {!loading && !error && filteredMembers.length > 0 && (
              <div className="flex flex-row justify-between items-center gap-2 mt-4 px-2">
                <div className="text-sm text-gray-500 flex-shrink-0">
                  Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredMembers.length)} of {filteredMembers.length} data
                  {searchQuery && <span className="ml-1 text-gray-400 hidden sm:inline">(filtered from {membersData.length})</span>}
                </div>
                {/* Mobile: Compact pagination with chevron only */}
                <div className="flex items-center gap-2 sm:hidden flex-shrink-0">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="h-7 px-3"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-3 w-3" />
                  </Button>
                  <div className="text-sm text-gray-600 px-2 whitespace-nowrap">
                    Page {currentPage} of {totalPages}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="h-7 px-3"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
                {/* Desktop: Full pagination with Previous/Next text */}
                <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <div className="text-sm text-gray-600 px-3">
                    Page {currentPage} of {totalPages}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* Add Data Modal */}
            {addModalOpen && (
              <div className="fixed inset-0 bg-black/40 dark:bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in-0 duration-200" onClick={() => setAddModalOpen(false)}>
                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 mx-4 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{language === 'id' ? 'Tambah Data' : 'Add Data'}</h3>
                    <Button variant="outline" onClick={() => setAddModalOpen(false)} size="icon" aria-label="Close">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm text-gray-700 dark:text-gray-300 font-medium">{t('members.form.fullName')} <span className="text-red-500">*</span></label>
                      <Input 
                        value={form.name} 
                        placeholder={t('members.form.fullNamePlaceholder')} 
                        onChange={(e) => {
                          setForm({ ...form, name: e.target.value });
                          if (formErrors.name) setFormErrors({ ...formErrors, name: '' });
                        }}
                        className={formErrors.name ? 'border-red-500 focus:border-red-500' : ''}
                      />
                      {formErrors.name && <p className="text-xs text-red-500 mt-1">{formErrors.name}</p>}
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-gray-700 dark:text-gray-300 font-medium">{t('members.form.email')}</label>
                      <Input 
                        type="email" 
                        value={form.email} 
                        placeholder="name@example.com" 
                        onChange={(e) => {
                          setForm({ ...form, email: e.target.value });
                          if (formErrors.email) setFormErrors({ ...formErrors, email: '' });
                        }}
                        className={formErrors.email ? 'border-red-500 focus:border-red-500' : ''}
                      />
                      {formErrors.email && <p className="text-xs text-red-500 mt-1">{formErrors.email}</p>}
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-gray-700 dark:text-gray-300 font-medium">{t('members.form.organization')}</label>
                      <Input 
                        value={form.organization} 
                        placeholder={t('members.form.optional')} 
                        onChange={(e) => {
                          setForm({ ...form, organization: e.target.value });
                          if (formErrors.organization) setFormErrors({ ...formErrors, organization: '' });
                        }}
                        className={formErrors.organization ? 'border-red-500 focus:border-red-500' : ''}
                      />
                      {formErrors.organization && <p className="text-xs text-red-500 mt-1">{formErrors.organization}</p>}
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-gray-700 dark:text-gray-300 font-medium">{t('members.form.phone')}</label>
                      <Input 
                        value={form.phone} 
                        placeholder={t('members.form.optional')} 
                        onChange={(e) => {
                          setForm({ ...form, phone: e.target.value });
                          if (formErrors.phone) setFormErrors({ ...formErrors, phone: '' });
                        }}
                        className={formErrors.phone ? 'border-red-500 focus:border-red-500' : ''}
                      />
                      {formErrors.phone && <p className="text-xs text-red-500 mt-1">{formErrors.phone}</p>}
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-gray-700 dark:text-gray-300 font-medium">{t('members.form.job')}</label>
                      <Input value={form.job} placeholder={t('members.form.optional')} onChange={(e) => setForm({ ...form, job: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-gray-700 dark:text-gray-300 font-medium">{t('members.form.dob')}</label>
                      <Input type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm text-gray-700 dark:text-gray-300 font-medium">{t('members.form.address')}</label>
                      <Input value={form.address} placeholder={t('members.form.optional')} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-gray-700 dark:text-gray-300 font-medium">{t('members.form.city')}</label>
                      <Input value={form.city} placeholder={t('members.form.optional')} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                    </div>
                    <div className="flex items-end lg:col-span-3">
                      <LoadingButton 
                        type="submit" 
                        isLoading={adding}
                        loadingText={language === 'id' ? 'Menyimpan...' : 'Saving...'}
                        variant="primary"
                        className="gradient-primary text-white"
                      >
                        {t('common.save')}
                      </LoadingButton>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Edit Data Modal */}
            {editOpen && (
              <div className="fixed inset-0 bg-black/40 dark:bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in-0 duration-200" onClick={() => setEditOpen(false)}>
                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 mx-4 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{language === 'id' ? 'Edit Data' : 'Edit Data'}</h3>
                    <Button variant="outline" onClick={() => setEditOpen(false)} size="icon" aria-label="Close">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <form onSubmit={submitEdit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm text-gray-700 dark:text-gray-300 font-medium">{t('members.form.fullName')} <span className="text-red-500">*</span></label>
                      <Input 
                        value={editForm.name} 
                        onChange={(e) => {
                          setEditForm({ ...editForm, name: e.target.value });
                          if (editFormErrors.name) setEditFormErrors({ ...editFormErrors, name: '' });
                        }}
                        className={editFormErrors.name ? 'border-red-500 focus:border-red-500' : ''}
                      />
                      {editFormErrors.name && <p className="text-xs text-red-500 mt-1">{editFormErrors.name}</p>}
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-gray-700 dark:text-gray-300 font-medium">{t('members.form.email')}</label>
                      <Input 
                        type="email" 
                        value={editForm.email} 
                        onChange={(e) => {
                          setEditForm({ ...editForm, email: e.target.value });
                          if (editFormErrors.email) setEditFormErrors({ ...editFormErrors, email: '' });
                        }}
                        className={editFormErrors.email ? 'border-red-500 focus:border-red-500' : ''}
                      />
                      {editFormErrors.email && <p className="text-xs text-red-500 mt-1">{editFormErrors.email}</p>}
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-gray-700 dark:text-gray-300 font-medium">{t('members.form.organization')}</label>
                      <Input 
                        value={editForm.organization} 
                        onChange={(e) => {
                          setEditForm({ ...editForm, organization: e.target.value });
                          if (editFormErrors.organization) setEditFormErrors({ ...editFormErrors, organization: '' });
                        }}
                        className={editFormErrors.organization ? 'border-red-500 focus:border-red-500' : ''}
                      />
                      {editFormErrors.organization && <p className="text-xs text-red-500 mt-1">{editFormErrors.organization}</p>}
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-gray-700 dark:text-gray-300 font-medium">{t('members.form.phone')}</label>
                      <Input 
                        value={editForm.phone} 
                        onChange={(e) => {
                          setEditForm({ ...editForm, phone: e.target.value });
                          if (editFormErrors.phone) setEditFormErrors({ ...editFormErrors, phone: '' });
                        }}
                        className={editFormErrors.phone ? 'border-red-500 focus:border-red-500' : ''}
                      />
                      {editFormErrors.phone && <p className="text-xs text-red-500 mt-1">{editFormErrors.phone}</p>}
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-gray-700 dark:text-gray-300 font-medium">{t('members.form.job')}</label>
                      <Input value={editForm.job} onChange={(e) => setEditForm({ ...editForm, job: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-gray-700 dark:text-gray-300 font-medium">{t('members.form.dob')}</label>
                      <Input type="date" value={editForm.date_of_birth} onChange={(e) => setEditForm({ ...editForm, date_of_birth: e.target.value })} />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm text-gray-700 dark:text-gray-300 font-medium">{t('members.form.address')}</label>
                      <Input value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-gray-700 dark:text-gray-300 font-medium">{t('members.form.city')}</label>
                      <Input value={editForm.city} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} />
                    </div>
                    <div className="flex items-end">
                      <LoadingButton 
                        type="submit" 
                        isLoading={editSaving}
                        loadingText={language === 'id' ? 'Menyimpan...' : 'Saving...'}
                        variant="primary"
                        className="gradient-primary text-white"
                      >
                        {language === 'id' ? 'Simpan Perubahan' : 'Save Changes'}
                      </LoadingButton>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Member Detail Modal */}
            {detailModalOpen && detailMember && (
              <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
                <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col p-0 sm:p-6">
                  {/* Header - Fixed */}
                  <DialogHeader className="px-4 sm:px-0 pt-4 sm:pt-0 pb-4 flex-shrink-0 border-b border-gray-200 dark:border-gray-700">
                    <DialogTitle className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {t('members.detail.title')}
                    </DialogTitle>
                  </DialogHeader>
                  
                  {/* Content - Scrollable */}
                  <div className="flex-1 overflow-y-auto px-4 sm:px-0 py-4 sm:py-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                      {/* Name */}
                      <div className="space-y-1">
                        <label className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">Full Name</label>
                        <div className="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100">{detailMember.name}</div>
                      </div>

                      {/* Email */}
                      {detailMember.email && (
                        <div className="space-y-1">
                          <label className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">Email</label>
                          <div className="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100 break-words">{detailMember.email}</div>
                        </div>
                      )}

                      {/* Phone */}
                      {detailMember.phone && (
                        <div className="space-y-1">
                          <label className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">Phone</label>
                          <div className="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100">{detailMember.phone}</div>
                        </div>
                      )}

                      {/* Organization */}
                      {detailMember.organization && (
                        <div className="space-y-1">
                          <label className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">Organization / School</label>
                          <div className="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100">{detailMember.organization}</div>
                        </div>
                      )}

                      {/* Job */}
                      {detailMember.job && (
                        <div className="space-y-1">
                          <label className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">Job / Position</label>
                          <div className="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100">{detailMember.job}</div>
                        </div>
                      )}

                      {/* Date of Birth */}
                      {detailMember.date_of_birth && (
                        <div className="space-y-1">
                          <label className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">Date of Birth</label>
                          <div className="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100">
                            {formatReadableDate(detailMember.date_of_birth, language)}
                          </div>
                        </div>
                      )}

                      {/* City */}
                      {detailMember.city && (
                        <div className="space-y-1">
                          <label className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">City</label>
                          <div className="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100">{detailMember.city}</div>
                        </div>
                      )}

                      {/* Address */}
                      {detailMember.address && (
                        <div className="space-y-1 sm:col-span-2">
                          <label className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">Address</label>
                          <div className="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100 break-words">{detailMember.address}</div>
                        </div>
                      )}

                      {/* Notes */}
                      {detailMember.notes && (
                        <div className="space-y-1 sm:col-span-2">
                          <label className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">Notes</label>
                          <div className="text-sm sm:text-base text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words">{detailMember.notes}</div>
                        </div>
                      )}
                    </div>

                    {/* Metadata */}
                    {(detailMember.created_at || detailMember.updated_at) && (
                      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <div className="grid grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                          <div>
                            {detailMember.created_at && (
                              <>
                                <span className="font-medium">Created:</span>{' '}
                                <span className="text-gray-600 dark:text-gray-300">
                                  {formatReadableDate(detailMember.created_at, language)}
                                </span>
                              </>
                            )}
                          </div>
                          <div>
                            {detailMember.updated_at && (
                              <>
                                <span className="font-medium">Updated:</span>{' '}
                                <span className="text-gray-600 dark:text-gray-300">
                                  {formatReadableDate(detailMember.updated_at, language)}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Action Buttons - Fixed at bottom */}
                  {(role === "Admin" || role === "Team") && (
                    <div className="flex-shrink-0 px-4 sm:px-0 pt-4 pb-4 sm:pb-0 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex justify-end gap-3">
                        <Button
                          className="gradient-primary text-white text-sm sm:text-base px-4 sm:px-6"
                          onClick={() => {
                            setDetailModalOpen(false);
                            openEdit(detailMember);
                          }}
                        >
                          Edit
                        </Button>
                      </div>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            )}
          </div>
        </section>

      {/* Excel Import Info Modal */}
      <Dialog open={showExcelInfoModal} onOpenChange={setShowExcelInfoModal}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg md:max-w-xl max-h-[90vh] overflow-y-auto overflow-x-hidden p-4 sm:p-6">
          <DialogHeader className="pb-3 sm:pb-4">
            <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl text-gray-900 dark:text-gray-100">
              <Info className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 flex-shrink-0" />
              {t('members.excel.title')}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-3 sm:space-y-4">
            {/* Columns To Fill */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 sm:p-4 bg-gray-50 dark:bg-gray-800/50">
              <h3 className="font-semibold text-xs sm:text-sm mb-2 sm:mb-3 text-gray-900 dark:text-gray-100">{t('members.excel.optionalColumns')}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                <div className="flex items-start gap-1.5">
                  <span className="text-red-500 font-bold">*</span>
                  <span className="font-medium">Name</span>
                </div>
                <div>• <span className="font-medium">Email</span></div>
                <div>• <span className="font-medium">Organization</span></div>
                <div>• <span className="font-medium">Phone</span></div>
                <div>• <span className="font-medium">Job</span></div>
                <div>• <span className="font-medium">Date of Birth</span></div>
                <div>• <span className="font-medium">Address</span></div>
                <div>• <span className="font-medium">City</span></div>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 sm:mt-3">
                <span className="text-red-500">*</span> Required field
              </p>
            </div>

            {/* Example Table */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 sm:p-4 bg-white dark:bg-gray-900">
              <h3 className="font-semibold text-xs sm:text-sm mb-2 sm:mb-3 text-gray-900 dark:text-gray-100">{t('members.excel.exampleFormat')}</h3>
              <div className="w-full overflow-x-auto">
                <table className="w-full min-w-0 text-[10px] sm:text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-100 dark:bg-gray-800">
                      <th className="border border-gray-300 dark:border-gray-600 p-1.5 sm:p-2 text-left text-gray-900 dark:text-gray-100">Name*</th>
                      <th className="border border-gray-300 dark:border-gray-600 p-1.5 sm:p-2 text-left text-gray-900 dark:text-gray-100">Email</th>
                      <th className="border border-gray-300 dark:border-gray-600 p-1.5 sm:p-2 text-left text-gray-900 dark:text-gray-100 hidden sm:table-cell">Organization</th>
                      <th className="border border-gray-300 dark:border-gray-600 p-1.5 sm:p-2 text-left text-gray-900 dark:text-gray-100">Phone</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-gray-300 dark:border-gray-600 p-1.5 sm:p-2 text-gray-900 dark:text-gray-100">John Doe</td>
                      <td className="border border-gray-300 dark:border-gray-600 p-1.5 sm:p-2 text-gray-900 dark:text-gray-100 break-words">john@example.com</td>
                      <td className="border border-gray-300 dark:border-gray-600 p-1.5 sm:p-2 text-gray-900 dark:text-gray-100 hidden sm:table-cell">ABC Corp</td>
                      <td className="border border-gray-300 dark:border-gray-600 p-1.5 sm:p-2 text-gray-900 dark:text-gray-100">08123456789</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 dark:border-gray-600 p-1.5 sm:p-2 text-gray-900 dark:text-gray-100">Jane Smith</td>
                      <td className="border border-gray-300 dark:border-gray-600 p-1.5 sm:p-2 text-gray-900 dark:text-gray-100 break-words">jane@example.com</td>
                      <td className="border border-gray-300 dark:border-gray-600 p-1.5 sm:p-2 text-gray-900 dark:text-gray-100 hidden sm:table-cell">XYZ Inc</td>
                      <td className="border border-gray-300 dark:border-gray-600 p-1.5 sm:p-2 text-gray-900 dark:text-gray-100">08198765432</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 sm:justify-end pt-2 sm:pt-3 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="outline"
                onClick={() => setShowExcelInfoModal(false)}
                className="w-full sm:w-auto text-sm"
              >
                {t('members.excel.cancel')}
              </Button>
              <Button
                onClick={() => {
                  setShowExcelInfoModal(false);
                  excelInputRef.current?.click();
                }}
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white w-full sm:w-auto text-sm"
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                {t('members.excel.chooseFile')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Toast Notifications */}
      <Toaster position="top-right" richColors />
    </ModernLayout>
  );
}


