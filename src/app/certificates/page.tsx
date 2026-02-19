"use client";

import React, { Suspense, useEffect } from "react";
import ModernLayout from "@/components/modern-layout";
import type { ReactElement } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, FileText } from "lucide-react";
import { Toaster } from "sonner";
import { QuickGenerateModal } from "@/components/certificate/QuickGenerateModal";
import { WizardGenerateModal } from "@/components/certificate/WizardGenerateModal";
import { STANDARD_CANVAS_WIDTH } from "@/lib/constants/canvas";
import { CertificatesPageSkeleton } from "@/components/ui/certificates-skeleton";
import { useCertificatesPage } from "@/features/certificates/hooks/useCertificatesPage";

// Sub-components
import { CertificatesHeader } from "@/features/certificates/components/CertificatesHeader";
import { CertificatesTable } from "@/features/certificates/components/CertificatesTable";
import { CertificatesMobileList } from "@/features/certificates/components/CertificatesMobileList";
import { CertificatePreviewDialog } from "@/features/certificates/components/CertificatePreviewDialog";
import { EditCertificateDialog } from "@/features/certificates/components/EditCertificateDialog";
import { SendEmailDialog } from "@/features/certificates/components/SendEmailDialog";
import { MemberDetailModal } from "@/features/certificates/components/MemberDetailModal";
import { FilterDialog } from "@/features/certificates/components/FilterDialog";

function CertificatesContent(): ReactElement {
  const {
    // Tenant
    tenants, selectedTenantId, setSelectedTenantId, loadingTenants, tenantRole,
    // Data
    loading, error,
    // Search / filter
    searchInput, setSearchInput, categoryFilter, dateFilter,
    filterModalOpen, setFilterModalOpen,
    tempCategoryFilter, setTempCategoryFilter,
    tempDateFilter, setTempDateFilter,
    openFilterModal, applyFilters, cancelFilters,
    // Pagination
    currentPage, setCurrentPage, totalPages, currentCertificates, filtered, indexOfFirstItem, indexOfLastItem,
    // Helpers
    formatDateShort, isCertificateExpired, getExpiredOverlayUrl, handleOpenImagePreview, language, t,
    // Export
    exportingPDF, exportingPNG, generatingLink, exportToPDF, exportToPNG, generateCertificateLink,
    // Send email
    sendModalOpen, setSendModalOpen, isSendingEmail, sendFormErrors, setSendFormErrors, sendForm, setSendForm, sendPreviewSrcs, openSendEmailModal, confirmSendEmail,
    // Generate
    quickGenerateOpen, setQuickGenerateOpen, wizardGenerateOpen, setWizardGenerateOpen, templates, members, handleOpenWizardGenerate, handleQuickGenerate,
    // Edit
    isEditOpen, setIsEditOpen, draft, setDraft, openEdit, submitEdit,
    // Delete
    deletingCertificateId, canDelete, requestDelete,
    // Preview
    previewCertificate, setPreviewCertificate, previewTemplate, previewMode, setPreviewMode, scoreDefaults, previewContainerRef, containerDimensions,
    memberDetailOpen, setMemberDetailOpen, detailMember, loadingMemberDetail,
  } = useCertificatesPage();

  // Set document title
  useEffect(() => {
    const setTitle = () => { if (typeof document !== "undefined") document.title = "Certificates | Certify - Certificate Platform"; };
    setTitle();
    const timeouts = [setTimeout(setTitle, 50), setTimeout(setTitle, 200), setTimeout(setTitle, 500)];
    return () => timeouts.forEach(clearTimeout);
  }, []);

  const isDualTemplate = !!(previewTemplate?.score_image_url);
  const expiredOverlayUrl = getExpiredOverlayUrl();

  const getImageSrc = (cert: typeof previewCertificate, side: "certificate" | "score") => {
    if (!cert) return null;
    const url = side === "certificate" ? cert.certificate_image_url : cert.score_image_url;
    if (!url) return null;
    let src = url;
    if (!/^https?:\/\//i.test(src) && !src.startsWith("/") && !src.startsWith("data:")) src = `/${src}`;
    if (src.startsWith("/") && typeof window !== "undefined") src = `${window.location.origin}${src}`;
    if (cert.updated_at) src = `${src}?v=${new Date(cert.updated_at).getTime()}`;
    return src;
  };

  const previewImageSrc = previewCertificate
    ? (previewMode === "score" ? getImageSrc(previewCertificate, "score") : getImageSrc(previewCertificate, "certificate"))
    : null;

  const containerScale = containerDimensions ? containerDimensions.width / STANDARD_CANVAS_WIDTH : 0;

  const sharedTableProps = {
    currentCertificates, exportingPDF, exportingPNG, generatingLink,
    deletingCertificateId, canDelete, tenantRole,
    isCertificateExpired, formatDateShort,
    setPreviewCertificate, setPreviewMode,
    exportToPDF, exportToPNG, generateCertificateLink, openSendEmailModal, openEdit, requestDelete, t,
  };

  return (
    <ModernLayout>
      <section
        className="relative -mt-4 pb-6 sm:-mt-5 sm:pb-8 overflow-x-hidden"
        style={{ backgroundColor: "var(--background, #f9fafb)" } as React.CSSProperties}
      >
        <div className="w-full max-w-[1280px] mx-auto px-3 sm:px-4 md:px-6 lg:px-4 xl:px-0 relative overflow-x-hidden">

          {/* Header */}
          <CertificatesHeader
            tenants={tenants}
            selectedTenantId={selectedTenantId}
            setSelectedTenantId={setSelectedTenantId}
            loadingTenants={loadingTenants}
            tenantRole={tenantRole}
            searchInput={searchInput}
            setSearchInput={setSearchInput}
            categoryFilter={categoryFilter}
            dateFilter={dateFilter}
            openFilterModal={openFilterModal}
            handleOpenWizardGenerate={handleOpenWizardGenerate}
            t={t}
          />

          {/* Loading State */}
          {loading && (
            <div className="min-h-[400px] flex items-center justify-center">
              <div className="text-center">
                <div className="w-12 h-12 border-b-2 border-blue-600 rounded-full animate-spin mx-auto mb-6" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{t("certificates.loading")}</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm">{t("certificates.loadingMessage")}</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="min-h-[400px] flex items-center justify-center">
              <div className="text-center max-w-md">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-3xl">⚠️</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">{t("certificates.errorTitle")}</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
              </div>
            </div>
          )}

          {/* No Tenant Selected */}
          {!loading && !error && !selectedTenantId && (
            <div className="min-h-[400px] flex items-center justify-center">
              <div className="text-center max-w-md">
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <FileText className="w-8 h-8 text-blue-500" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">{t("certificates.selectTenantTitle")}</h3>
                <p className="text-gray-600 dark:text-gray-400">{t("certificates.selectTenantMessage")}</p>
              </div>
            </div>
          )}

          {/* Main Content */}
          {!loading && !error && selectedTenantId && (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block">
                <CertificatesTable {...sharedTableProps} />
              </div>

              {/* Mobile List */}
              <div className="md:hidden space-y-3">
                <CertificatesMobileList {...sharedTableProps} />
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t("certificates.showing")} {indexOfFirstItem + 1}–{Math.min(indexOfLastItem, filtered.length)} {t("certificates.of")} {filtered.length}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-gray-700 dark:text-gray-300">{currentPage} / {totalPages}</span>
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Dialogs */}
      <EditCertificateDialog
        isEditOpen={isEditOpen}
        draft={draft}
        setDraft={setDraft}
        setIsEditOpen={setIsEditOpen}
        submitEdit={submitEdit}
        t={t}
      />

      <CertificatePreviewDialog
        previewCertificate={previewCertificate}
        setPreviewCertificate={setPreviewCertificate}
        isDualTemplate={isDualTemplate}
        previewMode={previewMode === "combined" ? "certificate" : previewMode}
        setPreviewMode={setPreviewMode}
        previewImageSrc={previewImageSrc}
        previewContainerRef={previewContainerRef}
        containerScale={containerScale}
        scoreDefaults={scoreDefaults}
        expiredOverlayUrl={expiredOverlayUrl}
        isCertificateExpired={isCertificateExpired}
        handleOpenImagePreview={handleOpenImagePreview}
        canDelete={canDelete}
        deletingCertificateId={deletingCertificateId}
        tenantRole={tenantRole}
        requestDelete={requestDelete}
        openEdit={openEdit}
        t={t}
      />

      <SendEmailDialog
        sendModalOpen={sendModalOpen}
        setSendModalOpen={setSendModalOpen}
        isSendingEmail={isSendingEmail}
        sendFormErrors={sendFormErrors}
        setSendFormErrors={setSendFormErrors}
        sendForm={sendForm}
        setSendForm={setSendForm}
        sendPreviewSrcs={sendPreviewSrcs}
        confirmSendEmail={confirmSendEmail}
        t={t}
      />

      <MemberDetailModal
        memberDetailOpen={memberDetailOpen}
        setMemberDetailOpen={setMemberDetailOpen}
        detailMember={detailMember}
        loadingMemberDetail={loadingMemberDetail}
        language={language}
      />

      <WizardGenerateModal
        open={wizardGenerateOpen}
        onClose={() => setWizardGenerateOpen(false)}
        templates={templates}
        members={members}
        onGenerate={(params) => handleQuickGenerate(params)}
      />

      <QuickGenerateModal
        open={quickGenerateOpen}
        onClose={() => setQuickGenerateOpen(false)}
        templates={templates}
        members={members}
        onGenerate={(params) => handleQuickGenerate(params)}
      />

      <FilterDialog
        filterModalOpen={filterModalOpen}
        setFilterModalOpen={setFilterModalOpen}
        tempCategoryFilter={tempCategoryFilter}
        setTempCategoryFilter={setTempCategoryFilter}
        tempDateFilter={tempDateFilter}
        setTempDateFilter={setTempDateFilter}
        applyFilters={applyFilters}
        cancelFilters={cancelFilters}
      />

      <Toaster position="top-right" richColors />
    </ModernLayout>
  );
}

export default function CertificatesPage() {
  return (
    <Suspense fallback={
      <ModernLayout>
        <CertificatesPageSkeleton />
      </ModernLayout>
    }>
      <CertificatesContent />
    </Suspense>
  );
}
