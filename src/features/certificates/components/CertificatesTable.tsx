"use client";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileText, Trash2, Edit, Download, ChevronDown, Link, Image as ImageIcon } from "lucide-react";
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
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("certificates.tableNo")}</TableHead>
          <TableHead>{t("certificates.tableName")}</TableHead>
          <TableHead>{t("certificates.tableDescription")}</TableHead>
          <TableHead>{t("certificates.tableCategory")}</TableHead>
          <TableHead>{t("certificates.tableIssueDate")}</TableHead>
          <TableHead>{t("certificates.tableExpiredDate")}</TableHead>
          <TableHead className="text-right">{t("certificates.tableActions")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {currentCertificates.map((cert) => {
          const isExpired = isCertificateExpired(cert);
          return (
            <TableRow
              key={cert.id}
              className={`cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 ${isExpired ? "opacity-60" : ""}`}
              onClick={() => { setPreviewCertificate(cert); setPreviewMode("certificate"); }}
            >
              <TableCell className="font-mono text-xs">{cert.certificate_no}</TableCell>
              <TableCell className="font-medium">{cert.name}</TableCell>
              <TableCell className="text-gray-500 dark:text-gray-400 max-w-[200px] truncate">{cert.description || "—"}</TableCell>
              <TableCell>{cert.category || "—"}</TableCell>
              <TableCell>{formatDateShort(cert.issue_date)}</TableCell>
              <TableCell>
                {isExpired ? (
                  <span className="text-red-500 text-xs font-medium">{formatDateShort(cert.expired_date)} ({t("certificates.expired")})</span>
                ) : (
                  formatDateShort(cert.expired_date)
                )}
              </TableCell>
              <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => void exportToPDF(cert)} disabled={!!exportingPDF || isExpired}>
                      <FileText className="w-4 h-4 mr-2" />
                      {exportingPDF === cert.id ? t("certificates.exportingPDF") : t("certificates.exportPDF")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => void exportToPNG(cert)} disabled={!!exportingPNG || isExpired}>
                      <Download className="w-4 h-4 mr-2" />
                      {exportingPNG === cert.id ? t("certificates.exportingPNG") : t("certificates.exportPNG")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => void generateCertificateLink(cert)} disabled={!!generatingLink}>
                      <Link className="w-4 h-4 mr-2" />
                      {generatingLink === cert.id ? t("certificates.generatingLink") : t("certificates.generateLink")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => void openSendEmailModal(cert)} disabled={isExpired}>
                      <ImageIcon className="w-4 h-4 mr-2" />
                      {t("certificates.sendEmail")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openEdit(cert)} disabled={tenantRole === "staff" || !tenantRole}>
                      <Edit className="w-4 h-4 mr-2" />
                      {t("certificates.edit")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => void requestDelete(cert.id)}
                      disabled={!canDelete || deletingCertificateId === cert.id}
                      className="text-red-600 dark:text-red-400"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {deletingCertificateId === cert.id ? t("certificates.deleting") : t("certificates.delete")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
