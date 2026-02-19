"use client";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LoadingButton } from "@/components/ui/loading-button";
import type { Template } from "@/features/templates/types";

const CATEGORIES = ["MoU","Magang","Pelatihan","Kunjungan Industri","Sertifikat","Surat","Lainnya"];
const toggleCls = (active: boolean) =>
  `rounded-md transition-all ${active ? "bg-blue-600 text-white shadow-sm dark:bg-blue-500 hover:bg-blue-700 border border-transparent" : "bg-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700/50 border border-gray-300 dark:border-gray-600"}`;

interface TemplateFormDraft extends Partial<Template> {}

interface AddTemplateDialogProps {
  isCreateOpen: boolean;
  setIsCreateOpen: (v: boolean) => void;
  draft: TemplateFormDraft | null;
  setDraft: React.Dispatch<React.SetStateAction<Partial<Template> | null>>;
  isDualTemplate: boolean;
  setIsDualTemplate: (v: boolean) => void;
  imagePreview: string | null;
  certificateImagePreview: string | null;
  scoreImagePreview: string | null;
  previewImagePreview: string | null;
  handleImageUpload: (f: File | null) => void;
  handlePreviewImageUpload: (f: File | null) => void;
  handleCertificateImageUpload: (f: File | null) => void;
  handleScoreImageUpload: (f: File | null) => void;
  submitCreate: () => void;
  creatingTemplate: boolean;
  t: (key: string) => string;
}

export function AddTemplateDialog({
  isCreateOpen, setIsCreateOpen, draft, setDraft, isDualTemplate, setIsDualTemplate,
  imagePreview, certificateImagePreview, scoreImagePreview, previewImagePreview,
  handleImageUpload, handlePreviewImageUpload, handleCertificateImageUpload, handleScoreImageUpload,
  submitCreate, creatingTemplate, t,
}: AddTemplateDialogProps) {
  return (
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
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
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
            <ImageFieldCreate label={t("templates.templateImage")} preview={imagePreview} onChange={handleImageUpload} />
          )}
          {isDualTemplate && (
            <>
              <ImageFieldCreate label={t("templates.certificateImage")} preview={certificateImagePreview} onChange={handleCertificateImageUpload} />
              <ImageFieldCreate label={t("templates.scoreImage")} preview={scoreImagePreview} onChange={handleScoreImageUpload} />
            </>
          )}
          <ImageFieldCreate label={t("templates.previewImage")} preview={previewImagePreview} onChange={handlePreviewImageUpload} />
          <div className="flex justify-end gap-3 pt-6">
            <Button variant="outline" className="dark:text-gray-100" onClick={() => setIsCreateOpen(false)}>{t("common.cancel")}</Button>
            <LoadingButton className="gradient-primary text-white" onClick={submitCreate} isLoading={creatingTemplate} loadingText={t("common.saving")} variant="primary">{t("templates.create")}</LoadingButton>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ImageFieldCreate({ label, preview, onChange }: { label: string; preview: string | null; onChange: (f: File | null) => void; }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{label}</label>
      <div className="space-y-3">
        <input type="file" accept=".png,.jpg,.jpeg" onChange={(e) => onChange(e.target.files?.[0] || null)}
          className="block w-full text-sm text-gray-700 dark:text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 dark:file:bg-blue-900/30 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100 cursor-pointer" />
        {preview && (
          <div className="relative w-full h-32">
            <Image src={preview} alt={label} fill className="object-cover rounded-lg border border-gray-200 dark:border-gray-700" unoptimized />
          </div>
        )}
      </div>
    </div>
  );
}
