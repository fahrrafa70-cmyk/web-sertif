"use client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileText, Trash2, Edit, Download, ChevronDown, Link, Image as ImageIcon } from "lucide-react";
import type { Certificate } from "@/lib/supabase/certificates";

interface CertificatesMobileListProps {
  currentCertificates: Certificate[];
  exportingPDF: string | null;
  exportingPNG: string | null;
  generatingLink: string | null;
  deletingCertificateId: string | null;
  canDelete: boolean;
  tenantRole: string | null;
  isCertificateExpired: (cert: Certificate) => boolean;
  formatDateShort: (date: string | null | undefined) => string;
  setPreviewCertificate: (cert: Certificate | null) => void;
  exportToPDF: (cert: Certificate) => Promise<void>;
  exportToPNG: (cert: Certificate) => Promise<void>;
  generateCertificateLink: (cert: Certificate) => Promise<void>;
  openSendEmailModal: (cert: Certificate) => Promise<void>;
  openEdit: (cert: Certificate) => void;
  requestDelete: (id: string) => Promise<void>;
  t: (key: string) => string;
}

export function CertificatesMobileList({
  currentCertificates, exportingPDF, exportingPNG, generatingLink,
  deletingCertificateId, canDelete, tenantRole,
  isCertificateExpired, formatDateShort,
  setPreviewCertificate,
  exportToPDF, exportToPNG, generateCertificateLink, openSendEmailModal, openEdit, requestDelete,
  t,
}: CertificatesMobileListProps) {
  if (currentCertificates.length === 0) {
    return (
      <div className="min-h-[300px] flex items-center justify-center">
        <div className="text-center">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">{t("certificates.noCertificatesMessage")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {currentCertificates.map((cert) => {
        const isExpired = isCertificateExpired(cert);
        return (
          <div
            key={cert.id}
            className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm ${isExpired ? "opacity-60" : ""}`}
            onClick={() => setPreviewCertificate(cert)}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">{cert.name}</p>
                <p className="text-xs font-mono text-gray-500 dark:text-gray-400 mt-0.5">{cert.certificate_no}</p>
                {cert.description && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{cert.description}</p>
                )}
                <div className="flex flex-wrap gap-2 mt-2">
                  {cert.category && (
                    <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">{cert.category}</span>
                  )}
                  <span className="text-xs text-gray-500 dark:text-gray-400">{formatDateShort(cert.issue_date)}</span>
                  {isExpired && (
                    <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full">{t("certificates.expired")}</span>
                  )}
                </div>
              </div>
              <div onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 flex-shrink-0">
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => void exportToPDF(cert)} disabled={!!exportingPDF || isExpired}>
                      <FileText className="w-4 h-4 mr-2" />{t("certificates.exportPDF")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => void exportToPNG(cert)} disabled={!!exportingPNG || isExpired}>
                      <Download className="w-4 h-4 mr-2" />{t("certificates.exportPNG")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => void generateCertificateLink(cert)} disabled={!!generatingLink}>
                      <Link className="w-4 h-4 mr-2" />{t("certificates.generateLink")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => void openSendEmailModal(cert)} disabled={isExpired}>
                      <ImageIcon className="w-4 h-4 mr-2" />{t("certificates.sendEmail")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openEdit(cert)} disabled={tenantRole === "staff" || !tenantRole}>
                      <Edit className="w-4 h-4 mr-2" />{t("certificates.edit")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => void requestDelete(cert.id)}
                      disabled={!canDelete || deletingCertificateId === cert.id}
                      className="text-red-600 dark:text-red-400"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />{t("certificates.delete")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
