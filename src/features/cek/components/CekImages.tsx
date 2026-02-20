"use client";

import Image from "next/image";
import { FileText } from "lucide-react";
import type { Certificate } from "@/lib/supabase/certificates";

interface CekImagesProps {
  certificate: Certificate;
  isExpired: boolean;
  expiredOverlayUrl: string | null;
}

export function CekImages({ certificate, isExpired, expiredOverlayUrl }: CekImagesProps) {
  return (
    <div className="p-4 bg-gray-50 dark:bg-gray-900">
      {/* Single-sided: Center the certificate image */}
      {!certificate.score_image_url && certificate.certificate_image_url ? (
        <div className="flex justify-center">
          <div
            className="relative w-full max-w-4xl rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden bg-gray-100 dark:bg-gray-900"
            style={{ backgroundImage: `url(${certificate.certificate_image_url})`, backgroundSize: "contain", backgroundRepeat: "no-repeat", backgroundPosition: "center", aspectRatio: "4 / 3" }}
            onContextMenu={(e) => e.preventDefault()}
          >
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
        </div>
      ) : (
        /* Double-sided: Side by side layout */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Main Certificate Image */}
          {certificate.certificate_image_url ? (
            <div
              className="relative w-full rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden bg-gray-100 dark:bg-gray-900"
              style={{ backgroundImage: `url(${certificate.certificate_image_url})`, backgroundSize: "contain", backgroundRepeat: "no-repeat", backgroundPosition: "center", aspectRatio: "4 / 3" }}
              onContextMenu={(e) => e.preventDefault()}
            >
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
          ) : (
            <div className="w-full h-48 flex items-center justify-center text-gray-400 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
              <div className="text-center"><FileText className="w-12 h-12 mx-auto mb-2" /><p className="text-sm">No preview available</p></div>
            </div>
          )}

          {/* Score Image (back side) */}
          {certificate.score_image_url && (
            <div
              className="relative w-full rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden bg-gray-100 dark:bg-gray-900"
              style={{ backgroundImage: `url(${certificate.score_image_url})`, backgroundSize: "contain", backgroundRepeat: "no-repeat", backgroundPosition: "center", aspectRatio: "4 / 3" }}
              onContextMenu={(e) => e.preventDefault()}
            >
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
          )}
        </div>
      )}
    </div>
  );
}
