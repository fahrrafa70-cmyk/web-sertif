"use client";

import { formatReadableDate } from "@/lib/utils/certificate-formatters";
import type { Certificate } from "@/lib/supabase/certificates";

interface CertificateInfoProps {
  certificate: Certificate;
  language: "en" | "id";
}

export function CertificateInfo({ certificate, language }: CertificateInfoProps) {
  return (
    <div className="p-6">
      <div className="space-y-6">
        {/* Recipient Info */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Recipient Information
          </h3>
          <div className="space-y-2">
            <div>
              <span className="text-sm text-gray-500">Name:</span>
              <div className="text-base font-medium">
                {certificate.members?.name || certificate.name}
              </div>
            </div>
            {certificate.members?.organization && (
              <div>
                <span className="text-sm text-gray-500">Organization:</span>
                <div className="text-base">
                  {certificate.members.organization}
                </div>
              </div>
            )}
            {certificate.description && (
              <div>
                <span className="text-sm text-gray-500">Description:</span>
                <div className="text-base">
                  {certificate.description}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Certificate Details */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Certificate Details
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Category:</span>
              <span className="font-medium">{certificate.category || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Template:</span>
              <span className="font-medium">
                {certificate.templates?.name || "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Issue Date:</span>
              <span className="font-medium">
                {formatReadableDate(certificate.issue_date, language)}
              </span>
            </div>
            {certificate.expired_date && (
              <div className="flex justify-between">
                <span className="text-gray-500">Expiry Date:</span>
                <span className="font-medium">
                  {formatReadableDate(certificate.expired_date, language)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Verification Status */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
            <div>
              <div className="text-sm font-medium text-green-800">
                Certificate Verified
              </div>
              <div className="text-xs text-green-600">
                This certificate is authentic and valid
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
