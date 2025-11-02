"use client";

import ModernLayout from "@/components/modern-layout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { Member, createMember, getMembers, updateMember, deleteMember as deleteMemberService } from "@/lib/supabase/members";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/language-context";
import * as XLSX from "xlsx";
import { FileSpreadsheet, Info, ChevronLeft, ChevronRight, Search, X } from "lucide-react";

export default function MembersPage() {
  const { t } = useLanguage();
  const [role, setRole] = useState<"Admin" | "Team" | "Public">("Public");
  const [membersData, setMembersData] = useState<Member[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [adding, setAdding] = useState<boolean>(false);
  const [showForm, setShowForm] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [initialized, setInitialized] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(8);
  const [searchQuery, setSearchQuery] = useState<string>("");
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
      const data = await getMembers();
      setMembersData(data);
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : t('members.loadMembersFailed'));
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

          console.log("📊 Excel data parsed:", jsonData);

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
            toast.success(`Successfully imported ${successCount} member(s)${errorCount > 0 ? `, ${errorCount} failed` : ""}`);
          } else {
            toast.error(`Failed to import members. ${errorCount} error(s)`);
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
        // Load role
        const raw = window.localStorage.getItem("ecert-role") || "";
        console.log("🔍 Checking role from localStorage:", raw);
        const normalized = raw.toLowerCase();
        const mapped = normalized === "admin" ? "Admin" : normalized === "team" ? "Team" : normalized === "public" ? "Public" : "Public";
        setRole(mapped);
        console.log("✅ Role set to:", mapped);
        
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
    if (!editForm.name.trim()) {
      toast.error(t('members.nameRequired'));
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
    if (!form.name.trim()) {
      toast.error(t('members.nameRequired'));
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
      setShowForm(false);
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
    
    const confirmed = confirm(`Are you sure you want to delete member "${member.name}"? This action cannot be undone.`);
    if (!confirmed) return;
    
    try {
      setDeleting(id);
      // Call the actual delete function from members service
      await deleteMemberService(id);
      
      // Remove from local state after successful deletion
      setMembersData(prev => prev.filter(m => m.id !== id));
      toast.success(t('members.deleteSuccess'));
    } catch (error) {
      console.error("Failed to delete member:", error);
      toast.error(error instanceof Error ? error.message : t('members.deleteFailed'));
    } finally {
      setDeleting(null);
    }
  }

  // Filter members based on search query
  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) {
      return membersData;
    }
    
    const query = searchQuery.toLowerCase();
    return membersData.filter(member => 
      member.name.toLowerCase().includes(query) ||
      (member.email && member.email.toLowerCase().includes(query)) ||
      (member.organization && member.organization.toLowerCase().includes(query)) ||
      (member.phone && member.phone.toLowerCase().includes(query)) ||
      (member.job && member.job.toLowerCase().includes(query)) ||
      (member.city && member.city.toLowerCase().includes(query))
    );
  }, [membersData, searchQuery]);

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
            <div className="w-16 h-16 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
              <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {t('common.loading')}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              {t('members.loadingPage')}
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
        <section className="min-h-screen py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                <div>
                  <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">{t('members.title')}</h1>
                  <p className="text-gray-600 dark:text-gray-400 mt-1 text-base">{t('members.subtitle')}</p>
                </div>
              {(role === "Admin" || role === "Team") && (
                <div className="flex gap-2">
                  <Button 
                    onClick={() => setShowExcelInfoModal(true)} 
                    disabled={importing}
                    className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
                  >
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    {importing ? t('members.excel.importing') : t('members.excel.importExcel')}
                  </Button>
                  <input
                    ref={excelInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleExcelImport}
                    className="hidden"
                  />
                  <Button onClick={() => setShowForm((s) => !s)} className="gradient-primary text-white">
                    {showForm ? t('common.close') : t('members.addMember')}
                  </Button>
                </div>
              )}
              </div>
              
              {/* Search Bar */}
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search members by name, email, organization..."
                  className="pl-10 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
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

            {showForm && (role === "Admin" || role === "Team") && (
              <motion.form onSubmit={onSubmit} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm">
                <div className="space-y-2">
                  <label className="text-sm text-gray-700 dark:text-gray-300 font-medium">{t('members.form.fullName')}</label>
                  <Input value={form.name} placeholder={t('members.form.fullNamePlaceholder')} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-gray-700 dark:text-gray-300 font-medium">{t('members.form.email')}</label>
                  <Input type="email" value={form.email} placeholder="name@example.com" onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-gray-700 dark:text-gray-300 font-medium">{t('members.form.organization')}</label>
                  <Input value={form.organization} placeholder={t('members.form.optional')} onChange={(e) => setForm({ ...form, organization: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-gray-700 dark:text-gray-300 font-medium">{t('members.form.phone')}</label>
                  <Input value={form.phone} placeholder={t('members.form.optional')} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
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
                <div className="space-y-2 md:col-span-2 lg:col-span-3">
                  <label className="text-sm text-gray-700 dark:text-gray-300 font-medium">{t('members.form.notes')}</label>
                  <Input value={form.notes} placeholder={t('members.form.optional')} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
                <div className="flex items-end lg:col-span-3">
                  <Button type="submit" disabled={adding} className="gradient-primary text-white">
                    {adding ? t('members.adding') : t('common.save')}
                  </Button>
                </div>
              </motion.form>
            )}

            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              whileInView={{ opacity: 1, y: 0 }} 
              viewport={{ once: true }} 
              transition={{ duration: 0.4 }} 
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden"
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
                        <TableCell className="font-medium text-gray-900 dark:text-gray-100 px-2 py-1.5">{m.name}</TableCell>
                        <TableCell className="text-gray-700 dark:text-gray-300 px-2 py-1.5">{m.organization || "—"}</TableCell>
                        <TableCell className="text-gray-700 dark:text-gray-300 px-2 py-1.5">
                          <div className="flex flex-col">
                            <span className="text-gray-900 dark:text-gray-100">{m.email || "—"}</span>
                            {m.phone && (
                              <span className="text-xs text-gray-500 mt-0.5">{m.phone}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-700 dark:text-gray-300 px-2 py-1.5">{m.job || "—"}</TableCell>
                        <TableCell className="text-gray-700 dark:text-gray-300 px-2 py-1.5">{m.city || "—"}</TableCell>
                        <TableCell className="text-right px-2 py-1.5" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-1.5">
                            {(role === "Admin" || role === "Team") && (
                              <Button variant="outline" size="sm" className="border-gray-300" onClick={() => openEdit(m)}>{t('common.edit')}</Button>
                            )}
                            {canDelete && (
                              <Button 
                                size="sm"
                                className="bg-gradient-to-r from-red-500 to-red-600 text-white" 
                                onClick={() => deleteMember(m.id)}
                                disabled={deleting === m.id}
                              >
                                {deleting === m.id ? t('members.deleting') : t('common.delete')}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {loading && (
                      <TableRow>
                        <TableCell colSpan={7} className="py-20">
                          <div className="flex flex-col items-center justify-center">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-full flex items-center justify-center mb-4 shadow-sm">
                              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                            <span className="text-gray-600 dark:text-gray-400 text-sm font-medium">{t('members.loadingMembers')}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                    {!loading && filteredMembers.length === 0 && (
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
                                    onClick={() => setShowForm(true)}
                                    className="text-blue-600 hover:text-blue-700 font-medium"
                                  >
                                    {t('members.addMember')}
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
            
            {/* Pagination Controls */}
            {!loading && filteredMembers.length > 0 && (
              <div className="flex justify-between items-center mt-4 px-2">
                <div className="text-sm text-gray-500">
                  Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredMembers.length)} of {filteredMembers.length} members
                  {searchQuery && <span className="ml-1 text-gray-400">(filtered from {membersData.length})</span>}
                </div>
                <div className="flex items-center gap-2">
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

            {editOpen && (
              <div className="fixed inset-0 bg-black/40 dark:bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setEditOpen(false)}>
                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 mx-4" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('members.editMember')}</h3>
                    <Button variant="outline" onClick={() => setEditOpen(false)} size="icon" aria-label="Close">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <form onSubmit={submitEdit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm text-gray-700 dark:text-gray-300 font-medium">{t('members.form.fullName')}</label>
                      <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-gray-700 dark:text-gray-300 font-medium">{t('members.form.email')}</label>
                      <Input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-gray-700 dark:text-gray-300 font-medium">{t('members.form.organization')}</label>
                      <Input value={editForm.organization} onChange={(e) => setEditForm({ ...editForm, organization: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-gray-700 dark:text-gray-300 font-medium">{t('members.form.phone')}</label>
                      <Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
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
                    <div className="space-y-2 md:col-span-2 lg:col-span-3">
                      <label className="text-sm text-gray-700 dark:text-gray-300 font-medium">{t('members.form.notes')}</label>
                      <Input value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} />
                    </div>
                    <div className="flex items-end">
                      <Button type="submit" disabled={editSaving} className="gradient-primary text-white">
                        {editSaving ? t('members.saving') : t('members.saveChanges')}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Member Detail Modal */}
            {detailModalOpen && detailMember && (
              <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {t('members.detail.title')}
                    </DialogTitle>
                    <DialogDescription className="text-gray-600 dark:text-gray-400">
                      {t('members.detail.description')} {detailMember.name}
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="mt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                      {/* Name */}
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Full Name</label>
                        <div className="mt-1 text-base text-gray-900 dark:text-gray-100">{detailMember.name}</div>
                      </div>

                      {/* Email */}
                      {detailMember.email && (
                        <div>
                          <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</label>
                          <div className="mt-1 text-base text-gray-900 dark:text-gray-100">{detailMember.email}</div>
                        </div>
                      )}

                      {/* Phone */}
                      {detailMember.phone && (
                        <div>
                          <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Phone</label>
                          <div className="mt-1 text-base text-gray-900 dark:text-gray-100">{detailMember.phone}</div>
                        </div>
                      )}

                      {/* Organization */}
                      {detailMember.organization && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Organization / School</label>
                          <div className="mt-1 text-base text-gray-900 dark:text-gray-100">{detailMember.organization}</div>
                        </div>
                      )}

                      {/* Job */}
                      {detailMember.job && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Job / Position</label>
                          <div className="mt-1 text-base text-gray-900 dark:text-gray-100">{detailMember.job}</div>
                        </div>
                      )}

                      {/* Date of Birth */}
                      {detailMember.date_of_birth && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Date of Birth</label>
                          <div className="mt-1 text-base text-gray-900 dark:text-gray-100">
                            {new Date(detailMember.date_of_birth).toLocaleDateString('id-ID', { 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })}
                          </div>
                        </div>
                      )}

                      {/* City */}
                      {detailMember.city && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">City</label>
                          <div className="mt-1 text-base text-gray-900 dark:text-gray-100">{detailMember.city}</div>
                        </div>
                      )}

                      {/* Address */}
                      {detailMember.address && (
                        <div className="md:col-span-2">
                          <label className="text-sm font-medium text-gray-500">Address</label>
                          <div className="mt-1 text-base text-gray-900 dark:text-gray-100">{detailMember.address}</div>
                        </div>
                      )}

                      {/* Notes */}
                      {detailMember.notes && (
                        <div className="md:col-span-2">
                          <label className="text-sm font-medium text-gray-500">Notes</label>
                          <div className="mt-1 text-base text-gray-900 whitespace-pre-wrap">{detailMember.notes}</div>
                        </div>
                      )}
                    </div>

                    {/* Metadata */}
                    <div className="mt-8 pt-6 border-t border-gray-200">
                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-500">
                        {detailMember.created_at && (
                          <div>
                            <span className="font-medium">Created:</span>{' '}
                            {new Date(detailMember.created_at).toLocaleDateString('id-ID', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        )}
                        {detailMember.updated_at && (
                          <div>
                            <span className="font-medium">Updated:</span>{' '}
                            {new Date(detailMember.updated_at).toLocaleDateString('id-ID', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {(role === "Admin" || role === "Team") && (
                    <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
                      <Button
                        className="gradient-primary text-white"
                        onClick={() => {
                          setDetailModalOpen(false);
                          openEdit(detailMember);
                        }}
                      >
                        Edit
                      </Button>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            )}
          </div>
        </section>

      {/* Excel Import Info Modal */}
      <Dialog open={showExcelInfoModal} onOpenChange={setShowExcelInfoModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
              <Info className="w-5 h-5 text-blue-500" />
              {t('members.excel.title')}
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              {t('members.excel.description')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Column Requirements */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50">
              <h3 className="font-semibold text-sm mb-3 text-gray-900 dark:text-gray-100">{t('members.excel.requiredColumns')}</h3>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-red-500 font-bold">*</span>
                  <div>
                    <span className="font-medium text-gray-900 dark:text-gray-100">Name</span>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{t('members.excel.nameRequired')}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50">
              <h3 className="font-semibold text-sm mb-3 text-gray-900 dark:text-gray-100">{t('members.excel.optionalColumns')}</h3>
              <div className="grid grid-cols-2 gap-3 text-sm text-gray-700 dark:text-gray-300">
                <div>• <span className="font-medium">Email</span></div>
                <div>• <span className="font-medium">Organization</span></div>
                <div>• <span className="font-medium">Phone</span></div>
                <div>• <span className="font-medium">Job</span></div>
                <div>• <span className="font-medium">Date of Birth</span></div>
                <div>• <span className="font-medium">Address</span></div>
                <div>• <span className="font-medium">City</span></div>
                <div>• <span className="font-medium">Notes</span></div>
              </div>
            </div>

            {/* Example Table */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-900">
              <h3 className="font-semibold text-sm mb-3 text-gray-900 dark:text-gray-100">{t('members.excel.exampleFormat')}</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-100 dark:bg-gray-800">
                      <th className="border border-gray-300 dark:border-gray-600 p-2 text-left text-gray-900 dark:text-gray-100">Name*</th>
                      <th className="border border-gray-300 dark:border-gray-600 p-2 text-left text-gray-900 dark:text-gray-100">Email</th>
                      <th className="border border-gray-300 dark:border-gray-600 p-2 text-left text-gray-900 dark:text-gray-100">Organization</th>
                      <th className="border border-gray-300 dark:border-gray-600 p-2 text-left text-gray-900 dark:text-gray-100">Phone</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-gray-300 dark:border-gray-600 p-2 text-gray-900 dark:text-gray-100">John Doe</td>
                      <td className="border border-gray-300 dark:border-gray-600 p-2 text-gray-900 dark:text-gray-100">john@example.com</td>
                      <td className="border border-gray-300 dark:border-gray-600 p-2 text-gray-900 dark:text-gray-100">ABC Corp</td>
                      <td className="border border-gray-300 dark:border-gray-600 p-2 text-gray-900 dark:text-gray-100">08123456789</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 dark:border-gray-600 p-2 text-gray-900 dark:text-gray-100">Jane Smith</td>
                      <td className="border border-gray-300 dark:border-gray-600 p-2 text-gray-900 dark:text-gray-100">jane@example.com</td>
                      <td className="border border-gray-300 dark:border-gray-600 p-2 text-gray-900 dark:text-gray-100">XYZ Inc</td>
                      <td className="border border-gray-300 dark:border-gray-600 p-2 text-gray-900 dark:text-gray-100">08198765432</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Notes */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <p className="text-xs text-blue-800 dark:text-blue-300">
                <strong>{t('members.excel.note')}</strong> {t('members.excel.noteText')}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 justify-end pt-2">
              <Button
                variant="outline"
                onClick={() => setShowExcelInfoModal(false)}
              >
                {t('members.excel.cancel')}
              </Button>
              <Button
                onClick={() => {
                  setShowExcelInfoModal(false);
                  excelInputRef.current?.click();
                }}
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                {t('members.excel.chooseFile')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </ModernLayout>
  );
}


