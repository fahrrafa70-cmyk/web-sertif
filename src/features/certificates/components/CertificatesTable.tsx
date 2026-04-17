"use client";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileText, Trash2, Edit, Download, ChevronDown, Link, Image as ImageIcon, Upload } from "lucide-react";
import type { Certificate } from "@/lib/supabase/certificates";

interface CertificatesTableProps {
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
  setPreviewMode: (mode: "certificate" | "score") => void;
  exportToPDF: (cert: Certificate) => Promise<void>;
  exportToPNG: (cert: Certificate) => Promise<void>;
  generateCertificateLink: (cert: Certificate) => Promise<void>;
  openSendEmailModal: (cert: Certificate) => Promise<void>;
  openEdit: (cert: Certificate) => void;
  requestDelete: (id: string) => Promise<void>;
  t: (key: string) => string;
}

export function CertificatesTable({
  currentCertificates, exportingPDF, exportingPNG, generatingLink,
  deletingCertificateId, canDelete, tenantRole,
  isCertificateExpired, formatDateShort,
  setPreviewCertificate, setPreviewMode,
  exportToPDF, exportToPNG, generateCertificateLink, openSendEmailModal, openEdit, requestDelete,
  t,
}: CertificatesTableProps) {
  if (currentCertificates.length === 0) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <FileText className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">{t("certificates.noCertificatesTitle")}</h3>
          <p className="text-gray-600 dark:text-gray-400">{t("certificates.noCertificatesMessage")}</p>
        </div>
      </div>
    );
  }

  return (
    <Table className="[&_td]:py-2 [&_th]:py-2">
      <TableHeader>
        <TableRow>
          <TableHead className="w-[220px]">{t("certificates.certificateNumber")}</TableHead>
          <TableHead>{t("certificates.recipient")}</TableHead>
          <TableHead>{t("certificates.category")}</TableHead>
          <TableHead>{t("certificates.issuedDate")}</TableHead>
          <TableHead>{t("certificates.expiryDate")}</TableHead>
          <TableHead className="text-right">{t("certificates.actions")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {currentCertificates.map((cert) => {
          const isExpired = isCertificateExpired(cert);
          const isExportingThis = exportingPDF === cert.id || exportingPNG === cert.id;
          return (
            <TableRow
              key={cert.id}
              className={`cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 ${isExpired ? "bg-red-900/40 dark:bg-red-900/50 hover:bg-red-900/50 dark:hover:bg-red-900/60" : ""}`}
              onClick={() => { setPreviewCertificate(cert); setPreviewMode("certificate"); }}
            >
              <TableCell className="font-mono text-sm font-semibold">{cert.certificate_no}</TableCell>
              <TableCell className="font-medium">{cert.name}</TableCell>
              <TableCell>{cert.category || "—"}</TableCell>
              <TableCell>{formatDateShort(cert.issue_date)}</TableCell>
              <TableCell>
                {isExpired ? (
                  <span className="text-red-500 text-xs font-medium">
                    {formatDateShort(cert.expired_date)} ({t("certificates.expired")})
                  </span>
                ) : (
                  formatDateShort(cert.expired_date)
                )}
              </TableCell>
              <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-end gap-1">
                  {/* Export dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-3 gap-1 text-sm"
                        disabled={isExportingThis || isExpired}
                      >
                        <Upload className="h-3.5 w-3.5" />
                        {isExportingThis
                          ? (exportingPDF === cert.id ? t("certificates.exportingPDF") : t("certificates.exportingPNG"))
                          : "Export"}
                        <ChevronDown className="h-3 w-3 ml-0.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => void exportToPDF(cert)} disabled={!!exportingPDF || isExpired}>
                        <FileText className="w-4 h-4 mr-2" />
                        {t("certificates.exportPDF")}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => void exportToPNG(cert)} disabled={!!exportingPNG || isExpired}>
                        <Download className="w-4 h-4 mr-2" />
                        {t("certificates.exportPNG")}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => void generateCertificateLink(cert)} disabled={!!generatingLink}>
                        <Link className="w-4 h-4 mr-2" />
                        {generatingLink === cert.id ? t("certificates.generatingLink") : t("certificates.generateLink")}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => void openSendEmailModal(cert)} disabled={isExpired}>
                        <ImageIcon className="w-4 h-4 mr-2" />
                        {t("certificates.sendEmail")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Edit button */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 gap-1 text-sm"
                    onClick={() => openEdit(cert)}
                    disabled={tenantRole === "staff" || !tenantRole}
                  >
                    <Edit className="h-3.5 w-3.5" />
                    {t("certificates.edit")}
                  </Button>

                  {/* Delete button */}
                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-8 px-3 gap-1 text-sm"
                    onClick={() => void requestDelete(cert.id)}
                    disabled={!canDelete || deletingCertificateId === cert.id}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {deletingCertificateId === cert.id ? t("certificates.deleting") : t("certificates.delete")}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
