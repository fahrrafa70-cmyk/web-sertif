"use client";

import { motion } from "framer-motion";
import { useState, useEffect, useCallback, useRef, useMemo, memo } from "react";
import { Input } from "@/components/ui/input";
import { getCertificateByNumber, getCertificateByPublicId, Certificate, advancedSearchCertificates, getCertificateCategories, SearchFilters } from "@/lib/supabase/certificates";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { ArrowRight, Search, Filter } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import { useRouter } from "next/navigation";
import { useDebouncedCallback } from "@/hooks/use-debounce";
import { requestDeduplicator } from "@/hooks/use-request-deduplication";

// Memoized animation variants to prevent recreation
const ANIMATION_VARIANTS = {
  container: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1,
        ease: [0.4, 0, 0.2, 1] as const
      }
    }
  },
  item: {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        ease: [0.4, 0, 0.2, 1] as const
      }
    }
  }
} as const;

interface OptimizedHeroSectionProps {
  className?: string;
}

const OptimizedHeroSection = memo(function OptimizedHeroSection({ 
  className = "" 
}: OptimizedHeroSectionProps) {
  const { t } = useLanguage();
  const router = useRouter();
  
  // State management with better organization
  const [searchState, setSearchState] = useState({
    query: "",
    searching: false,
    error: "",
  });
  
  const [filters, setFilters] = useState<SearchFilters>({
    keyword: "",
    category: "",
    startDate: "",
    endDate: "",
  });
  
  const [categories, setCategories] = useState<string[]>([]);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  
  // Memoized search function with request deduplication
  const performSearch = useCallback(async (searchFilters: SearchFilters) => {
    const searchKey = `search-${JSON.stringify(searchFilters)}`;
    
    try {
      setSearchState(prev => ({ ...prev, searching: true, error: "" }));
      
      // Use request deduplication to prevent duplicate API calls
      const results = await requestDeduplicator.deduplicate(
        searchKey,
        () => advancedSearchCertificates(searchFilters)
      );
      
      if (results.length === 0) {
        const errorMsg = searchFilters.keyword 
          ? `${t('search.noResults')} "${searchFilters.keyword}"`
          : t('search.noResultsGeneral');
        setSearchState(prev => ({ ...prev, error: errorMsg }));
      }
      
      return results;
    } catch (err) {
      console.error('Search error:', err);
      setSearchState(prev => ({ ...prev, error: t('error.search.failed') }));
      return [];
    } finally {
      setSearchState(prev => ({ ...prev, searching: false }));
    }
  }, [t]);
  
  // Debounced search handler
  const debouncedSearch = useDebouncedCallback(
    useCallback(async (query: string) => {
      if (!query.trim()) {
        setSearchState(prev => ({ ...prev, error: "" }));
        return;
      }
      
      const searchFilters: SearchFilters = {
        keyword: query.trim(),
        category: filters.category,
        startDate: filters.startDate,
        endDate: filters.endDate,
      };
      
      await performSearch(searchFilters);
    }, [performSearch, filters]),
    300
  );
  
  // Optimized search handler
  const handleSearch = useCallback(async () => {
    const query = searchState.query.trim();
    if (!query) {
      setSearchState(prev => ({ ...prev, error: t('error.search.empty') }));
      return;
    }
    
    // Check if it's a direct link/ID search
    const publicLinkMatch = query.match(/(?:\/cek\/|cek\/)([a-f0-9-]{36})/i);
    const oldLinkMatch = query.match(/(?:\/certificate\/|certificate\/)([A-Za-z0-9-_]+)/);
    const isCertId = query.match(/^CERT-/i);
    
    if (publicLinkMatch || oldLinkMatch || isCertId) {
      // Direct search by ID/link
      setSearchState(prev => ({ ...prev, searching: true, error: "" }));
      try {
        let cert: Certificate | null = null;
        if (publicLinkMatch) {
          cert = await getCertificateByPublicId(publicLinkMatch[1]);
        } else {
          const certNo = oldLinkMatch ? oldLinkMatch[1] : query;
          cert = await getCertificateByNumber(certNo);
        }
        
        if (!cert) {
          setSearchState(prev => ({ ...prev, error: t('error.search.notFound') }));
        } else {
          // Handle certificate preview (implement as needed)
          console.log('Certificate found:', cert);
        }
      } catch (err) {
        console.error(err);
        setSearchState(prev => ({ ...prev, error: t('error.search.failed') }));
      } finally {
        setSearchState(prev => ({ ...prev, searching: false }));
      }
    } else {
      // Keyword search - redirect to search results page
      const params = new URLSearchParams();
      params.set('q', query);
      if (filters.category) params.set('category', filters.category);
      if (filters.startDate) params.set('startDate', filters.startDate);
      if (filters.endDate) params.set('endDate', filters.endDate);
      
      router.push(`/search?${params.toString()}`);
    }
  }, [searchState.query, filters, router, t]);
  
  // Load categories on mount with deduplication
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const cats = await requestDeduplicator.deduplicate(
          'categories',
          getCertificateCategories
        );
        setCategories(cats);
      } catch (err) {
        console.error('Failed to load categories:', err);
      }
    };
    loadCategories();
  }, []);
  
  // Memoized input handler
  const handleInputChange = useCallback((value: string) => {
    setSearchState(prev => ({ ...prev, query: value, error: "" }));
    debouncedSearch(value);
  }, [debouncedSearch]);
  
  // Memoized filter modal handlers
  const filterHandlers = useMemo(() => ({
    openModal: () => setFilterModalOpen(true),
    closeModal: () => setFilterModalOpen(false),
    clearFilters: () => setFilters({
      keyword: "",
      category: "",
      startDate: "",
      endDate: "",
    })
  }), []);
  
  // Memoized filter indicator
  const hasActiveFilters = useMemo(() => 
    !!(filters.category || filters.startDate || filters.endDate),
    [filters]
  );
  
  return (
    <section className={`relative w-full flex-1 flex items-center justify-center ${className}`}>
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 text-center py-8 sm:py-12 md:py-20">
        <motion.div
          variants={ANIMATION_VARIANTS.container}
          initial="hidden"
          animate="visible"
          className="max-w-5xl mx-auto"
        >
          {/* Main Title */}
          <motion.div variants={ANIMATION_VARIANTS.item} className="mb-4 sm:mb-5">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold text-gradient mb-2 sm:mb-3 leading-tight">
              {t('hero.title')}
            </h1>
          </motion.div>

          {/* Optimized Search Bar */}
          <motion.div
            variants={ANIMATION_VARIANTS.item}
            className="mx-auto max-w-2xl relative"
          >
            <div className="relative mb-2">
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 sm:gap-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl sm:rounded-2xl p-1.5 border border-gray-200 dark:border-gray-700 shadow-sm transition-all duration-200">
                  <div className="flex-1 relative">
                    <Search className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                    <Input
                      value={searchState.query}
                      onChange={(e) => handleInputChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleSearch();
                        }
                      }}
                      placeholder={t('search.searchByName')}
                      className="h-9 sm:h-10 pl-8 sm:pl-9 bg-transparent border-0 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus-visible:ring-0 text-sm sm:text-base text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <LoadingButton
                    type="button"
                    onClick={handleSearch}
                    isLoading={searchState.searching}
                    loadingText={t('hero.searching')}
                    variant="primary"
                    className="h-9 sm:h-10 px-3 sm:px-4 md:h-11 md:px-5 gradient-primary text-white rounded-lg sm:rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] text-xs sm:text-sm"
                  >
                    <span className="hidden sm:inline">{t('hero.searchButton')}</span>
                    <span className="sm:hidden">{t('hero.searchButton')}</span>
                    <ArrowRight className="ml-1 sm:ml-2 w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5" />
                  </LoadingButton>
                </div>
                
                {/* Filter Button */}
                <Button
                  type="button"
                  onClick={filterHandlers.openModal}
                  variant="outline"
                  size="icon"
                  className={`flex-shrink-0 h-9 sm:h-10 md:h-12 w-9 sm:w-10 md:w-12 ${
                    hasActiveFilters
                      ? 'bg-green-500 hover:bg-green-600 text-white border-green-500'
                      : 'border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <Filter className="w-4 h-4 md:w-5 md:h-5" />
                </Button>
              </div>
            </div>

            {/* Error Message */}
            {searchState.error && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-2 mb-3 text-sm text-red-600 dark:text-red-400"
              >
                {searchState.error}
              </motion.p>
            )}

            {/* Active Filters Indicator */}
            {hasActiveFilters && (
              <div className="mt-4 mb-3 flex flex-wrap items-center gap-2 sm:gap-3 text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium flex-shrink-0">{t('search.filteredBy')}:</span>
                <div className="flex flex-wrap items-center gap-2">
                  {filters.category && (
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-md text-xs">
                      {filters.category}
                    </span>
                  )}
                  {(filters.startDate || filters.endDate) && (
                    <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-md text-xs">
                      {filters.startDate && filters.endDate 
                        ? `${filters.startDate} - ${filters.endDate}`
                        : filters.startDate || filters.endDate}
                    </span>
                  )}
                  <Button
                    type="button"
                    onClick={filterHandlers.clearFilters}
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    Clear all
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
});

OptimizedHeroSection.displayName = "OptimizedHeroSection";

export default OptimizedHeroSection;
