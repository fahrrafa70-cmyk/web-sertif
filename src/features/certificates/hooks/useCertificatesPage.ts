import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useLanguage } from "@/contexts/language-context";
import { useDebounce } from "@/hooks/use-debounce";
import { useCertificates } from "@/hooks/use-certificates";
import { toast } from "sonner";
import { confirmToast } from "@/lib/ui/confirm";
import {
  Tenant,
  getTenantsForCurrentUser,
  getCurrentUserTenantRole,
} from "@/lib/supabase/tenants";
import {
  Certificate,
  createCertificate,
  CreateCertificateData,
  generateCertificateNumber,
} from "@/lib/supabase/certificates";
import { supabaseClient } from "@/lib/supabase/client";
import {
  Template,
  getTemplate,
  getTemplateImageUrl,
  getTemplateLayout,
  getTemplatesForTenant,
} from "@/lib/supabase/templates";
import { Member, getMembersForTenant } from "@/lib/supabase/members";
import {
  getTemplateDefaults,
  TemplateDefaults,
  TextLayerDefault,
  PhotoLayerDefault,
} from "@/lib/storage/template-defaults";
import {
  TemplateLayoutConfig,
  TextLayerConfig,
  PhotoLayerConfig,
  QRCodeLayerConfig,
} from "@/types/template-layout";
import { renderCertificateToDataURL, RenderTextLayer } from "@/lib/render/certificate-render";
import { generateThumbnail } from "@/lib/utils/thumbnail";
import { STANDARD_CANVAS_WIDTH, STANDARD_CANVAS_HEIGHT } from "@/lib/constants/canvas";
import { formatDateString, formatReadableDate } from "@/lib/utils/certificate-formatters";
import { autoPopulatePrestasi } from "@/lib/utils/score-predicates";
import { replaceVariables, replaceVariablesInRichText } from "@/lib/utils/variable-parser";
import { generatePairedXIDFilenames } from "@/lib/utils/generate-xid";
import { QuickGenerateParams } from "@/components/certificate/QuickGenerateModal";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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

  // ─── Search / filter / pagination ───────────────────────────────────────────
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearchInput = useDebounce(searchInput, 100);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [tempCategoryFilter, setTempCategoryFilter] = useState("");
  const [tempDateFilter, setTempDateFilter] = useState("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

  useEffect(() => {
    const check = () => setItemsPerPage(window.innerWidth < 768 ? 5 : 10);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const filtered = useMemo(() => {
    if (!selectedTenantId) return [];
    let certs = certificates.filter((c) => c.tenant_id === selectedTenantId);
    const q = (debouncedSearchInput || certQuery || "").toLowerCase();
    if (q) {
      certs = certs.filter(
        (c) =>
          c.certificate_no.toLowerCase().includes(q) ||
          c.name.toLowerCase().includes(q) ||
          (c.description && c.description.toLowerCase().includes(q))
      );
    }
    if (categoryFilter) certs = certs.filter((c) => c.category === categoryFilter);
    if (dateFilter) certs = certs.filter((c) => c.issue_date === dateFilter);
    return certs;
  }, [certificates, debouncedSearchInput, certQuery, categoryFilter, dateFilter, selectedTenantId]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentCertificates = useMemo(
    () => filtered.slice(indexOfFirstItem, indexOfLastItem),
    [filtered, indexOfFirstItem, indexOfLastItem]
  );
  const totalPages = useMemo(
    () => Math.ceil(filtered.length / itemsPerPage),
    [filtered, itemsPerPage]
  );

  useEffect(() => { setCurrentPage(1); }, [searchInput, categoryFilter, dateFilter]);
  useEffect(() => { setCurrentPage(1); }, [itemsPerPage]);

  const openFilterModal = () => {
    setTempCategoryFilter(categoryFilter);
    setTempDateFilter(dateFilter);
    setFilterModalOpen(true);
  };
  const applyFilters = () => {
    setCategoryFilter(tempCategoryFilter);
    setDateFilter(tempDateFilter);
    setFilterModalOpen(false);
  };
  const cancelFilters = () => {
    setTempCategoryFilter(categoryFilter);
    setTempDateFilter(dateFilter);
    setFilterModalOpen(false);
  };

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

  // ─── Export ──────────────────────────────────────────────────────────────────
  const [exportingPDF, setExportingPDF] = useState<string | null>(null);
  const [exportingPNG, setExportingPNG] = useState<string | null>(null);
  const [generatingLink, setGeneratingLink] = useState<string | null>(null);

  async function exportToPDF(certificate: Certificate) {
    if (isCertificateExpired(certificate)) {
      toast.error(language === "id" ? "Sertifikat kadaluarsa tidak dapat diexport" : "Expired certificates cannot be exported", { duration: 2000 });
      return;
    }
    if (!certificate.certificate_image_url) {
      toast.error("Certificate image not available to export", { duration: 2000 });
      return;
    }
    try {
      setExportingPDF(certificate.id);
      const mod = (await import("jspdf").catch(() => null)) as null | typeof import("jspdf");
      if (!mod || !("jsPDF" in mod)) { toast.error("PDF library missing."); return; }
      const { jsPDF } = mod;

      async function fetchImage(urlRaw: string) {
        let s = urlRaw || "";
        if (s && !/^https?:\/\//i.test(s) && !s.startsWith("/") && !s.startsWith("data:")) s = `/${s}`;
        const cb = certificate.updated_at ? `?v=${new Date(certificate.updated_at).getTime()}` : "";
        const withBust = s.startsWith("/") ? `${s}${cb}` : s;
        const src = withBust.startsWith("/") && typeof window !== "undefined" ? `${window.location.origin}${withBust}` : withBust;
        const resp = await fetch(src);
        if (!resp.ok) throw new Error(`Failed to fetch image: ${resp.status}`);
        const blob = await resp.blob();
        const dataUrl = await new Promise<string>((res, rej) => {
          const r = new FileReader(); r.onloadend = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(blob);
        });
        const bm = await createImageBitmap(blob);
        const dims = { w: bm.width, h: bm.height }; bm.close();
        return { dataUrl, dims, mime: blob.type };
      }

      const main = await fetchImage(certificate.certificate_image_url);
      const imgType = main.mime.includes("png") ? "PNG" : "JPEG";
      const orientation = main.dims.w >= main.dims.h ? "l" : "p";
      const doc = new jsPDF({ orientation, unit: "mm", format: "a4" });

      function addCentered(dataUrl: string, dims: { w: number; h: number }) {
        const pw = doc.internal.pageSize.getWidth(), ph = doc.internal.pageSize.getHeight(), m = 8;
        const sc = Math.min((pw - m * 2) / dims.w, (ph - m * 2) / dims.h);
        const dw = dims.w * sc, dh = dims.h * sc;
        doc.addImage(dataUrl, imgType, (pw - dw) / 2, (ph - dh) / 2, dw, dh, undefined, "FAST");
      }

      addCentered(main.dataUrl, main.dims);
      if (certificate.score_image_url) {
        doc.addPage();
        const score = await fetchImage(certificate.score_image_url);
        addCentered(score.dataUrl, score.dims);
      }
      doc.save(`${certificate.certificate_no || "certificate"}-combined.pdf`);
      toast.success("PDF exported");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to export PDF");
    } finally { setExportingPDF(null); }
  }

  async function exportToPNG(certificate: Certificate) {
    if (isCertificateExpired(certificate)) {
      toast.error(language === "id" ? "Sertifikat kadaluarsa tidak dapat diunduh PNG-nya" : "Expired certificates cannot be downloaded as PNG", { duration: 2000 });
      return;
    }
    if (!certificate.certificate_image_url) {
      toast.error("Certificate image not available to export", { duration: 2000 });
      return;
    }
    try {
      setExportingPNG(certificate.id);
      async function downloadPng(urlRaw: string, name: string) {
        let s = urlRaw || "";
        if (s && !/^https?:\/\//i.test(s) && !s.startsWith("/") && !s.startsWith("data:")) s = `/${s}`;
        const cb = certificate.updated_at ? `?v=${new Date(certificate.updated_at).getTime()}` : "";
        const withBust = s.startsWith("/") ? `${s}${cb}` : s;
        const src = withBust.startsWith("/") && typeof window !== "undefined" ? `${window.location.origin}${withBust}` : withBust;
        const resp = await fetch(src);
        if (!resp.ok) throw new Error(`Failed to fetch image: ${resp.status}`);
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = name;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
      const base = certificate.certificate_no || "certificate";
      await downloadPng(certificate.certificate_image_url, `${base}.png`);
      if (certificate.score_image_url) await downloadPng(certificate.score_image_url, `${base}-score.png`);
      toast.success("PNGs downloaded successfully");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to export PNG");
    } finally { setExportingPNG(null); }
  }

  async function generateCertificateLink(certificate: Certificate) {
    const identifier = certificate.certificate_no;
    if (!identifier) { toast.error(t("certificates.generateLink") + " - " + t("hero.noPublicLink")); return; }
    try {
      setGeneratingLink(certificate.id);
      let baseUrl = process.env.NEXT_PUBLIC_APP_URL;
      if (!baseUrl && typeof window !== "undefined") baseUrl = window.location.origin;
      if (baseUrl && !baseUrl.match(/^https?:\/\//i)) baseUrl = `https://${baseUrl.replace(/^\/\//, "")}`;
      const link = `${baseUrl}/cek/${identifier}`;
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(link);
      } else {
        const ta = document.createElement("textarea"); ta.value = link;
        ta.style.position = "fixed"; ta.style.opacity = "0";
        document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta);
      }
      toast.success(t("hero.linkCopied"), { duration: 2000 });
    } catch { toast.error(t("hero.linkGenerateFailed"), { duration: 2000 }); }
    finally { setGeneratingLink(null); }
  }

  // ─── Send Email ──────────────────────────────────────────────────────────────
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const sendingRef = useRef(false);
  const [sendFormErrors, setSendFormErrors] = useState<{ email?: string; subject?: string; message?: string }>({});
  const [sendForm, setSendForm] = useState({ email: "", subject: "", message: "" });
  const [sendPreviewSrcs, setSendPreviewSrcs] = useState<{ cert: string | null; score: string | null }>({ cert: null, score: null });
  const [sendCert, setSendCert] = useState<Certificate | null>(null);

  async function openSendEmailModal(certificate: Certificate) {
    if (!certificate.certificate_image_url) { toast.error("Certificate image not available", { duration: 2000 }); return; }
    let srcRaw = certificate.certificate_image_url || "";
    if (srcRaw && !/^https?:\/\//i.test(srcRaw) && !srcRaw.startsWith("/") && !srcRaw.startsWith("data:")) srcRaw = `/${srcRaw}`;
    const src = srcRaw.startsWith("/") && typeof window !== "undefined" ? `${window.location.origin}${srcRaw}` : srcRaw;
    let scoreRaw = certificate.score_image_url || "";
    if (scoreRaw && !/^https?:\/\//i.test(scoreRaw) && !scoreRaw.startsWith("/") && !scoreRaw.startsWith("data:")) scoreRaw = `/${scoreRaw}`;
    const scoreSrc = scoreRaw ? (scoreRaw.startsWith("/") && typeof window !== "undefined" ? `${window.location.origin}${scoreRaw}` : scoreRaw) : null;
    setSendCert(certificate);
    setSendPreviewSrcs({ cert: src, score: scoreSrc });
    setSendForm({
      email: "",
      subject: certificate.certificate_no ? `Certificate #${certificate.certificate_no}` : "Your Certificate",
      message: `Certificate Information:\n\n• Certificate Number: ${certificate.certificate_no || "N/A"}\n• Recipient Name: ${certificate.name || "N/A"}\n• Issue Date: ${new Date(certificate.issue_date).toLocaleDateString()}${certificate.expired_date ? `\n• Expiry Date: ${new Date(certificate.expired_date).toLocaleDateString()}` : ""}${certificate.category ? `\n• Category: ${certificate.category}` : ""}`,
    });
    setSendModalOpen(true);
  }

  async function confirmSendEmail() {
    if (!sendCert || !sendPreviewSrcs.cert) return;
    if (isSendingEmail || sendingRef.current) return;
    setSendFormErrors({});
    const errors: { email?: string; subject?: string; message?: string } = {};
    const recipientEmail = (sendForm.email || "").trim();
    if (!recipientEmail) { errors.email = "Recipient email is required"; }
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) { errors.email = "Please enter a valid email address"; }
    if (!sendForm.subject.trim()) errors.subject = "Subject is required";
    if (!sendForm.message.trim()) errors.message = "Message is required";
    if (Object.keys(errors).length > 0) { setSendFormErrors(errors); return; }
    setIsSendingEmail(true);
    sendingRef.current = true;
    try {
      const payload = {
        recipientEmail, recipientName: sendCert.name,
        imageUrl: sendPreviewSrcs.cert, scoreImageUrl: sendPreviewSrcs.score,
        certificateNo: sendCert.certificate_no,
        subject: sendForm.subject.trim(), message: sendForm.message.trim(),
      };
      const res = await fetch("/api/send-certificate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 400) throw new Error("Invalid email address or missing required fields");
        else if (res.status === 404) throw new Error("Email service not available");
        else if (res.status === 500) throw new Error("Server error. Please try again later");
        throw new Error(json?.error || `Failed to send email (status ${res.status})`);
      }
      if (json.previewUrl) { toast.success("Email queued! Preview opened in new tab"); try { window.open(json.previewUrl, "_blank"); } catch {} }
      else { toast.success(`Email sent successfully to ${recipientEmail}`); }
      setSendModalOpen(false); setSendCert(null);
      setSendPreviewSrcs({ cert: null, score: null });
      setSendForm({ email: "", subject: "", message: "" });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to send email. Please try again.");
    } finally { setIsSendingEmail(false); sendingRef.current = false; }
  }

  // ─── Quick / Wizard Generate ─────────────────────────────────────────────────
  const [quickGenerateOpen, setQuickGenerateOpen] = useState(false);
  const [wizardGenerateOpen, setWizardGenerateOpen] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [, setLoadingQuickGenData] = useState(false);

  async function loadTemplatesAndMembers() {
    if (!selectedTenantId) { toast.error("Pilih tenant terlebih dahulu sebelum generate sertifikat"); return false; }
    const loadingToast = toast.loading("Loading templates and members...");
    try {
      setLoadingQuickGenData(true);
      const [td, md] = await Promise.all([getTemplatesForTenant(selectedTenantId), getMembersForTenant(selectedTenantId)]);
      setTemplates(td.filter((t) => t.status === "ready" || !t.status));
      setMembers(md);
      toast.dismiss(loadingToast);
      return true;
    } catch {
      toast.dismiss(loadingToast);
      toast.error("Failed to load templates and members for this tenant");
      return false;
    } finally { setLoadingQuickGenData(false); }
  }

  const handleOpenQuickGenerate = async () => {
    setQuickGenerateOpen(true);
    await loadTemplatesAndMembers();
  };

  const handleOpenWizardGenerate = async () => {
    setWizardGenerateOpen(true);
    await loadTemplatesAndMembers();
  };

  // ─── generateSingleCertificate ───────────────────────────────────────────────
  const generateSingleCertificate = async (
    template: Template,
    member: Member,
    certData: { certificate_no: string; description: string; issue_date: string; expired_date: string },
    defaults: TemplateDefaults,
    dateFormat: string,
    scoreData?: Record<string, string>,
    layoutConfig?: TemplateLayoutConfig | null,
    excelRowData?: Record<string, string>
  ) => {
    if (scoreData) scoreData = autoPopulatePrestasi(scoreData);

    let finalCertificateNo = certData.certificate_no?.trim();
    if (!finalCertificateNo && certData.issue_date) {
      try { finalCertificateNo = await generateCertificateNumber(new Date(certData.issue_date)); }
      catch { finalCertificateNo = `CERT-${Date.now()}`; }
    }
    let finalExpiredDate = certData.expired_date?.trim();
    if (!finalExpiredDate && certData.issue_date) {
      const exp = new Date(certData.issue_date); exp.setFullYear(exp.getFullYear() + 3);
      finalExpiredDate = exp.toISOString().split("T")[0];
    }
    let finalIssueDate = certData.issue_date?.trim();
    if (!finalIssueDate) finalIssueDate = new Date().toISOString().split("T")[0];
    const finalCertData = {
      certificate_no: finalCertificateNo || certData.certificate_no,
      description: certData.description || "",
      issue_date: finalIssueDate,
      expired_date: finalExpiredDate || certData.expired_date,
    };

    const templateImageUrl = await getTemplateImageUrl(template);
    if (!templateImageUrl) throw new Error(`Template image not found for ${template.name}`);

    const certDataMap = certData as unknown as Record<string, string>;
    const nilaiFromCert = certDataMap && Object.prototype.hasOwnProperty.call(certDataMap, "nilai") ? (certDataMap["nilai"] as string | undefined) : undefined;
    const variableData: Record<string, string> = {
      name: member.name || "", nama: member.name || "",
      certificate_no: finalCertData.certificate_no || "",
      description: finalCertData.description || "",
      nilai: nilaiFromCert !== undefined && nilaiFromCert !== null ? String(nilaiFromCert) : "",
      issue_date: formatDateString(finalCertData.issue_date, dateFormat),
      expired_date: finalCertData.expired_date ? formatDateString(finalCertData.expired_date, dateFormat) : "",
      ...certDataMap, ...(excelRowData || {}), ...(scoreData || {}),
    };

    const textLayers: RenderTextLayer[] = defaults.textLayers.filter((l) => l.visible !== false).map((layer) => {
      let text = "";
      let processedRichText = layer.richText;
      const isStdAuto = ["name","certificate_no","description","issue_date","expired_date"].includes(layer.id);
      const hasExcelValue = !!(excelRowData && excelRowData[layer.id] !== undefined && excelRowData[layer.id] !== null && String(excelRowData[layer.id]).trim() !== "");
      const hasScoreValue = !!(scoreData && scoreData[layer.id] !== undefined && scoreData[layer.id] !== null && String(scoreData[layer.id]).trim() !== "");
      const hasCertDataKey = !isStdAuto && !!(certDataMap && Object.prototype.hasOwnProperty.call(certDataMap, layer.id));

      if (hasExcelValue) text = String(excelRowData![layer.id]).trim();
      else if (hasScoreValue) text = String(scoreData![layer.id]).trim();
      else if (hasCertDataKey) { const raw = certDataMap[layer.id]; text = raw === undefined || raw === null ? "" : String(raw); }
      else if (isStdAuto) {
        if (layer.id === "name") text = member.name;
        else if (layer.id === "certificate_no") text = finalCertData.certificate_no || "";
        else if (layer.id === "description") text = finalCertData.description || "";
        else if (layer.id === "issue_date") text = formatDateString(finalCertData.issue_date, dateFormat);
        else if (layer.id === "expired_date") text = finalCertData.expired_date ? formatDateString(finalCertData.expired_date, dateFormat) : "";
      }

      const hasAnyExplicit = hasExcelValue || hasScoreValue || hasCertDataKey || isStdAuto;
      if (hasAnyExplicit && processedRichText && processedRichText.length > 0) {
        if (!processedRichText.some((s) => s.text.includes("{"))) processedRichText = undefined;
      }
      if (!hasAnyExplicit && !isStdAuto && !text && layer.defaultText) {
        text = layer.defaultText;
        if (!layer.hasInlineFormatting) processedRichText = undefined;
      }
      if (processedRichText && processedRichText.length > 0) {
        if (processedRichText.some((s) => s.text.includes("{"))) {
          processedRichText = replaceVariablesInRichText(processedRichText, variableData);
          text = processedRichText.map((s) => s.text).join("");
        }
      } else if (text && text.includes("{")) {
        text = replaceVariables(text, variableData);
      }
      return { id: layer.id, text, x: layer.x, y: layer.y, xPercent: layer.xPercent, yPercent: layer.yPercent, fontSize: layer.fontSize, color: layer.color, fontWeight: layer.fontWeight, fontStyle: layer.fontStyle, fontFamily: layer.fontFamily, textAlign: layer.textAlign, maxWidth: layer.maxWidth, lineHeight: layer.lineHeight, letterSpacing: layer.letterSpacing, richText: processedRichText, hasInlineFormatting: layer.hasInlineFormatting };
    });

    const photoLayersForRender = (defaults.photoLayers || []).map((layer) => ({
      id: layer.id, type: layer.type, src: layer.src, x: layer.x, y: layer.y, xPercent: layer.xPercent, yPercent: layer.yPercent, width: layer.width, height: layer.height, widthPercent: layer.widthPercent, heightPercent: layer.heightPercent, zIndex: layer.zIndex, fitMode: layer.fitMode, opacity: layer.opacity, rotation: layer.rotation, crop: layer.crop, mask: layer.mask,
    }));

    const qrLayersForRender = (layoutConfig?.certificate?.qrLayers || []).map((layer: QRCodeLayerConfig) => ({
      id: layer.id, type: layer.type as "qr_code",
      qrData: layer.qrData.replace("{{CERTIFICATE_URL}}", `${process.env.NEXT_PUBLIC_BASE_URL || window.location.origin}/cek/${finalCertData.certificate_no}`),
      x: layer.x, y: layer.y, xPercent: layer.xPercent, yPercent: layer.yPercent, width: layer.width, height: layer.height, widthPercent: layer.widthPercent, heightPercent: layer.heightPercent, zIndex: layer.zIndex, opacity: layer.opacity, rotation: layer.rotation, foregroundColor: layer.foregroundColor, backgroundColor: layer.backgroundColor, errorCorrectionLevel: layer.errorCorrectionLevel, margin: layer.margin,
    }));

    const { cert: certFileName, xid } = generatePairedXIDFilenames();

    const certImgDataUrl = await renderCertificateToDataURL({ templateImageUrl, textLayers, photoLayers: photoLayersForRender, qrLayers: qrLayersForRender, templateId: template.id, templateName: template.name });
    const certThumb = await generateThumbnail(certImgDataUrl, { format: "webp", quality: 0.85, maxWidth: 1200 });

    async function uploadToStorage(imageData: string, fileName: string) {
      const resp = await fetch("/api/upload-to-storage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imageData, fileName, bucketName: "certificates" }) });
      if (!resp.ok) throw new Error(`Failed to upload ${fileName}: ${await resp.text()}`);
      const r = await resp.json();
      if (!r.success) throw new Error(`Upload failed: ${r.error}`);
      return r.url as string;
    }

    const certImgUrl = await uploadToStorage(certImgDataUrl, certFileName);
    const certThumbUrl = await uploadToStorage(certThumb, `preview/${xid}_cert.webp`);

    const certificateDataToSave: CreateCertificateData = {
      certificate_no: finalCertData.certificate_no, name: member.name.trim(),
      description: finalCertData.description.trim() || undefined,
      issue_date: finalCertData.issue_date, expired_date: finalCertData.expired_date || undefined,
      category: template.category || undefined, template_id: template.id,
      member_id: member.id.startsWith("temp-") ? undefined : member.id,
      tenant_id: selectedTenantId || undefined,
      text_layers: textLayers.map((l) => {
        const b = { id: l.id, text: l.text, x: l.x || 0, y: l.y || 0, xPercent: l.xPercent || 0, yPercent: l.yPercent || 0, fontSize: l.fontSize, color: l.color, fontWeight: l.fontWeight || "normal", fontFamily: l.fontFamily || "Arial", maxWidth: l.maxWidth, lineHeight: l.lineHeight, letterSpacing: l.letterSpacing };
        if (l.id !== "certificate_no" && l.id !== "issue_date") return { ...b, textAlign: l.textAlign };
        return b;
      }),
      merged_image: certImgUrl, certificate_image_url: certImgUrl, certificate_thumbnail_url: certThumbUrl,
    };

    const savedCertificate = await createCertificate(certificateDataToSave);

    try {
      const xidFromDb = savedCertificate.xid;
      const finalCertImgDataUrl = await renderCertificateToDataURL({ templateImageUrl, textLayers, photoLayers: photoLayersForRender, qrLayers: qrLayersForRender, templateId: template.id, templateName: template.name });
      const finalThumb = await generateThumbnail(finalCertImgDataUrl, { format: "webp", quality: 0.85, maxWidth: 1200 });
      const finalPngUrl = await uploadToStorage(finalCertImgDataUrl, `${xidFromDb}_cert.png`);
      const finalWebpUrl = await uploadToStorage(finalThumb, `${xidFromDb}_cert.webp`);
      await supabaseClient.from("certificates").update({ certificate_image_url: finalPngUrl, certificate_thumbnail_url: finalWebpUrl }).eq("id", savedCertificate.id);
    } catch (e) { console.error("⚠️ Post-save render/upload error:", e); }

    if (template.score_image_url) {
      try {
        const scoreLayout = layoutConfig?.score;
        if (scoreLayout && scoreLayout.textLayers && scoreLayout.textLayers.length > 0) {
          const migratedScoreLayers = scoreLayout.textLayers.filter((l) => l.visible !== false).map((l) => ({
            ...l,
            x: l.x !== undefined ? l.x : (l.xPercent || 0) * STANDARD_CANVAS_WIDTH,
            y: l.y !== undefined ? l.y : (l.yPercent || 0) * STANDARD_CANVAS_HEIGHT,
            xPercent: l.xPercent !== undefined ? l.xPercent : (l.x || 0) / STANDARD_CANVAS_WIDTH,
            yPercent: l.yPercent !== undefined ? l.yPercent : (l.y || 0) / STANDARD_CANVAS_HEIGHT,
            maxWidth: l.maxWidth || 300, lineHeight: l.lineHeight || 1.2,
            fontStyle: l.fontStyle || "normal", fontWeight: l.fontWeight || "normal",
          }));

          const scoreTextLayers: RenderTextLayer[] = migratedScoreLayers.map((layer: TextLayerConfig) => {
            let text = "";
            let processedRichText = layer.richText;
            const isStdAuto = ["name","certificate_no","description","issue_date","expired_date","score_date","expiry_date"].includes(layer.id);
            const hasSV = !!(scoreData && scoreData[layer.id] !== undefined && scoreData[layer.id] !== null && String(scoreData[layer.id]).trim() !== "");
            const hasCdk = !isStdAuto && !!(certDataMap && Object.prototype.hasOwnProperty.call(certDataMap, layer.id));
            if (hasSV) text = String(scoreData![layer.id]).trim();
            else if (hasCdk) { const raw = certDataMap[layer.id]; text = raw === undefined || raw === null ? "" : String(raw); }
            else if (isStdAuto) {
              if (layer.id === "name") text = member.name;
              else if (layer.id === "certificate_no") text = finalCertData.certificate_no || "";
              else if (layer.id === "description") text = finalCertData.description || "";
              else if (layer.id === "issue_date" || layer.id === "score_date") text = formatDateString(finalCertData.issue_date, dateFormat);
              else if (layer.id === "expired_date" || layer.id === "expiry_date") text = finalCertData.expired_date ? formatDateString(finalCertData.expired_date, dateFormat) : "";
            }
            const hasAny = hasSV || hasCdk || isStdAuto;
            if (hasAny && processedRichText && processedRichText.length > 0 && !layer.hasInlineFormatting) {
              if (!processedRichText.some((s) => s.text.includes("{"))) processedRichText = undefined;
            }
            if (!hasAny && !text && layer.defaultText) { text = layer.defaultText; if (!layer.hasInlineFormatting) processedRichText = undefined; }
            const vd: Record<string, string> = { name: member.name || "", nama: member.name || "", certificate_no: finalCertData.certificate_no || "", description: finalCertData.description || "", issue_date: formatDateString(finalCertData.issue_date, dateFormat), expired_date: finalCertData.expired_date ? formatDateString(finalCertData.expired_date, dateFormat) : "", ...certDataMap, ...(excelRowData || {}), ...(scoreData || {}) };
            if (processedRichText && processedRichText.length > 0) {
              if (processedRichText.some((s) => s.text.includes("{"))) { processedRichText = replaceVariablesInRichText(processedRichText, vd); text = processedRichText.map((s) => s.text).join(""); }
            } else if (text && text.includes("{")) { text = replaceVariables(text, vd); }
            const textChanged = text !== layer.defaultText;
            const hasPRT = processedRichText && processedRichText !== layer.richText;
            if (textChanged && layer.richText && !hasPRT) processedRichText = undefined;
            return { id: layer.id, text, x: layer.x, y: layer.y, xPercent: layer.xPercent, yPercent: layer.yPercent, fontSize: layer.fontSize, color: layer.color, fontWeight: layer.fontWeight, fontStyle: layer.fontStyle, fontFamily: layer.fontFamily, textAlign: layer.textAlign, maxWidth: layer.maxWidth, lineHeight: layer.lineHeight, richText: processedRichText, hasInlineFormatting: layer.hasInlineFormatting };
          });

          const scorePhotoLayers = (scoreLayout.photoLayers || []).map((l) => ({ id: l.id, type: l.type, src: l.src, x: l.x, y: l.y, xPercent: l.xPercent, yPercent: l.yPercent, width: l.width, height: l.height, widthPercent: l.widthPercent, heightPercent: l.heightPercent, zIndex: l.zIndex, fitMode: l.fitMode, opacity: l.opacity, rotation: l.rotation, crop: l.crop, mask: l.mask }));
          const scoreQRLayers = (layoutConfig?.score?.qrLayers || []).map((l: QRCodeLayerConfig) => ({ id: l.id, type: l.type as "qr_code", qrData: l.qrData.replace("{{CERTIFICATE_URL}}", `${process.env.NEXT_PUBLIC_BASE_URL || window.location.origin}/cek/${savedCertificate.certificate_no}`), x: l.x, y: l.y, xPercent: l.xPercent, yPercent: l.yPercent, width: l.width, height: l.height, widthPercent: l.widthPercent, heightPercent: l.heightPercent, zIndex: l.zIndex, opacity: l.opacity, rotation: l.rotation, foregroundColor: l.foregroundColor, backgroundColor: l.backgroundColor, errorCorrectionLevel: l.errorCorrectionLevel, margin: l.margin }));

          const scoreImgDataUrl = await renderCertificateToDataURL({ templateImageUrl: template.score_image_url, textLayers: scoreTextLayers, photoLayers: scorePhotoLayers, qrLayers: scoreQRLayers, templateId: template.id, templateName: template.name });
          const scoreThumb = await generateThumbnail(scoreImgDataUrl, { format: "webp", quality: 0.85, maxWidth: 1200 });
          const scorePngUrl = await uploadToStorage(scoreImgDataUrl, `${savedCertificate.xid}_score.png`);
          const scoreWebpUrl = await uploadToStorage(scoreThumb, `preview/${xid}_score.webp`);
          await supabaseClient.from("certificates").update({ score_image_url: scorePngUrl, score_thumbnail_url: scoreWebpUrl }).eq("id", savedCertificate.id);
        } else {
          const scoreImgDataUrl = await renderCertificateToDataURL({ templateImageUrl: template.score_image_url, textLayers: [], photoLayers: [], qrLayers: [], templateId: template.id, templateName: template.name });
          const scoreThumb = await generateThumbnail(scoreImgDataUrl, { format: "webp", quality: 0.85, maxWidth: 1200 });
          const scorePngUrl = await uploadToStorage(scoreImgDataUrl, `${savedCertificate.xid}_score.png`);
          const scoreWebpUrl = await uploadToStorage(scoreThumb, `preview/${xid}_score.webp`);
          await supabaseClient.from("certificates").update({ score_image_url: scorePngUrl, score_thumbnail_url: scoreWebpUrl }).eq("id", savedCertificate.id);
        }
      } catch (err) { console.error("⚠️ Failed to generate score/back image:", err); }
    }

    return savedCertificate;
  };

  // ─── handleQuickGenerate ─────────────────────────────────────────────────────
  const handleQuickGenerate = async (params: QuickGenerateParams) => {
    const loadingToast = toast.loading(t("quickGenerate.generatingCertificates"));
    try {
      const layoutConfig = await getTemplateLayout(params.template.id);
      let defaults: TemplateDefaults | null = null;

      if (layoutConfig && layoutConfig.certificate) {
        const migratedLayers = layoutConfig.certificate.textLayers.map((layer) => ({
          ...layer,
          x: layer.x !== undefined ? layer.x : (layer.xPercent || 0) * STANDARD_CANVAS_WIDTH,
          y: layer.y !== undefined ? layer.y : (layer.yPercent || 0) * STANDARD_CANVAS_HEIGHT,
          xPercent: layer.xPercent !== undefined ? layer.xPercent : (layer.x || 0) / STANDARD_CANVAS_WIDTH,
          yPercent: layer.yPercent !== undefined ? layer.yPercent : (layer.y || 0) / STANDARD_CANVAS_HEIGHT,
          maxWidth: layer.maxWidth || 300, lineHeight: layer.lineHeight || 1.2,
          fontStyle: layer.fontStyle || "normal", fontWeight: layer.fontWeight || "normal",
        }));
        const photoLayersRaw = layoutConfig.certificate.photoLayers || (layoutConfig as unknown as { photoLayers?: PhotoLayerConfig[] }).photoLayers;
        const photoLayersFromConfig: PhotoLayerDefault[] = (photoLayersRaw || []).map((l: PhotoLayerConfig) => ({ id: l.id, type: l.type, src: l.src, x: l.x, y: l.y, xPercent: l.xPercent, yPercent: l.yPercent, width: l.width, height: l.height, widthPercent: l.widthPercent, heightPercent: l.heightPercent, zIndex: l.zIndex, fitMode: l.fitMode, crop: l.crop, mask: l.mask, opacity: l.opacity, rotation: l.rotation, maintainAspectRatio: l.maintainAspectRatio, originalWidth: l.originalWidth, originalHeight: l.originalHeight, storagePath: l.storagePath }));
        defaults = { templateId: params.template.id, templateName: params.template.name, textLayers: migratedLayers, overlayImages: layoutConfig.certificate.overlayImages, photoLayers: photoLayersFromConfig, savedAt: layoutConfig.lastSavedAt };
      } else {
        const tplId = params.template.is_dual_template ? `${params.template.id}_certificate` : params.template.id;
        defaults = getTemplateDefaults(tplId);
      }

      if (!defaults || !defaults.textLayers || defaults.textLayers.length === 0) throw new Error("Template layout not configured. Please configure the template layout first in Templates page.");

      if (params.dataSource === "member") {
        if (params.members && params.members.length > 0 && params.certificateData) {
          const total = params.members.length; let generated = 0;
          for (const member of params.members) {
            try {
              await generateSingleCertificate(params.template, member, params.certificateData, defaults, params.dateFormat, params.scoreDataMap?.[member.id], layoutConfig);
              generated++;
              toast.loading(`${t("quickGenerate.generatingCertificates")} ${generated}/${total}`, { id: loadingToast });
            } catch (e) { console.error(`❌ Failed for ${member.name}:`, e); }
          }
          toast.dismiss(loadingToast);
          toast.success(`${t("quickGenerate.successMultiple")} ${generated}/${total} ${t("quickGenerate.certificatesGenerated")}`, { duration: 3000 });
        } else if (params.member && params.certificateData) {
          let memberScoreData: Record<string, string> | undefined;
          if (params.template.score_image_url && layoutConfig?.score && params.scoreDataMap && params.member.id) {
            memberScoreData = params.scoreDataMap[params.member.id];
          }
          await generateSingleCertificate(params.template, params.member, params.certificateData, defaults, params.dateFormat, memberScoreData, layoutConfig);
          toast.dismiss(loadingToast);
          toast.success(t("quickGenerate.successSingle"), { duration: 2000 });
        } else { throw new Error("No member(s) provided for certificate generation"); }
      } else if (params.dataSource === "excel" && params.excelData) {
        const total = params.excelData.length; let generated = 0;
        for (const row of params.excelData) {
          try {
            const name = String(row.name || row.recipient || "");
            const description = String(row.description || "");
            let issueDate = String(row.issue_date || row.date || "");
            if (!issueDate) issueDate = new Date().toISOString().split("T")[0];
            const certNo = String(row.certificate_no || row.cert_no || "");
            const expiredDate = String(row.expired_date || row.expiry || "");
            const tempMember: Member = { id: `temp-${Date.now()}-${generated}`, name, email: String(row.email || ""), organization: String(row.organization || ""), phone: String(row.phone || ""), job: String(row.job || ""), date_of_birth: null, address: String(row.address || ""), city: String(row.city || ""), notes: "", created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
            const excelRowData: Record<string, string> = {};
            for (const [k, v] of Object.entries(row)) {
              if (!["name","certificate_no","issue_date","expired_date","description","email","organization","phone","job","address","city"].includes(k)) {
                if (v !== undefined && v !== null && v !== "") excelRowData[k] = String(v);
              }
            }
            let excelScoreData: Record<string, string> | undefined;
            if (params.template.score_image_url && layoutConfig?.score) {
              excelScoreData = {};
              for (const layer of (layoutConfig.score.textLayers || [])) {
                if (["name","certificate_no","issue_date","score_date","description"].includes(layer.id)) continue;
                if (row[layer.id] !== undefined && row[layer.id] !== null && row[layer.id] !== "") excelScoreData[layer.id] = String(row[layer.id]);
              }
            }
            await generateSingleCertificate(params.template, tempMember, { certificate_no: certNo, description, issue_date: issueDate, expired_date: expiredDate }, defaults, params.dateFormat, excelScoreData, layoutConfig, excelRowData);
            generated++;
            toast.loading(`${t("quickGenerate.generatingCertificates")} ${generated}/${total}`, { id: loadingToast });
          } catch { /* continue */ }
        }
        toast.dismiss(loadingToast);
        toast.success(`${t("quickGenerate.successMultiple")} ${generated}/${total} ${t("quickGenerate.certificatesGenerated")}`, { duration: 3000 });
      }
      await refresh();
    } catch (error: unknown) {
      toast.dismiss(loadingToast);
      toast.error(error instanceof Error ? error.message : "Failed to generate certificate", { duration: 3000 });
    }
  };

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
  const forceCanDelete = false;

  async function requestDelete(id: string) {
    if (!canDelete && !forceCanDelete) { toast.error(t("certificates.deleteNoPermission"), { duration: 2000 }); return; }
    const certificate = certificates.find((c) => c.id === id);
    const certificateName = certificate?.name || "this certificate";
    const deleteMessage = t("certificates.deleteConfirm").replace("{name}", certificateName).replace("{number}", certificate?.certificate_no || "");
    const confirmed = await confirmToast(deleteMessage, { confirmText: t("common.delete"), tone: "destructive" });
    if (confirmed) {
      try {
        setDeletingCertificateId(id);
        await deleteCert(id);
        const successMessage = t("certificates.deleteSuccess").replace("{name}", certificateName);
        toast.success(successMessage, { duration: 2000 });
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
    // Search / filter
    searchInput, setSearchInput, categoryFilter, dateFilter,
    filterModalOpen, setFilterModalOpen, tempCategoryFilter, setTempCategoryFilter, tempDateFilter, setTempDateFilter,
    openFilterModal, applyFilters, cancelFilters,
    // Pagination
    currentPage, setCurrentPage, itemsPerPage, totalPages, filtered, currentCertificates, indexOfFirstItem, indexOfLastItem,
    // Helpers
    formatDateShort, isCertificateExpired, getExpiredOverlayUrl, handleOpenImagePreview, language, t,
    // Export
    exportingPDF, exportingPNG, generatingLink, exportToPDF, exportToPNG, generateCertificateLink,
    // Send email
    sendModalOpen, setSendModalOpen, isSendingEmail, sendFormErrors, setSendFormErrors, sendForm, setSendForm, sendPreviewSrcs, openSendEmailModal, confirmSendEmail,
    // Generate
    quickGenerateOpen, setQuickGenerateOpen, wizardGenerateOpen, setWizardGenerateOpen, templates, members, handleOpenQuickGenerate, handleOpenWizardGenerate, handleQuickGenerate,
    // Edit
    isEditOpen, setIsEditOpen, draft, setDraft, openEdit, submitEdit,
    // Delete
    deletingCertificateId, canDelete, requestDelete,
    // Preview
    previewCertificate, setPreviewCertificate, previewTemplate, previewMode, setPreviewMode, scoreDefaults, previewContainerRef, containerDimensions,
    memberDetailOpen, setMemberDetailOpen, detailMember, setDetailMember, loadingMemberDetail, setLoadingMemberDetail,
    // Params
    certQuery,
  };
}
