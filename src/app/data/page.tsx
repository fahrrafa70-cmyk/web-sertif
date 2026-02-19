"use client";

import ModernLayout from "@/components/modern-layout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast, Toaster } from "sonner";
import { Search, X, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { useMembers } from "@/features/members/hooks/useMembers";
import { MembersHeader } from "@/features/members/components/MembersHeader";
import { MembersTable } from "@/features/members/components/MembersTable";
import { MembersMobileList } from "@/features/members/components/MembersMobileList";
import { AddMemberModal } from "@/features/members/components/AddMemberModal";
import { EditMemberModal } from "@/features/members/components/EditMemberModal";
import { MemberDetailDialog } from "@/features/members/components/MemberDetailDialog";
import { ExcelInfoDialog } from "@/features/members/components/ExcelInfoDialog";
import { MembersFilterDialog } from "@/features/members/components/MembersFilterDialog";

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
    editOpen, setEditOpen,
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
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6"><span className="text-3xl">🔒</span></div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">{t("members.accessDenied.title")}</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">{t("members.accessDenied.message")}</p>
          </div>
        </div>
      </ModernLayout>
    );
  }

  const sharedMemberProps = {
    role, canDelete, deleting, searchQuery, language, t,
    openDetailModal, openEdit, deleteMember,
    setAddModalOpen, setFormErrors, setSearchQuery,
    filteredMembers,
  };

  return (
    <ModernLayout>
      <section className="relative -mt-4 pb-6 sm:-mt-5 sm:pb-8 bg-gray-50 dark:bg-gray-900">
        <div className="w-full max-w-[1280px] mx-auto px-2 sm:px-3 lg:px-0 relative">

          <MembersHeader
            tenants={tenants} selectedTenantId={selectedTenantId} loadingTenants={loadingTenants}
            role={role} importing={importing} language={language} excelInputRef={excelInputRef}
            handleTenantChange={handleTenantChange} setShowExcelInfoModal={setShowExcelInfoModal}
            setAddModalOpen={setAddModalOpen} setFormErrors={setFormErrors}
            handleExcelImport={handleExcelImport} t={t}
          />

          {/* Search + Filter */}
          <div className="flex items-center gap-2 mt-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <Input
                placeholder="Search data by name, email, organization..."
                className="h-10 pl-10 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 text-sm sm:text-base flex items-center"
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 flex items-center justify-center">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Button onClick={openFilterModal} variant={organizationFilter || cityFilter || jobFilter ? "default" : "outline"}
              size="icon" className="flex-shrink-0 h-10 w-10 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 flex items-center justify-center relative">
              <Filter className="h-5 w-5" />
              {(organizationFilter || cityFilter || jobFilter) && <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full" />}
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

          {/* Table (desktop) + Cards (mobile) */}
          {!loading && !error && (
            <>
              <MembersTable {...sharedMemberProps} currentMembers={currentMembers} indexOfFirstItem={indexOfFirstItem} />
              <MembersMobileList {...sharedMemberProps} currentMembers={currentMembers} />
            </>
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
        </div>
      </section>

      {/* Modals */}
      <AddMemberModal
        addModalOpen={addModalOpen} setAddModalOpen={setAddModalOpen}
        form={form} setForm={setForm} formErrors={formErrors} setFormErrors={setFormErrors}
        adding={adding} language={language} onSubmit={onSubmit} t={t}
      />
      <EditMemberModal
        editOpen={editOpen} setEditOpen={setEditOpen}
        editForm={editForm} setEditForm={setEditForm}
        editFormErrors={editFormErrors} setEditFormErrors={setEditFormErrors}
        editSaving={editSaving} language={language} submitEdit={submitEdit} t={t}
      />
      <MemberDetailDialog
        detailModalOpen={detailModalOpen} setDetailModalOpen={setDetailModalOpen}
        detailMember={detailMember} role={role} language={language} openEdit={openEdit} t={t}
      />
      <ExcelInfoDialog
        showExcelInfoModal={showExcelInfoModal} setShowExcelInfoModal={setShowExcelInfoModal}
        excelInputRef={excelInputRef} t={t}
      />
      <MembersFilterDialog
        filterModalOpen={filterModalOpen} setFilterModalOpen={setFilterModalOpen}
        tempOrganizationFilter={tempOrganizationFilter} setTempOrganizationFilter={setTempOrganizationFilter}
        tempCityFilter={tempCityFilter} setTempCityFilter={setTempCityFilter}
        tempJobFilter={tempJobFilter} setTempJobFilter={setTempJobFilter}
        uniqueOrganizations={uniqueOrganizations} uniqueCities={uniqueCities} uniqueJobs={uniqueJobs}
        applyFilters={applyFilters} cancelFilters={cancelFilters}
      />

      <Toaster position="top-right" richColors />
    </ModernLayout>
  );
}
