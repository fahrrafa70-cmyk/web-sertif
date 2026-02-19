"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLanguage } from "@/contexts/language-context";
import { useModal } from "@/contexts/modal-context";
import { toast } from "sonner";
import { getTenantsForCurrentUser, type Tenant } from "@/lib/supabase/tenants";
import { useDebounce } from "@/hooks/use-debounce";
import {
  advancedSearchCertificates,
  publicSearchCertificates,
  getCertificateCategories,
  Certificate,
  SearchFilters,
  PublicSearchFilters,
  getCertificateByNumber,
} from "@/lib/supabase/certificates";
import { supabaseClient } from "@/lib/supabase/client";

const ITEMS_PER_PAGE = 9;

export function useSearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, language } = useLanguage();
  const { setIsModalOpen } = useModal();

  // ── document title ────────────────────────────────────────────────────────
  useEffect(() => {
    const set = () => { if (typeof document !== "undefined") document.title = "Search | Certify - Certificate Platform"; };
    set();
    const ts = [setTimeout(set, 50), setTimeout(set, 200), setTimeout(set, 500)];
    return () => ts.forEach(clearTimeout);
  }, []);

  // ── tenants ───────────────────────────────────────────────────────────────
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>("");
  const [loadingTenants, setLoadingTenants] = useState(true);

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
        setFilters((prev) => ({ ...prev, tenant_id: initialId }));
      } finally {
        setLoadingTenants(false);
      }
    };
    void load();
  }, []);

  useEffect(() => {
    setFilters((prev) => ({ ...prev, tenant_id: selectedTenantId }));
  }, [selectedTenantId]);

  // ── categories ────────────────────────────────────────────────────────────
  const [categories, setCategories] = useState<string[]>([]);
  useEffect(() => {
    if (!selectedTenantId) { setCategories([]); return; }
    getCertificateCategories(selectedTenantId)
      .then((cats) => setCategories(Array.isArray(cats) ? cats : []))
      .catch(() => setCategories([]));
  }, [selectedTenantId]);

  // ── search state ──────────────────────────────────────────────────────────
  const initialQuery = searchParams.get("q") || "";
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [inputValue, setInputValue] = useState(initialQuery);
  const [searching, setSearching] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [searchResults, setSearchResults] = useState<Certificate[]>([]);
  const [searchError, setSearchError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    keyword: initialQuery, category: "", startDate: "", endDate: "", tenant_id: "",
  });
  const [currentPage, setCurrentPage] = useState(1);

  const abortControllerRef = useRef<AbortController | null>(null);
  const debouncedSearchQuery = useDebounce(searchQuery, 400);
  const isInitialMount = useRef(true);
  const loadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchResultsRef = useRef<Certificate[]>([]);
  const hasRunInitialSearchRef = useRef(false);

  // sync inputValue on searchQuery mount
  useEffect(() => { setInputValue(searchQuery); }, [searchQuery]);
  useEffect(() => () => { if (inputTimeoutRef.current) clearTimeout(inputTimeoutRef.current); }, []);
  useEffect(() => { isInitialMount.current = false; }, []);
  // disable auto-search-on-typing (intentional no-op)
  useEffect(() => { void debouncedSearchQuery; void hasSearched; void filters; }, [debouncedSearchQuery, hasSearched, filters]);

  // scroll to top on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const t = setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 50);
    return () => clearTimeout(t);
  }, [initialQuery]);

  // scroll lock when modal open
  const scrollYRef = useRef(0);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [sendModalOpen, setSendModalOpen] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (previewOpen || sendModalOpen) {
      scrollYRef.current = window.scrollY;
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollYRef.current}px`;
      document.body.style.width = "100%";
      document.body.style.overflow = "hidden";
      return () => {
        const saved = scrollYRef.current;
        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.width = "";
        document.body.style.overflow = "";
        window.scrollTo(0, saved);
      };
    }
  }, [previewOpen, sendModalOpen]);

  // ── filter modal state ────────────────────────────────────────────────────
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [tempCategory, setTempCategory] = useState("");
  const [tempStartDate, setTempStartDate] = useState("");
  const [tempEndDate, setTempEndDate] = useState("");
  const [tempTenant, setTempTenant] = useState("");

  // ── preview modal state ───────────────────────────────────────────────────
  const [previewCert, setPreviewCert] = useState<Certificate | null>(null);

  // ── send email state ──────────────────────────────────────────────────────
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [sendFormErrors, setSendFormErrors] = useState<{ email?: string; subject?: string; message?: string }>({});
  const [sendForm, setSendForm] = useState<{ email: string; subject: string; message: string }>({ email: "", subject: "", message: "" });
  const [sendPreviewSrc, setSendPreviewSrc] = useState<string | null>(null);
  const [sendCert, setSendCert] = useState<Certificate | null>(null);

  // ── keyboard handling ─────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (sendModalOpen) {
          setSendModalOpen(false); setPreviewOpen(false); setPreviewCert(null); setIsModalOpen(false);
          e.preventDefault(); return;
        }
        if (previewOpen) {
          setPreviewOpen(false); setPreviewCert(null); setIsModalOpen(false);
          e.preventDefault(); return;
        }
        if (filterModalOpen) { setFilterModalOpen(false); e.preventDefault(); return; }
        router.push("/");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router, previewOpen, sendModalOpen, filterModalOpen, setIsModalOpen]);

  // ── helpers ───────────────────────────────────────────────────────────────
  const formatDateShort = useCallback((input?: string | null) => {
    if (!input) return "—";
    const d = new Date(input);
    if (isNaN(d.getTime())) return "—";
    return `${d.getDate()} ${d.toLocaleString(language === "id" ? "id-ID" : "en-US", { month: "short" })} ${d.getFullYear()}`;
  }, [language]);

  const capitalize = useCallback((str: string) => str.charAt(0).toUpperCase() + str.slice(1), []);

  const getThumbnailUrl = useCallback((masterUrl: string | null | undefined): string | null => {
    if (!masterUrl) return null;
    if (/supabase\.(co|in)\/storage/i.test(masterUrl)) {
      const match = masterUrl.match(/(.*\/certificates\/)([^/]+)\.png/i);
      if (match) return `${match[1]}preview/${match[2]}.webp`;
    }
    return null;
  }, []);

  const normalizeImageUrl = useCallback((url: string | null | undefined, updatedAt?: string | null): { src: string; shouldOptimize: boolean } => {
    if (!url) return { src: "", shouldOptimize: false };
    let srcRaw = url;
    if (!/^https?:\/\//i.test(srcRaw) && !srcRaw.startsWith("/") && !srcRaw.startsWith("data:")) srcRaw = `/${srcRaw}`;
    const isRemote = /^https?:\/\//i.test(srcRaw);
    if (isRemote) srcRaw = srcRaw.split("?")[0];
    const cacheBust = updatedAt && srcRaw.startsWith("/") ? `?v=${new Date(updatedAt).getTime()}` : "";
    const src = srcRaw.startsWith("/") ? `${srcRaw}${cacheBust}` : srcRaw;
    const isDataUrl = srcRaw.startsWith("data:");
    const isSupabase = /supabase\.(co|in)\/storage/i.test(srcRaw);
    const isLocal = srcRaw.startsWith("/");
    return { src, shouldOptimize: (isLocal || isSupabase) && !isDataUrl };
  }, []);

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

  const expiredOverlayUrl = useMemo(() => {
    try {
      const { data } = supabaseClient.storage.from("templates").getPublicUrl("expired.png");
      return data?.publicUrl || null;
    } catch { return null; }
  }, []);

  // ── performSearch ─────────────────────────────────────────────────────────
  const abortPreviousSearch = useCallback(() => {
    if (abortControllerRef.current) { abortControllerRef.current.abort(); abortControllerRef.current = null; }
  }, []);

  const performSearch = useCallback(async (searchFilters: SearchFilters, markAsSearched = false) => {
    abortPreviousSearch();
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    if (loadingTimeoutRef.current) { clearTimeout(loadingTimeoutRef.current); loadingTimeoutRef.current = null; }
    loadingTimeoutRef.current = setTimeout(() => setSearching(true), 100);
    setSearchError("");

    try {
      if (signal.aborted) return;
      const q = searchFilters.keyword || "";
      if (!q || typeof q !== "string") { setSearchError(t("error.search.empty")); setSearchResults([]); return; }

      const cekMatch = q.match(/(?:\/cek\/|cek\/)([A-Za-z0-9-_]+)/);
      const oldMatch = q.match(/(?:\/certificate\/|certificate\/)([A-Za-z0-9-_]+)/);
      const isCertId = q.match(/^CERT-/i);
      const trimmed = q.trim();

      if (!cekMatch && !oldMatch && !isCertId) {
        if (trimmed.length < 3) { setSearchError("Search must be at least 3 characters long"); setSearchResults([]); return; }
        const letterCount = (trimmed.match(/[a-zA-Z]/g) || []).length;
        if (letterCount < 3) { setSearchError("Search must contain at least 3 letters"); setSearchResults([]); return; }
      }

      if (cekMatch || oldMatch || isCertId) {
        const certNo = cekMatch ? cekMatch[1] : oldMatch ? oldMatch[1] : q;
        const cert = await getCertificateByNumber(certNo);
        if (cert) { router.push(`/cek/${certNo}`); return; }
        setSearchError(t("error.search.notFound")); setSearchResults([]);
      } else {
        if (!q.trim()) { setSearchError(t("error.search.empty")); setSearchResults([]); return; }
        let results: Certificate[];
        if (!searchFilters.tenant_id?.trim()) {
          const pf: PublicSearchFilters = { keyword: searchFilters.keyword, category: searchFilters.category, startDate: searchFilters.startDate, endDate: searchFilters.endDate };
          results = await publicSearchCertificates(pf);
        } else {
          results = await advancedSearchCertificates(searchFilters);
        }

        if (Array.isArray(results)) {
          const currentIds = searchResultsRef.current.map((r) => r.id).sort().join(",");
          const newIds = results.map((r) => r.id).sort().join(",");
          if (currentIds !== newIds) { searchResultsRef.current = results; setSearchResults(results); setCurrentPage(1); }
          if (results.length === 0) {
            const msg = searchFilters.keyword
              ? `${t("search.noResults")} "${searchFilters.keyword}"${searchFilters.category ? ` ${t("search.inCategory")} "${searchFilters.category}"` : ""}`
              : t("search.noResultsGeneral");
            setSearchError(msg); toast.info(msg, { id: "search-no-results" });
          } else { setSearchError(""); }
        } else {
          const msg = t("error.search.failed") || "Search failed. Please try again.";
          setSearchError(msg); toast.error(msg, { id: "search-error" }); setSearchResults([]);
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      const msg = t("error.search.failed") || "Search failed. Please try again.";
      setSearchError(msg); setSearchResults([]); toast.error(msg, { id: "search-error" });
    } finally {
      if (loadingTimeoutRef.current) { clearTimeout(loadingTimeoutRef.current); loadingTimeoutRef.current = null; }
      setSearching(false);
      if (markAsSearched) setHasSearched(true);
    }
  }, [t, router, abortPreviousSearch]);

  // initial search from URL
  useEffect(() => {
    if (!initialQuery?.trim() || loadingTenants || hasRunInitialSearchRef.current) { if (!initialQuery?.trim()) setHasSearched(false); return; }
    const initialFilters: SearchFilters = {
      keyword: initialQuery,
      category: searchParams.get("category") || "",
      startDate: searchParams.get("startDate") || "",
      endDate: searchParams.get("endDate") || "",
      tenant_id: selectedTenantId || "",
    };
    setFilters(initialFilters);
    performSearch(initialFilters, true);
    setHasSearched(true);
    if (typeof window !== "undefined") window.history.replaceState({}, "", "/search");
    hasRunInitialSearchRef.current = true;
  }, [initialQuery, searchParams, selectedTenantId, loadingTenants, performSearch]);

  // ── search handlers ───────────────────────────────────────────────────────
  const handleSearch = useCallback(() => {
    const q = searchQuery.trim();
    if (!q) { setSearchError(t("error.search.empty")); setSearchResults([]); setHasSearched(false); return; }
    const pubMatch = q.match(/(?:\/cek\/|cek\/|\/c\/|c\/)([a-f0-9-]{16,36})/i);
    const oldMatch = q.match(/(?:\/certificate\/|certificate\/)([A-Za-z0-9-_]+)/);
    const isCertId = q.match(/^CERT-/i);
    if (!pubMatch && !oldMatch && !isCertId) {
      if (q.length < 3) { setSearchError("Search must be at least 3 characters long"); setSearchResults([]); return; }
      const lc = (q.match(/[a-zA-Z]/g) || []).length;
      if (lc < 3) { setSearchError("Search must contain at least 3 letters"); setSearchResults([]); return; }
    }
    const newFilters: SearchFilters = { keyword: q, category: filters.category, startDate: filters.startDate, endDate: filters.endDate, tenant_id: filters.tenant_id || selectedTenantId || "" };
    setFilters(newFilters);
    performSearch(newFilters, true);
  }, [searchQuery, filters, performSearch, t, selectedTenantId]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSearch();
  }, [handleSearch]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    setIsTyping(true);
    if (value.trim() !== searchQuery.trim()) { setSearchResults([]); setSearchError(""); searchResultsRef.current = []; setCurrentPage(1); }
    if (inputTimeoutRef.current) clearTimeout(inputTimeoutRef.current);
    inputTimeoutRef.current = setTimeout(() => { setSearchQuery(value); setIsTyping(false); }, 500);
  }, [searchQuery]);

  const handleClearSearch = useCallback(() => {
    if (inputTimeoutRef.current) { clearTimeout(inputTimeoutRef.current); inputTimeoutRef.current = null; }
    setInputValue(""); setSearchQuery(""); setSearchError(""); setSearchResults([]); setHasSearched(false); setCurrentPage(1); setIsTyping(false);
  }, []);

  const handleBackToHome = useCallback(() => {
    setSearchQuery(""); setFilters({ keyword: "", category: "", startDate: "", endDate: "", tenant_id: selectedTenantId });
    router.push("/");
  }, [router, selectedTenantId]);

  const clearFilters = useCallback(() => {
    const cleared: SearchFilters = { keyword: searchQuery, category: "", startDate: "", endDate: "", tenant_id: filters.tenant_id };
    setFilters(cleared);
    if (searchQuery.trim()) performSearch(cleared, true);
  }, [searchQuery, filters.tenant_id, performSearch]);

  // ── filter modal handlers ─────────────────────────────────────────────────
  const openFilterModal = useCallback(() => {
    setTempCategory(filters.category || ""); setTempStartDate(filters.startDate || ""); setTempEndDate(filters.endDate || ""); setTempTenant(selectedTenantId || "");
    setFilterModalOpen(true);
  }, [filters, selectedTenantId]);

  const applyFilters = useCallback(() => {
    if (tempTenant !== selectedTenantId) {
      setSelectedTenantId(tempTenant);
      try { window.localStorage.setItem("ecert-selected-tenant-id", tempTenant); } catch { /* ignore */ }
    }
    const newFilters: SearchFilters = { keyword: searchQuery, category: tempCategory, startDate: tempStartDate, endDate: tempEndDate, tenant_id: tempTenant };
    setFilters(newFilters);
    if (searchQuery.trim()) performSearch(newFilters, true);
    setFilterModalOpen(false);
  }, [searchQuery, tempCategory, tempStartDate, tempEndDate, tempTenant, selectedTenantId, performSearch]);

  const cancelFilters = useCallback(() => {
    setTempCategory(filters.category || ""); setTempStartDate(filters.startDate || ""); setTempEndDate(filters.endDate || ""); setTempTenant(selectedTenantId || "");
    setFilterModalOpen(false);
  }, [filters, selectedTenantId]);

  const clearTempFilters = useCallback(() => { setTempCategory(""); setTempStartDate(""); setTempEndDate(""); }, []);

  const hasActiveFilters = useMemo(() => !!(filters.category || filters.startDate || filters.endDate), [filters.category, filters.startDate, filters.endDate]);

  // ── preview modal handlers ────────────────────────────────────────────────
  const handlePreview = useCallback((cert: Certificate) => {
    setPreviewCert(cert); setPreviewOpen(true); setIsModalOpen(true);
  }, [setIsModalOpen]);

  const handleClosePreview = useCallback(() => {
    setPreviewOpen(false); setPreviewCert(null); setIsModalOpen(false);
  }, [setIsModalOpen]);

  const handleOpenImagePreview = useCallback((url: string | null | undefined, updatedAt?: string | null) => {
    if (!url) return;
    let imageUrl = url;
    if (/^https?:\/\//i.test(imageUrl) || imageUrl.startsWith("data:")) { window.open(imageUrl, "_blank", "noopener,noreferrer"); return; }
    if (!imageUrl.startsWith("/")) imageUrl = `/${imageUrl}`;
    if (updatedAt) imageUrl = `${imageUrl}?v=${new Date(updatedAt).getTime()}`;
    if (typeof window !== "undefined") imageUrl = `${window.location.origin}${imageUrl}`;
    window.open(imageUrl, "_blank", "noopener,noreferrer");
  }, []);

  // ── exports ───────────────────────────────────────────────────────────────
  const exportToPDF = useCallback(async (certificate: Certificate) => {
    try {
      if (!certificate.certificate_image_url) { toast.error(t("hero.imageNotAvailable")); return; }
      const mod = await import("jspdf").catch(() => null) as null | typeof import("jspdf");
      if (!mod || !("jsPDF" in mod)) { toast.error(t("hero.pdfLibraryMissing")); return; }
      const { jsPDF } = mod;
      let srcRaw = certificate.certificate_image_url;
      if (!/^https?:\/\//i.test(srcRaw) && !srcRaw.startsWith("/") && !srcRaw.startsWith("data:")) srcRaw = `/${srcRaw}`;
      const cacheBust = certificate.updated_at ? `?v=${new Date(certificate.updated_at).getTime()}` : "";
      const local = srcRaw.startsWith("/") ? `${srcRaw}${cacheBust}` : srcRaw;
      const src = local.startsWith("/") && typeof window !== "undefined" ? `${window.location.origin}${local}` : local;
      const resp = await fetch(src);
      if (!resp.ok) throw new Error(`${t("hero.fetchImageFailed")}: ${resp.status}`);
      const blob = await resp.blob();
      const dataUrl = await new Promise<string>((res, rej) => { const r = new FileReader(); r.onloadend = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(blob); });
      const imgType = blob.type.includes("png") ? "PNG" : "JPEG";
      const bmp = await createImageBitmap(blob);
      const imgW = bmp.width; const imgH = bmp.height; bmp.close();
      const doc = new jsPDF({ orientation: imgW >= imgH ? "l" : "p", unit: "mm", format: "a4" });
      const pW = doc.internal.pageSize.getWidth(); const pH = doc.internal.pageSize.getHeight();
      const margin = 8; const maxW = pW - margin * 2; const maxH = pH - margin * 2;
      const scale = Math.min(maxW / imgW, maxH / imgH);
      const dW = imgW * scale; const dH = imgH * scale;
      doc.addImage(dataUrl, imgType, (pW - dW) / 2, (pH - dH) / 2, dW, dH, undefined, "FAST");
      doc.save(`${certificate.certificate_no || "certificate"}.pdf`);
      toast.success(t("hero.pdfExported"));
    } catch (err) { toast.error(err instanceof Error ? err.message : t("hero.exportPdfFailed")); }
  }, [t]);

  const exportToPNG = useCallback(async (certificate: Certificate) => {
    try {
      if (!certificate.certificate_image_url) { toast.error(t("hero.imageNotAvailable")); return; }
      let srcRaw = certificate.certificate_image_url;
      if (!/^https?:\/\//i.test(srcRaw) && !srcRaw.startsWith("/") && !srcRaw.startsWith("data:")) srcRaw = `/${srcRaw}`;
      const cacheBust = certificate.updated_at ? `?v=${new Date(certificate.updated_at).getTime()}` : "";
      const local = srcRaw.startsWith("/") ? `${srcRaw}${cacheBust}` : srcRaw;
      const src = local.startsWith("/") && typeof window !== "undefined" ? `${window.location.origin}${local}` : local;
      const resp = await fetch(src);
      if (!resp.ok) throw new Error(`${t("hero.fetchImageFailed")}: ${resp.status}`);
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url; link.download = `${certificate.certificate_no || "certificate"}.png`;
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success(t("hero.pngDownloaded"));
    } catch (err) { toast.error(err instanceof Error ? err.message : t("hero.exportPngFailed")); }
  }, [t]);

  const generateCertificateLink = useCallback(async (certificate: Certificate) => {
    try {
      if (!certificate.certificate_no) { toast.error(t("hero.noPublicLink")); return; }
      await navigator.clipboard.writeText(`${window.location.origin}/cek/${certificate.certificate_no}`);
      toast.success(t("hero.linkCopied"));
    } catch { toast.error(t("hero.linkGenerateFailed")); }
  }, [t]);

  // ── email send ────────────────────────────────────────────────────────────
  const openSendEmailModal = useCallback(async (certificate: Certificate) => {
    try {
      if (!certificate.certificate_image_url) { toast.error(t("hero.imageNotAvailableShort")); return; }
      let srcRaw = certificate.certificate_image_url;
      if (!/^https?:\/\//i.test(srcRaw) && !srcRaw.startsWith("/") && !srcRaw.startsWith("data:")) srcRaw = `/${srcRaw}`;
      const src = srcRaw.startsWith("/") && typeof window !== "undefined" ? `${window.location.origin}${srcRaw}` : srcRaw;
      setSendCert(certificate);
      setSendPreviewSrc(src);
      const subject = certificate.certificate_no
        ? t("hero.emailDefaultSubject").replace("{number}", certificate.certificate_no)
        : t("hero.emailDefaultSubjectNoNumber");
      const message = `Certificate Information:\n\n• Certificate Number: ${certificate.certificate_no || "N/A"}\n• Recipient Name: ${certificate.name || "N/A"}\n• Issue Date: ${new Date(certificate.issue_date || certificate.created_at || new Date()).toLocaleDateString()}${certificate.expired_date ? `\n• Expiry Date: ${new Date(certificate.expired_date).toLocaleDateString()}` : ""}${certificate.category ? `\n• Category: ${certificate.category}` : ""}`;
      setSendForm({ email: "", subject, message });
      setSendModalOpen(true);
    } catch (err) { toast.error(err instanceof Error ? err.message : t("hero.emailPrepareFailed")); }
  }, [t]);

  const closeSendModal = useCallback(() => {
    setSendModalOpen(false); setPreviewOpen(false); setPreviewCert(null); setIsModalOpen(false);
  }, [setIsModalOpen]);

  const confirmSendEmail = useCallback(async () => {
    if (!sendCert || !sendPreviewSrc || isSendingEmail) return;
    setSendFormErrors({});
    const errors: { email?: string; subject?: string; message?: string } = {};
    const recipientEmail = (sendForm.email || "").trim();
    if (!recipientEmail) { errors.email = t("hero.emailValidationRequired"); }
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) { errors.email = t("hero.emailValidationInvalid"); }
    if (!sendForm.subject.trim()) errors.subject = t("hero.subjectRequired");
    if (!sendForm.message.trim()) errors.message = t("hero.messageRequired");
    if (Object.keys(errors).length > 0) { setSendFormErrors(errors); return; }
    setIsSendingEmail(true);
    try {
      const res = await fetch("/api/send-certificate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientEmail, recipientName: sendCert.name, imageUrl: sendPreviewSrc, certificateNo: sendCert.certificate_no, subject: sendForm.subject.trim(), message: sendForm.message.trim() }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 400) throw new Error(t("hero.emailInvalidFields"));
        if (res.status === 404) throw new Error(t("hero.emailServiceUnavailable"));
        if (res.status === 500) throw new Error(t("hero.emailServerError"));
        throw new Error(json?.error || t("hero.emailSendFailed"));
      }
      if (json.previewUrl) { toast.success(t("hero.emailQueued")); try { window.open(json.previewUrl, "_blank"); } catch { /* ignore */ } }
      else toast.success(`${t("hero.emailSentSuccess")} ${recipientEmail}`);
      setSendModalOpen(false); setPreviewOpen(false); setPreviewCert(null); setIsModalOpen(false);
      setSendCert(null); setSendPreviewSrc(null); setSendForm({ email: "", subject: "", message: "" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("hero.emailSendFailed"));
    } finally { setIsSendingEmail(false); }
  }, [sendCert, sendPreviewSrc, sendForm, isSendingEmail, t, setIsModalOpen]);

  // ── pagination ────────────────────────────────────────────────────────────
  const paginationData = useMemo(() => {
    const totalItems = searchResults.length;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return { totalItems, totalPages, startIndex, endIndex, currentResults: searchResults.slice(startIndex, endIndex) };
  }, [searchResults, currentPage]);

  const changePage = useCallback((page: number) => {
    setCurrentPage(page);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // ── memoized values ───────────────────────────────────────────────────────
  const resultsCountText = useMemo(() => {
    if (!searchQuery.trim() || searchResults.length === 0) return null;
    const ct = searchResults.length === 1 ? t("hero.certificate") : t("hero.certificates");
    return `${searchResults.length} ${ct} ${t("search.foundFor")} "${searchQuery}"`;
  }, [searchResults.length, searchQuery, t]);

  // loadingSkeletons rendered directly in page JSX (cannot contain JSX in .ts files)

  return {
    // i18n
    t, language,
    // tenants
    tenants, selectedTenantId, loadingTenants,
    // categories
    categories,
    // search
    searchQuery, inputValue, searching, isTyping, searchResults, searchError, hasSearched, filters,
    // pagination
    currentPage, setCurrentPage, changePage, paginationData,
    // search handlers
    handleSearch, handleKeyDown, handleInputChange, handleClearSearch, handleBackToHome, clearFilters,
    // filter modal
    filterModalOpen, setFilterModalOpen, openFilterModal, applyFilters, cancelFilters, clearTempFilters, hasActiveFilters,
    tempCategory, setTempCategory, tempStartDate, setTempStartDate, tempEndDate, setTempEndDate, tempTenant, setTempTenant,
    // preview
    previewOpen, previewCert, handlePreview, handleClosePreview, handleOpenImagePreview,
    // send email
    sendModalOpen, sendForm, setSendForm, sendFormErrors, setSendFormErrors, isSendingEmail, sendPreviewSrc, sendCert,
    openSendEmailModal, confirmSendEmail, closeSendModal,
    // exports
    exportToPDF, exportToPNG, generateCertificateLink,
    // helpers
    formatDateShort, capitalize, getThumbnailUrl, normalizeImageUrl, isCertificateExpired, expiredOverlayUrl,
    // memoized
    resultsCountText,
    // loading ref (needed for empty-state condition in JSX)
    loadingTimeoutRef,
  };
}
