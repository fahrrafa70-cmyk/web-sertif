"use client";
import React from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trash2, Edit } from "lucide-react";
import { STANDARD_CANVAS_WIDTH, STANDARD_CANVAS_HEIGHT } from "@/lib/constants/canvas";
import type { Certificate } from "@/lib/supabase/certificates";

interface TextLayer {
  id: string;
  text: string;
  x?: number;
  y?: number;
  xPercent?: number;
  yPercent?: number;
  fontSize: number;
  color: string;
  fontWeight: string | number;
  fontFamily: string;
  textAlign?: string;
  maxWidth?: number;
  lineHeight?: number;
}

interface ScoreDefaults {
  textLayers?: { id: string }[];
}

interface CertificatePreviewDialogProps {
  previewCertificate: Certificate | null;
  setPreviewCertificate: (cert: Certificate | null) => void;
  isDualTemplate: boolean;
  previewMode: "certificate" | "score";
  setPreviewMode: (mode: "certificate" | "score") => void;
  previewImageSrc: string | null;
  previewContainerRef: React.RefObject<HTMLDivElement | null>;
  containerScale: number;
  scoreDefaults: ScoreDefaults | null;
  expiredOverlayUrl: string | null;
  isCertificateExpired: (cert: Certificate) => boolean;
  handleOpenImagePreview: (src: string, updatedAt: string | null | undefined) => void;
  canDelete: boolean;
  deletingCertificateId: string | null;
  tenantRole: string | null;
  requestDelete: (id: string) => Promise<void>;
  openEdit: (cert: Certificate) => void;
  t: (key: string) => string;
}

export function CertificatePreviewDialog({
  previewCertificate, setPreviewCertificate,
  isDualTemplate, previewMode, setPreviewMode,
  previewImageSrc, previewContainerRef, containerScale,
  scoreDefaults, expiredOverlayUrl,
  isCertificateExpired, handleOpenImagePreview,
  canDelete, deletingCertificateId, tenantRole,
  requestDelete, openEdit, t,
}: CertificatePreviewDialogProps) {
  return (
    <Dialog open={!!previewCertificate} onOpenChange={(open) => { if (!open) setPreviewCertificate(null); }}>
      <DialogContent className="max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col p-4 sm:p-6">
        <DialogHeader className="flex-shrink-0 pb-2 sm:pb-4">
          <DialogTitle className="text-xl sm:text-2xl font-bold">
            {t("certificates.previewTitle")}
          </DialogTitle>
        </DialogHeader>

        {previewCertificate && (
          <>
            {/* Dual template toggle */}
            {isDualTemplate && (
              <div className="flex gap-2 mb-3 flex-shrink-0">
                <Button
                  variant={previewMode === "certificate" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPreviewMode("certificate")}
                  className={previewMode === "certificate" ? "gradient-primary text-white" : ""}
                >
                  {t("certificates.frontSide")}
                </Button>
                <Button
                  variant={previewMode === "score" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPreviewMode("score")}
                  className={previewMode === "score" ? "gradient-primary text-white" : ""}
                >
                  {t("certificates.backSide")}
                </Button>
              </div>
            )}

            {/* Certificate image */}
            <div className="flex-1 overflow-auto min-h-0 flex items-center justify-center">
              <div
                className="relative w-full"
                style={{ maxWidth: "100%", aspectRatio: `${STANDARD_CANVAS_WIDTH}/${STANDARD_CANVAS_HEIGHT}` }}
                ref={previewContainerRef}
              >
                {previewImageSrc ? (
                  <>
                    <Image
                      src={previewImageSrc}
                      alt="Certificate preview"
                      fill
                      className="object-contain"
                      unoptimized
                      onClick={() => handleOpenImagePreview(previewImageSrc, previewCertificate.updated_at)}
                    />
                    {/* Expired overlay */}
                    {isCertificateExpired(previewCertificate) && expiredOverlayUrl && (
                      <Image
                        src={expiredOverlayUrl}
                        alt="Expired"
                        fill
                        className="object-contain pointer-events-none"
                        unoptimized
                      />
                    )}
                    {/* Text layer overlay intentionally removed:
                        previewImageSrc is the fully-rendered certificate image
                        that already has all text baked in. Drawing text_layers
                        on top would produce double-text. */}
                  </>
                ) : (
                  <div className="relative z-10 text-center p-6 xl:p-10">
                    <div className="mb-4 xl:mb-6">
                      <h3 className="text-2xl xl:text-3xl font-bold text-gray-800 dark:text-gray-100 mb-2">{t("certificates.certificateTitle")}</h3>
                      <div className="w-16 xl:w-20 h-1 bg-[#2563eb] mx-auto rounded-full" />
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 mb-3 xl:mb-4">{t("certificates.certifyText")}</p>
                    <h4 className="text-xl xl:text-2xl font-bold text-gray-800 dark:text-gray-100 mb-3 xl:mb-4">{previewCertificate.name}</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t("certificates.fallbackPreview")}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-4 pt-4 sm:pt-6 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
              <div className="flex flex-wrap gap-2">
                <button
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-4 py-2 shadow-sm hover:shadow-md disabled:pointer-events-none disabled:opacity-50"
                  onClick={() => {
                    const id = previewCertificate.id;
                    setPreviewCertificate(null);
                    void requestDelete(id);
                  }}
                  disabled={!canDelete || deletingCertificateId === previewCertificate.id}
                >
                  {deletingCertificateId === previewCertificate.id ? (
                    <><div className="w-4 h-4 mr-1 border-b-2 border-white rounded-full animate-spin" />{t("certificates.deleting")}</>
                  ) : (
                    <><Trash2 className="w-4 h-4 mr-1" />{t("certificates.deleteCertificate")}</>
                  )}
                </button>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="border-blue-300 text-blue-600 hover:bg-blue-50 dark:border-blue-500/60 dark:text-blue-300 dark:hover:bg-blue-500/10 px-6 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => {
                    const cert = previewCertificate;
                    setPreviewCertificate(null);
                    openEdit(cert);
                  }}
                  disabled={tenantRole === "staff" || !tenantRole}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  {t("certificates.editCertificate")}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
