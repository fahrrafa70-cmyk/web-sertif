import { useState } from "react";
import { formatReadableDate } from "@/lib/utils/certificate-formatters";
import { Button } from "@/components/ui/button";
import { X, Download, ChevronDown, FileText, Link, Image as ImageIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Certificate } from "@/features/certificates/types";

interface HeroPreviewModalProps {
  t: (key: string) => string;
  language: "en" | "id";
  previewOpen: boolean;
  setPreviewOpen: (open: boolean) => void;
  previewCert: Certificate | null;
  exportToPDF: (cert: Certificate) => void;
  exportToPNG: (cert: Certificate) => void;
  generateCertificateLink: (cert: Certificate) => void;
  openSendEmailModal: (cert: Certificate) => void;
}

export function HeroPreviewModal({
  t,
  language,
  previewOpen,
  setPreviewOpen,
  previewCert,
  exportToPDF,
  exportToPNG,
  generateCertificateLink,
  openSendEmailModal,
}: HeroPreviewModalProps) {
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>("");

  if (!previewOpen || !previewCert) return null;

  return (
    <>
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
    </>
  );
}
