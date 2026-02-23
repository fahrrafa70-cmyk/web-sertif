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

export function useSearchCore() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, language } = useLanguage();
  const { setIsModalOpen } = useModal();

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

  // ── filter modal state ────────────────────────────────────────────────────
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [tempCategory, setTempCategory] = useState("");
  const [tempStartDate, setTempStartDate] = useState("");
  const [tempEndDate, setTempEndDate] = useState("");
  const [tempTenant, setTempTenant] = useState("");

  // ── preview modal state ───────────────────────────────────────────────────
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewCert, setPreviewCert] = useState<Certificate | null>(null);

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

  return {
    t, language, router, searchParams, setIsModalOpen,
    tenants, selectedTenantId, loadingTenants,
    categories,
    searchQuery, inputValue, searching, isTyping, searchResults, searchError, hasSearched, filters,
    currentPage, setCurrentPage, changePage, paginationData,
    handleSearch, handleKeyDown, handleInputChange, handleClearSearch, handleBackToHome, clearFilters,
    filterModalOpen, setFilterModalOpen, openFilterModal, applyFilters, cancelFilters, clearTempFilters, hasActiveFilters,
    tempCategory, setTempCategory, tempStartDate, setTempStartDate, tempEndDate, setTempEndDate, tempTenant, setTempTenant,
    previewOpen, setPreviewOpen, previewCert, setPreviewCert, handlePreview, handleClosePreview, handleOpenImagePreview,
    formatDateShort, capitalize, getThumbnailUrl, normalizeImageUrl, isCertificateExpired, expiredOverlayUrl,
    resultsCountText, loadingTimeoutRef,
  };
}
