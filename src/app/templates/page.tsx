"use client";

import ModernLayout from "@/components/modern-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toaster } from "sonner";
import { Search, X, Filter, FileText, Plus } from "lucide-react";
import { TemplatesPageSkeleton } from "@/components/ui/templates-skeleton";
import { useTemplatesPage } from "@/features/templates/hooks/useTemplatesPage";
import { TemplateCard } from "@/features/templates/components/TemplateCard";
import { TemplatesHeader } from "@/features/templates/components/TemplatesHeader";
import { AddTemplateDialog } from "@/features/templates/components/AddTemplateDialog";
import { EditTemplateDialog } from "@/features/templates/components/EditTemplateDialog";
import { TemplatePreviewDialog } from "@/features/templates/components/TemplatePreviewDialog";
import { TemplatesFilterDialog } from "@/features/templates/components/TemplatesFilterDialog";

export default function TemplatesPage() {
  const {
    role, canDelete,
    tenants, selectedTenantId, loadingTenants, handleTenantChange,
    templates, loading, error, refresh, filtered,
    query, setQuery,
    categoryFilter, orientationFilter, statusFilter,
    tempCategoryFilter, setTempCategoryFilter,
    tempOrientationFilter, setTempOrientationFilter,
    tempStatusFilter, setTempStatusFilter,
    filterModalOpen, setFilterModalOpen,
    openFilterModal, applyFilters, cancelFilters,
    isCreateOpen, setIsCreateOpen, openCreate, submitCreate, creatingTemplate,
    isEditOpen, setIsEditOpen, handleEditClick, submitEdit, editingTemplate,
    draft, setDraft,
    isDualTemplate, setIsDualTemplate,
    imagePreview, handleImageUpload,
    previewImagePreview, handlePreviewImageUpload,
    certificateImagePreview, handleCertificateImageUpload,
    scoreImagePreview, handleScoreImageUpload,
    deletingTemplateId, requestDelete,
    previewTemplate, setPreviewTemplate, handlePreviewClick,
    configuringTemplateId, handleConfigureClick,
    templateUsageMap, getTemplateUrl, t,
  } = useTemplatesPage();

  if (loading && templates.length === 0) {
    return <ModernLayout><TemplatesPageSkeleton /></ModernLayout>;
  }

  const imageProps = {
    imagePreview, certificateImagePreview, scoreImagePreview, previewImagePreview,
    handleImageUpload, handlePreviewImageUpload, handleCertificateImageUpload, handleScoreImageUpload,
    isDualTemplate, setIsDualTemplate,
  };

  return (
    <ModernLayout>
      <section className="relative -mt-4 pb-6 sm:-mt-5 sm:pb-8 duration-500" style={{ backgroundColor: "var(--background, #f9fafb)" } as React.CSSProperties}>
        <div className="w-full max-w-[1280px] mx-auto px-2 sm:px-3 lg:px-0 relative">

          <TemplatesHeader
            tenants={tenants} selectedTenantId={selectedTenantId} loadingTenants={loadingTenants}
            role={role} handleTenantChange={handleTenantChange} openCreate={openCreate} t={t}
          />

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-md p-4 sm:p-6">
            {/* Search */}
            <div className="mb-4">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  <Input placeholder={t("templates.search")} className="h-10 pl-10" value={query} onChange={(e) => setQuery(e.target.value)} />
                  {query && <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>}
                </div>
                <Button type="button" variant={categoryFilter || orientationFilter || statusFilter ? "default" : "outline"}
                  onClick={openFilterModal} className="h-10 w-10 p-0 flex-shrink-0 relative" aria-label="Toggle filters">
                  <Filter className="w-4 h-4" />
                  {(categoryFilter || orientationFilter || statusFilter) && <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full" />}
                </Button>
              </div>
            </div>

            {/* Loading */}
            {loading && (
              <div className="min-h-[400px] flex items-center justify-center">
                <div className="text-center">
                  <svg className="animate-spin mx-auto mb-6" width="32" height="32" viewBox="0 0 32 32" fill="none">
                    <circle className="stroke-blue-500" cx="16" cy="16" r="12" strokeWidth="3" strokeLinecap="round" strokeDasharray="75.4" strokeDashoffset="18.85" />
                  </svg>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{t("templates.loading")}</h3>
                  <p className="text-gray-500 text-sm">{t("templates.loadingMessage")}</p>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="min-h-[400px] flex items-center justify-center">
                <div className="text-center max-w-md">
                  <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6"><span className="text-3xl">⚠️</span></div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{t("templates.errorLoading")}</h3>
                  <p className="text-gray-500 text-sm mb-6">{error}</p>
                  <Button onClick={() => refresh()} className="bg-[#2563eb] text-white">{t("templates.tryAgain")}</Button>
                </div>
              </div>
            )}

            {/* Count */}
            {!loading && !error && filtered.length > 0 && (
              <div className="mb-4"><p className="text-sm text-gray-600 dark:text-gray-400">{t("templates.found").replace("{count}", filtered.length.toString()).replace("{plural}", filtered.length !== 1 ? "s" : "")}</p></div>
            )}

            {/* Grid */}
            {!loading && !error && filtered.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 max-w-full duration-300">
                {filtered.map((template) => (
                  <TemplateCard
                    key={template.id} template={template}
                    onEdit={handleEditClick} onPreview={handlePreviewClick}
                    onConfigure={handleConfigureClick} onDelete={requestDelete}
                    getTemplateUrl={getTemplateUrl}
                    isConfiguring={configuringTemplateId === template.id}
                    canDelete={canDelete} templateUsageMap={templateUsageMap}
                    deletingTemplateId={deletingTemplateId} t={t}
                  />
                ))}
              </div>
            )}

            {/* Empty */}
            {!loading && !error && !loadingTenants && selectedTenantId && filtered.length === 0 && (
              <div className="p-12 sm:p-16">
                <div className="text-center max-w-md mx-auto">
                  <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center mx-auto mb-6"><FileText className="w-10 h-10 text-gray-400" /></div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">{t("templates.noTemplates")}</h3>
                  {(role === "owner" || role === "manager") && (
                    <Button onClick={openCreate} className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"><Plus className="w-5 h-5 mr-2" />+ New Template</Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <AddTemplateDialog
        isCreateOpen={isCreateOpen} setIsCreateOpen={setIsCreateOpen}
        draft={draft} setDraft={setDraft} {...imageProps}
        submitCreate={submitCreate} creatingTemplate={creatingTemplate} t={t}
      />
      <EditTemplateDialog
        isEditOpen={isEditOpen} setIsEditOpen={setIsEditOpen}
        draft={draft} setDraft={setDraft} role={role} {...imageProps}
        submitEdit={submitEdit} editingTemplate={editingTemplate} t={t}
      />
      <TemplatePreviewDialog
        previewTemplate={previewTemplate} setPreviewTemplate={setPreviewTemplate}
        role={role} templateUsageMap={templateUsageMap} t={t}
      />
      <TemplatesFilterDialog
        filterModalOpen={filterModalOpen} setFilterModalOpen={setFilterModalOpen}
        tempCategoryFilter={tempCategoryFilter} setTempCategoryFilter={setTempCategoryFilter}
        tempOrientationFilter={tempOrientationFilter} setTempOrientationFilter={setTempOrientationFilter}
        tempStatusFilter={tempStatusFilter} setTempStatusFilter={setTempStatusFilter}
        applyFilters={applyFilters} cancelFilters={cancelFilters}
      />

      <Toaster position="top-right" richColors />
    </ModernLayout>
  );
}
