"use client";

import ModernLayout from "@/components/modern-layout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast, Toaster } from "sonner";
import { formatReadableDate } from "@/lib/utils/certificate-formatters";
import {
  FileSpreadsheet, Info, ChevronLeft, ChevronRight,
  Search, X, Users, Filter,
} from "lucide-react";
import { LoadingButton } from "@/components/ui/loading-button";
import { useMembers } from "@/features/members/hooks/useMembers";

export default function MembersPage() {
  const {
    role, initialized, canDelete,
    tenants, selectedTenantId, loadingTenants, handleTenantChange,
    membersData, loading, error, loadMembers, deleting, deleteMember,
    searchQuery, setSearchQuery,
    organizationFilter, cityFilter, jobFilter,
    tempOrganizationFilter, setTempOrganizationFilter,
    tempCityFilter, setTempCityFilter,
    tempJobFilter, setTempJobFilter,
    filterModalOpen, setFilterModalOpen,
    openFilterModal, applyFilters, cancelFilters,
    uniqueOrganizations, uniqueCities, uniqueJobs,
    filteredMembers, currentMembers, currentPage, setCurrentPage,
    totalPages, indexOfFirstItem, indexOfLastItem,
    addModalOpen, setAddModalOpen, form, setForm, formErrors, setFormErrors, adding, onSubmit,
    editOpen, setEditOpen, editingMember,
    editForm, setEditForm, editFormErrors, setEditFormErrors, editSaving,
    openEdit, submitEdit,
    detailModalOpen, setDetailModalOpen, detailMember, openDetailModal,
    showExcelInfoModal, setShowExcelInfoModal, importing,
    excelInputRef, handleExcelImport,
    t, language,
  } = useMembers();

  if (!initialized) {
    return (
      <ModernLayout>
        <div className="min-h-[calc(100vh-80px)] flex items-center justify-center px-4">
          <div className="text-center">
            <div className="w-12 h-12 border-b-2 border-blue-600 rounded-full animate-spin mx-auto mb-6" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{t("members.loading")}</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm">{t("members.loadingMessage")}</p>
          </div>
        </div>
      </ModernLayout>
    );
  }

  if (role === "user" || role === "public") {
    return (
      <ModernLayout>
        <div className="min-h-[calc(100vh-80px)] flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-3xl">🔒</span>
            </div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">{t("members.accessDenied.title")}</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">{t("members.accessDenied.message")}</p>
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

          {/* Search + Filter */}
          <div className="flex items-center gap-2 mt-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <Input
                placeholder="Search data by name, email, organization..."
                className="h-10 pl-10 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 text-sm sm:text-base flex items-center"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 flex items-center justify-center">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Button
              onClick={openFilterModal}
              variant={organizationFilter || cityFilter || jobFilter ? "default" : "outline"}
              size="icon"
              className="flex-shrink-0 h-10 w-10 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 flex items-center justify-center relative"
            >
              <Filter className="h-5 w-5" />
              {(organizationFilter || cityFilter || jobFilter) && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full" />
              )}
            </Button>
          </div>

          {/* Loading */}
          {loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-[400px] flex items-center justify-center">
              <div className="text-center">
                <div className="w-12 h-12 border-b-2 border-blue-600 rounded-full animate-spin mx-auto mb-6" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{t("members.loading")}</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm">{t("members.loadingMessage")}</p>
              </div>
            </motion.div>
          )}

          {/* Error */}
          {error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-[400px] flex items-center justify-center">
              <div className="text-center max-w-md">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6"><span className="text-3xl">⚠️</span></div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{t("members.errorLoading")}</h3>
                <p className="text-gray-500 text-sm mb-6">{error}</p>
                <Button onClick={() => loadMembers()} className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white">{t("members.tryAgain")}</Button>
              </div>
            </motion.div>
          )}

          {/* Desktop Table */}
          {!loading && !error && (
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }}
              className="hidden xl:block bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-md overflow-hidden mt-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50/50 dark:bg-gray-800/50">
                      <TableHead className="w-10 text-center px-2">#</TableHead>
                      <TableHead className="min-w-[120px] px-2">{t("members.table.name")}</TableHead>
                      <TableHead className="min-w-[130px] px-2">{t("members.table.organization")}</TableHead>
                      <TableHead className="min-w-[150px] px-2">{t("members.table.contact")}</TableHead>
                      <TableHead className="min-w-[80px] px-2">{t("members.table.job")}</TableHead>
                      <TableHead className="min-w-[100px] px-2">{t("members.table.city")}</TableHead>
                      <TableHead className="min-w-[140px] px-2">
                        <div className="w-full flex justify-center"><span className="text-center">{t("members.table.actions")}</span></div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentMembers.map((m, index) => (
                      <TableRow key={m.id} onClick={() => openDetailModal(m)} className="cursor-pointer hover:bg-blue-50/50 transition-colors border-b border-gray-100 last:border-0">
                        <TableCell className="text-gray-500 text-center px-2 py-1.5">{indexOfFirstItem + index + 1}</TableCell>
                        <TableCell className="font-medium text-gray-900 dark:text-gray-100 px-2 py-1.5 break-words min-w-[120px]">{m.name}</TableCell>
                        <TableCell className="text-gray-700 dark:text-gray-300 px-2 py-1.5 break-words min-w-[130px]">{m.organization || "—"}</TableCell>
                        <TableCell className="text-gray-700 dark:text-gray-300 px-2 py-1.5 min-w-[150px]">
                          <div className="flex flex-col">
                            <span className="text-gray-900 dark:text-gray-100 break-words">{m.email || "—"}</span>
                            {m.phone && <span className="text-xs text-gray-500 mt-0.5 break-words">{m.phone}</span>}
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-700 dark:text-gray-300 px-2 py-1.5 break-words min-w-[80px]">{m.job || "—"}</TableCell>
                        <TableCell className="text-gray-700 dark:text-gray-300 px-2 py-1.5 break-words min-w-[100px]">{m.city || "—"}</TableCell>
                        <TableCell className="px-2 py-1.5 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-center gap-1.5">
                            {(role === "owner" || role === "manager" || role === "staff") && (
                              <Button variant="outline" size="sm" className="border-gray-300" onClick={() => openEdit(m)}>{t("common.edit")}</Button>
                            )}
                            <LoadingButton size="sm"
                              className="bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                              onClick={() => deleteMember(m.id)} isLoading={deleting === m.id}
                              loadingText={language === "id" ? "Menghapus..." : "Deleting..."}
                              variant="destructive" disabled={!canDelete || deleting === m.id}>
                              {t("common.delete")}
                            </LoadingButton>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredMembers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-gray-500 dark:text-gray-400 py-16">
                          <div className="text-center">
                            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4"><span className="text-2xl text-gray-400">👥</span></div>
                            {searchQuery ? (
                              <>
                                <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-300 mb-2">{t("members.search.noResults")}</h3>
                                <p className="text-gray-500 dark:text-gray-400 mb-4">{t("members.search.noMatch")} &quot;{searchQuery}&quot;</p>
                                <button onClick={() => setSearchQuery("")} className="text-blue-600 hover:text-blue-700 font-medium">{t("members.search.clearSearch")}</button>
                              </>
                            ) : (
                              <>
                                <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-300 mb-2">{t("members.noMembersTitle")}</h3>
                                <p className="text-gray-500 dark:text-gray-400 mb-4">{t("members.noMembersMessage")}</p>
                                {(role === "owner" || role === "manager" || role === "staff") && (
                                  <button onClick={() => { setAddModalOpen(true); setFormErrors({}); }} className="text-blue-600 hover:text-blue-700 font-medium">
                                    {language === "id" ? "Tambah Data" : "Add Data"}
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

          {/* Mobile Card View */}
          {!loading && !error && (
            <div className="xl:hidden grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mt-4">
              {currentMembers.map((m) => (
                <div key={m.id} onClick={() => openDetailModal(m)}
                  className="group bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 shadow-sm hover:shadow-md hover:-translate-y-1 cursor-pointer transition-all duration-300">
                  <div className="space-y-2 mb-3">
                    <div><div className="text-[10px] text-gray-500 uppercase tracking-wide mb-0.5">{t("members.table.name")}</div><div className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{m.name}</div></div>
                    <div className="grid grid-cols-2 gap-x-3">
                      <div><div className="text-[10px] text-gray-500 uppercase tracking-wide mb-0.5">{t("members.table.organization")}</div><div className="text-gray-700 dark:text-gray-300 text-xs">{m.organization || "—"}</div></div>
                      <div><div className="text-[10px] text-gray-500 uppercase tracking-wide mb-0.5">{t("members.table.job")}</div><div className="text-gray-700 dark:text-gray-300 text-xs">{m.job || "—"}</div></div>
                    </div>
                    <div className="grid grid-cols-2 gap-x-3">
                      <div><div className="text-[10px] text-gray-500 uppercase tracking-wide mb-0.5">Email</div><div className="text-gray-700 dark:text-gray-300 text-xs break-words">{m.email || "—"}</div></div>
                      {m.phone && <div><div className="text-[10px] text-gray-500 uppercase tracking-wide mb-0.5">Phone</div><div className="text-gray-700 dark:text-gray-300 text-xs">{m.phone}</div></div>}
                    </div>
                    {m.city && <div><div className="text-[10px] text-gray-500 uppercase tracking-wide mb-0.5">{t("members.table.city")}</div><div className="text-gray-700 dark:text-gray-300 text-xs">{m.city}</div></div>}
                  </div>
                  <div className="flex gap-2 pt-3 border-t border-gray-200 dark:border-gray-700" onClick={(e) => e.stopPropagation()}>
                    {(role === "owner" || role === "manager" || role === "staff") && (
                      <Button variant="outline" size="sm" className="flex-1 border-gray-300" onClick={() => openEdit(m)}>{t("common.edit")}</Button>
                    )}
                    <LoadingButton size="sm"
                      className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 disabled:opacity-50"
                      onClick={() => deleteMember(m.id)} isLoading={deleting === m.id}
                      loadingText={language === "id" ? "Menghapus..." : "Deleting..."}
                      variant="destructive" disabled={!canDelete || deleting === m.id}>
                      {t("common.delete")}
                    </LoadingButton>
                  </div>
                </div>
              ))}
              {filteredMembers.length === 0 && (
                <div className="col-span-full bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4"><span className="text-2xl text-gray-400">👥</span></div>
                  {searchQuery ? (
                    <>
                      <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-300 mb-2">{t("members.search.noResults")}</h3>
                      <p className="text-gray-500 mb-4">{t("members.search.noMatch")} &quot;{searchQuery}&quot;</p>
                      <button onClick={() => setSearchQuery("")} className="text-blue-600 hover:text-blue-700 font-medium">{t("members.search.clearSearch")}</button>
                    </>
                  ) : (
                    <>
                      <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-300 mb-2">{t("members.noMembersTitle")}</h3>
                      <p className="text-gray-500 mb-4">{t("members.noMembersMessage")}</p>
                      {(role === "owner" || role === "manager" || role === "staff") && (
                        <button onClick={() => { setAddModalOpen(true); setFormErrors({}); }} className="text-blue-600 hover:text-blue-700 font-medium">
                          {language === "id" ? "Tambah Data" : "Add Data"}
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Pagination */}
          {!loading && !error && filteredMembers.length > 0 && (
            <div className="flex flex-row justify-between items-center gap-2 mt-4 px-2">
              <div className="text-sm text-gray-500 flex-shrink-0">
                Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredMembers.length)} of {filteredMembers.length} data
                {searchQuery && <span className="ml-1 text-gray-400 hidden sm:inline">(filtered from {membersData.length})</span>}
              </div>
              <div className="flex items-center gap-2 sm:hidden flex-shrink-0">
                <Button variant="outline" size="sm" className="h-7 px-3" onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} disabled={currentPage === 1}><ChevronLeft className="h-3 w-3" /></Button>
                <div className="text-sm text-gray-600 px-2 whitespace-nowrap">Page {currentPage} of {totalPages}</div>
                <Button variant="outline" size="sm" className="h-7 px-3" onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}><ChevronRight className="h-3 w-3" /></Button>
              </div>
              <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4 mr-1" />Previous</Button>
                <div className="text-sm text-gray-600 px-3">Page {currentPage} of {totalPages}</div>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}>Next<ChevronRight className="h-4 w-4 ml-1" /></Button>
              </div>
            </div>
          )}

          {/* Add Data Modal */}
          {addModalOpen && (
            <div className="fixed inset-0 bg-black/40 dark:bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in-0 duration-200" onClick={() => setAddModalOpen(false)}>
              <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 mx-4 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{language === "id" ? "Tambah Data" : "Add Data"}</h3>
                  <Button variant="outline" onClick={() => setAddModalOpen(false)} size="icon" aria-label="Close"><X className="w-4 h-4" /></Button>
                </div>
                <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm text-gray-700 dark:text-gray-300 font-medium">{t("members.form.fullName")} <span className="text-red-500">*</span></label>
                    <Input value={form.name} placeholder={t("members.form.fullNamePlaceholder")} onChange={(e) => { setForm({ ...form, name: e.target.value }); if (formErrors.name) setFormErrors({ ...formErrors, name: "" }); }} className={formErrors.name ? "border-red-500 focus:border-red-500" : ""} />
                    {formErrors.name && <p className="text-xs text-red-500 mt-1">{formErrors.name}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-gray-700 dark:text-gray-300 font-medium">{t("members.form.email")}</label>
                    <Input type="email" value={form.email} placeholder="name@example.com" onChange={(e) => { setForm({ ...form, email: e.target.value }); if (formErrors.email) setFormErrors({ ...formErrors, email: "" }); }} className={formErrors.email ? "border-red-500 focus:border-red-500" : ""} />
                    {formErrors.email && <p className="text-xs text-red-500 mt-1">{formErrors.email}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-gray-700 dark:text-gray-300 font-medium">{t("members.form.organization")}</label>
                    <Input value={form.organization} placeholder={t("members.form.optional")} onChange={(e) => { setForm({ ...form, organization: e.target.value }); if (formErrors.organization) setFormErrors({ ...formErrors, organization: "" }); }} className={formErrors.organization ? "border-red-500 focus:border-red-500" : ""} />
                    {formErrors.organization && <p className="text-xs text-red-500 mt-1">{formErrors.organization}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-gray-700 dark:text-gray-300 font-medium">{t("members.form.phone")}</label>
                    <Input value={form.phone} placeholder={t("members.form.optional")} onChange={(e) => { setForm({ ...form, phone: e.target.value }); if (formErrors.phone) setFormErrors({ ...formErrors, phone: "" }); }} className={formErrors.phone ? "border-red-500 focus:border-red-500" : ""} />
                    {formErrors.phone && <p className="text-xs text-red-500 mt-1">{formErrors.phone}</p>}
                  </div>
                  <div className="space-y-2"><label className="text-sm text-gray-700 dark:text-gray-300 font-medium">{t("members.form.job")}</label><Input value={form.job} placeholder={t("members.form.optional")} onChange={(e) => setForm({ ...form, job: e.target.value })} /></div>
                  <div className="space-y-2"><label className="text-sm text-gray-700 dark:text-gray-300 font-medium">{t("members.form.dob")}</label><Input type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} /></div>
                  <div className="space-y-2 md:col-span-2"><label className="text-sm text-gray-700 dark:text-gray-300 font-medium">{t("members.form.address")}</label><Input value={form.address} placeholder={t("members.form.optional")} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
                  <div className="space-y-2"><label className="text-sm text-gray-700 dark:text-gray-300 font-medium">{t("members.form.city")}</label><Input value={form.city} placeholder={t("members.form.optional")} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
                  <div className="flex items-end lg:col-span-3">
                    <LoadingButton type="submit" isLoading={adding} loadingText={language === "id" ? "Menyimpan..." : "Saving..."} variant="primary" className="gradient-primary text-white">{t("common.save")}</LoadingButton>
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
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{language === "id" ? "Edit Data" : "Edit Data"}</h3>
                  <Button variant="outline" onClick={() => setEditOpen(false)} size="icon" aria-label="Close"><X className="w-4 h-4" /></Button>
                </div>
                <form onSubmit={submitEdit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm text-gray-700 dark:text-gray-300 font-medium">{t("members.form.fullName")} <span className="text-red-500">*</span></label>
                    <Input value={editForm.name} onChange={(e) => { setEditForm({ ...editForm, name: e.target.value }); if (editFormErrors.name) setEditFormErrors({ ...editFormErrors, name: "" }); }} className={editFormErrors.name ? "border-red-500 focus:border-red-500" : ""} />
                    {editFormErrors.name && <p className="text-xs text-red-500 mt-1">{editFormErrors.name}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-gray-700 dark:text-gray-300 font-medium">{t("members.form.email")}</label>
                    <Input type="email" value={editForm.email} onChange={(e) => { setEditForm({ ...editForm, email: e.target.value }); if (editFormErrors.email) setEditFormErrors({ ...editFormErrors, email: "" }); }} className={editFormErrors.email ? "border-red-500 focus:border-red-500" : ""} />
                    {editFormErrors.email && <p className="text-xs text-red-500 mt-1">{editFormErrors.email}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-gray-700 dark:text-gray-300 font-medium">{t("members.form.organization")}</label>
                    <Input value={editForm.organization} onChange={(e) => { setEditForm({ ...editForm, organization: e.target.value }); if (editFormErrors.organization) setEditFormErrors({ ...editFormErrors, organization: "" }); }} className={editFormErrors.organization ? "border-red-500 focus:border-red-500" : ""} />
                    {editFormErrors.organization && <p className="text-xs text-red-500 mt-1">{editFormErrors.organization}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-gray-700 dark:text-gray-300 font-medium">{t("members.form.phone")}</label>
                    <Input value={editForm.phone} onChange={(e) => { setEditForm({ ...editForm, phone: e.target.value }); if (editFormErrors.phone) setEditFormErrors({ ...editFormErrors, phone: "" }); }} className={editFormErrors.phone ? "border-red-500 focus:border-red-500" : ""} />
                    {editFormErrors.phone && <p className="text-xs text-red-500 mt-1">{editFormErrors.phone}</p>}
                  </div>
                  <div className="space-y-2"><label className="text-sm text-gray-700 dark:text-gray-300 font-medium">{t("members.form.job")}</label><Input value={editForm.job} onChange={(e) => setEditForm({ ...editForm, job: e.target.value })} /></div>
                  <div className="space-y-2"><label className="text-sm text-gray-700 dark:text-gray-300 font-medium">{t("members.form.dob")}</label><Input type="date" value={editForm.date_of_birth} onChange={(e) => setEditForm({ ...editForm, date_of_birth: e.target.value })} /></div>
                  <div className="space-y-2 md:col-span-2"><label className="text-sm text-gray-700 dark:text-gray-300 font-medium">{t("members.form.address")}</label><Input value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} /></div>
                  <div className="space-y-2"><label className="text-sm text-gray-700 dark:text-gray-300 font-medium">{t("members.form.city")}</label><Input value={editForm.city} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} /></div>
                  <div className="flex items-end">
                    <LoadingButton type="submit" isLoading={editSaving} loadingText={language === "id" ? "Menyimpan..." : "Saving..."} variant="primary" className="gradient-primary text-white">{language === "id" ? "Simpan" : "Save"}</LoadingButton>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Member Detail Modal */}
          {detailModalOpen && detailMember && (
            <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
              <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col p-0 sm:p-6">
                <DialogHeader className="px-4 sm:px-0 pt-4 sm:pt-0 pb-4 flex-shrink-0 border-b border-gray-200 dark:border-gray-700">
                  <DialogTitle className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">{t("members.detail.title")}</DialogTitle>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto px-4 sm:px-0 py-4 sm:py-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div className="space-y-1"><label className="text-xs sm:text-sm font-medium text-gray-500">Full Name</label><div className="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100">{detailMember.name}</div></div>
                    {detailMember.email && <div className="space-y-1"><label className="text-xs sm:text-sm font-medium text-gray-500">Email</label><div className="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100 break-words">{detailMember.email}</div></div>}
                    {detailMember.phone && <div className="space-y-1"><label className="text-xs sm:text-sm font-medium text-gray-500">Phone</label><div className="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100">{detailMember.phone}</div></div>}
                    {detailMember.organization && <div className="space-y-1"><label className="text-xs sm:text-sm font-medium text-gray-500">Organization / School</label><div className="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100">{detailMember.organization}</div></div>}
                    {detailMember.job && <div className="space-y-1"><label className="text-xs sm:text-sm font-medium text-gray-500">Job / Position</label><div className="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100">{detailMember.job}</div></div>}
                    {detailMember.date_of_birth && <div className="space-y-1"><label className="text-xs sm:text-sm font-medium text-gray-500">Date of Birth</label><div className="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100">{formatReadableDate(detailMember.date_of_birth, language)}</div></div>}
                    {detailMember.city && <div className="space-y-1"><label className="text-xs sm:text-sm font-medium text-gray-500">City</label><div className="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100">{detailMember.city}</div></div>}
                    {detailMember.address && <div className="space-y-1 sm:col-span-2"><label className="text-xs sm:text-sm font-medium text-gray-500">Address</label><div className="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100 break-words">{detailMember.address}</div></div>}
                    {detailMember.notes && <div className="space-y-1 sm:col-span-2"><label className="text-xs sm:text-sm font-medium text-gray-500">Notes</label><div className="text-sm sm:text-base text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words">{detailMember.notes}</div></div>}
                  </div>
                  {(detailMember.created_at || detailMember.updated_at) && (
                    <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <div className="grid grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm text-gray-500">
                        <div>{detailMember.created_at && <><span className="font-medium">Created:</span> <span className="text-gray-600 dark:text-gray-300">{formatReadableDate(detailMember.created_at, language)}</span></>}</div>
                        <div>{detailMember.updated_at && <><span className="font-medium">Updated:</span> <span className="text-gray-600 dark:text-gray-300">{formatReadableDate(detailMember.updated_at, language)}</span></>}</div>
                      </div>
                    </div>
                  )}
                </div>
                {(role === "owner" || role === "manager" || role === "staff") && (
                  <div className="flex-shrink-0 px-4 sm:px-0 pt-4 pb-4 sm:pb-0 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex justify-end gap-3">
                      <Button className="gradient-primary text-white text-sm sm:text-base px-4 sm:px-6" onClick={() => { setDetailModalOpen(false); openEdit(detailMember); }}>Edit</Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          )}
        </div>
      </section>

      {/* Excel Info Modal */}
      <Dialog open={showExcelInfoModal} onOpenChange={setShowExcelInfoModal}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg md:max-w-xl max-h-[90vh] overflow-y-auto overflow-x-hidden p-4 sm:p-6">
          <DialogHeader className="pb-3 sm:pb-4">
            <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl text-gray-900 dark:text-gray-100">
              <Info className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 flex-shrink-0" />
              {t("members.excel.title")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 sm:space-y-4">
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 sm:p-4 bg-gray-50 dark:bg-gray-800/50">
              <h3 className="font-semibold text-xs sm:text-sm mb-2 sm:mb-3 text-gray-900 dark:text-gray-100">{t("members.excel.optionalColumns")}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                <div className="flex items-start gap-1.5"><span className="text-red-500 font-bold">*</span><span className="font-medium">Name</span></div>
                <div>• <span className="font-medium">Email</span></div>
                <div>• <span className="font-medium">Organization</span></div>
                <div>• <span className="font-medium">Phone</span></div>
                <div>• <span className="font-medium">Job</span></div>
                <div>• <span className="font-medium">Date of Birth</span></div>
                <div>• <span className="font-medium">Address</span></div>
                <div>• <span className="font-medium">City</span></div>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 sm:mt-3"><span className="text-red-500">*</span> Required field</p>
            </div>
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 sm:p-4 bg-white dark:bg-gray-900">
              <h3 className="font-semibold text-xs sm:text-sm mb-2 sm:mb-3 text-gray-900 dark:text-gray-100">{t("members.excel.exampleFormat")}</h3>
              <div className="w-full overflow-x-auto">
                <table className="w-full min-w-0 text-[10px] sm:text-xs border-collapse">
                  <thead><tr className="bg-gray-100 dark:bg-gray-800">
                    <th className="border border-gray-300 dark:border-gray-600 p-1.5 sm:p-2 text-left text-gray-900 dark:text-gray-100">Name*</th>
                    <th className="border border-gray-300 dark:border-gray-600 p-1.5 sm:p-2 text-left text-gray-900 dark:text-gray-100">Email</th>
                    <th className="border border-gray-300 dark:border-gray-600 p-1.5 sm:p-2 text-left text-gray-900 dark:text-gray-100 hidden sm:table-cell">Organization</th>
                    <th className="border border-gray-300 dark:border-gray-600 p-1.5 sm:p-2 text-left text-gray-900 dark:text-gray-100">Phone</th>
                  </tr></thead>
                  <tbody>
                    <tr><td className="border border-gray-300 dark:border-gray-600 p-1.5 sm:p-2 text-gray-900 dark:text-gray-100">John Doe</td><td className="border border-gray-300 dark:border-gray-600 p-1.5 sm:p-2 text-gray-900 dark:text-gray-100 break-words">john@example.com</td><td className="border border-gray-300 dark:border-gray-600 p-1.5 sm:p-2 text-gray-900 dark:text-gray-100 hidden sm:table-cell">ABC Corp</td><td className="border border-gray-300 dark:border-gray-600 p-1.5 sm:p-2 text-gray-900 dark:text-gray-100">08123456789</td></tr>
                    <tr><td className="border border-gray-300 dark:border-gray-600 p-1.5 sm:p-2 text-gray-900 dark:text-gray-100">Jane Smith</td><td className="border border-gray-300 dark:border-gray-600 p-1.5 sm:p-2 text-gray-900 dark:text-gray-100 break-words">jane@example.com</td><td className="border border-gray-300 dark:border-gray-600 p-1.5 sm:p-2 text-gray-900 dark:text-gray-100 hidden sm:table-cell">XYZ Inc</td><td className="border border-gray-300 dark:border-gray-600 p-1.5 sm:p-2 text-gray-900 dark:text-gray-100">08198765432</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:justify-end pt-2 sm:pt-3 border-t border-gray-200 dark:border-gray-700">
              <Button variant="outline" onClick={() => setShowExcelInfoModal(false)} className="w-full sm:w-auto text-sm">{t("members.excel.cancel")}</Button>
              <Button onClick={() => { setShowExcelInfoModal(false); excelInputRef.current?.click(); }}
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white w-full sm:w-auto text-sm">
                <FileSpreadsheet className="w-4 h-4 mr-2" />{t("members.excel.chooseFile")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Filter Modal */}
      <Dialog open={filterModalOpen} onOpenChange={setFilterModalOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 max-h-[80vh] overflow-visible"
          style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", maxHeight: "80vh" }}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); applyFilters(); } else if (e.key === "Escape") { e.preventDefault(); cancelFilters(); } }}>
          <DialogHeader className="border-b border-gray-200 dark:border-gray-700 pb-4">
            <div className="flex items-center gap-2"><Filter className="h-5 w-5 text-blue-500" /><DialogTitle className="text-gray-900 dark:text-white">Filter</DialogTitle></div>
          </DialogHeader>
          <div className="space-y-4 py-4 overflow-y-auto max-h-[50vh]">
            <div className="space-y-2 relative">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Organization</label>
              <select value={tempOrganizationFilter} onChange={(e) => setTempOrganizationFilter(e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" style={{ position: "relative", zIndex: 1 }}>
                <option value="">All</option>
                {uniqueOrganizations.map((org) => <option key={org} value={org}>{org}</option>)}
              </select>
            </div>
            <div className="space-y-2 relative">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">City</label>
              <select value={tempCityFilter} onChange={(e) => setTempCityFilter(e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" style={{ position: "relative", zIndex: 1 }}>
                <option value="">All</option>
                {uniqueCities.map((city) => <option key={city} value={city}>{city}</option>)}
              </select>
            </div>
            <div className="space-y-2 relative">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Job</label>
              <select value={tempJobFilter} onChange={(e) => setTempJobFilter(e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" style={{ position: "relative", zIndex: 1 }}>
                <option value="">All</option>
                {uniqueJobs.map((job) => <option key={job} value={job}>{job}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2 pt-4">
            <Button onClick={cancelFilters} variant="outline" className="flex-1 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</Button>
            <Button onClick={applyFilters} className="flex-1 gradient-primary text-white">Apply</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Toaster position="top-right" richColors />
    </ModernLayout>
  );
}
