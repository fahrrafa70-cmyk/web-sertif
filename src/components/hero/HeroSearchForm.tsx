import { motion } from "framer-motion";
import { Search, ArrowRight, Filter, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import type { SearchFilters } from "@/features/certificates/types";

interface HeroSearchFormProps {
  mounted: boolean;
  t: (key: string) => string;
  certificateId: string;
  setCertificateId: (val: string) => void;
  handleSearch: () => void;
  searching: boolean;
  openFilterModal: () => void;
  filters: SearchFilters;
  searchError: string;
  clearFilters: () => void;
  itemVariants: any;
}

export function HeroSearchForm({
  mounted,
  t,
  certificateId,
  setCertificateId,
  handleSearch,
  searching,
  openFilterModal,
  filters,
  searchError,
  clearFilters,
  itemVariants,
}: HeroSearchFormProps) {
  return (
    <motion.div variants={itemVariants} className="mx-auto max-w-2xl relative">
      <div className="relative mb-2">
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 sm:gap-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl sm:rounded-2xl p-1.5 border border-gray-200 dark:border-gray-700 shadow-sm transition-all duration-200">
            <div className="flex-1 relative">
              <Search className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
              <Input
                value={certificateId}
                onChange={(e) => setCertificateId(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSearch();
                  }
                }}
                placeholder={mounted ? t("search.searchByName") : "Search by name or number..."}
                className="h-9 sm:h-10 pl-8 sm:pl-9 bg-transparent border-0 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus-visible:ring-0 text-sm sm:text-base text-gray-900 dark:text-gray-100"
                suppressHydrationWarning
              />
            </div>
            <LoadingButton
              type="button"
              onClick={handleSearch}
              isLoading={searching}
              loadingText={t("search.searching") || "Searching..."}
              className="h-9 sm:h-10 px-3 sm:px-4 md:h-11 md:px-5 gradient-primary text-white rounded-lg sm:rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm flex items-center gap-1 sm:gap-2"
            >
              <span className="hidden sm:inline">{t("search.search")}</span>
              <span className="sm:hidden">{t("search.searchShort") || "Search"}</span>
              <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
            </LoadingButton>
          </div>

          {/* Filter Button */}
          <Button
            type="button"
            onClick={openFilterModal}
            variant="outline"
            size="icon"
            className={`flex-shrink-0 h-9 sm:h-10 md:h-12 w-9 sm:w-10 md:w-12 ${
              filters.category || filters.startDate || filters.endDate
                ? "bg-green-500 hover:bg-green-600 text-white border-green-500"
                : "border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
            }`}
          >
            <Filter className="w-4 h-4 md:w-5 md:h-5" />
          </Button>
        </div>
      </div>

      {/* Error Message */}
      {searchError && !(filters.category || filters.startDate || filters.endDate) && (
        <motion.p
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 mb-3 text-sm text-red-600 dark:text-red-400"
        >
          {searchError}
        </motion.p>
      )}

      {/* Active Filters Indicator */}
      {(filters.category || filters.startDate || filters.endDate) && (
        <>
          <div className="mt-4 mb-3 flex flex-wrap items-center gap-2 sm:gap-3 text-sm text-gray-600 dark:text-gray-400">
            <span className="font-medium flex-shrink-0">{t("search.filteredBy")}:</span>
            <div className="flex flex-wrap items-center gap-2">
              {filters.category && (
                <span className="px-2.5 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-md text-xs sm:text-sm">
                  {filters.category}
                </span>
              )}
              {filters.startDate && (
                <span className="px-2.5 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-md text-xs sm:text-sm">
                  {filters.startDate}
                </span>
              )}
              {filters.endDate && (
                <span className="px-2.5 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-md text-xs sm:text-sm">
                  {filters.endDate}
                </span>
              )}
            </div>
            <button
              onClick={clearFilters}
              className="ml-1 sm:ml-2 p-1.5 rounded-lg text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex-shrink-0"
              aria-label={t("search.clearFilters")}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {searchError && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-3 text-sm text-red-600 dark:text-red-400"
            >
              {searchError}
            </motion.p>
          )}
        </>
      )}
    </motion.div>
  );
}
