"use client";

import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Toaster } from "sonner";
import ModernHeader from "@/components/modern-header";
import { useSearchPage } from "@/features/search/hooks/useSearchPage";

import { CertificateCard } from "@/features/search/components/CertificateCard";
import { SearchHeader } from "@/features/search/components/SearchHeader";
import { SearchFilterDialog } from "@/features/search/components/SearchFilterDialog";
import { CertificatePreviewDialog } from "@/features/search/components/CertificatePreviewDialog";

function SearchResultsContent() {
  const {
    t, language, tenants, loadingTenants, categories,
    inputValue, searching, isTyping, searchResults, searchError, hasSearched,
    currentPage, changePage, paginationData,
    handleSearch, handleKeyDown, handleInputChange, handleClearSearch, handleBackToHome,
    filterModalOpen, setFilterModalOpen, openFilterModal, applyFilters, hasActiveFilters,
    tempCategory, setTempCategory, tempStartDate, setTempStartDate, tempEndDate, setTempEndDate, tempTenant, setTempTenant,
    previewOpen, previewCert, handlePreview, handleClosePreview, handleOpenImagePreview,
    sendModalOpen, sendForm, setSendForm, sendFormErrors, setSendFormErrors, isSendingEmail, sendPreviewSrc,
    openSendEmailModal, confirmSendEmail, closeSendModal,
    exportToPDF, exportToPNG, generateCertificateLink,
    formatDateShort, capitalize, getThumbnailUrl, normalizeImageUrl, isCertificateExpired, expiredOverlayUrl,
    resultsCountText, loadingTimeoutRef,
  } = useSearchPage();

  const { totalItems, totalPages, startIndex, endIndex, currentResults } = paginationData;

  const SkeletonGrid = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 sm:gap-x-5 gap-y-5 sm:gap-y-6">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden animate-pulse flex flex-row h-[180px]">
          <div className="w-[170px] flex-shrink-0 bg-gray-200 dark:bg-gray-700" />
          <div className="flex-1 p-4 flex flex-col justify-center gap-1.5">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="bg-gray-50 dark:bg-gray-900 w-full overflow-x-hidden">
      <ModernHeader />
      <div className="w-full px-4 sm:px-6 pt-4 sm:pt-6 pb-4 sm:pb-5 relative z-[10]">
        <SearchHeader
          inputValue={inputValue} searching={searching} hasActiveFilters={hasActiveFilters} searchError={searchError} t={t}
          handleInputChange={handleInputChange} handleKeyDown={handleKeyDown} handleClearSearch={handleClearSearch}
          handleSearch={handleSearch} openFilterModal={openFilterModal}
        />

        {resultsCountText && <div className="mb-4 sm:mb-5"><p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{resultsCountText}</p></div>}
        {isTyping && inputValue.trim() && <SkeletonGrid />}

        {!isTyping && searchResults.length > 0 && (
          <>
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {language === "id" ? `Menampilkan ${startIndex + 1}-${Math.min(endIndex, totalItems)} dari ${totalItems} hasil` : `Showing ${startIndex + 1}-${Math.min(endIndex, totalItems)} of ${totalItems} results`}
              </p>
              {totalPages > 1 && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {language === "id" ? `Halaman ${currentPage} dari ${totalPages}` : `Page ${currentPage} of ${totalPages}`}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 sm:gap-x-5 gap-y-5 sm:gap-y-6">
              {currentResults.map((cert, index) => (
                <CertificateCard
                  key={cert.id} certificate={cert} onPreview={handlePreview} language={language} t={t} index={index}
                  expiredOverlayUrl={expiredOverlayUrl} getThumbnailUrl={getThumbnailUrl}
                  normalizeImageUrl={normalizeImageUrl} isCertificateExpired={isCertificateExpired}
                />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-8">
                {/* Mobile */}
                <div className="flex items-center gap-2 sm:hidden">
                  <Button variant="outline" size="sm" onClick={() => changePage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="flex items-center gap-1">
                    <ChevronLeft className="h-3 w-3" />{language === "id" ? "Sebelumnya" : "Previous"}
                  </Button>
                  <div className="text-sm text-gray-600 px-2 whitespace-nowrap">
                    {language === "id" ? `Halaman ${currentPage} dari ${totalPages}` : `Page ${currentPage} of ${totalPages}`}
                  </div>
                  <Button variant="outline" size="sm" onClick={() => changePage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} className="flex items-center gap-1">
                    {language === "id" ? "Selanjutnya" : "Next"}<ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
                {/* Desktop */}
                <div className="hidden sm:flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => changePage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="flex items-center gap-1">
                    <ChevronLeft className="w-4 h-4" />{language === "id" ? "Sebelumnya" : "Previous"}
                  </Button>
                  <div className="flex gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 5) pageNum = i + 1;
                      else if (currentPage <= 3) pageNum = i + 1;
                      else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                      else pageNum = currentPage - 2 + i;
                      return <Button key={pageNum} variant={currentPage === pageNum ? "default" : "outline"} size="sm" onClick={() => changePage(pageNum)} className="w-10">{pageNum}</Button>;
                    })}
                  </div>
                  <Button variant="outline" size="sm" onClick={() => changePage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} className="flex items-center gap-1">
                    {language === "id" ? "Selanjutnya" : "Next"}<ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {!isTyping && searching && searchResults.length === 0 && <SkeletonGrid />}

        {!isTyping && !searching && !loadingTimeoutRef.current && hasSearched && searchResults.length === 0 && !searchError && (
          <div className="text-center py-12 sm:py-16">
            <div className="max-w-md mx-auto">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">{t("error.search.noResults") || "No certificates found"}</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">{t("error.search.tryDifferent") || "Try adjusting your search terms or filters"}</p>
              <Button variant="outline" onClick={handleBackToHome}>{t("nav.home") || "Back to Home"}</Button>
            </div>
          </div>
        )}

        <CertificatePreviewDialog
          previewOpen={previewOpen} previewCert={previewCert} handleClosePreview={handleClosePreview}
          language={language} t={t} isCertificateExpired={isCertificateExpired} getThumbnailUrl={getThumbnailUrl}
          normalizeImageUrl={normalizeImageUrl} handleOpenImagePreview={handleOpenImagePreview}
          expiredOverlayUrl={expiredOverlayUrl} formatDateShort={formatDateShort} capitalize={capitalize}
          sendModalOpen={sendModalOpen} exportToPDF={exportToPDF} exportToPNG={exportToPNG}
          openSendEmailModal={openSendEmailModal} generateCertificateLink={generateCertificateLink}
          closeSendModal={closeSendModal} sendPreviewSrc={sendPreviewSrc} sendForm={sendForm}
          setSendForm={setSendForm} sendFormErrors={sendFormErrors} setSendFormErrors={setSendFormErrors}
          isSendingEmail={isSendingEmail} confirmSendEmail={confirmSendEmail}
        />

        <SearchFilterDialog
          filterModalOpen={filterModalOpen} setFilterModalOpen={setFilterModalOpen}
          tempTenant={tempTenant} setTempTenant={setTempTenant} loadingTenants={loadingTenants} tenants={tenants}
          tempCategory={tempCategory} setTempCategory={setTempCategory} categories={categories}
          tempStartDate={tempStartDate} setTempStartDate={setTempStartDate} tempEndDate={tempEndDate} setTempEndDate={setTempEndDate}
          applyFilters={applyFilters} t={t}
        />
      </div>
    </div>
  );
}

export default function SearchResultsPage() {
  return (
    <>
      <Suspense fallback={
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <svg className="animate-spin mx-auto mb-4" width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle className="stroke-blue-500 dark:stroke-blue-400" cx="16" cy="16" r="12" strokeWidth="3" strokeLinecap="round" strokeDasharray="75.4" strokeDashoffset="18.85" />
            </svg>
            <p className="text-gray-600 dark:text-gray-400">Loading...</p>
          </div>
        </div>
      }>
        <SearchResultsContent />
      </Suspense>
      <Toaster position="top-right" expand={true} richColors={true} />
    </>
  );
}
