"use client";

import { memo, Suspense, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, ArrowRight, Search, Filter, X as XIcon,
  Download, ChevronDown, ChevronLeft, ChevronRight,
  FileText as FileTextIcon, Image as ImageIcon, Link as LinkIcon, Mail,
} from "lucide-react";
import { Toaster } from "sonner";
import Image from "next/image";
import { formatReadableDate } from "@/lib/utils/certificate-formatters";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ModernHeader from "@/components/modern-header";
import { type Certificate } from "@/lib/supabase/certificates";
import { useSearchPage } from "@/features/search/hooks/useSearchPage";

// ── CertificateCard ───────────────────────────────────────────────────────────
const CertificateCard = memo(({
  certificate, onPreview, language, t, index = 0, expiredOverlayUrl: overlayUrl, getThumbnailUrl, normalizeImageUrl, isCertificateExpired,
}: {
  certificate: Certificate;
  onPreview: (cert: Certificate) => void;
  language: "en" | "id";
  t: (key: string) => string;
  index?: number;
  expiredOverlayUrl: string | null;
  getThumbnailUrl: (url: string | null | undefined) => string | null;
  normalizeImageUrl: (url: string | null | undefined, updatedAt?: string | null) => { src: string; shouldOptimize: boolean };
  isCertificateExpired: (cert: Certificate) => boolean;
}) => {
  const formattedDate = useMemo(() => {
    if (!certificate.issue_date) return null;
    return formatReadableDate(certificate.issue_date, language);
  }, [certificate.issue_date, language]);

  const imageConfig = useMemo(() => {
    const thumbnailUrl = certificate.certificate_thumbnail_url || getThumbnailUrl(certificate.certificate_image_url);
    return normalizeImageUrl(thumbnailUrl || certificate.certificate_image_url, certificate.updated_at);
  }, [certificate.certificate_thumbnail_url, certificate.certificate_image_url, certificate.updated_at, getThumbnailUrl, normalizeImageUrl]);

  const isExpired = useMemo(() => isCertificateExpired(certificate), [certificate, isCertificateExpired]);

  return (
    <div
      onClick={() => onPreview(certificate)}
      className="group bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-1 transition-[transform,box-shadow] duration-200 ease-out cursor-pointer flex flex-row h-[180px] will-change-transform relative"
    >
      <div className="relative w-[170px] flex-shrink-0 flex items-center justify-center overflow-hidden bg-gray-100 dark:bg-gray-900 cert-thumbnail-bg">
        {imageConfig.src ? (
          <div className="relative w-full h-full" style={{ backgroundColor: "transparent !important" }}>
            <Image
              key={`cert-image-${certificate.id}-${imageConfig.src}`}
              src={imageConfig.src}
              alt={certificate.name}
              fill
              sizes="170px"
              className="object-contain"
              style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "contain", backgroundColor: "transparent !important" }}
              loading={index < 3 ? "eager" : "lazy"}
              priority={index < 3}
              unoptimized={!imageConfig.shouldOptimize}
              onError={(e) => { e.currentTarget.style.display = "none"; }}
            />
            {isExpired && overlayUrl && (
              <div
                className="absolute inset-0 pointer-events-none z-10 overflow-hidden flex items-center justify-center"
                style={{ backgroundImage: `url(${overlayUrl})`, backgroundSize: "contain", backgroundPosition: "center", backgroundRepeat: "no-repeat", opacity: 0.85, mixBlendMode: "multiply", filter: "brightness(1.1) contrast(1.2)" }}
              />
            )}
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400 dark:text-gray-500" style={{ zIndex: 1 }}>
            <div className="text-center"><div className="text-2xl mb-1">📄</div><div className="text-xs">{t("hero.noPreviewImage")}</div></div>
          </div>
        )}
      </div>

      <div className="flex-1 p-4 flex flex-col justify-center gap-1.5 relative z-0">
        <div>
          <h3 className="font-semibold text-base text-gray-900 dark:text-gray-100 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-tight">
            {certificate.name}
          </h3>
        </div>
        <div><p className="text-sm font-medium text-gray-600 dark:text-gray-400 truncate">{certificate.certificate_no}</p></div>
        {certificate.category && (
          <div><span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">{certificate.category}</span></div>
        )}
        <div className="space-y-0.5 pt-1 border-t border-gray-200 dark:border-gray-700">
          {formattedDate && <p className="text-xs text-gray-500 dark:text-gray-400">{t("hero.issued")}: {formattedDate}</p>}
          {certificate.members?.organization && <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">{certificate.members.organization}</p>}
        </div>
      </div>
    </div>
  );
}, (prev, next) => {
  if (prev.certificate.id !== next.certificate.id) return false;
  if (prev.certificate.certificate_image_url !== next.certificate.certificate_image_url) return false;
  if (prev.certificate.certificate_thumbnail_url !== next.certificate.certificate_thumbnail_url) return false;
  if (prev.certificate.updated_at !== next.certificate.updated_at) return false;
  if (prev.certificate.expired_date !== next.certificate.expired_date) return false;
  if (prev.certificate.issue_date !== next.certificate.issue_date) return false;
  if (prev.language !== next.language) return false;
  if (prev.expiredOverlayUrl !== next.expiredOverlayUrl) return false;
  return true;
});
CertificateCard.displayName = "CertificateCard";

// ── SearchResultsContent ──────────────────────────────────────────────────────
function SearchResultsContent() {
  const router = useRouter();
  const {
    t, language,
    tenants, selectedTenantId: _selectedTenantId, loadingTenants,
    categories,
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
    resultsCountText,
    loadingTimeoutRef,
  } = useSearchPage();

  const { totalItems, totalPages, startIndex, endIndex, currentResults } = paginationData;

  const SkeletonGrid = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 sm:gap-x-5 gap-y-5 sm:gap-y-6">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden animate-pulse flex flex-row h-[150px]">
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
        {/* Search Bar */}
        <div className="mb-8 sm:mb-10">
          <div className="flex items-center gap-2 sm:gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.push("/")} className="flex-shrink-0 h-9 sm:h-10 w-9 sm:w-10 self-center" aria-label="Go back to home">
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>

            <div className="flex-1 max-w-[600px] relative">
              <div className="flex items-center gap-2 sm:gap-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl sm:rounded-2xl p-1.5 border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="relative flex-1">
                  <Search className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                  <Input
                    type="text"
                    placeholder={t("search.searchByName") || "Search certificates..."}
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
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

        {/* Results Count */}
        {resultsCountText && <div className="mb-4 sm:mb-5"><p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{resultsCountText}</p></div>}

        {/* Typing Skeleton */}
        {isTyping && inputValue.trim() && <SkeletonGrid />}

        {/* Results Grid */}
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
                  key={cert.id}
                  certificate={cert}
                  onPreview={handlePreview}
                  language={language}
                  t={t}
                  index={index}
                  expiredOverlayUrl={expiredOverlayUrl}
                  getThumbnailUrl={getThumbnailUrl}
                  normalizeImageUrl={normalizeImageUrl}
                  isCertificateExpired={isCertificateExpired}
                />
              ))}
            </div>

            {/* Pagination */}
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
                      return (
                        <Button key={pageNum} variant={currentPage === pageNum ? "default" : "outline"} size="sm" onClick={() => changePage(pageNum)} className="w-10">{pageNum}</Button>
                      );
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

        {/* Loading Skeleton */}
        {!isTyping && searching && searchResults.length === 0 && <SkeletonGrid />}

        {/* Empty State */}
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

        {/* Certificate Preview Modal */}
        {previewOpen && previewCert && (
          <>
            <div className="fixed inset-0 bg-black/20 dark:bg-black/40 animate-in fade-in-0 duration-200" onClick={handleClosePreview} style={{ top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, position: "fixed" }} />
            <div className="fixed inset-0 flex items-center justify-center p-2 sm:p-4 pointer-events-none animate-in fade-in-0 duration-200" onClick={handleClosePreview} style={{ zIndex: 10000 }}>
              <div
                className={`bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-auto pointer-events-auto animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 ${sendModalOpen ? "opacity-0 pointer-events-none" : ""}`}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b dark:border-gray-700">
                  <div className="text-base sm:text-lg font-semibold dark:text-gray-100">{capitalize(t("hero.certificate"))}</div>
                  <Button variant="outline" onClick={handleClosePreview} size="icon" aria-label="Close" className="h-8 w-8 sm:h-10 sm:w-10"><XIcon className="w-4 h-4" /></Button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
                  <div className="p-2 sm:p-4 bg-gray-50 dark:bg-gray-900">
                    {previewCert.certificate_image_url ? (() => {
                      const isExpired = isCertificateExpired(previewCert);
                      const thumbnailUrl = previewCert.certificate_thumbnail_url || getThumbnailUrl(previewCert.certificate_image_url);
                      const fullImageUrl = previewCert.certificate_image_url;
                      const { src, shouldOptimize } = normalizeImageUrl(thumbnailUrl || fullImageUrl, previewCert.updated_at);
                      return (
                        <div
                          className={`relative w-full ${isExpired ? "cursor-default" : "cursor-zoom-in group"}`}
                          role={isExpired ? undefined : "button"}
                          tabIndex={isExpired ? undefined : 0}
                          onClick={() => { if (!isExpired && fullImageUrl) handleOpenImagePreview(fullImageUrl, previewCert.updated_at); }}
                          onKeyDown={(e) => { if (!isExpired && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); if (fullImageUrl) handleOpenImagePreview(fullImageUrl, previewCert.updated_at); } }}
                        >
                          <div className="relative w-full aspect-auto">
                            <Image
                              src={src} alt="Certificate" width={800} height={600}
                              className={`w-full h-auto rounded-lg border transition-transform duration-200 ${isExpired ? "" : "group-hover:scale-[1.01]"}`}
                              priority unoptimized={!shouldOptimize}
                              placeholder="blur"
                              blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
                              onError={(e) => { e.currentTarget.style.display = "none"; }}
                            />
                            {isExpired && expiredOverlayUrl && (
                              <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden flex items-center justify-center">
                                <Image src={expiredOverlayUrl} alt="Expired" className="max-w-full max-h-full" style={{ objectFit: "contain", width: "100%", height: "auto" }} width={800} height={600} onError={(e) => { e.currentTarget.style.display = "none"; }} />
                              </div>
                            )}
                            {isExpired && !expiredOverlayUrl && (
                              <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center bg-red-500/20">
                                <div className="text-xs text-red-600 dark:text-red-400 font-bold">EXPIRED</div>
                              </div>
                            )}
                          </div>
                          {!isExpired && <div className="absolute bottom-3 right-3 px-3 py-1 rounded-md bg-black/60 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity">{t("hero.viewFullImage")}</div>}
                        </div>
                      );
                    })() : <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">{t("hero.noPreviewImage")}</div>}
                  </div>

                  <div className="p-4 sm:p-6">
                    <div className="space-y-2">
                      <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{t("hero.noCertificate") || "No Certificate"}:</div>
                      <div className="text-sm sm:text-base font-medium text-gray-900 dark:text-gray-100">{previewCert.certificate_no || "—"}</div>
                      <div className="text-lg sm:text-xl md:text-2xl font-semibold dark:text-gray-100 mt-2">{previewCert.members?.name || previewCert.name}</div>
                      {previewCert.members?.organization && <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{previewCert.members.organization}</div>}
                    </div>
                    <div className="mt-4 space-y-1 text-xs sm:text-sm">
                      <div><span className="text-gray-500 dark:text-gray-400">{t("hero.category")}:</span> {previewCert.category || "—"}</div>
                      <div><span className="text-gray-500 dark:text-gray-400">{t("hero.issued")}:</span> {formatDateShort(previewCert.issue_date)}</div>
                      {previewCert.expired_date && <div><span className="text-gray-500 dark:text-gray-400">{t("hero.expires")}:</span> {formatDateShort(previewCert.expired_date)}</div>}
                    </div>
                    <div className="mt-4 sm:mt-6 flex flex-wrap gap-2 sm:gap-3">
                      {isCertificateExpired(previewCert) ? (
                        <div className="w-full p-3 sm:p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                          <p className="text-sm sm:text-base font-medium text-red-700 dark:text-red-400 text-center">
                            {language === "id" ? "Sertifikat ini telah kadaluarsa" : "This certificate has expired"}
                          </p>
                        </div>
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="border-gray-300">
                              <Download className="w-4 h-4 mr-1" />{t("hero.export")}<ChevronDown className="w-4 h-4 ml-1" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => exportToPDF(previewCert)}><FileTextIcon className="w-4 h-4 mr-2" />{t("hero.exportAsPDF")}</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => exportToPNG(previewCert)}><ImageIcon className="w-4 h-4 mr-2" />{t("hero.downloadPNG")}</DropdownMenuItem>
                            {previewCert.certificate_image_url && <DropdownMenuItem onClick={() => openSendEmailModal(previewCert)}><Mail className="w-4 h-4 mr-2" />{t("hero.sendViaEmail")}</DropdownMenuItem>}
                            {previewCert.public_id && <DropdownMenuItem onClick={() => generateCertificateLink(previewCert)}><LinkIcon className="w-4 h-4 mr-2" />{t("hero.generateLink")}</DropdownMenuItem>}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Send Email Modal */}
        {sendModalOpen && (
          <>
            <div className="fixed top-0 left-0 right-0 bottom-0 w-screen h-screen flex items-center justify-center p-4 pointer-events-none animate-in fade-in-0 duration-200" onClick={closeSendModal} style={{ zIndex: 10201 }}>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden pointer-events-auto animate-in zoom-in-95 slide-in-from-bottom-4 duration-300" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 py-4 border-b dark:border-gray-700">
                  <div>
                    <div className="text-lg font-semibold dark:text-gray-100">{t("hero.sendEmailTitle")}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{t("hero.sendEmailSubtitle")}</div>
                  </div>
                  <Button variant="outline" onClick={closeSendModal} size="icon" aria-label="Close"><XIcon className="w-4 h-4" /></Button>
                </div>
                <div className="p-6 space-y-4">
                  {sendPreviewSrc && (
                    <div className="mb-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">{t("hero.certificatePreviewLabel")}</div>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={sendPreviewSrc} alt="Certificate Preview" className="w-full h-auto rounded-lg border max-h-48 object-contain" />
                    </div>
                  )}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("hero.recipientEmail")}</label>
                    <Input type="email" value={sendForm.email}
                      onChange={(e) => { setSendForm({ ...sendForm, email: e.target.value }); if (sendFormErrors.email) setSendFormErrors((err) => ({ ...err, email: undefined })); }}
                      className={`w-full ${sendFormErrors.email ? "border-red-500" : ""}`} disabled={isSendingEmail}
                      onKeyDown={(e) => { if (e.key === "Enter" && !isSendingEmail) { e.preventDefault(); confirmSendEmail(); } else if (e.key === "Escape") { e.preventDefault(); closeSendModal(); } }}
                    />
                    {sendFormErrors.email && <p className="text-xs text-red-500 mt-1">{sendFormErrors.email}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("hero.subject")}</label>
                    <Input value={sendForm.subject}
                      onChange={(e) => { setSendForm({ ...sendForm, subject: e.target.value }); if (sendFormErrors.subject) setSendFormErrors((err) => ({ ...err, subject: undefined })); }}
                      placeholder={t("hero.emailSubjectPlaceholder")} className={`w-full ${sendFormErrors.subject ? "border-red-500" : ""}`} disabled={isSendingEmail}
                      onKeyDown={(e) => { if (e.key === "Enter" && !isSendingEmail) { e.preventDefault(); confirmSendEmail(); } else if (e.key === "Escape") { e.preventDefault(); closeSendModal(); } }}
                    />
                    {sendFormErrors.subject && <p className="text-xs text-red-500 mt-1">{sendFormErrors.subject}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("hero.message")}</label>
                    <textarea value={sendForm.message}
                      onChange={(e) => { setSendForm({ ...sendForm, message: e.target.value }); if (sendFormErrors.message) setSendFormErrors((err) => ({ ...err, message: undefined })); }}
                      placeholder={t("hero.emailMessagePlaceholder")}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 ${sendFormErrors.message ? "border-red-500" : "border-gray-300 dark:border-gray-600"}`}
                      rows={4} disabled={isSendingEmail}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !isSendingEmail) { e.preventDefault(); confirmSendEmail(); } else if (e.key === "Escape") { e.preventDefault(); closeSendModal(); } }}
                    />
                    {sendFormErrors.message && <p className="text-xs text-red-500 mt-1">{sendFormErrors.message}</p>}
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <Button variant="outline" onClick={closeSendModal} disabled={isSendingEmail}>{t("hero.cancel")}</Button>
                    <Button onClick={confirmSendEmail} className="gradient-primary text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all duration-300" disabled={isSendingEmail}>
                      {isSendingEmail ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          {t("hero.sending")}
                        </>
                      ) : t("hero.sendEmail")}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Filter Modal */}
        <Dialog open={filterModalOpen} onOpenChange={setFilterModalOpen}>
          <DialogContent className="sm:max-w-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <DialogHeader className="border-b border-gray-200 dark:border-gray-700 pb-4">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-blue-500" />
                <DialogTitle className="text-gray-900 dark:text-white">Filter</DialogTitle>
              </div>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("search.tenant") || "Organization"}</label>
                <select value={tempTenant} onChange={(e) => setTempTenant(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={loadingTenants}>
                  {loadingTenants ? <option value="">Loading organizations...</option> : (
                    tenants.length === 0 ? <option value="">No organizations available</option> : (
                      <>
                        {!tempTenant && <option value="">Select organization...</option>}
                        {tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
                      </>
                    )
                  )}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
                <select value={tempCategory} onChange={(e) => setTempCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <option value="">All</option>
                  {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Start Date</label>
                <input type="date" value={tempStartDate} onChange={(e) => setTempStartDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">End Date</label>
                <input type="date" value={tempEndDate} onChange={(e) => setTempEndDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
            </div>
            <div className="flex justify-end pt-4">
              <Button onClick={applyFilters} className="px-8 gradient-primary text-white">Apply</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

// ── Page export ───────────────────────────────────────────────────────────────
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
