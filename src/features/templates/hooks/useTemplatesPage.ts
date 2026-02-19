"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";
import { useLanguage } from "@/contexts/language-context";
import { useDebounce } from "@/hooks/use-debounce";
import { useTemplates } from "@/hooks/use-templates";
import { Template, CreateTemplateData, UpdateTemplateData, getTemplatePreviewUrl } from "@/lib/supabase/templates";
import { getCertificatesByTemplate } from "@/lib/supabase/certificates";
import { getTenantsForCurrentUser, type Tenant } from "@/lib/supabase/tenants";
import { confirmToast } from "@/lib/ui/confirm";

type PageRole = "owner" | "manager" | "staff" | "user" | "public";

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

export function useTemplatesPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const { role: authRole } = useAuth();

  // ── role ──────────────────────────────────────────────────────────────────
  const [role, setRole] = useState<PageRole>("public");
  useEffect(() => {
    if (authRole) {
      const n = authRole.toLowerCase();
      const mapped: PageRole =
        n === "owner" || n === "manager" || n === "staff"
          ? (n as "owner" | "manager" | "staff")
          : n === "user" ? "user" : "public";
      setRole(mapped);
    }
  }, [authRole]);

  // ── document title ────────────────────────────────────────────────────────
  useEffect(() => {
    const set = () => { if (typeof document !== "undefined") document.title = "Templates | Certify - Certificate Platform"; };
    set();
    const ts = [setTimeout(set, 50), setTimeout(set, 200), setTimeout(set, 500)];
    return () => ts.forEach(clearTimeout);
  }, []);

  // ── tenants ───────────────────────────────────────────────────────────────
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState("");
  const [loadingTenants, setLoadingTenants] = useState(true);

  useEffect(() => {
    const run = async () => {
      try {
        setLoadingTenants(true);
        const data = await getTenantsForCurrentUser();
        setTenants(data);
        let initialId = "";
        try {
          const stored = window.localStorage.getItem("ecert-selected-tenant-id") || "";
          if (stored && data.some((t) => t.id === stored)) initialId = stored;
        } catch { /* ignore */ }
        if (!initialId && data.length === 1) initialId = data[0].id;
        setSelectedTenantId(initialId);
      } finally {
        setLoadingTenants(false);
      }
    };
    void run();
  }, []);

  const handleTenantChange = useCallback((id: string) => {
    setSelectedTenantId(id);
    try { window.localStorage.setItem("ecert-selected-tenant-id", id); } catch { /* ignore */ }
  }, []);

  const selectedTenant = useMemo(
    () => tenants.find((t) => t.id === selectedTenantId) || null,
    [tenants, selectedTenantId]
  );

  // ── templates hook ────────────────────────────────────────────────────────
  const { templates, loading, error, create, update, delete: deleteTemplate, refresh } = useTemplates();

  // ── search & filter ───────────────────────────────────────────────────────
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 100);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [orientationFilter, setOrientationFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [tempCategoryFilter, setTempCategoryFilter] = useState("");
  const [tempOrientationFilter, setTempOrientationFilter] = useState("");
  const [tempStatusFilter, setTempStatusFilter] = useState("");

  const openFilterModal = useCallback(() => {
    setTempCategoryFilter(categoryFilter);
    setTempOrientationFilter(orientationFilter);
    setTempStatusFilter(statusFilter);
    setFilterModalOpen(true);
  }, [categoryFilter, orientationFilter, statusFilter]);

  const applyFilters = useCallback(() => {
    setCategoryFilter(tempCategoryFilter);
    setOrientationFilter(tempOrientationFilter);
    setStatusFilter(tempStatusFilter);
    setFilterModalOpen(false);
  }, [tempCategoryFilter, tempOrientationFilter, tempStatusFilter]);

  const cancelFilters = useCallback(() => {
    setTempCategoryFilter(categoryFilter);
    setTempOrientationFilter(orientationFilter);
    setTempStatusFilter(statusFilter);
    setFilterModalOpen(false);
  }, [categoryFilter, orientationFilter, statusFilter]);

  const filtered = useMemo(() => {
    if (!templates.length || !selectedTenantId) return [];
    let list = templates.filter((t) => t.tenant_id === selectedTenantId);
    if (!list.length) return [];
    if (categoryFilter) { list = list.filter((t) => t.category === categoryFilter); if (!list.length) return []; }
    if (orientationFilter) { list = list.filter((t) => t.orientation === orientationFilter); if (!list.length) return []; }
    if (statusFilter === "ready") { list = list.filter((t) => t.is_layout_configured); if (!list.length) return []; }
    else if (statusFilter === "draft") { list = list.filter((t) => !t.is_layout_configured); if (!list.length) return []; }
    if (debouncedQuery) {
      const q = debouncedQuery.toLowerCase().trim();
      if (q) list = list.filter((t) => t.name.toLowerCase().includes(q) || t.category.toLowerCase().includes(q));
    }
    return list;
  }, [templates, debouncedQuery, categoryFilter, orientationFilter, statusFilter, selectedTenantId]);

  // ── modal & form state ────────────────────────────────────────────────────
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
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);
  const [creatingTemplate, setCreatingTemplate] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(false);
  const [templateUsageMap, setTemplateUsageMap] = useState<Map<string, number>>(new Map());
  const [configuringTemplateId, setConfiguringTemplateId] = useState<string | null>(null);

  const canDelete = role === "owner" || role === "manager";

  // ── image upload helpers ──────────────────────────────────────────────────
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

  // ── open create ───────────────────────────────────────────────────────────
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

  // ── submit create ─────────────────────────────────────────────────────────
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

  // ── open edit ─────────────────────────────────────────────────────────────
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

  // ── submit edit ───────────────────────────────────────────────────────────
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

  // ── delete ────────────────────────────────────────────────────────────────
  const requestDelete = useCallback(async (id: string) => {
    if (!canDelete) { toast.error(t("templates.deleteNoPermission")); return; }
    const template = templates.find((t) => t.id === id);
    const templateName = template?.name || "this template";
    try {
      const certs = await getCertificatesByTemplate(id);
      if (certs && certs.length > 0) {
        toast.error(t("templates.cannotDeleteInUse").replace("{name}", templateName).replace("{count}", certs.length.toString()));
        return;
      }
    } catch {
      toast.warning(t("templates.cannotVerifyUsage"));
    }
    const ok = await confirmToast(
      t("templates.deleteConfirm").replace("{name}", templateName),
      { confirmText: t("common.delete"), tone: "destructive" }
    );
    if (ok) {
      try {
        setDeletingTemplateId(id);
        await deleteTemplate(id);
        toast.success(t("templates.deleteSuccess").replace("{name}", templateName));
      } catch (e) {
        toast.error(e instanceof Error ? e.message : t("templates.deleteFailed"));
      } finally {
        setDeletingTemplateId(null);
      }
    }
  }, [canDelete, templates, deleteTemplate, t]);

  // ── configure / preview ───────────────────────────────────────────────────
  const handleConfigureClick = useCallback((templateId: string) => {
    setConfiguringTemplateId(templateId);
    setTimeout(() => {
      try {
        router.push(`/templates/configure?template=${templateId}`);
      } catch {
        setConfiguringTemplateId(null);
      }
    }, 0);
  }, [router]);

  const handlePreviewClick = useCallback((template: Template) => {
    setPreviewTemplate(template);
  }, []);

  const getTemplateUrl = useCallback((template: Template): string | null => {
    return getTemplatePreviewUrl(template);
  }, []);

  return {
    // role
    role, canDelete,
    // tenants
    tenants, selectedTenantId, loadingTenants, selectedTenant,
    handleTenantChange,
    // templates & loading
    templates, loading, error, refresh, filtered,
    // search & filter
    query, setQuery,
    categoryFilter, orientationFilter, statusFilter,
    tempCategoryFilter, setTempCategoryFilter,
    tempOrientationFilter, setTempOrientationFilter,
    tempStatusFilter, setTempStatusFilter,
    filterModalOpen, setFilterModalOpen,
    openFilterModal, applyFilters, cancelFilters,
    // create
    isCreateOpen, setIsCreateOpen, openCreate, submitCreate, creatingTemplate,
    // edit
    isEditOpen, setIsEditOpen, handleEditClick, submitEdit, editingTemplate,
    // shared form state
    draft, setDraft,
    isDualTemplate, setIsDualTemplate,
    imageFile, imagePreview, handleImageUpload,
    previewImageFile, previewImagePreview, handlePreviewImageUpload,
    certificateImageFile, certificateImagePreview, handleCertificateImageUpload,
    scoreImageFile, scoreImagePreview, handleScoreImageUpload,
    // delete
    deletingTemplateId, requestDelete,
    // preview modal
    previewTemplate, setPreviewTemplate, handlePreviewClick,
    // configure
    configuringTemplateId, handleConfigureClick,
    // template usage
    templateUsageMap, setTemplateUsageMap,
    // url helper
    getTemplateUrl,
    // i18n
    t,
  };
}
