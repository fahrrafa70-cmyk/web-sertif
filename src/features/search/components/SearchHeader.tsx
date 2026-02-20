"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, ArrowRight, Search as SearchIcon, X as XIcon, Filter } from "lucide-react";

interface SearchHeaderProps {
  inputValue: string;
  searching: boolean;
  hasActiveFilters: boolean;
  searchError: string | null;
  t: (key: string) => string;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  handleClearSearch: () => void;
  handleSearch: () => void;
  openFilterModal: () => void;
}

export function SearchHeader({
  inputValue, searching, hasActiveFilters, searchError, t,
  handleInputChange, handleKeyDown, handleClearSearch, handleSearch, openFilterModal,
}: SearchHeaderProps) {
  const router = useRouter();

  return (
    <div className="mb-8 sm:mb-10">
      <div className="flex items-center gap-2 sm:gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/")} className="flex-shrink-0 h-9 sm:h-10 w-9 sm:w-10 self-center" aria-label="Go back to home">
          <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
        </Button>

        <div className="flex-1 max-w-[600px] relative">
          <div className="flex items-center gap-2 sm:gap-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl sm:rounded-2xl p-1.5 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
              <Input
                type="text" placeholder={t("search.searchByName") || "Search certificates..."}
                value={inputValue} onChange={handleInputChange} onKeyDown={handleKeyDown}
                className="h-9 sm:h-10 pl-8 sm:pl-9 pr-8 sm:pr-9 bg-transparent border-0 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus-visible:ring-0 text-sm sm:text-base text-gray-900 dark:text-gray-100"
              />
              {inputValue && (
                <button onClick={handleClearSearch} className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" aria-label="Clear search">
                  <XIcon className="w-4 h-4" />
                </button>
              )}
            </div>
            <Button onClick={handleSearch} disabled={searching} className="h-9 sm:h-10 px-3 sm:px-4 md:h-11 md:px-5 gradient-primary text-white rounded-lg sm:rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm flex items-center gap-2">
              <span>{t("hero.searchButton")}</span>
              {searching ? <div className="w-4 h-4 border-b-2 border-white rounded-full animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            </Button>
          </div>
          {searchError && <p className="absolute top-full left-0 mt-1 text-xs sm:text-sm text-red-600 dark:text-red-400 px-1 whitespace-nowrap">{searchError}</p>}
        </div>

        <Button type="button" onClick={openFilterModal} variant="outline" size="icon"
          className={`flex-shrink-0 h-9 sm:h-10 w-9 sm:w-10 ${hasActiveFilters ? "bg-green-500 hover:bg-green-600 text-white border-green-500" : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"}`}
          aria-label="Filter">
          <Filter className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>
      </div>
    </div>
  );
}
