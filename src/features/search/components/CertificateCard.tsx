"use client";

import { memo, useMemo } from "react";
import Image from "next/image";
import { formatReadableDate } from "@/lib/utils/certificate-formatters";
import type { Certificate } from "@/features/certificates/types";

interface CertificateCardProps {
  certificate: Certificate;
  onPreview: (cert: Certificate) => void;
  language: "en" | "id";
  t: (key: string) => string;
  index?: number;
  expiredOverlayUrl: string | null;
  getThumbnailUrl: (url: string | null | undefined) => string | null;
  normalizeImageUrl: (url: string | null | undefined, updatedAt?: string | null) => { src: string; shouldOptimize: boolean };
  isCertificateExpired: (cert: Certificate) => boolean;
}

export const CertificateCard = memo(({
  certificate, onPreview, language, t, index = 0,
  expiredOverlayUrl: overlayUrl, getThumbnailUrl, normalizeImageUrl, isCertificateExpired,
}: CertificateCardProps) => {
  const formattedDate = useMemo(() => {
    if (!certificate.issue_date) return null;
    return formatReadableDate(certificate.issue_date, language);
  }, [certificate.issue_date, language]);

  const imageConfig = useMemo(() => {
    const thumbnailUrl = certificate.certificate_thumbnail_url || getThumbnailUrl(certificate.certificate_image_url);
    return normalizeImageUrl(thumbnailUrl || certificate.certificate_image_url, certificate.updated_at);
  }, [certificate.certificate_thumbnail_url, certificate.certificate_image_url, certificate.updated_at, getThumbnailUrl, normalizeImageUrl]);

  const isExpired = useMemo(() => isCertificateExpired(certificate), [certificate, isCertificateExpired]);

  return (
    <div
      onClick={() => onPreview(certificate)}
      className="group bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-1 transition-[transform,box-shadow] duration-200 ease-out cursor-pointer flex flex-row h-[180px] will-change-transform relative"
    >
      <div className="relative w-[170px] flex-shrink-0 flex items-center justify-center overflow-hidden bg-gray-100 dark:bg-gray-900 cert-thumbnail-bg">
        {imageConfig.src ? (
          <div className="relative w-full h-full" style={{ backgroundColor: "transparent !important" }}>
            <Image
              src={imageConfig.src} alt={certificate.name} fill sizes="170px" className="object-contain"
              style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "contain", backgroundColor: "transparent !important" }}
              loading={index < 3 ? "eager" : "lazy"} priority={index < 3} unoptimized={!imageConfig.shouldOptimize}
              onError={(e) => { e.currentTarget.style.display = "none"; }}
            />
            {isExpired && overlayUrl && (
              <div
                className="absolute inset-0 pointer-events-none z-10 overflow-hidden flex items-center justify-center"
                style={{ backgroundImage: `url(${overlayUrl})`, backgroundSize: "contain", backgroundPosition: "center", backgroundRepeat: "no-repeat", opacity: 0.85, mixBlendMode: "multiply", filter: "brightness(1.1) contrast(1.2)" }}
              />
            )}
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400 dark:text-gray-500" style={{ zIndex: 1 }}>
            <div className="text-center"><div className="text-2xl mb-1">📄</div><div className="text-xs">{t("hero.noPreviewImage")}</div></div>
          </div>
        )}
      </div>

      <div className="flex-1 p-4 flex flex-col justify-center gap-1.5 relative z-0">
        <div>
          <h3 className="font-semibold text-base text-gray-900 dark:text-gray-100 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-tight">
            {certificate.name}
          </h3>
        </div>
        <div><p className="text-sm font-medium text-gray-600 dark:text-gray-400 truncate">{certificate.certificate_no}</p></div>
        {certificate.category && <div><span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">{certificate.category}</span></div>}
        <div className="space-y-0.5 pt-1 border-t border-gray-200 dark:border-gray-700">
          {formattedDate && <p className="text-xs text-gray-500 dark:text-gray-400">{t("hero.issued")}: {formattedDate}</p>}
          {certificate.members?.organization && <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">{certificate.members.organization}</p>}
        </div>
      </div>
    </div>
  );
}, (prev, next) => {
  if (prev.certificate.id !== next.certificate.id) return false;
  if (prev.certificate.certificate_image_url !== next.certificate.certificate_image_url) return false;
  if (prev.certificate.certificate_thumbnail_url !== next.certificate.certificate_thumbnail_url) return false;
  if (prev.certificate.updated_at !== next.certificate.updated_at) return false;
  if (prev.certificate.expired_date !== next.certificate.expired_date) return false;
  if (prev.certificate.issue_date !== next.certificate.issue_date) return false;
  if (prev.language !== next.language) return false;
  if (prev.expiredOverlayUrl !== next.expiredOverlayUrl) return false;
  return true;
});
CertificateCard.displayName = "CertificateCard";
