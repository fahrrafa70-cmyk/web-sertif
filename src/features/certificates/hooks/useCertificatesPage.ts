import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useLanguage } from "@/contexts/language-context";
import { useCertificates } from "@/hooks/use-certificates";
import { toast } from "sonner";
import { confirmToast } from "@/lib/ui/confirm";
import {
  Tenant,
  getTenantsForCurrentUser,
  getCurrentUserTenantRole,
} from "@/lib/supabase/tenants";
import { Certificate } from "@/lib/supabase/certificates";
import { supabaseClient } from "@/lib/supabase/client";
import {
  Template,
  getTemplate,
} from "@/lib/supabase/templates";
import {
  getTemplateDefaults,
  TemplateDefaults,
} from "@/lib/storage/template-defaults";
import { STANDARD_CANVAS_WIDTH, STANDARD_CANVAS_HEIGHT } from "@/lib/constants/canvas";
import { formatReadableDate } from "@/lib/utils/certificate-formatters";

// Pre-existing extracted hooks (shared with hero-section.tsx)
import { useCertificateExport } from "./useCertificateExport";
import { useCertificateEmail } from "./useCertificateEmail";

// New page-specific extracted hooks
import { useCertificateState } from "./useCertificateState";
import { useCertificateGenerate } from "./useCertificateGenerate";

export { formatReadableDate };

export function useCertificatesPage() {
  const { t, language } = useLanguage();
  const params = useSearchParams();
  const certQuery = (params?.get("cert") || "").toLowerCase();

  // ─── Tenant state ───────────────────────────────────────────────────────────
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>("");
  const [loadingTenants, setLoadingTenants] = useState<boolean>(true);
  const [tenantRole, setTenantRole] = useState<"owner" | "manager" | "staff" | null>(null);

  useEffect(() => {
    const load = async () => {
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
    void load();
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!selectedTenantId) { setTenantRole(null); return; }
      try {
        const role = await getCurrentUserTenantRole(selectedTenantId);
        setTenantRole(role);
      } catch { setTenantRole(null); }
    };
    void load();
  }, [selectedTenantId]);

  // ─── Certificates hook ───────────────────────────────────────────────────────
  const { certificates, loading, error, update, delete: deleteCert, refresh } = useCertificates();

  // ─── Helper functions ────────────────────────────────────────────────────────
  const formatDateShort = useCallback(
    (input?: string | null) => {
      if (!input) return "—";
      const d = new Date(input);
      if (isNaN(d.getTime())) return "—";
      const month = d.toLocaleString(language === "id" ? "id-ID" : "en-US", { month: "short" });
      return `${d.getDate()} ${month} ${d.getFullYear()}`;
    },
    [language]
  );

  const isCertificateExpired = useCallback((certificate: Certificate): boolean => {
    if (!certificate.expired_date) return false;
    try {
      const exp = new Date(certificate.expired_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      exp.setHours(0, 0, 0, 0);
      return exp < today;
    } catch { return false; }
  }, []);

  const getExpiredOverlayUrl = useCallback(() => {
    try {
      const { data } = supabaseClient.storage.from("templates").getPublicUrl("expired.png");
      return data?.publicUrl || null;
    } catch { return null; }
  }, []);

  const handleOpenImagePreview = useCallback((url: string | null | undefined, updatedAt?: string | null) => {
    if (!url) return;
    let imageUrl = url;
    if (/^https?:\/\//i.test(imageUrl) || imageUrl.startsWith("data:")) {
      window.open(imageUrl, "_blank", "noopener,noreferrer");
      return;
    }
    if (!imageUrl.startsWith("/")) imageUrl = `/${imageUrl}`;
    if (updatedAt) imageUrl = `${imageUrl}?v=${new Date(updatedAt).getTime()}`;
    if (typeof window !== "undefined") imageUrl = `${window.location.origin}${imageUrl}`;
    window.open(imageUrl, "_blank", "noopener,noreferrer");
  }, []);

  // ─── Extracted hooks ─────────────────────────────────────────────────────────
  const stateOps = useCertificateState({ certificates, selectedTenantId, certQuery });
  const exportBase = useCertificateExport({ t });
  const emailOps = useCertificateEmail({ t });
  const generateOps = useCertificateGenerate({ selectedTenantId, refresh, t });

  // Page-level loading state wrappers for export (the base hook is stateless)
  const [exportingPDF, setExportingPDF] = useState<string | null>(null);
  const [exportingPNG, setExportingPNG] = useState<string | null>(null);
  const [generatingLink, setGeneratingLink] = useState<string | null>(null);

  const exportToPDF = useCallback(async (certificate: Certificate) => {
    if (isCertificateExpired(certificate)) {
      toast.error(language === "id" ? "Sertifikat kadaluarsa tidak dapat diexport" : "Expired certificates cannot be exported", { duration: 2000 }); return;
    }
    setExportingPDF(certificate.id);
    try { await exportBase.exportToPDF(certificate); } finally { setExportingPDF(null); }
  }, [exportBase, isCertificateExpired, language]);

  const exportToPNG = useCallback(async (certificate: Certificate) => {
    if (isCertificateExpired(certificate)) {
      toast.error(language === "id" ? "Sertifikat kadaluarsa tidak dapat diunduh PNG-nya" : "Expired certificates cannot be downloaded as PNG", { duration: 2000 }); return;
    }
    setExportingPNG(certificate.id);
    try { await exportBase.exportToPNG(certificate); } finally { setExportingPNG(null); }
  }, [exportBase, isCertificateExpired, language]);

  const generateCertificateLink = useCallback(async (certificate: Certificate) => {
    setGeneratingLink(certificate.id);
    try { await exportBase.generateCertificateLink(certificate); } finally { setGeneratingLink(null); }
  }, [exportBase]);

  // Alias sendPreviewSrc (singular, from useCertificateEmail) to sendPreviewSrcs {cert, score}
  const sendPreviewSrcs = { cert: emailOps.sendPreviewSrc, score: null };


  // ─── Edit certificate ─────────────────────────────────────────────────────────
  const [isEditOpen, setIsEditOpen] = useState<null | string>(null);
  const [draft, setDraft] = useState<Certificate | null>(null);

  function openEdit(certificate: Certificate) {
    setDraft({ ...certificate });
    setIsEditOpen(certificate.id);
  }

  async function submitEdit() {
    if (!draft || !isEditOpen) return;
    try {
      await update(isEditOpen, { certificate_no: draft.certificate_no, name: draft.name, description: draft.description || undefined, issue_date: draft.issue_date, expired_date: draft.expired_date || undefined, category: draft.category || undefined });
      toast.success(t("certificates.updateSuccess"), { duration: 2000 });
      setIsEditOpen(null); setDraft(null);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : t("certificates.updateFailed"), { duration: 2000 });
    }
  }

  // ─── Delete certificate ───────────────────────────────────────────────────────
  const [deletingCertificateId, setDeletingCertificateId] = useState<string | null>(null);
  const canDelete = tenantRole === "owner" || tenantRole === "manager";

  async function requestDelete(id: string) {
    if (!canDelete) { toast.error(t("certificates.deleteNoPermission"), { duration: 2000 }); return; }
    const certificate = certificates.find((c) => c.id === id);
    const certificateName = certificate?.name || "this certificate";
    const deleteMessage = t("certificates.deleteConfirm").replace("{name}", certificateName).replace("{number}", certificate?.certificate_no || "");
    const confirmed = await confirmToast(deleteMessage, { confirmText: t("common.delete"), tone: "destructive" });
    if (confirmed) {
      try {
        setDeletingCertificateId(id);
        await deleteCert(id);
        toast.success(t("certificates.deleteSuccess").replace("{name}", certificateName), { duration: 2000 });
      } catch (error: unknown) {
        toast.error(error instanceof Error ? error.message : t("certificates.deleteFailed"), { duration: 2000 });
      } finally { setDeletingCertificateId(null); }
    }
  }

  // ─── Member detail ────────────────────────────────────────────────────────────
  const [detailMember, setDetailMember] = useState<{ name?: string; email?: string; phone?: string; organization?: string; job?: string; date_of_birth?: string | null; city?: string; address?: string; notes?: string; created_at?: string; updated_at?: string } | null>(null);
  const [loadingMemberDetail, setLoadingMemberDetail] = useState(false);

  // ─── Preview modal ────────────────────────────────────────────────────────────
  const [previewCertificate, setPreviewCertificate] = useState<Certificate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [previewMode, setPreviewMode] = useState<"certificate" | "score" | "combined">("certificate");
  const [scoreDefaults, setScoreDefaults] = useState<TemplateDefaults | null>(null);
  const [memberDetailOpen, setMemberDetailOpen] = useState<boolean>(false);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [containerDimensions, setContainerDimensions] = useState<{ width: number; height: number } | null>(null);

  async function openPreview(certificate: Certificate) {
    setPreviewCertificate(certificate);
    setPreviewMode("certificate");
    if (certificate.template_id) {
      try {
        const template = await getTemplate(certificate.template_id);
        setPreviewTemplate(template);
        try { setScoreDefaults(template ? getTemplateDefaults(`${template.id}_score`) : null); }
        catch { setScoreDefaults(null); }
      } catch { setPreviewTemplate(null); }
    }
  }

  useEffect(() => {
    const updateDimensions = () => {
      if (!previewContainerRef.current) return;
      const rect = previewContainerRef.current.getBoundingClientRect();
      const ca = rect.width / rect.height;
      const ia = STANDARD_CANVAS_WIDTH / STANDARD_CANVAS_HEIGHT;
      let iw = rect.width, ih = rect.height;
      if (ca > ia) { iw = rect.height * ia; ih = rect.height; }
      else { iw = rect.width; ih = rect.width / ia; }
      setContainerDimensions({ width: iw, height: ih });
    };
    const raf = () => requestAnimationFrame(() => requestAnimationFrame(updateDimensions));
    updateDimensions(); raf();
    const t1 = setTimeout(raf, 16); const t2 = setTimeout(raf, 50); const t3 = setTimeout(raf, 100); const t4 = setTimeout(raf, 200); const t5 = setTimeout(raf, 500); const t6 = setTimeout(raf, 1000);
    window.addEventListener("resize", raf);
    const ro = new ResizeObserver(() => requestAnimationFrame(updateDimensions));
    if (previewContainerRef.current) ro.observe(previewContainerRef.current);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); clearTimeout(t5); clearTimeout(t6); window.removeEventListener("resize", raf); ro.disconnect(); };
  }, [previewMode, previewCertificate]);

  return {
    // Tenant
    tenants, selectedTenantId, setSelectedTenantId, loadingTenants, tenantRole,
    // Certificates data
    certificates, loading, error, refresh,
    // Helper functions
    formatDateShort, isCertificateExpired, getExpiredOverlayUrl, handleOpenImagePreview, language, t,
    // State (search, filter, pagination)
    ...stateOps,
    // Export & link
    exportingPDF, exportingPNG, generatingLink, exportToPDF, exportToPNG, generateCertificateLink,
    // Email
    ...emailOps,
    setSendModalOpen: emailOps.closeSendModal,
    setSendFormErrors: undefined as unknown as React.Dispatch<React.SetStateAction<{ email?: string; subject?: string; message?: string }>>,
    sendPreviewSrcs,
    // Generate
    ...generateOps,
    // Edit
    isEditOpen, setIsEditOpen, draft, setDraft, openEdit, submitEdit,
    // Delete
    deletingCertificateId, canDelete, requestDelete,
    // Preview
    previewCertificate, setPreviewCertificate, previewTemplate, previewMode, setPreviewMode,
    scoreDefaults, previewContainerRef, containerDimensions, openPreview,
    memberDetailOpen, setMemberDetailOpen, detailMember, setDetailMember, loadingMemberDetail, setLoadingMemberDetail,
    // Params
    certQuery,
  };
}
