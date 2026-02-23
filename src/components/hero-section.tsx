"use client";

import { motion } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import { Toaster } from "sonner";
import { useLanguage } from "@/contexts/language-context";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Filter } from "lucide-react";

import { useCertificateExport } from "@/features/certificates/hooks/useCertificateExport";
import { useCertificateEmail } from "@/features/certificates/hooks/useCertificateEmail";
import { useCertificateSearch } from "@/features/certificates/hooks/useCertificateSearch";
import type { Certificate } from "@/features/certificates/types";

import { HeroSearchForm } from "./hero/HeroSearchForm";
import { HeroPreviewModal } from "./hero/HeroPreviewModal";
import { SendEmailDialog } from "@/features/certificates/components/SendEmailDialog";

export default function HeroSection() {
  const { t, language } = useLanguage();
  const safeT = useCallback(
    (key: string, fallback: string) => {
      const value = t(key);
      return !value || value === key ? fallback : value;
    },
    [t]
  );

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Local-only view state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewCert, setPreviewCert] = useState<Certificate | null>(null);

  // Business logic hooks
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

  // Keyboard shortcut (Escape handling)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && previewOpen) setPreviewOpen(false);
    };
    if (previewOpen) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [previewOpen]);

  // If search successfully navigated away or is active, we might show results elsewhere,
  // but since useCertificateSearch handles routing to /search for us, 
  // we just manage the search initiation here.
  // We can intercept successful search from showResults if needed, but it navigates.

  // Animation variants
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

            {/* Extracted Search Form Component */}
            <HeroSearchForm
              mounted={mounted}
              t={t}
              certificateId={certificateId}
              setCertificateId={setCertificateId}
              handleSearch={handleSearch}
              searching={searching}
              openFilterModal={openFilterModal}
              filters={filters}
              searchError={searchError}
              clearFilters={clearFilters}
              itemVariants={itemVariants}
            />
          </motion.div>
        </div>
      </section>

      {/* Extracted Preview Modal Component (includes full-image preview) */}
      <HeroPreviewModal
        t={t}
        language={language}
        previewOpen={previewOpen}
        setPreviewOpen={setPreviewOpen}
        previewCert={previewCert}
        exportToPDF={exportToPDF}
        exportToPNG={exportToPNG}
        generateCertificateLink={generateCertificateLink}
        openSendEmailModal={openSendEmailModal}
      />

      {/* Reusable Send Email Modal Component */}
      <SendEmailDialog
        sendModalOpen={sendModalOpen}
        closeSendModal={closeSendModal}
        isSendingEmail={isSendingEmail}
        sendFormErrors={sendFormErrors}
        sendForm={sendForm}
        setSendForm={setSendForm}
        sendPreviewSrcs={{ cert: sendPreviewSrc, score: null }}
        confirmSendEmail={confirmSendEmail}
        t={t}
      />

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
