"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import { X as XIcon, Download, ChevronDown, FileText as FileTextIcon, Image as ImageIcon, Link as LinkIcon, Mail } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Certificate } from "@/features/certificates/types";

interface CertificatePreviewDialogProps {
  previewOpen: boolean;
  previewCert: Certificate | null;
  handleClosePreview: () => void;
  language: "en" | "id";
  t: (key: string) => string;
  isCertificateExpired: (cert: Certificate) => boolean;
  getThumbnailUrl: (url: string | null | undefined) => string | null;
  normalizeImageUrl: (url: string | null | undefined, updatedAt?: string | null) => { src: string; shouldOptimize: boolean };
  handleOpenImagePreview: (url: string, updatedAt?: string | null) => void;
  expiredOverlayUrl: string | null;
  formatDateShort: (dateString: string | null | undefined) => string;
  capitalize: (s: string) => string;
  sendModalOpen: boolean;
  exportToPDF: (cert: Certificate) => void;
  exportToPNG: (cert: Certificate) => void;
  openSendEmailModal: (cert: Certificate) => void;
  generateCertificateLink: (cert: Certificate) => void;
  // Send Email Modal Props
  closeSendModal: () => void;
  sendPreviewSrc: string | null;
  sendForm: { email: string; subject: string; message: string };
  setSendForm: (f: { email: string; subject: string; message: string }) => void;
  sendFormErrors: { email?: string; subject?: string; message?: string };
  setSendFormErrors: (f: (prev: any) => any) => void;
  isSendingEmail: boolean;
  confirmSendEmail: () => void;
}

export function CertificatePreviewDialog({
  previewOpen, previewCert, handleClosePreview, language, t,
  isCertificateExpired, getThumbnailUrl, normalizeImageUrl, handleOpenImagePreview,
  expiredOverlayUrl, formatDateShort, capitalize, sendModalOpen,
  exportToPDF, exportToPNG, openSendEmailModal, generateCertificateLink,
  closeSendModal, sendPreviewSrc, sendForm, setSendForm, sendFormErrors, setSendFormErrors,
  isSendingEmail, confirmSendEmail,
}: CertificatePreviewDialogProps) {
  if (!previewCert || !previewOpen) return null;

  return (
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
                    role={isExpired ? undefined : "button"} tabIndex={isExpired ? undefined : 0}
                    onClick={() => { if (!isExpired && fullImageUrl) handleOpenImagePreview(fullImageUrl, previewCert.updated_at); }}
                    onKeyDown={(e) => { if (!isExpired && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); if (fullImageUrl) handleOpenImagePreview(fullImageUrl, previewCert.updated_at); } }}
                  >
                    <div className="relative w-full aspect-auto">
                      <Image
                        src={src} alt="Certificate" width={800} height={600}
                        className={`w-full h-auto rounded-lg border transition-transform duration-200 ${isExpired ? "" : "group-hover:scale-[1.01]"}`}
                        priority unoptimized={!shouldOptimize} placeholder="blur"
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

      {/* Send Email Modal */}
      {sendModalOpen && (
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
                  onChange={(e) => { setSendForm({ ...sendForm, email: e.target.value }); if (sendFormErrors.email) setSendFormErrors((err: any) => ({ ...err, email: undefined })); }}
                  className={`w-full ${sendFormErrors.email ? "border-red-500" : ""}`} disabled={isSendingEmail}
                  onKeyDown={(e) => { if (e.key === "Enter" && !isSendingEmail) { e.preventDefault(); confirmSendEmail(); } else if (e.key === "Escape") { e.preventDefault(); closeSendModal(); } }}
                />
                {sendFormErrors.email && <p className="text-xs text-red-500 mt-1">{sendFormErrors.email}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("hero.subject")}</label>
                <Input value={sendForm.subject}
                  onChange={(e) => { setSendForm({ ...sendForm, subject: e.target.value }); if (sendFormErrors.subject) setSendFormErrors((err: any) => ({ ...err, subject: undefined })); }}
                  placeholder={t("hero.emailSubjectPlaceholder")} className={`w-full ${sendFormErrors.subject ? "border-red-500" : ""}`} disabled={isSendingEmail}
                  onKeyDown={(e) => { if (e.key === "Enter" && !isSendingEmail) { e.preventDefault(); confirmSendEmail(); } else if (e.key === "Escape") { e.preventDefault(); closeSendModal(); } }}
                />
                {sendFormErrors.subject && <p className="text-xs text-red-500 mt-1">{sendFormErrors.subject}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("hero.message")}</label>
                <textarea value={sendForm.message}
                  onChange={(e) => { setSendForm({ ...sendForm, message: e.target.value }); if (sendFormErrors.message) setSendFormErrors((err: any) => ({ ...err, message: undefined })); }}
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
      )}
    </>
  );
}
