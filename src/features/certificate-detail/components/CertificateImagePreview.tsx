"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import type { Certificate } from "@/lib/supabase/certificates";

interface CertificateImagePreviewProps {
  certificate: Certificate;
  imagePreviewOpen: boolean;
  setImagePreviewOpen: (open: boolean) => void;
}

export function CertificateImagePreview({ certificate, imagePreviewOpen, setImagePreviewOpen }: CertificateImagePreviewProps) {
  return (
    <>
      <div className="p-6 bg-gray-50 flex-1">
        {certificate.certificate_image_url ? (
          <div className="relative">
            <div className="relative w-full" onClick={() => setImagePreviewOpen(true)}>
              <Image
                src={certificate.certificate_image_url}
                alt="Certificate"
                width={1200}
                height={800}
                className="w-full h-auto rounded-lg border shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                unoptimized
              />
            </div>
            <Button
              onClick={() => setImagePreviewOpen(true)}
              className="absolute top-4 right-4 bg-white/90 hover:bg-white text-gray-700 shadow-md"
              size="sm"
            >
              <Eye className="w-4 h-4 mr-1" />
              View Full
            </Button>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-500 border-2 border-dashed border-gray-300 rounded-lg bg-white">
            No certificate image available
          </div>
        )}
      </div>

      {imagePreviewOpen && certificate.certificate_image_url && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" 
          onClick={() => setImagePreviewOpen(false)}
        >
          <div 
            className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 max-w-5xl w-full overflow-hidden" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Certificate Image - {certificate.certificate_no}
              </div>
              <Button 
                variant="outline" 
                onClick={() => setImagePreviewOpen(false)}
              >
                Close
              </Button>
            </div>
            <div className="p-4 bg-gray-50">
              <div className="relative w-full">
                <Image 
                  src={certificate.certificate_image_url} 
                  alt="Certificate" 
                  width={1600} 
                  height={1000} 
                  className="w-full h-auto rounded-lg border" 
                  unoptimized
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
