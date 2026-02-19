"use client";

import { motion } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { toast, Toaster } from "sonner";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  ArrowRight,
  Search,
  Download,
  ChevronDown,
  FileText,
  Link,
  Filter,
  X,
  Image as ImageIcon,
} from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import { formatReadableDate } from "@/lib/utils/certificate-formatters";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCertificateExport } from "@/features/certificates/hooks/useCertificateExport";
import { useCertificateEmail } from "@/features/certificates/hooks/useCertificateEmail";
import { useCertificateSearch } from "@/features/certificates/hooks/useCertificateSearch";
import type { Certificate } from "@/features/certificates/types";

export default function HeroSection() {
  const { t, language } = useLanguage();
  const safeT = useCallback(
    (key: string, fallback: string) => {
      const value = t(key);
      return !value || value === key ? fallback : value;
    },
    [t],
  );

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Local-only UI state (not extracted — these are pure view concerns)
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewCert, setPreviewCert] = useState<Certificate | null>(null);
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>("");

  // ── Business logic from hooks ─────────────────────────────────────────────

  const { exportToPDF, exportToPNG, generateCertificateLink } = useCertificateExport({ t });

  const {
    sendModalOpen,
    isSendingEmail,
    sendFormErrors,
    sendForm,
    setSendForm,
    sendPreviewSrc,
    openSendEmailModal,
    confirmSendEmail,
    closeSendModal,
  } = useCertificateEmail({ t });

  const {
    tenants,
    selectedTenantId,
    loadingTenants,
    certificateId,
    setCertificateId,
    searching,
    searchError,
    showResults,
    handleSearch,
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
    clearFilters,
  } = useCertificateSearch({ t, safeT });

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (previewOpen) setPreviewOpen(false);
        if (imagePreviewOpen) setImagePreviewOpen(false);
      }
    };
    if (previewOpen || imagePreviewOpen) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [previewOpen, imagePreviewOpen]);

  // ── Animation variants ────────────────────────────────────────────────────
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15, delayChildren: 0.1, ease: [0.4, 0, 0.2, 1] as const },
    },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] as const } },
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <section
        className="relative w-full flex-1 flex items-center justify-center"
        style={{ backgroundColor: "var(--background)" }}
      >
        <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 text-center py-8 sm:py-12 md:py-20">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            style={{ willChange: "opacity" }}
            className="max-w-5xl mx-auto"
          >
            {/* Hero Title */}
            <motion.div variants={itemVariants} className="mb-4 sm:mb-5">
              <h1
                className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold text-gradient mb-2 sm:mb-3 leading-tight"
                suppressHydrationWarning
              >
                {mounted ? t("hero.title") : "Search Certificate"}
              </h1>
            </motion.div>

            {/* Search Bar */}
            <motion.div variants={itemVariants} className="mx-auto max-w-2xl relative">
              <div className="relative mb-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex items-center gap-2 sm:gap-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl sm:rounded-2xl p-1.5 border border-gray-200 dark:border-gray-700 shadow-sm transition-all duration-200">
                    <div className="flex-1 relative">
                      <Search className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                      <Input
                        value={certificateId}
                        onChange={(e) => {
                          setCertificateId(e.target.value);
                        }}
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
          </motion.div>
        </div>
      </section>

      {/* Certificate Preview Modal */}
      {previewOpen && previewCert && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-2 sm:p-4"
          onClick={() => setPreviewOpen(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b dark:border-gray-700">
              <div className="text-base sm:text-lg font-semibold dark:text-gray-100">
                {t("hero.certificatePreview")}
              </div>
              <Button
                variant="outline"
                onClick={() => setPreviewOpen(false)}
                size="icon"
                aria-label="Close"
                className="h-8 w-8 sm:h-10 sm:w-10"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
              <div className="p-2 sm:p-4 bg-gray-50 dark:bg-gray-900">
                {previewCert.certificate_image_url ? (
                  <div
                    className="relative w-full aspect-[4/3] cursor-zoom-in group overflow-hidden rounded-lg"
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      setImagePreviewUrl(previewCert.certificate_image_url!);
                      setImagePreviewOpen(true);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setImagePreviewUrl(previewCert.certificate_image_url!);
                        setImagePreviewOpen(true);
                      }
                    }}
                  >
                    <div className="absolute inset-0 bg-gray-200 dark:bg-gray-800 animate-pulse" />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewCert.certificate_image_url ?? undefined}
                      alt="Certificate"
                      className="absolute inset-0 w-full h-full object-contain rounded-lg border transition-transform duration-200 group-hover:scale-[1.01]"
                      onLoad={(e) => {
                        const skeleton = e.currentTarget.parentElement?.querySelector(".animate-pulse");
                        if (skeleton) (skeleton as HTMLElement).style.display = "none";
                      }}
                      onError={(e) => {
                        const skeleton = e.currentTarget.parentElement?.querySelector(".animate-pulse");
                        if (skeleton) (skeleton as HTMLElement).style.display = "none";
                      }}
                    />
                    <div className="absolute bottom-3 right-3 px-3 py-1 rounded-md bg-black/60 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      {t("hero.viewFullImage")}
                    </div>
                  </div>
                ) : (
                  <div className="aspect-[4/3] flex items-center justify-center text-gray-500 dark:text-gray-400 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
                    {t("hero.noPreviewImage")}
                  </div>
                )}
              </div>
              <div className="p-4 sm:p-6">
                <div className="space-y-2">
                  <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{t("hero.recipient")}</div>
                  <div className="text-lg sm:text-xl md:text-2xl font-semibold dark:text-gray-100">
                    {previewCert.members?.name || previewCert.name}
                  </div>
                  {previewCert.members?.organization && (
                    <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                      {previewCert.members.organization}
                    </div>
                  )}
                </div>
                <div className="mt-4 space-y-1 text-xs sm:text-sm">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">{t("hero.category")}:</span>{" "}
                    {previewCert.category || "—"}
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">{t("hero.template")}:</span>{" "}
                    {(previewCert as unknown as { templates?: { name?: string } }).templates?.name || "—"}
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">{t("hero.issued")}:</span>{" "}
                    {formatReadableDate(previewCert.issue_date, language)}
                  </div>
                  {previewCert.expired_date && (
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">{t("hero.expires")}:</span>{" "}
                      {formatReadableDate(previewCert.expired_date, language)}
                    </div>
                  )}
                </div>
                <div className="mt-4 sm:mt-6 flex flex-wrap gap-2 sm:gap-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="border-gray-300">
                        <Download className="w-4 h-4 mr-1" />
                        {t("hero.export")}
                        <ChevronDown className="w-4 h-4 ml-1" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => exportToPDF(previewCert)}>
                        <FileText className="w-4 h-4 mr-2" />
                        {t("hero.exportAsPDF")}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => exportToPNG(previewCert)}>
                        <ImageIcon className="w-4 h-4 mr-2" />
                        {t("hero.downloadPNG")}
                      </DropdownMenuItem>
                      {previewCert.certificate_image_url && (
                        <DropdownMenuItem onClick={() => openSendEmailModal(previewCert)}>
                          <FileText className="w-4 h-4 mr-2" />
                          {t("hero.sendViaEmail")}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => generateCertificateLink(previewCert)}>
                        <Link className="w-4 h-4 mr-2" />
                        {t("hero.generateLink")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Full-Image Preview Modal */}
      {imagePreviewOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4"
          onClick={() => setImagePreviewOpen(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b dark:border-gray-700 flex-shrink-0">
              <div className="text-sm text-gray-600 dark:text-gray-400">{t("hero.certificateImage")}</div>
              <Button
                variant="outline"
                onClick={() => setImagePreviewOpen(false)}
                size="icon"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-900 overflow-auto flex-1">
              {imagePreviewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imagePreviewUrl} alt="Certificate" className="w-full h-auto rounded-lg border" />
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
                  {t("hero.noPreviewImage")}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Send Email Modal */}
      {sendModalOpen && (
        <div
          className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4"
          onClick={closeSendModal}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b dark:border-gray-700">
              <div>
                <div className="text-lg font-semibold dark:text-gray-100">{t("hero.sendEmailTitle")}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">{t("hero.sendEmailSubtitle")}</div>
              </div>
              <Button variant="outline" onClick={closeSendModal} size="icon" aria-label="Close">
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-6 space-y-4">
              {sendPreviewSrc && (
                <div className="mb-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {t("hero.certificatePreviewLabel")}
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={sendPreviewSrc}
                    alt="Certificate Preview"
                    className="w-full h-auto rounded-lg border max-h-48 object-contain"
                  />
                </div>
              )}

              {/* Email field */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-white">
                  {t("hero.recipientEmail")}
                </label>
                <Input
                  type="email"
                  value={sendForm.email}
                  onChange={(e) => setSendForm({ ...sendForm, email: e.target.value })}
                  className={`w-full ${sendFormErrors.email ? "border-red-500" : ""}`}
                  disabled={isSendingEmail}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !isSendingEmail) { e.preventDefault(); confirmSendEmail(); }
                    if (e.key === "Escape") closeSendModal();
                  }}
                />
                {sendFormErrors.email && <p className="text-xs text-red-500 mt-1">{sendFormErrors.email}</p>}
              </div>

              {/* Subject field */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-white">{t("hero.subject")}</label>
                <Input
                  value={sendForm.subject}
                  onChange={(e) => setSendForm({ ...sendForm, subject: e.target.value })}
                  placeholder={t("hero.emailSubjectPlaceholder")}
                  className={`w-full ${sendFormErrors.subject ? "border-red-500" : ""}`}
                  disabled={isSendingEmail}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !isSendingEmail) { e.preventDefault(); confirmSendEmail(); }
                    if (e.key === "Escape") closeSendModal();
                  }}
                />
                {sendFormErrors.subject && <p className="text-xs text-red-500 mt-1">{sendFormErrors.subject}</p>}
              </div>

              {/* Message field */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-white">{t("hero.message")}</label>
                <textarea
                  value={sendForm.message}
                  onChange={(e) => setSendForm({ ...sendForm, message: e.target.value })}
                  placeholder={t("hero.emailMessagePlaceholder")}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 ${
                    sendFormErrors.message ? "border-red-500" : "border-gray-300 dark:border-gray-600"
                  }`}
                  rows={4}
                  disabled={isSendingEmail}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && !isSendingEmail) { e.preventDefault(); confirmSendEmail(); }
                    if (e.key === "Escape") closeSendModal();
                  }}
                />
                {sendFormErrors.message && <p className="text-xs text-red-500 mt-1">{sendFormErrors.message}</p>}
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={closeSendModal} disabled={isSendingEmail}>
                  {t("hero.cancel")}
                </Button>
                <LoadingButton
                  onClick={confirmSendEmail}
                  isLoading={isSendingEmail}
                  loadingText={t("hero.sending")}
                  variant="primary"
                  className="gradient-primary text-white shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  {t("hero.sendEmail")}
                </LoadingButton>
              </div>
            </div>
          </div>
        </div>
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
            {/* Organization */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Organization</label>
              <select
                value={tempTenant}
                onChange={(e) => setTempTenant(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loadingTenants}
              >
                {loadingTenants ? (
                  <option value="">Loading organizations...</option>
                ) : tenants.length === 0 ? (
                  <option value="">No organizations available</option>
                ) : (
                  <>
                    {!tempTenant && <option value="">Select organization...</option>}
                    {tenants.map((tenant) => (
                      <option key={tenant.id} value={tenant.id}>
                        {tenant.name}
                      </option>
                    ))}
                  </>
                )}
              </select>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
              <select
                value={tempCategory}
                onChange={(e) => setTempCategory(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Start Date */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Start Date</label>
              <input
                type="date"
                value={tempStartDate}
                onChange={(e) => setTempStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* End Date */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">End Date</label>
              <input
                type="date"
                value={tempEndDate}
                onChange={(e) => setTempEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button onClick={applyFilters} className="px-8 gradient-primary text-white">
              Apply
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Toaster position="top-right" richColors />
    </>
  );
}
