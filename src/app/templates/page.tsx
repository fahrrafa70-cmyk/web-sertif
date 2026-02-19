"use client";

import ModernLayout from "@/components/modern-layout";
import { Button } from "@/components/ui/button";
import { memo } from "react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { FileText, Plus, Search, Edit, Trash2, Layout, X, Settings, Filter } from "lucide-react";
import { Template, getTemplatePreviewUrl, getTemplateImageUrl } from "@/lib/supabase/templates";
import { toast, Toaster } from "sonner";
import { LoadingButton } from "@/components/ui/loading-button";
import Image from "next/image";
import { TemplatesPageSkeleton } from "@/components/ui/templates-skeleton";
import { useTemplatesPage } from "@/features/templates/hooks/useTemplatesPage";

// ── Helper ────────────────────────────────────────────────────────────────────
const getCategoryColor = (category: string) => {
  const colors: Record<string, string> = {
    Training: "from-blue-500 to-blue-600",
    Internship: "from-green-500 to-green-600",
    MoU: "from-purple-500 to-purple-600",
    Visit: "from-orange-500 to-orange-600",
  };
  return colors[category] || "from-gray-500 to-gray-600";
};

// ── Memoized Template Card ────────────────────────────────────────────────────
interface TemplateCardProps {
  template: Template;
  onEdit: (template: Template) => void;
  onPreview: (template: Template) => void;
  onConfigure: (templateId: string) => void;
  onDelete: (templateId: string) => void;
  getTemplateUrl: (template: Template) => string | null;
  isConfiguring: boolean;
  canDelete: boolean;
  templateUsageMap: Map<string, number>;
  deletingTemplateId: string | null;
  t: (key: string) => string;
}

const TemplateCard = memo(({ template, onEdit, onPreview, onConfigure, onDelete, getTemplateUrl, isConfiguring, canDelete, templateUsageMap, deletingTemplateId, t }: TemplateCardProps) => {
  const imageUrl = getTemplateUrl(template);
  return (
    <div
      className="group bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200 ease-out cursor-pointer flex flex-row h-[200px] w-full transform will-change-transform"
      onClick={() => onPreview(template)}
    >
      {/* Thumbnail */}
      <div className="relative w-[160px] h-full flex-shrink-0 bg-gray-100 dark:bg-gray-900 overflow-hidden border-r border-gray-200 dark:border-gray-700">
        {imageUrl ? (
          <Image src={imageUrl} alt={template.name} width={160} height={200} className="w-full h-full object-contain" sizes="160px" priority={false} loading="lazy" quality={75} />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center"><Layout className="w-8 h-8 text-gray-400 mx-auto mb-2" /><div className="text-xs text-gray-500">No Image</div></div>
          </div>
        )}
        <div className="absolute top-2 left-2 z-10">
          {template.is_layout_configured ? (
            <Badge variant="default" className="bg-green-500 hover:bg-green-600 text-white text-xs shadow-sm px-1.5 py-0.5">✓ Ready</Badge>
          ) : (
            <Badge variant="secondary" className="bg-yellow-500 hover:bg-yellow-600 text-white text-xs shadow-sm px-1.5 py-0.5">Draft</Badge>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 flex flex-col justify-between min-w-0 p-4 w-full overflow-hidden">
        <div className="min-w-0 flex-1 w-full flex flex-col">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mb-2 w-full text-left truncate">{template.name}</h3>
          <div className="mb-2 w-full text-left">
            <span className={`inline-block px-2 py-1 rounded text-xs font-medium bg-gradient-to-r ${getCategoryColor(template.category)} text-white shadow-sm`}>{template.category}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 w-full text-left">
            <div className="flex items-center gap-1"><Layout className="w-3 h-3 flex-shrink-0" /><span className="font-medium text-xs">{template.orientation}</span></div>
            {template.created_at && <><span className="text-gray-400">•</span><span className="text-xs">{new Date(template.created_at).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}</span></>}
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-auto pt-2 border-t border-gray-100 dark:border-gray-700 w-full">
          <LoadingButton size="sm"
            className="h-7 px-2 text-xs font-medium !bg-blue-600 hover:!bg-blue-700 text-white shadow-sm transition-all duration-300 flex-1 min-w-0 relative z-10 pointer-events-auto hover:scale-[1.02] hover:shadow-md"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onConfigure(template.id); }}
            isLoading={isConfiguring} loadingText="Opening...">
            {!isConfiguring && <Settings className="w-3 h-3 mr-1" />}
            <span className="truncate">{isConfiguring ? "Opening..." : "Layout"}</span>
          </LoadingButton>
          <Button variant="outline" size="sm" className="h-7 w-7 p-0 border-gray-200 dark:border-gray-700 flex-shrink-0 relative z-10 pointer-events-auto" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(template); }}>
            <Edit className="w-3 h-3" />
          </Button>
          <LoadingButton variant="outline" size="sm"
            className={`h-7 w-7 p-0 border-gray-200 dark:border-gray-700 flex-shrink-0 relative z-10 pointer-events-auto ${canDelete && !templateUsageMap.has(template.id) ? "" : "opacity-50 cursor-not-allowed"}`}
            onClick={(e) => {
              e.preventDefault(); e.stopPropagation();
              if (canDelete && !templateUsageMap.has(template.id)) { onDelete(template.id); }
              else if (templateUsageMap.has(template.id)) { const count = templateUsageMap.get(template.id) || 0; toast.error(t("templates.cannotDeleteInUse").replace("{name}", template.name).replace("{count}", count.toString())); }
            }}
            disabled={!canDelete || templateUsageMap.has(template.id)}
            isLoading={deletingTemplateId === template.id} loadingText=""
            title={templateUsageMap.has(template.id) ? t("templates.usedBy").replace("{count}", (templateUsageMap.get(template.id) || 0).toString()) : undefined}>
            {deletingTemplateId !== template.id && <Trash2 className="w-3 h-3" />}
          </LoadingButton>
        </div>
      </div>
    </div>
  );
});
TemplateCard.displayName = "TemplateCard";

// ── Helper: image upload input ────────────────────────────────────────────────
function ImageUploadField({ label, preview, onChange, onRemove, removeLabel }: {
  label: string;
  preview: string | null;
  onChange: (file: File | null) => void;
  onRemove: () => void;
  removeLabel: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{label}</label>
      <div className="space-y-3">
        <input type="file" accept=".png,.jpg,.jpeg" onChange={(e) => onChange(e.target.files?.[0] || null)}
          className="block w-full text-sm text-gray-700 dark:text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 dark:file:bg-blue-900/30 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100 cursor-pointer" />
        {preview && (
          <div className="relative">
            <div className="relative w-full h-32"><Image src={preview} alt={label} fill className="object-cover rounded-lg border border-gray-200 dark:border-gray-700" unoptimized /></div>
            <Button variant="outline" size="sm" className="absolute top-2 right-2 bg-white/90 dark:bg-gray-800/90" onClick={onRemove}><X className="w-4 h-4" /></Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Orientation & Mode toggle ─────────────────────────────────────────────────
const toggleCls = (active: boolean) =>
  `rounded-md transition-all ${active ? "bg-blue-600 text-white shadow-sm dark:bg-blue-500 hover:bg-blue-700 border border-transparent" : "bg-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700/50 border border-gray-300 dark:border-gray-600"}`;

// ── Page component ────────────────────────────────────────────────────────────
export default function TemplatesPage() {
  const router = useRouter();
  const {
    role, canDelete,
    tenants, selectedTenantId, loadingTenants,
    handleTenantChange,
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
    imageFile, imagePreview, handleImageUpload,
    previewImageFile, previewImagePreview, handlePreviewImageUpload,
    certificateImageFile, certificateImagePreview, handleCertificateImageUpload,
    scoreImageFile, scoreImagePreview, handleScoreImageUpload,
    deletingTemplateId, requestDelete,
    previewTemplate, setPreviewTemplate, handlePreviewClick,
    configuringTemplateId, handleConfigureClick,
    templateUsageMap,
    getTemplateUrl,
    t,
  } = useTemplatesPage();

  if (loading && templates.length === 0) {
    return <ModernLayout><TemplatesPageSkeleton /></ModernLayout>;
  }

  return (
    <ModernLayout>
      <section className="relative -mt-4 pb-6 sm:-mt-5 sm:pb-8 duration-500" style={{ backgroundColor: "var(--background, #f9fafb)" } as React.CSSProperties}>
        <div className="w-full max-w-[1280px] mx-auto px-2 sm:px-3 lg:px-0 relative">

          {/* Header */}
          <div className="mb-3 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-2 w-full">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-lg shadow-md flex-shrink-0 bg-blue-500">
                  <Layout className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <h1 className="text-xl sm:text-3xl md:text-4xl font-bold text-[#2563eb] dark:text-blue-400">{t("templates.title")}</h1>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
                {tenants.length > 0 && (
                  <div className="w-full sm:w-56">
                    <select
                      className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-xs sm:text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                      value={selectedTenantId}
                      onChange={(e) => handleTenantChange(e.target.value)}
                      disabled={loadingTenants || tenants.length === 0}
                    >
                      {loadingTenants && <option value="">Memuat tenant...</option>}
                      {!loadingTenants && tenants.length > 0 && !selectedTenantId && <option value="">Pilih tenant...</option>}
                      {!loadingTenants && tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
                    </select>
                  </div>
                )}
                {(role === "owner" || role === "manager") && (
                  <Button onClick={openCreate} className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white w-full sm:w-auto">
                    <Plus className="w-4 h-4 mr-2" /><span>{t("templates.create")}</span>
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Content Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-md p-4 sm:p-6">
            {/* Search */}
            <div className="mb-4">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  <Input placeholder={t("templates.search")} className="h-10 pl-10" value={query} onChange={(e) => setQuery(e.target.value)} />
                  {query && (
                    <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
                  )}
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
              <div className="mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t("templates.found").replace("{count}", filtered.length.toString()).replace("{plural}", filtered.length !== 1 ? "s" : "")}
                </p>
              </div>
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
                    <Button onClick={openCreate} className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white">
                      <Plus className="w-5 h-5 mr-2" />+ New Template
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Create Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-xl font-bold">{t("templates.createTitle")}</DialogTitle></DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t("templates.templateName")}</label>
              <Input value={draft?.name ?? ""} onChange={(e) => setDraft((d) => d ? { ...d, name: e.target.value } : d)} placeholder={t("templates.templateNamePlaceholder")} className="rounded-lg dark:bg-gray-900" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t("templates.category")}</label>
              <select value={draft?.category ?? ""} onChange={(e) => setDraft((d) => d ? { ...d, category: e.target.value } : d)} className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">{t("templates.selectCategory")}</option>
                {["MoU","Magang","Pelatihan","Kunjungan Industri","Sertifikat","Surat","Lainnya"].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t("templates.orientation")}</label>
              <div className="grid grid-cols-2 gap-2 dark:bg-gray-800 p-1 rounded-lg">
                <Button variant="ghost" onClick={() => setDraft((d) => d ? { ...d, orientation: "Landscape" } : d)} className={toggleCls(draft?.orientation === "Landscape")}>{t("templates.landscape")}</Button>
                <Button variant="ghost" onClick={() => setDraft((d) => d ? { ...d, orientation: "Portrait" } : d)} className={toggleCls(draft?.orientation === "Portrait")}>{t("templates.portrait")}</Button>
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t("templates.templateMode")}</label>
              <div className="grid grid-cols-2 gap-2 dark:bg-gray-800 p-1 rounded-lg">
                <Button variant="ghost" onClick={() => setIsDualTemplate(false)} className={toggleCls(!isDualTemplate)}>{t("templates.singleSide")}</Button>
                <Button variant="ghost" onClick={() => setIsDualTemplate(true)} className={toggleCls(isDualTemplate)}>{t("templates.doubleSide")}</Button>
              </div>
            </div>
            {!isDualTemplate && (
              <ImageUploadField label={t("templates.templateImage")} preview={imagePreview} onChange={handleImageUpload} onRemove={() => handleImageUpload(null)} removeLabel="Remove" />
            )}
            {isDualTemplate && (
              <>
                <ImageUploadField label={t("templates.certificateImage")} preview={certificateImagePreview} onChange={handleCertificateImageUpload} onRemove={() => handleCertificateImageUpload(null)} removeLabel="Remove" />
                <ImageUploadField label={t("templates.scoreImage")} preview={scoreImagePreview} onChange={handleScoreImageUpload} onRemove={() => handleScoreImageUpload(null)} removeLabel="Remove" />
              </>
            )}
            <ImageUploadField label={t("templates.previewImage")} preview={previewImagePreview} onChange={handlePreviewImageUpload} onRemove={() => handlePreviewImageUpload(null)} removeLabel="Remove" />
            <div className="flex justify-end gap-3 pt-6">
              <Button variant="outline" className="dark:text-gray-100" onClick={() => setIsCreateOpen(false)}>{t("common.cancel")}</Button>
              <LoadingButton className="gradient-primary text-white" onClick={submitCreate} isLoading={creatingTemplate} loadingText={t("common.saving")} variant="primary">{t("templates.create")}</LoadingButton>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Edit Dialog ────────────────────────────────────────────────────── */}
      <Dialog open={!!isEditOpen} onOpenChange={(o) => setIsEditOpen(o ? isEditOpen : null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-xl font-bold">{t("templates.editTitle")}</DialogTitle></DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t("templates.templateName")}</label>
              <Input value={draft?.name ?? ""} onChange={(e) => setDraft((d) => d ? { ...d, name: e.target.value } : d)} placeholder={t("templates.templateNamePlaceholder")} className="rounded-lg dark:bg-gray-900" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t("templates.category")}</label>
              <select value={draft?.category ?? ""} onChange={(e) => setDraft((d) => d ? { ...d, category: e.target.value } : d)} className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">{t("templates.selectCategory")}</option>
                {["MoU","Magang","Pelatihan","Kunjungan Industri","Sertifikat","Surat","Lainnya"].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t("templates.orientation")}</label>
              <div className="grid grid-cols-2 gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                <Button variant="ghost" onClick={() => setDraft((d) => d ? { ...d, orientation: "Landscape" } : d)} className={toggleCls(draft?.orientation === "Landscape")}>{t("templates.landscape")}</Button>
                <Button variant="ghost" onClick={() => setDraft((d) => d ? { ...d, orientation: "Portrait" } : d)} className={toggleCls(draft?.orientation === "Portrait")}>{t("templates.portrait")}</Button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t("templates.status")}</label>
              <select
                value={(draft?.status !== undefined && draft?.status !== null && draft?.status !== "") ? draft.status : (draft?.is_layout_configured ? "ready" : "draft")}
                onChange={(e) => setDraft((d) => d ? { ...d, status: e.target.value } : null)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="draft">{t("templates.status.draft")}</option>
                <option value="ready">{t("templates.status.ready")}</option>
              </select>
            </div>
            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t("templates.templateMode")}</label>
              <div className="grid grid-cols-2 gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                <Button variant="ghost" onClick={() => setIsDualTemplate(false)} className={toggleCls(!isDualTemplate)}>{t("templates.singleSide")}</Button>
                <Button variant="ghost" onClick={() => setIsDualTemplate(true)} className={toggleCls(isDualTemplate)}>{t("templates.doubleSide")}</Button>
              </div>
            </div>
            {/* Single mode */}
            {!isDualTemplate && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t("templates.currentTemplateImage")}</label>
                  <div className="relative border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-900">
                    {imagePreview ? (
                      <div className="relative w-full h-40 bg-gray-50 dark:bg-gray-800"><Image src={imagePreview} alt="New template" fill className="object-contain" unoptimized /></div>
                    ) : draft && getTemplateImageUrl(draft as Template) ? (
                      <div className="relative w-full h-40 bg-gray-50 dark:bg-gray-800"><Image src={getTemplateImageUrl(draft as Template)!} alt="Current template" fill className="object-contain" unoptimized /></div>
                    ) : (
                      <div className="w-full h-40 flex items-center justify-center text-gray-400 bg-gray-50 dark:bg-gray-800"><Layout className="w-6 h-6 mr-2" />{t("templates.noTemplateImage")}</div>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t("templates.changeTemplateImage")}</label>
                  <input type="file" accept=".png,.jpg,.jpeg" onChange={(e) => handleImageUpload(e.target.files?.[0] || null)} className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 cursor-pointer" />
                  {imagePreview && <Button variant="outline" size="sm" className="w-full" onClick={() => handleImageUpload(null)}><X className="w-4 h-4 mr-2" />{t("templates.removeNewImage")}</Button>}
                </div>
              </>
            )}
            {/* Dual mode */}
            {isDualTemplate && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t("templates.currentCertificateImage")}</label>
                  <div className="relative border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                    {certificateImagePreview ? (
                      <div className="relative w-full h-40"><Image src={certificateImagePreview} alt="Certificate" fill className="object-contain" unoptimized /></div>
                    ) : draft && (draft as Template).certificate_image_url ? (
                      <div className="relative w-full h-40"><Image src={`${(draft as Template).certificate_image_url}?v=${Date.now()}`} alt="Current certificate" fill className="object-contain" unoptimized /></div>
                    ) : (
                      <div className="w-full h-40 flex items-center justify-center text-gray-400 bg-gray-50 dark:bg-gray-800"><Layout className="w-6 h-6 mr-2" />{t("templates.noCertificateImage")}</div>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t("templates.changeCertificateImage")}</label>
                  <input type="file" accept=".png,.jpg,.jpeg" onChange={(e) => handleCertificateImageUpload(e.target.files?.[0] || null)} className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 cursor-pointer" />
                  {certificateImagePreview && <Button variant="outline" size="sm" className="w-full" onClick={() => handleCertificateImageUpload(null)}><X className="w-4 h-4 mr-2" />{t("templates.removeNewCertificateImage")}</Button>}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t("templates.currentScoreImage")}</label>
                  <div className="relative border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                    {scoreImagePreview ? (
                      <div className="relative w-full h-40"><Image src={scoreImagePreview} alt="Score" fill className="object-contain" unoptimized /></div>
                    ) : draft && (draft as Template).score_image_url ? (
                      <div className="relative w-full h-40"><Image src={`${(draft as Template).score_image_url}?v=${Date.now()}`} alt="Current score" fill className="object-contain" unoptimized /></div>
                    ) : (
                      <div className="w-full h-40 flex items-center justify-center text-gray-400 bg-gray-50 dark:bg-gray-800"><Layout className="w-6 h-6 mr-2" />{t("templates.noScoreImage")}</div>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t("templates.changeScoreImage")}</label>
                  <input type="file" accept=".png,.jpg,.jpeg" onChange={(e) => handleScoreImageUpload(e.target.files?.[0] || null)} className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 cursor-pointer" />
                  {scoreImagePreview && <Button variant="outline" size="sm" className="w-full" onClick={() => handleScoreImageUpload(null)}><X className="w-4 h-4 mr-2" />{t("templates.removeNewScoreImage")}</Button>}
                </div>
              </>
            )}
            {/* Preview image (edit) */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t("templates.currentPreviewImage")}</label>
              <div className="relative border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                {previewImagePreview ? (
                  <div className="relative w-full h-32"><Image src={previewImagePreview} alt="Preview" fill className="object-contain" unoptimized /></div>
                ) : draft && (draft as Template).preview_image_path ? (
                  <div className="relative w-full h-32"><Image src={`${(draft as Template).preview_image_path}?v=${Date.now()}`} alt="Current preview" fill className="object-contain" unoptimized /></div>
                ) : (
                  <div className="w-full h-32 flex items-center justify-center text-gray-400 bg-gray-50 dark:bg-gray-800"><Layout className="w-6 h-6 mr-2" />{t("templates.noPreviewImage")}</div>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t("templates.changePreviewImage")}</label>
              <input type="file" accept=".png,.jpg,.jpeg" onChange={(e) => handlePreviewImageUpload(e.target.files?.[0] || null)} className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 cursor-pointer" />
              {previewImagePreview && <Button variant="outline" size="sm" className="w-full" onClick={() => handlePreviewImageUpload(null)}><X className="w-4 h-4 mr-2" />{t("templates.removeNewPreview")}</Button>}
            </div>
            <div className="flex justify-end gap-3 pt-6">
              <Button variant="outline" className="dark:text-gray-100" onClick={() => setIsEditOpen(null)}>{t("common.cancel")}</Button>
              {(role === "owner" || role === "manager") && (
                <LoadingButton className="gradient-primary text-white" onClick={submitEdit} isLoading={editingTemplate} loadingText={t("common.saving")} variant="primary">{t("members.saveChanges")}</LoadingButton>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Preview Modal ──────────────────────────────────────────────────── */}
      <Dialog open={!!previewTemplate} onOpenChange={(o) => setPreviewTemplate(o ? previewTemplate : null)}>
        <DialogContent
          className="preview-modal-content relative max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-0 animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-4 duration-300"
          onKeyDown={(e) => { if (e.key === "Escape") { e.preventDefault(); setPreviewTemplate(null); } }}>
          <DialogHeader className="space-y-1 flex-shrink-0 pb-2 sm:pb-4 px-4 sm:px-6 pt-4 sm:pt-6 border-b border-gray-200 dark:border-gray-700">
            <DialogTitle className="text-xl sm:text-2xl font-bold">{t("templates.preview") || "Template Preview"}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            {previewTemplate && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
                <div className="p-2 sm:p-4 bg-gray-50 dark:bg-gray-900">
                  {getTemplatePreviewUrl(previewTemplate) ? (
                    <div className="relative w-full aspect-[4/3] bg-gray-100 dark:bg-gray-900 rounded-lg overflow-hidden">
                      <Image src={getTemplatePreviewUrl(previewTemplate)!} alt={previewTemplate.name} fill className="object-contain border border-gray-200 dark:border-gray-700" unoptimized />
                    </div>
                  ) : (
                    <div className="aspect-[4/3] flex items-center justify-center text-gray-500 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
                      <div className="text-center"><Layout className="w-8 h-8 mx-auto mb-2 text-gray-400" /><p className="text-sm">No preview image</p></div>
                    </div>
                  )}
                </div>
                <div className="p-4 sm:p-6">
                  <div className="space-y-2">
                    <div className="text-xs sm:text-sm text-gray-500">{t("templates.templateNameLabel")}</div>
                    <div className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-900 dark:text-gray-100">{previewTemplate.name}</div>
                  </div>
                  <div className="mt-4 space-y-1 text-xs sm:text-sm">
                    <div><span className="text-gray-500">{t("templates.categoryLabel")}</span>{" "}<Badge className={`ml-2 bg-gradient-to-r ${getCategoryColor(previewTemplate.category)} text-white text-xs`}>{previewTemplate.category}</Badge></div>
                    <div><span className="text-gray-500">{t("templates.orientationLabel")}</span>{" "}<span className="font-medium">{previewTemplate.orientation}</span></div>
                    <div>
                      <span className="text-gray-500">{t("templates.statusLabel")}</span>{" "}
                      {(previewTemplate.status === "ready" || ((!previewTemplate.status || previewTemplate.status === "") && previewTemplate.is_layout_configured)) ? (
                        <Badge className="ml-2 bg-green-500 hover:bg-green-600 text-white text-xs">✓ {t("templates.status.ready")}</Badge>
                      ) : (
                        <Badge className="ml-2 bg-yellow-500 hover:bg-yellow-600 text-white text-xs">{t("templates.status.draft")}</Badge>
                      )}
                    </div>
                    {previewTemplate.created_at && (
                      <div><span className="text-gray-500">{t("templates.createdLabel")}</span>{" "}<span>{new Date(previewTemplate.created_at).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}</span></div>
                    )}
                    {previewTemplate.is_dual_template && (
                      <div><span className="text-gray-500">{t("templates.typeLabel")}</span>{" "}<span className="font-medium">{t("templates.doubleSidedType")}</span></div>
                    )}
                    {templateUsageMap.has(previewTemplate.id) && (
                      <div><span className="text-gray-500">{t("templates.usageLabel")}</span>{" "}<span className="font-medium">{t("templates.usedBy").replace("{count}", (templateUsageMap.get(previewTemplate.id) || 0).toString())}</span></div>
                    )}
                  </div>
                  {(role === "owner" || role === "manager") && (
                    <div className="mt-4 sm:mt-6 flex flex-wrap gap-2 sm:gap-3">
                      <Button className="gradient-primary text-white" onClick={() => { router.push(`/templates/configure?template=${previewTemplate.id}`); setPreviewTemplate(null); }}>
                        <Settings className="w-4 h-4 mr-2" />{t("templates.configureLayout")}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Filter Modal ───────────────────────────────────────────────────── */}
      <Dialog open={filterModalOpen} onOpenChange={setFilterModalOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); applyFilters(); } else if (e.key === "Escape") { e.preventDefault(); cancelFilters(); } }}>
          <DialogHeader className="border-b border-gray-200 dark:border-gray-700 pb-4">
            <div className="flex items-center gap-2"><Filter className="h-5 w-5 text-blue-500" /><DialogTitle className="text-gray-900 dark:text-white">Filter</DialogTitle></div>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
              <select value={tempCategoryFilter} onChange={(e) => setTempCategoryFilter(e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">All</option>
                {["MoU","Magang","Pelatihan","Kunjungan Industri","Sertifikat","Surat","Lainnya"].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Orientation</label>
              <select value={tempOrientationFilter} onChange={(e) => setTempOrientationFilter(e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">All</option>
                <option value="Landscape">Landscape</option>
                <option value="Portrait">Portrait</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
              <select value={tempStatusFilter} onChange={(e) => setTempStatusFilter(e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">All</option>
                <option value="ready">Ready</option>
                <option value="draft">Draft</option>
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
