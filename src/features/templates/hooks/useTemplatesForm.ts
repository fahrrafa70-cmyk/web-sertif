import { useState, useCallback } from "react";
import { toast } from "sonner";
import type { Template, CreateTemplateData, UpdateTemplateData } from "@/lib/supabase/templates";

function validateImageFile(file: File, t: (k: string) => string) {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (!ext || !["jpg", "jpeg", "png"].includes(ext)) {
    toast.error(t("templates.invalidFileType"));
    return false;
  }
  if (file.size > 10 * 1024 * 1024) {
    toast.error(t("templates.fileTooLarge"));
    return false;
  }
  return true;
}

export function useTemplatesForm(
  selectedTenantId: string,
  create: (data: CreateTemplateData) => Promise<unknown>,
  update: (id: string, data: UpdateTemplateData) => Promise<Template | null>,
  refresh: () => Promise<void>,
  t: (key: string) => string
) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState<null | string>(null);
  const [draft, setDraft] = useState<Partial<Template> | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [previewImageFile, setPreviewImageFile] = useState<File | null>(null);
  const [previewImagePreview, setPreviewImagePreview] = useState<string | null>(null);
  const [isDualTemplate, setIsDualTemplate] = useState(false);
  const [certificateImageFile, setCertificateImageFile] = useState<File | null>(null);
  const [certificateImagePreview, setCertificateImagePreview] = useState<string | null>(null);
  const [scoreImageFile, setScoreImageFile] = useState<File | null>(null);
  const [scoreImagePreview, setScoreImagePreview] = useState<string | null>(null);
  const [creatingTemplate, setCreatingTemplate] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(false);

  const handleImageUpload = useCallback((file: File | null) => {
    if (!file) { setImageFile(null); setImagePreview(null); return; }
    if (!validateImageFile(file, t)) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }, [t]);

  const handlePreviewImageUpload = useCallback((file: File | null) => {
    if (!file) { setPreviewImageFile(null); setPreviewImagePreview(null); return; }
    if (!validateImageFile(file, t)) return;
    setPreviewImageFile(file);
    setPreviewImagePreview(URL.createObjectURL(file));
  }, [t]);

  const handleCertificateImageUpload = useCallback((file: File | null) => {
    if (!file) { setCertificateImageFile(null); setCertificateImagePreview(null); return; }
    if (!validateImageFile(file, t)) return;
    setCertificateImageFile(file);
    setCertificateImagePreview(URL.createObjectURL(file));
  }, [t]);

  const handleScoreImageUpload = useCallback((file: File | null) => {
    if (!file) { setScoreImageFile(null); setScoreImagePreview(null); return; }
    if (!validateImageFile(file, t)) return;
    setScoreImageFile(file);
    setScoreImagePreview(URL.createObjectURL(file));
  }, [t]);

  const openCreate = useCallback(() => {
    setDraft({ name: "", orientation: "Landscape", category: "" });
    setImageFile(null); setImagePreview(null);
    setPreviewImageFile(null); setPreviewImagePreview(null);
    setIsDualTemplate(false);
    setCertificateImageFile(null); setCertificateImagePreview(null);
    setScoreImageFile(null); setScoreImagePreview(null);
    setIsCreateOpen(true);
  }, []);

  const resetFormState = useCallback(() => {
    setDraft(null);
    setImageFile(null); setImagePreview(null);
    setPreviewImageFile(null); setPreviewImagePreview(null);
    setIsDualTemplate(false);
    setCertificateImageFile(null); setCertificateImagePreview(null);
    setScoreImageFile(null); setScoreImagePreview(null);
  }, []);

  const submitCreate = useCallback(async () => {
    if (!selectedTenantId) { toast.error("Silakan pilih tenant terlebih dahulu sebelum membuat template"); return; }
    if (!draft?.name?.trim()) { toast.error(t("templates.fillTemplateName")); return; }
    if (!draft?.category?.trim()) { toast.error(t("templates.selectCategory")); return; }
    if (isDualTemplate) {
      if (!certificateImageFile) { toast.error(t("templates.uploadCertificateImage")); return; }
      if (!scoreImageFile) { toast.error(t("templates.uploadScoreImage")); return; }
    } else {
      if (!imageFile) { toast.error(t("templates.uploadTemplateImage")); return; }
    }
    try {
      setCreatingTemplate(true);
      const data: CreateTemplateData = {
        name: draft.name.trim(), category: draft.category.trim(),
        orientation: draft.orientation || "Landscape",
        tenant_id: selectedTenantId, is_dual_template: isDualTemplate,
        preview_image_file: previewImageFile || undefined,
      };
      if (isDualTemplate) {
        data.certificate_image_file = certificateImageFile || undefined;
        data.score_image_file = scoreImageFile || undefined;
      } else {
        data.image_file = imageFile || undefined;
      }
      await create(data);
      setIsCreateOpen(false);
      resetFormState();
      toast.success(t("templates.createSuccess"));
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("templates.createFailed"));
    } finally {
      setCreatingTemplate(false);
    }
  }, [selectedTenantId, draft, isDualTemplate, certificateImageFile, scoreImageFile, imageFile, previewImageFile, create, refresh, resetFormState, t]);

  const handleEditClick = useCallback((template: Template) => {
    const initialStatus =
      template.status !== undefined && template.status !== null && template.status !== ""
        ? template.status
        : template.is_layout_configured ? "ready" : "draft";
    setDraft({ ...template, status: initialStatus });
    setImageFile(null);
    setImagePreview(template.image_path || null);
    setPreviewImageFile(null);
    setPreviewImagePreview(template.preview_image_path || null);
    setIsDualTemplate(template.is_dual_template || false);
    setCertificateImageFile(null);
    setCertificateImagePreview(template.certificate_image_url || null);
    setScoreImageFile(null);
    setScoreImagePreview(template.score_image_url || null);
    setIsEditOpen(template.id);
  }, []);

  const submitEdit = useCallback(async () => {
    if (!draft || !isEditOpen || !draft.name || !draft.category) {
      toast.error(t("templates.fillRequiredFields")); return;
    }
    if (isDualTemplate) {
      if (!certificateImageFile && !draft.certificate_image_url) { toast.error(t("templates.certificateImageRequired")); return; }
      if (!scoreImageFile && !draft.score_image_url) { toast.error(t("templates.scoreImageRequired")); return; }
    } else {
      if (!imageFile && !draft.image_path) { toast.error(t("templates.templateImageRequired")); return; }
    }
    try {
      setEditingTemplate(true);
      const statusValue = (draft.status !== undefined && draft.status !== null && draft.status !== "")
        ? draft.status
        : (draft.is_layout_configured ? "ready" : "draft");
      const data: UpdateTemplateData = {
        name: draft.name, category: draft.category, orientation: draft.orientation,
        is_dual_template: isDualTemplate,
        preview_image_file: previewImageFile || undefined,
        status: statusValue,
      };
      if (isDualTemplate) {
        data.certificate_image_file = certificateImageFile || undefined;
        data.score_image_file = scoreImageFile || undefined;
      } else {
        data.image_file = imageFile || undefined;
      }
      const updated = await update(isEditOpen, data);
      if (updated && draft) {
        setDraft({
          ...draft, ...updated,
          status: updated.status || draft.status || (updated.is_layout_configured ? "ready" : "draft"),
        });
      }
      if (typeof window !== "undefined") {
        try {
          const { dataCache, CACHE_KEYS } = await import("@/lib/cache/data-cache");
          dataCache.delete(CACHE_KEYS.TEMPLATES);
        } catch { /* ignore */ }
      }
      await new Promise((r) => setTimeout(r, 500));
      await refresh();
      setIsEditOpen(null);
      resetFormState();
      toast.success(t("templates.updateSuccess"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("templates.updateFailed"));
    } finally {
      setEditingTemplate(false);
    }
  }, [draft, isEditOpen, isDualTemplate, certificateImageFile, scoreImageFile, imageFile, previewImageFile, update, refresh, resetFormState, t]);

  return {
    isCreateOpen, setIsCreateOpen, openCreate, submitCreate, creatingTemplate,
    isEditOpen, setIsEditOpen, handleEditClick, submitEdit, editingTemplate,
    draft, setDraft,
    isDualTemplate, setIsDualTemplate,
    imageFile, imagePreview, handleImageUpload,
    previewImageFile, previewImagePreview, handlePreviewImageUpload,
    certificateImageFile, certificateImagePreview, handleCertificateImageUpload,
    scoreImageFile, scoreImagePreview, handleScoreImageUpload,
  };
}
