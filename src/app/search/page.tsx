"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Search, Filter, X as XIcon } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce";
import ModernHeader from "@/components/modern-header";
import { 
  advancedSearchCertificates, 
  getCertificateCategories, 
  Certificate, 
  SearchFilters,
  getCertificateByNumber,
  getCertificateByPublicId
} from "@/lib/supabase/certificates";
import Image from "next/image";
import { FileText } from "lucide-react";
import { formatReadableDate } from "@/lib/utils/certificate-formatters";

function SearchResultsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, language } = useLanguage();
  
  // Get initial query from URL
  const initialQuery = searchParams.get('q') || '';
  
  // State management
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Certificate[]>([]);
  const [searchError, setSearchError] = useState("");
  const [hasSearched, setHasSearched] = useState(false); // Track if user has performed initial search
  const debouncedSearchQuery = useDebounce(searchQuery, 500); // Debounce for auto-search after first search
  const isInitialMount = useRef(true); // Track if this is the initial mount
  const [showFilters, setShowFilters] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewCert, setPreviewCert] = useState<Certificate | null>(null);
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>("");
  
  // Smooth scroll to top on mount and when query changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const timer = setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [initialQuery]);

  // Handle Escape key to go back to home
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle Escape if no modal is open
      if (e.key === 'Escape' && !previewOpen && !imagePreviewOpen && !showFilters) {
        e.preventDefault();
        router.push('/');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router, previewOpen, imagePreviewOpen, showFilters]);
  const [filters, setFilters] = useState<SearchFilters>({
    keyword: initialQuery,
    category: "",
    startDate: "",
    endDate: "",
  });

  // Load categories on mount
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const cats = await getCertificateCategories();
        if (Array.isArray(cats)) {
          setCategories(cats);
        } else {
          console.warn('Categories is not an array:', cats);
          setCategories([]);
        }
      } catch (error) {
        console.error('Failed to load categories:', error);
        setCategories([]);
      }
    };
    loadCategories();
  }, []);

  // Perform search function
  const performSearch = useCallback(async (searchFilters: SearchFilters, markAsSearched = false) => {
    setSearching(true);
    setSearchError("");
    
    try {
      // Check if it's a direct link/ID search
      const q = searchFilters.keyword || '';
      
      // Validate query
      if (!q || typeof q !== 'string') {
        setSearchError(t('error.search.empty'));
        setSearchResults([]);
        return;
      }
      
      const publicLinkMatch = q.match(/(?:\/cek\/|cek\/)([a-f0-9-]{36})/i);
      const oldLinkMatch = q.match(/(?:\/certificate\/|certificate\/)([A-Za-z0-9-_]+)/);
      const isCertId = q.match(/^CERT-/i);
      
      if (publicLinkMatch || oldLinkMatch || isCertId) {
        // Direct search by ID/link - redirect to certificate page
        try {
          let cert: Certificate | null = null;
          if (publicLinkMatch) {
            cert = await getCertificateByPublicId(publicLinkMatch[1]);
            if (cert) {
              router.push(`/cek/${publicLinkMatch[1]}`);
              return;
            }
          } else {
            const certNo = oldLinkMatch ? oldLinkMatch[1] : q;
            cert = await getCertificateByNumber(certNo);
            if (cert) {
              router.push(`/certificate/${certNo}`);
              return;
            }
          }
          
          if (!cert) {
            setSearchError(t('error.search.notFound'));
            setSearchResults([]);
          }
        } catch (error) {
          console.error('Direct search error:', error);
          setSearchError(t('error.search.failed') || 'Search failed. Please try again.');
          setSearchResults([]);
        }
      } else {
        // Keyword search - perform advanced search
        if (!q.trim()) {
          setSearchError(t('error.search.empty'));
          setSearchResults([]);
          return;
        }
        
        try {
          const results = await advancedSearchCertificates(searchFilters);
          
          // Validate results
          if (Array.isArray(results)) {
            setSearchResults(results);
            
            if (results.length === 0) {
              const errorMsg = searchFilters.keyword 
                ? `${t('search.noResults')} "${searchFilters.keyword}"${searchFilters.category ? ` ${t('search.inCategory')} "${searchFilters.category}"` : ''}`
                : searchFilters.category 
                  ? `${t('search.noResults')} ${t('search.inCategory')} "${searchFilters.category}"`
                  : t('search.noResultsGeneral');
              setSearchError(errorMsg);
              toast.info(errorMsg);
            } else {
              setSearchError('');
            }
          } else {
            console.error('Invalid search results format:', results);
            const errorMsg = t('error.search.failed') || 'Search failed. Please try again.';
            setSearchError(errorMsg);
            toast.error(errorMsg);
            setSearchResults([]);
          }
        } catch (searchError) {
          console.error('Advanced search error:', searchError);
          const errorMsg = t('error.search.failed') || 'Search failed. Please try again.';
          setSearchError(errorMsg);
          toast.error(errorMsg);
          setSearchResults([]);
        }
      }
    } catch (error) {
      console.error('Unexpected search error:', error);
      setSearchError(t('error.search.failed') || 'Search failed. Please try again.');
      setSearchResults([]);
    } finally {
      setSearching(false);
      // Mark as searched after search completes (for auto-search on edit)
      if (markAsSearched) {
        setHasSearched(true);
      }
    }
  }, [t, router]);

  // Search on mount if query exists (from URL) - for backward compatibility
  // URL will stay as /search without query params going forward
  useEffect(() => {
    if (initialQuery && initialQuery.trim()) {
      try {
        const urlCategory = searchParams.get('category') || '';
        const urlStartDate = searchParams.get('startDate') || '';
        const urlEndDate = searchParams.get('endDate') || '';
        setFilters({
          keyword: initialQuery,
          category: urlCategory,
          startDate: urlStartDate,
          endDate: urlEndDate,
        });
        performSearch({
          keyword: initialQuery,
          category: urlCategory,
          startDate: urlStartDate,
          endDate: urlEndDate,
        }, true); // Mark as searched after initial search from URL
        setHasSearched(true); // Set immediately since this is from URL (user already searched)
        // Clean URL to /search without query params after reading from URL
        if (typeof window !== 'undefined') {
          window.history.replaceState({}, '', '/search');
        }
      } catch (error) {
        console.error('Error during initial search:', error);
        setSearchError(t('error.search.failed') || 'Search failed. Please try again.');
        setSearching(false);
      }
    } else {
      // If no initial query, ensure hasSearched is false
      setHasSearched(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  // Mark initial mount as complete after first render
  useEffect(() => {
    isInitialMount.current = false;
  }, []);

  // Auto-search only after first search has been performed (when user edits input)
  // IMPORTANT: This should NOT trigger on initial mount or when user first types
  // Only trigger if user has explicitly searched before (hasSearched = true)
  useEffect(() => {
    // CRITICAL: Skip on initial mount
    if (isInitialMount.current) {
      return;
    }
    
    // CRITICAL: Skip entirely if user hasn't performed a manual search yet
    // This prevents auto-search when user first types
    if (!hasSearched) {
      return;
    }
    
    // Additional check: if debouncedSearchQuery is empty, don't search
    if (!debouncedSearchQuery.trim()) {
      return;
    }
    
    // Only auto-search if the debounced query is different from current keyword in filters
    // This prevents duplicate searches
    if (debouncedSearchQuery.trim() === filters.keyword) {
      return;
    }
    
    // All conditions met: perform auto-search
    const newFilters: SearchFilters = {
      keyword: debouncedSearchQuery.trim(),
      category: filters.category,
      startDate: filters.startDate,
      endDate: filters.endDate,
    };
    setFilters(newFilters);
    performSearch(newFilters, true); // Mark as searched for auto-search
  }, [debouncedSearchQuery, hasSearched, filters.category, filters.startDate, filters.endDate, filters.keyword, performSearch]);

  // Handle search submission
  const handleSearch = useCallback(() => {
    const q = searchQuery.trim();
    if (!q) {
      setSearchError(t('error.search.empty'));
      setSearchResults([]);
      setHasSearched(false); // Reset if search query is empty
      return;
    }

    // Update filters and perform search (URL stays as /search without query params)
    const newFilters: SearchFilters = {
      keyword: q,
      category: filters.category,
      startDate: filters.startDate,
      endDate: filters.endDate,
    };
    setFilters(newFilters);
    performSearch(newFilters, true); // Mark as searched after user clicks search or presses Enter
  }, [searchQuery, filters, performSearch, t]);

  // Handle Enter key
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  }, [handleSearch]);

  // Clear filters
  const clearFilters = useCallback(() => {
    const clearedFilters: SearchFilters = {
      keyword: searchQuery,
      category: "",
      startDate: "",
      endDate: "",
    };
    setFilters(clearedFilters);
    if (searchQuery.trim()) {
      performSearch(clearedFilters, true); // Keep hasSearched true when clearing filters
    }
  }, [searchQuery, performSearch]);

  // Check if filters are active
  const hasActiveFilters = filters.category || filters.startDate || filters.endDate;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 w-full">
      {/* Header - Full Width */}
      <ModernHeader />
      
      {/* Fixed Search Bar - Positioned below header with proper spacing */}
      {/* Background solid to hide content that scrolls UP behind search bar (same as header behavior) */}
      {/* Container with solid background - ensures content behind is completely hidden */}
      <div className="fixed top-[84px] sm:top-[70px] left-0 right-0 z-[45]">
          {/* Solid background layer - MUST be opaque to hide content behind */}
          <div className="absolute inset-0 bg-gray-50 dark:bg-gray-900" />
          {/* Blue border filling the gap between header and search bar - same color as primary blue */}
          <div className="absolute inset-x-0 top-0 h-[28px] sm:h-[6px] border-t-4 border-[#2563eb]" />
          {/* Content wrapper with relative positioning */}
          <div className="relative w-full px-4 sm:px-6 py-3 sm:py-4 z-10">
            <div className="flex items-center gap-2 sm:gap-3 relative z-10">
              {/* Back Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push('/')}
                className="flex-shrink-0 h-9 sm:h-10 w-9 sm:w-10 self-center"
                aria-label="Go back to home"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>

              {/* Search Bar - Matching home page design exactly */}
              <div className="flex-1 max-w-[600px] relative">
                <div className="flex items-center gap-2 sm:gap-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl sm:rounded-2xl p-1.5 border border-gray-200 dark:border-gray-700 shadow-sm">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                    <Input
                      type="text"
                      placeholder={t('search.searchByName') || 'Search certificates...'}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="h-9 sm:h-10 pl-8 sm:pl-9 pr-8 sm:pr-9 bg-transparent border-0 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus-visible:ring-0 text-sm sm:text-base text-gray-900 dark:text-gray-100"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setSearchError('');
                          setSearchResults([]);
                          setHasSearched(false); // Reset when clearing input
                        }}
                        className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        aria-label="Clear search"
                      >
                        <XIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <Button
                    onClick={handleSearch}
                    disabled={searching}
                    className="h-9 sm:h-10 px-3 sm:px-4 md:h-11 md:px-5 gradient-primary text-white rounded-lg sm:rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm"
                  >
                    {searching ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <span>{t('hero.searchButton') || 'Search'}</span>
                    )}
                  </Button>
                </div>
                {/* Error Message - Right below input field, absolute positioned */}
                {searchError && (
                  <p className="absolute top-full left-0 mt-1 text-xs sm:text-sm text-red-600 dark:text-red-400 px-1 whitespace-nowrap">{searchError}</p>
                )}
              </div>

              {/* Filter Button - Matching home page styling */}
              <Button
                type="button"
                variant={hasActiveFilters ? "default" : "outline"}
                onClick={() => setShowFilters(!showFilters)}
                className="h-9 sm:h-10 px-3 sm:px-4 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 flex-shrink-0 relative self-center"
                aria-label="Toggle filters"
              >
                <Filter className="w-4 h-4" />
                <span className="ml-2 hidden sm:inline text-sm">Filter</span>
                {hasActiveFilters && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full" />
                )}
              </Button>
            </div>

            {/* Filter Panel */}
            {showFilters && (
              <div className="pb-4 border-t border-gray-200 dark:border-gray-700 pt-4 px-5 sm:px-6 bg-gray-50 dark:bg-gray-900 relative z-10">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Category Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('search.category') || 'Category'}
                    </label>
                    <select
                      value={filters.category || ''}
                      onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    >
                      <option value="">{t('search.allCategories') || 'All Categories'}</option>
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Start Date Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('search.startDate') || 'Start Date'}
                    </label>
                    <Input
                      type="date"
                      value={filters.startDate || ''}
                      onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                      className="w-full"
                    />
                  </div>

                  {/* End Date Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('search.endDate') || 'End Date'}
                    </label>
                    <Input
                      type="date"
                      value={filters.endDate || ''}
                      onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Apply Filters Button */}
                <div className="flex justify-end gap-2 mt-4">
                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      onClick={clearFilters}
                      className="text-sm"
                    >
                      {t('search.clearFilters') || 'Clear Filters'}
                    </Button>
                  )}
                  <Button
                    onClick={() => {
                      handleSearch();
                      setShowFilters(false);
                    }}
                    className="text-sm"
                  >
                    {t('search.applyFilters') || 'Apply Filters'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main Content Area - Account for fixed header (56px/64px) + spacing (28px/6px) + search bar (~72px/80px) */}
        {/* z-index MUST be lower than search bar (z-[45]) to ensure content is hidden when scrolling behind search bar */}
        <div className="w-full px-3 sm:px-6 py-4 sm:py-5 relative z-[10]" style={{ paddingTop: 'calc(3.5rem + 1.75rem + 4.5rem)' }}>
          {/* Results Count */}
          {!searching && searchResults.length > 0 && searchQuery.trim() && (
            <div className="mb-4">
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                {searchResults.length} {searchResults.length === 1 ? t('hero.certificate') : t('hero.certificates')} {t('search.foundFor') || 'found for'} &quot;{searchQuery}&quot;
              </p>
            </div>
          )}

          {/* Loading State */}
          {searching && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 sm:gap-x-5 gap-y-5 sm:gap-y-6">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden animate-pulse flex flex-row h-[150px]"
                >
                  <div className="w-[170px] flex-shrink-0 bg-gray-200 dark:bg-gray-700" />
                  <div className="flex-1 p-4 flex flex-col justify-center gap-1.5">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Results Grid */}
          {!searching && searchResults.length > 0 && searchQuery.trim() && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 sm:gap-x-5 gap-y-5 sm:gap-y-6">
              {searchResults.map((certificate) => (
                <div
                  key={certificate.id}
                  onClick={() => {
                    setPreviewCert(certificate);
                    setPreviewOpen(true);
                  }}
                  className="group bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm dark:shadow-none hover:shadow-md dark:hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 cursor-pointer flex flex-row h-[180px]"
                >
                  {/* Certificate Thumbnail - Left Side */}
                  <div className="relative w-[170px] flex-shrink-0 bg-gray-100 dark:bg-gray-900 flex items-center justify-center overflow-hidden">
                    {certificate.certificate_image_url ? (
                      <Image
                        src={certificate.certificate_image_url}
                        alt={certificate.name}
                        fill
                        sizes="170px"
                        className="object-contain group-hover:scale-105 transition-transform duration-200"
                        loading="lazy"
                        unoptimized
                        onError={(e) => {
                          // Hide broken image
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-gray-400 dark:text-gray-500">
                        <div className="text-center">
                          <div className="text-2xl mb-1">📄</div>
                          <div className="text-xs">{t('hero.noPreviewImage') || 'No preview'}</div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Content Section - Right Side */}
                  <div className="flex-1 p-4 flex flex-col justify-center gap-1.5">
                    {/* Recipient Name - Primary */}
                    <div>
                      <h3 className="font-semibold text-base text-gray-900 dark:text-gray-100 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-tight">
                        {certificate.name}
                      </h3>
                    </div>

                    {/* Certificate Number - Secondary */}
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400 truncate">
                        {certificate.certificate_no}
                      </p>
                    </div>

                    {/* Status Badge */}
                    {certificate.category && (
                      <div>
                        <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                          {certificate.category}
                        </span>
                      </div>
                    )}

                    {/* Metadata */}
                    <div className="space-y-0.5 pt-1 border-t border-gray-200 dark:border-gray-700">
                      {certificate.issue_date && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {t('hero.issued') || 'Issued'}: {formatReadableDate(certificate.issue_date, language)}
                        </p>
                      )}
                      {certificate.members?.organization && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                          {certificate.members.organization}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!searching && searchResults.length === 0 && !searchError && initialQuery && (
            <div className="text-center py-12 sm:py-16">
              <div className="max-w-md mx-auto">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  {t('error.search.noResults') || 'No certificates found'}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  {t('error.search.tryDifferent') || 'Try adjusting your search terms or filters'}
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery('');
                    setFilters({ keyword: '', category: '', startDate: '', endDate: '' });
                    router.push('/');
                  }}
                >
                  {t('nav.home') || 'Back to Home'}
                </Button>
              </div>
            </div>
          )}

          {/* Initial State - No Search Yet - Minimal, no empty state shown */}
          {/* Empty state removed for better UX - search bar is already visible */}

          {/* Certificate Preview Modal */}
          {previewOpen && previewCert && (
            <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-2 sm:p-4" onClick={() => setPreviewOpen(false)}>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b dark:border-gray-700">
                  <div>
                    <div className="text-base sm:text-lg font-semibold dark:text-gray-100">{t('hero.certificatePreview')}</div>
                  </div>
                  <Button variant="outline" onClick={() => setPreviewOpen(false)} size="icon" aria-label="Close" className="h-8 w-8 sm:h-10 sm:w-10">
                    <XIcon className="w-4 h-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
                  <div className="p-2 sm:p-4 bg-gray-50 dark:bg-gray-900">
                    {previewCert.certificate_image_url ? (
                      <div
                        className="relative w-full cursor-zoom-in group"
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          setImagePreviewUrl(previewCert.certificate_image_url!);
                          setImagePreviewOpen(true);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setImagePreviewUrl(previewCert.certificate_image_url!);
                            setImagePreviewOpen(true);
                          }
                        }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={previewCert.certificate_image_url ?? undefined}
                          alt="Certificate"
                          className="w-full h-auto rounded-lg border transition-transform duration-200 group-hover:scale-[1.01]"
                        />
                        <div className="absolute bottom-3 right-3 px-3 py-1 rounded-md bg-black/60 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity">
                          {t('hero.viewFullImage')}
                        </div>
                      </div>
                    ) : (
                      <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">{t('hero.noPreviewImage')}</div>
                    )}
                  </div>
                  <div className="p-4 sm:p-6">
                    <div className="space-y-2">
                      <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{t('hero.recipient')}</div>
                      <div className="text-lg sm:text-xl md:text-2xl font-semibold dark:text-gray-100">{previewCert.members?.name || previewCert.name}</div>
                      {previewCert.members?.organization && (
                        <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{previewCert.members.organization}</div>
                      )}
                    </div>
                    <div className="mt-4 space-y-1 text-xs sm:text-sm">
                      <div><span className="text-gray-500 dark:text-gray-400">{t('hero.category')}:</span> {previewCert.category || "—"}</div>
                      <div><span className="text-gray-500 dark:text-gray-400">{t('hero.template')}:</span> {(previewCert as unknown as { templates?: { name?: string } }).templates?.name || "—"}</div>
                      <div><span className="text-gray-500 dark:text-gray-400">{t('hero.issued')}:</span> {formatReadableDate(previewCert.issue_date, language)}</div>
                      {previewCert.expired_date && (
                        <div><span className="text-gray-500 dark:text-gray-400">{t('hero.expires')}:</span> {formatReadableDate(previewCert.expired_date, language)}</div>
                      )}
                    </div>
                    <div className="mt-4 sm:mt-6 flex flex-wrap gap-2 sm:gap-3">
                      <Button
                        variant="outline"
                        onClick={() => {
                          const link = `/certificate/${previewCert.certificate_no}`;
                          window.open(link, '_blank');
                        }}
                        className="border-gray-300"
                      >
                        <FileText className="w-4 h-4 mr-1" />
                        {t('hero.viewDetails') || 'View Details'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Full Image Preview Modal */}
          {imagePreviewOpen && (
            <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4" onClick={() => setImagePreviewOpen(false)}>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between px-4 py-3 border-b dark:border-gray-700 flex-shrink-0">
                  <div className="text-sm text-gray-600 dark:text-gray-400">{t('hero.certificateImage')}</div>
                  <Button variant="outline" onClick={() => setImagePreviewOpen(false)} size="icon" aria-label="Close">
                    <XIcon className="w-4 h-4" />
                  </Button>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-900 overflow-auto flex-1">
                  {imagePreviewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imagePreviewUrl} alt="Certificate" className="w-full h-auto rounded-lg border" />
                  ) : (
                    <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">{t('hero.noPreviewImage')}</div>
                  )}
                </div>
              </div>
            </div>
          )}
      </div>
    </div>
  );
}

export default function SearchResultsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    }>
      <SearchResultsContent />
    </Suspense>
  );
}

