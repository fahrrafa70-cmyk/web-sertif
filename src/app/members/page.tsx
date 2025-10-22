"use client";

import Header from "@/components/header";
import Footer from "@/components/footer";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { Member, createMember, getMembers, updateMember, deleteMember as deleteMemberService } from "@/lib/supabase/members";
import { Certificate, getCertificatesByMember } from "@/lib/supabase/certificates";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/language-context";
import * as XLSX from "xlsx";
import { FileSpreadsheet, Info } from "lucide-react";

export default function MembersPage() {
  const { t } = useLanguage();
  const [role, setRole] = useState<"Admin" | "Team" | "Public">("Public");
  const [membersData, setMembersData] = useState<Member[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [adding, setAdding] = useState<boolean>(false);
  const [showForm, setShowForm] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [initialized, setInitialized] = useState<boolean>(false);
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

  // Viewer state for member's certificates
  const [viewerOpen, setViewerOpen] = useState<boolean>(false);
  const [viewerMember, setViewerMember] = useState<Member | null>(null);
  const [viewerCerts, setViewerCerts] = useState<Certificate[]>([]);
  const [viewerLoading, setViewerLoading] = useState<boolean>(false);
  const [imagePreviewOpen, setImagePreviewOpen] = useState<boolean>(false);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>("");

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

  async function openViewer(member: Member) {
    setViewerMember(member);
    setViewerOpen(true);
    try {
      setViewerLoading(true);
      const certs = await getCertificatesByMember(member.id);
      setViewerCerts(certs);
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : t('members.loadCertificatesFailed'));
    } finally {
      setViewerLoading(false);
    }
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

  const members = useMemo(() => membersData, [membersData]);
  const canDelete = role === "Admin";

  // Show loading while initializing
  if (!initialized) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="pt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-4">
                {t('common.loading')}
              </h1>
              <p className="text-gray-500">
                {t('members.loadingPage')}
              </p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Redirect if not authorized
  if (role === "Public") {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="pt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">
                {t('members.accessDenied.title')}
              </h1>
              <p className="text-gray-500">
                {t('members.accessDenied.message')}
              </p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-16">
        <section className="bg-white py-14">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('members.title')}</h1>
                <p className="text-gray-500 mt-1">{t('members.subtitle')}</p>
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
                  <Button onClick={() => setShowForm((s) => !s)} className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
                    {showForm ? t('common.close') : t('members.addMember')}
                  </Button>
                </div>
              )}
            </div>

            {showForm && (role === "Admin" || role === "Team") && (
              <motion.form onSubmit={onSubmit} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 border rounded-xl">
                <div className="space-y-2">
                  <label className="text-sm text-gray-700">{t('members.form.fullName')}</label>
                  <Input value={form.name} placeholder={t('members.form.fullNamePlaceholder')} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-gray-700">{t('members.form.email')}</label>
                  <Input type="email" value={form.email} placeholder="name@example.com" onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-gray-700">{t('members.form.organization')}</label>
                  <Input value={form.organization} placeholder={t('members.form.optional')} onChange={(e) => setForm({ ...form, organization: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-gray-700">{t('members.form.phone')}</label>
                  <Input value={form.phone} placeholder={t('members.form.optional')} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-gray-700">{t('members.form.job')}</label>
                  <Input value={form.job} placeholder={t('members.form.optional')} onChange={(e) => setForm({ ...form, job: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-gray-700">{t('members.form.dob')}</label>
                  <Input type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm text-gray-700">{t('members.form.address')}</label>
                  <Input value={form.address} placeholder={t('members.form.optional')} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-gray-700">{t('members.form.city')}</label>
                  <Input value={form.city} placeholder={t('members.form.optional')} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                </div>
                <div className="space-y-2 md:col-span-2 lg:col-span-3">
                  <label className="text-sm text-gray-700">{t('members.form.notes')}</label>
                  <Input value={form.notes} placeholder={t('members.form.optional')} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
                <div className="flex items-end">
                  <Button type="submit" disabled={adding} className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
                    {adding ? t('members.adding') : t('common.save')}
                  </Button>
                </div>
              </motion.form>
            )}

            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }} className="mt-8 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('members.table.name')}</TableHead>
                    <TableHead>{t('members.table.organization')}</TableHead>
                    <TableHead>{t('members.table.email')}</TableHead>
                    <TableHead>{t('members.table.phone')}</TableHead>
                    <TableHead>{t('members.table.job')}</TableHead>
                    <TableHead>{t('members.table.city')}</TableHead>
                    <TableHead className="text-right">{t('members.table.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.name}</TableCell>
                      <TableCell>{m.organization || "—"}</TableCell>
                      <TableCell>{m.email || "—"}</TableCell>
                      <TableCell>{m.phone || "—"}</TableCell>
                      <TableCell>{m.job || "—"}</TableCell>
                      <TableCell>{m.city || "—"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="secondary" onClick={() => openViewer(m)}>{t('members.viewCertificates')}</Button>
                          {(role === "Admin" || role === "Team") && (
                            <Button variant="outline" className="border-gray-300" onClick={() => openEdit(m)}>{t('common.edit')}</Button>
                          )}
                          {canDelete && (
                            <Button 
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
                      <TableCell colSpan={7} className="text-center text-gray-500 py-12">
                        <div className="flex items-center justify-center space-x-2">
                          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                          <span>{t('members.loadingMembers')}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                  {!loading && members.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-gray-500 py-12">
                        <div className="text-center">
                          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-2xl text-gray-400">👥</span>
                          </div>
                          <h3 className="text-lg font-semibold text-gray-600 mb-2">{t('members.noMembersTitle')}</h3>
                          <p className="text-gray-500 mb-4">{t('members.noMembersMessage')}</p>
                          {(role === "Admin" || role === "Team") && (
                            <button
                              onClick={() => setShowForm(true)}
                              className="text-blue-600 hover:text-blue-700 font-medium"
                            >
                              {t('members.addMember')}
                            </button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </motion.div>

            {viewerOpen && (
              <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center" onClick={() => setViewerOpen(false)}>
                <div className="bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-2xl p-6" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">{t('members.certificates')} — {viewerMember?.name}</h3>
                    <Button variant="outline" onClick={() => setViewerOpen(false)}>{t('common.close')}</Button>
                  </div>
                  {viewerLoading ? (
                    <p className="text-gray-500">{t('common.loading')}</p>
                  ) : viewerCerts.length === 0 ? (
                    <p className="text-gray-500">{t('members.noCertificatesForMember')}</p>
                  ) : (
                    <div className="space-y-2">
                      {viewerCerts.map((c) => (
                        <div key={c.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <div className="font-medium">{c.certificate_no}</div>
                            <div className="text-sm text-gray-500">{c.category || "—"} · Issued {new Date(c.issue_date).toLocaleDateString()}</div>
                          </div>
                          <Button variant="outline" onClick={() => { if (c.certificate_image_url) { setImagePreviewUrl(c.certificate_image_url); setImagePreviewOpen(true); } }}>{t('common.preview')}</Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {editOpen && (
              <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setEditOpen(false)}>
                <div className="bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-3xl p-6" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">{t('members.editMember')}</h3>
                    <Button variant="outline" onClick={() => setEditOpen(false)}>{t('common.close')}</Button>
                  </div>
                  <form onSubmit={submitEdit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm text-gray-700">{t('members.form.fullName')}</label>
                      <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-gray-700">{t('members.form.email')}</label>
                      <Input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-gray-700">{t('members.form.organization')}</label>
                      <Input value={editForm.organization} onChange={(e) => setEditForm({ ...editForm, organization: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-gray-700">{t('members.form.phone')}</label>
                      <Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-gray-700">{t('members.form.job')}</label>
                      <Input value={editForm.job} onChange={(e) => setEditForm({ ...editForm, job: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-gray-700">{t('members.form.dob')}</label>
                      <Input type="date" value={editForm.date_of_birth} onChange={(e) => setEditForm({ ...editForm, date_of_birth: e.target.value })} />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm text-gray-700">{t('members.form.address')}</label>
                      <Input value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-gray-700">{t('members.form.city')}</label>
                      <Input value={editForm.city} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} />
                    </div>
                    <div className="space-y-2 md:col-span-2 lg:col-span-3">
                      <label className="text-sm text-gray-700">{t('members.form.notes')}</label>
                      <Input value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} />
                    </div>
                    <div className="flex items-end">
                      <Button type="submit" disabled={editSaving} className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
                        {editSaving ? t('members.saving') : t('members.saveChanges')}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {imagePreviewOpen && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setImagePreviewOpen(false)}>
                <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between px-4 py-3 border-b">
                    <div className="text-sm text-gray-600">{t('members.certificateImagePreview')}</div>
                    <Button variant="outline" onClick={() => setImagePreviewOpen(false)}>{t('common.close')}</Button>
                  </div>
                  <div className="p-4 bg-gray-50">
                    {imagePreviewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={imagePreviewUrl} alt="Certificate" className="w-full h-auto rounded-lg border" />
                    ) : (
                      <div className="h-64 flex items-center justify-center text-gray-500 border rounded-lg bg-white">{t('members.noImage')}</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />

      {/* Excel Import Info Modal */}
      <Dialog open={showExcelInfoModal} onOpenChange={setShowExcelInfoModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="w-5 h-5 text-blue-500" />
              {t('members.excel.title')}
            </DialogTitle>
            <DialogDescription>
              {t('members.excel.description')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Column Requirements */}
            <div className="border rounded-lg p-4 bg-gray-50">
              <h3 className="font-semibold text-sm mb-3">{t('members.excel.requiredColumns')}</h3>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-red-500 font-bold">*</span>
                  <div>
                    <span className="font-medium">Name</span>
                    <p className="text-xs text-gray-600">{t('members.excel.nameRequired')}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="border rounded-lg p-4 bg-gray-50">
              <h3 className="font-semibold text-sm mb-3">{t('members.excel.optionalColumns')}</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
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
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold text-sm mb-3">{t('members.excel.exampleFormat')}</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border p-2 text-left">Name*</th>
                      <th className="border p-2 text-left">Email</th>
                      <th className="border p-2 text-left">Organization</th>
                      <th className="border p-2 text-left">Phone</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border p-2">John Doe</td>
                      <td className="border p-2">john@example.com</td>
                      <td className="border p-2">ABC Corp</td>
                      <td className="border p-2">08123456789</td>
                    </tr>
                    <tr>
                      <td className="border p-2">Jane Smith</td>
                      <td className="border p-2">jane@example.com</td>
                      <td className="border p-2">XYZ Inc</td>
                      <td className="border p-2">08198765432</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Notes */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-800">
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
    </div>
  );
}


