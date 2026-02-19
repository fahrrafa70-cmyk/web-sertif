"use client";

/**
 * useCertificateSearch
 *
 * Encapsulates all search, filter, and tenant selection state extracted from hero-section.tsx:
 *  - Tenant loading + localStorage persistence
 *  - Category loading
 *  - Filter modal (open / apply / cancel / clear)
 *  - performSearch  – calls advancedSearchCertificates
 *  - handleSearch   – validates input then navigates to /search?q=...
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { advancedSearchCertificates, getCertificateCategories } from "@/features/certificates/queries";
import { getTenantsForCurrentUser } from "@/features/tenants/queries";
import type { SearchFilters } from "@/features/certificates/types";
import type { Tenant } from "@/features/tenants/types";

interface UseCertificateSearchOptions {
  t: (key: string) => string;
  /** Validated i18n translation with fallback */
  safeT: (key: string, fallback: string) => string;
}

export function useCertificateSearch({ t, safeT }: UseCertificateSearchOptions) {
  const router = useRouter();

  // ── Tenant state ────────────────────────────────────────────────────────────
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>("");
  const [loadingTenants, setLoadingTenants] = useState(true);

  // ── Search / results state ──────────────────────────────────────────────────
  const [certificateId, setCertificateId] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [searchResults, setSearchResults] = useState<import("@/features/certificates/types").Certificate[]>([]);
  const [showResults, setShowResults] = useState(false);

  // ── Filter state ────────────────────────────────────────────────────────────
  const [categories, setCategories] = useState<string[]>([]);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    keyword: "",
    category: "",
    startDate: "",
    endDate: "",
    tenant_id: "",
  });

  // Temp values while filter modal is open
  const [tempCategory, setTempCategory] = useState("");
  const [tempStartDate, setTempStartDate] = useState("");
  const [tempEndDate, setTempEndDate] = useState("");
  const [tempTenant, setTempTenant] = useState("");

  // Track whether user has performed at least one search
  const hasSearchedRef = useRef(false);

  // ── Tenant loading ──────────────────────────────────────────────────────────
  useEffect(() => {
    const loadTenants = async () => {
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
    void loadTenants();
  }, []);

  // Sync tenant_id into filters whenever selectedTenantId changes
  useEffect(() => {
    setFilters((prev) => ({ ...prev, tenant_id: selectedTenantId }));
  }, [selectedTenantId]);

  // ── Category loading ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedTenantId) {
      setCategories([]);
      return;
    }
    getCertificateCategories(selectedTenantId)
      .then((cats) => setCategories(Array.isArray(cats) ? cats : []))
      .catch(() => setCategories([]));
  }, [selectedTenantId]);

  // ── Core search ─────────────────────────────────────────────────────────────
  const performSearch = useCallback(
    async (searchFilters: SearchFilters, showToast = false) => {
      try {
        setSearching(true);
        setSearchError("");

        const results = await advancedSearchCertificates(searchFilters);
        setSearchResults(results);
        setShowResults(results.length > 0);

        if (
          results.length === 0 &&
          (searchFilters.keyword || searchFilters.category || searchFilters.startDate || searchFilters.endDate)
        ) {
          const errorMsg = searchFilters.keyword
            ? `${t("search.noResults")} "${searchFilters.keyword}"${searchFilters.category ? ` ${t("search.inCategory")} "${searchFilters.category}"` : ""}`
            : searchFilters.category
              ? `${t("search.noResults")} ${t("search.inCategory")} "${searchFilters.category}"`
              : t("search.noResultsGeneral");
          setSearchError(errorMsg);
          if (showToast) toast.info(errorMsg);
        }
      } catch (err) {
        console.error("Search error:", err);
        setSearchError(t("error.search.failed"));
        if (showToast) toast.error(t("error.search.failed"));
      } finally {
        setSearching(false);
      }
    },
    [t],
  );

  // Live filter effect — re-search when filters change (only after first search)
  useEffect(() => {
    if (searchResults.length > 0 || showResults) hasSearchedRef.current = true;
  }, [searchResults.length, showResults]);

  useEffect(() => {
    const hasKeyword = certificateId.trim();
    const hasFilters = filters.category || filters.startDate || filters.endDate;

    if (!hasSearchedRef.current || !hasKeyword) return;

    const timeoutId = setTimeout(() => {
      performSearch(
        {
          keyword: certificateId.trim(),
          category: hasFilters ? filters.category : "",
          startDate: hasFilters ? filters.startDate : "",
          endDate: hasFilters ? filters.endDate : "",
          tenant_id: filters.tenant_id,
        },
        true,
      );
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [filters.category, filters.startDate, filters.endDate, certificateId, performSearch, filters.tenant_id]);

  // ── Main search handler (button click / Enter) ──────────────────────────────
  const handleSearch = useCallback(async () => {
    const q = certificateId.trim();
    if (!q) {
      setSearchError(safeT("error.search.empty", "Please enter a keyword to search"));
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    const publicLinkMatch = q.match(/(?:\/cek\/|cek\/|\/c\/|c\/)([a-f0-9-]{16,36})/i);
    const oldLinkMatch = q.match(/(?:\/certificate\/|certificate\/)([A-Za-z0-9-_]+)/);
    const isCertId = q.match(/^CERT-/i);

    if (!publicLinkMatch && !oldLinkMatch && !isCertId) {
      if (q.length < 3) {
        setSearchError(safeT("error.search.tooShort", "Search must be at least 3 characters long"));
        setSearchResults([]);
        setShowResults(false);
        return;
      }
      if ((q.match(/[a-zA-Z]/g) || []).length < 3) {
        setSearchError(safeT("error.search.tooFewLetters", "Search must contain at least 3 letters"));
        setSearchResults([]);
        setShowResults(false);
        return;
      }
    }

    setSearching(true);
    setSearchError("");

    const params = new URLSearchParams();
    params.set("q", q);
    if (filters.category) params.set("category", filters.category);
    if (filters.startDate) params.set("startDate", filters.startDate);
    if (filters.endDate) params.set("endDate", filters.endDate);

    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      setTimeout(() => router.push(`/search?${params.toString()}`), 150);
    } else {
      router.push(`/search?${params.toString()}`);
    }
    // Keep searching=true — component unmounts on navigation
  }, [certificateId, filters, router, safeT]);

  // ── Filter modal handlers ─────────────────────────────────────────────────
  const openFilterModal = useCallback(() => {
    setTempCategory(filters.category || "");
    setTempStartDate(filters.startDate || "");
    setTempEndDate(filters.endDate || "");
    setTempTenant(selectedTenantId || "");
    setFilterModalOpen(true);
  }, [filters, selectedTenantId]);

  const applyFilters = useCallback(() => {
    if (tempTenant !== selectedTenantId) {
      setSelectedTenantId(tempTenant);
      try { window.localStorage.setItem("ecert-selected-tenant-id", tempTenant); } catch { /* ignore */ }
    }
    const newFilters: SearchFilters = {
      keyword: certificateId.trim(),
      category: tempCategory,
      startDate: tempStartDate,
      endDate: tempEndDate,
      tenant_id: tempTenant,
    };
    setFilters(newFilters);
    if (certificateId.trim()) performSearch(newFilters, false);
    setFilterModalOpen(false);
  }, [certificateId, tempCategory, tempStartDate, tempEndDate, tempTenant, selectedTenantId, performSearch]);

  const cancelFilters = useCallback(() => {
    setTempCategory(filters.category || "");
    setTempStartDate(filters.startDate || "");
    setTempEndDate(filters.endDate || "");
    setTempTenant(selectedTenantId || "");
    setFilterModalOpen(false);
  }, [filters, selectedTenantId]);

  const clearFilters = useCallback(() => {
    const cleared: SearchFilters = {
      keyword: "",
      category: "",
      startDate: "",
      endDate: "",
      tenant_id: filters.tenant_id,
    };
    setFilters(cleared);
    if (certificateId.trim()) {
      performSearch({ ...cleared, keyword: certificateId.trim() }, true);
    } else {
      setSearchResults([]);
      setShowResults(false);
      setSearchError("");
      hasSearchedRef.current = false;
    }
  }, [certificateId, filters.tenant_id, performSearch]);

  return {
    // Tenant
    tenants,
    selectedTenantId,
    setSelectedTenantId,
    loadingTenants,
    // Search
    certificateId,
    setCertificateId,
    searching,
    searchError,
    searchResults,
    showResults,
    handleSearch,
    performSearch,
    // Categories + filters
    categories,
    filters,
    filterModalOpen,
    setFilterModalOpen,
    tempCategory, setTempCategory,
    tempStartDate, setTempStartDate,
    tempEndDate, setTempEndDate,
    tempTenant, setTempTenant,
    openFilterModal,
    applyFilters,
    cancelFilters,
    clearFilters,
  };
}
