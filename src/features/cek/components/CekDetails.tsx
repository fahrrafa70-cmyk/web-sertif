"use client";

import { Button } from "@/components/ui/button";
import { Link2, Share2, FileText, Calendar, Building2, User, Clock, Image as ImageIcon } from "lucide-react";
import { formatReadableDate } from "@/lib/utils/certificate-formatters";
import type { Certificate } from "@/lib/supabase/certificates";

interface CekDetailsProps {
  certificate: Certificate;
  language: "en" | "id";
  exportToPDF: () => void;
  exportToPNG: () => void;
  copyPublicLink: () => void;
  shareCertificate: () => void;
}

export function CekDetails({
  certificate, language, exportToPDF, exportToPNG, copyPublicLink, shareCertificate
}: CekDetailsProps) {
  return (
    <div className="p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Recipient Name - Left */}
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <User className="w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Recipient</p>
          </div>
          <p className="text-lg font-bold text-gray-900 dark:text-white mb-1">
            {certificate.members?.name || certificate.name}
          </p>
          {certificate.members?.organization && (
            <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
              <Building2 className="w-4 h-4 mr-1 flex-shrink-0" />
              {certificate.members.organization}
            </p>
          )}
        </div>

        {/* Certificate Number - Right */}
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Certificate Number</p>
          </div>
          <p className="text-lg font-bold text-gray-900 dark:text-white">{certificate.certificate_no}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Issue Date */}
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <Calendar className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Issue Date</p>
          </div>
          <p className="text-base font-semibold text-gray-900 dark:text-white">
            {formatReadableDate(certificate.issue_date, language)}
          </p>
        </div>

        {/* Expiry Date */}
        {certificate.expired_date && (
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <Clock className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Expiry Date</p>
            </div>
            <p className="text-base font-semibold text-gray-900 dark:text-white">
              {formatReadableDate(certificate.expired_date, language)}
            </p>
          </div>
        )}

        {/* Description - Full Width if exists */}
        {certificate.description && (
          <div className="md:col-span-2 pt-3 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Description</p>
            <p className="text-base text-gray-700 dark:text-gray-300">{certificate.description}</p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="mt-4 space-y-2">
        <div className="grid grid-cols-2 gap-3">
          <Button onClick={exportToPDF} className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700" size="lg">
            <FileText className="w-5 h-5 mr-2" />Download PDF
          </Button>
          <Button onClick={exportToPNG} className="bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700" size="lg">
            <ImageIcon className="w-5 h-5 mr-2" />Download PNG
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Button onClick={copyPublicLink} className="bg-white text-gray-900 border border-gray-200 shadow-md hover:shadow-lg transition-shadow" size="lg">
            <Link2 className="w-4 h-4 mr-2" />Copy Link
          </Button>
          <Button onClick={shareCertificate} className="bg-white text-gray-900 border border-gray-200 shadow-md hover:shadow-lg transition-shadow" size="lg">
            <Share2 className="w-4 h-4 mr-2" />Share
          </Button>
        </div>
      </div>
    </div>
  );
}
