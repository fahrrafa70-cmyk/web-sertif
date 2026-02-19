"use client";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LoadingButton } from "@/components/ui/loading-button";
import { Layout, X } from "lucide-react";
import { getTemplateImageUrl } from "@/lib/supabase/templates";
import type { Template } from "@/features/templates/types";

const CATEGORIES = ["MoU","Magang","Pelatihan","Kunjungan Industri","Sertifikat","Surat","Lainnya"];
const toggleCls = (active: boolean) =>
  `rounded-md transition-all ${active ? "bg-blue-600 text-white shadow-sm dark:bg-blue-500 hover:bg-blue-700 border border-transparent" : "bg-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700/50 border border-gray-300 dark:border-gray-600"}`;

interface EditTemplateDialogProps {
  isEditOpen: string | null;
  setIsEditOpen: (v: string | null) => void;
  draft: Partial<Template> | null;
  setDraft: React.Dispatch<React.SetStateAction<Partial<Template> | null>>;
  isDualTemplate: boolean;
  setIsDualTemplate: (v: boolean) => void;
  role: string | null;
  imagePreview: string | null;
  certificateImagePreview: string | null;
  scoreImagePreview: string | null;
  previewImagePreview: string | null;
  handleImageUpload: (f: File | null) => void;
  handlePreviewImageUpload: (f: File | null) => void;
  handleCertificateImageUpload: (f: File | null) => void;
  handleScoreImageUpload: (f: File | null) => void;
  submitEdit: () => void;
  editingTemplate: boolean;
  t: (key: string) => string;
}

export function EditTemplateDialog({
  isEditOpen, setIsEditOpen, draft, setDraft, isDualTemplate, setIsDualTemplate, role,
  imagePreview, certificateImagePreview, scoreImagePreview, previewImagePreview,
  handleImageUpload, handlePreviewImageUpload, handleCertificateImageUpload, handleScoreImageUpload,
  submitEdit, editingTemplate, t,
}: EditTemplateDialogProps) {
  return (
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
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
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
          {/* Single mode images */}
          {!isDualTemplate && (
            <>
              <CurrentImageField label={t("templates.currentTemplateImage")} preview={imagePreview} draft={draft} getUrl={(d) => getTemplateImageUrl(d as Template)} noImageLabel={t("templates.noTemplateImage")} />
              <ChangeImageField label={t("templates.changeTemplateImage")} preview={imagePreview} onChange={handleImageUpload} removeLabel={t("templates.removeNewImage")} />
            </>
          )}
          {/* Dual mode images */}
          {isDualTemplate && (
            <>
              <CurrentImageField label={t("templates.currentCertificateImage")} preview={certificateImagePreview} draft={draft} getUrl={(d) => (d as Template).certificate_image_url ? `${(d as Template).certificate_image_url}?v=${Date.now()}` : null} noImageLabel={t("templates.noCertificateImage")} />
              <ChangeImageField label={t("templates.changeCertificateImage")} preview={certificateImagePreview} onChange={handleCertificateImageUpload} removeLabel={t("templates.removeNewCertificateImage")} />
              <CurrentImageField label={t("templates.currentScoreImage")} preview={scoreImagePreview} draft={draft} getUrl={(d) => (d as Template).score_image_url ? `${(d as Template).score_image_url}?v=${Date.now()}` : null} noImageLabel={t("templates.noScoreImage")} />
              <ChangeImageField label={t("templates.changeScoreImage")} preview={scoreImagePreview} onChange={handleScoreImageUpload} removeLabel={t("templates.removeNewScoreImage")} />
            </>
          )}
          {/* Preview image */}
          <CurrentImageField label={t("templates.currentPreviewImage")} preview={previewImagePreview} draft={draft} getUrl={(d) => (d as Template).preview_image_path ? `${(d as Template).preview_image_path}?v=${Date.now()}` : null} noImageLabel={t("templates.noPreviewImage")} height="h-32" />
          <ChangeImageField label={t("templates.changePreviewImage")} preview={previewImagePreview} onChange={handlePreviewImageUpload} removeLabel={t("templates.removeNewPreview")} />
          <div className="flex justify-end gap-3 pt-6">
            <Button variant="outline" className="dark:text-gray-100" onClick={() => setIsEditOpen(null)}>{t("common.cancel")}</Button>
            {(role === "owner" || role === "manager") && (
              <LoadingButton className="gradient-primary text-white" onClick={submitEdit} isLoading={editingTemplate} loadingText={t("common.saving")} variant="primary">{t("members.saveChanges")}</LoadingButton>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CurrentImageField({ label, preview, draft, getUrl, noImageLabel, height = "h-40" }: {
  label: string; preview: string | null; draft: Template | null;
  getUrl: (d: Template) => string | null; noImageLabel: string; height?: string;
}) {
  const url = draft ? getUrl(draft) : null;
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{label}</label>
      <div className="relative border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-900">
        {preview ? (
          <div className={`relative w-full ${height} bg-gray-50 dark:bg-gray-800`}><Image src={preview} alt="New" fill className="object-contain" unoptimized /></div>
        ) : url ? (
          <div className={`relative w-full ${height} bg-gray-50 dark:bg-gray-800`}><Image src={url} alt="Current" fill className="object-contain" unoptimized /></div>
        ) : (
          <div className={`w-full ${height} flex items-center justify-center text-gray-400 bg-gray-50 dark:bg-gray-800`}><Layout className="w-6 h-6 mr-2" />{noImageLabel}</div>
        )}
      </div>
    </div>
  );
}

function ChangeImageField({ label, preview, onChange, removeLabel }: {
  label: string; preview: string | null; onChange: (f: File | null) => void; removeLabel: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{label}</label>
      <input type="file" accept=".png,.jpg,.jpeg" onChange={(e) => onChange(e.target.files?.[0] || null)} className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 cursor-pointer" />
      {preview && <Button variant="outline" size="sm" className="w-full" onClick={() => onChange(null)}><X className="w-4 h-4 mr-2" />{removeLabel}</Button>}
    </div>
  );
}
