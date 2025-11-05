"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getCertificateByNumber, Certificate } from "@/lib/supabase/certificates";
import { toast } from "sonner";
import ModernLayout from "@/components/modern-layout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Eye } from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";
import { useLanguage } from "@/contexts/language-context";
import { formatReadableDate } from "@/lib/utils/certificate-formatters";

export default function CertificatePage() {
  const params = useParams();
  const router = useRouter();
  const { language } = useLanguage();
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [loading, setLoading] = useState(true);
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);

  const certificateNo = params?.certificate_no as string;

  useEffect(() => {
    const loadCertificate = async () => {
      if (!certificateNo) {
        toast.error("Certificate number not provided");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const cert = await getCertificateByNumber(certificateNo);
        if (!cert) {
          toast.error("Certificate not found");
          setCertificate(null);
        } else {
          setCertificate(cert);
        }
      } catch (err) {
        console.error("Failed to load certificate:", err);
        toast.error("Failed to load certificate");
      } finally {
        setLoading(false);
      }
    };

    loadCertificate();
  }, [certificateNo]);

  // Handle keyboard events for image preview modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (imagePreviewOpen && e.key === "Escape") {
        setImagePreviewOpen(false);
      }
    };

    if (imagePreviewOpen) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [imagePreviewOpen]);

  if (loading) {
    return (
      <ModernLayout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
              <Eye className="w-8 h-8 text-gray-400" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Loading certificate...
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              Please wait while we verify your certificate.
            </p>
          </div>
        </div>
      </ModernLayout>
    );
  }

  if (!certificate) {
    return (
      <ModernLayout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Eye className="w-8 h-8 text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Certificate Not Found
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mb-8">
              {`The certificate with number "${certificateNo}" could not be found.`}
            </p>
            <div className="flex gap-4 justify-center">
              <Button
                onClick={() => router.back()}
                variant="outline"
                className="border-gray-300 dark:border-gray-600"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Back
              </Button>
              <Button
                onClick={() => router.push("/")}
                className="gradient-primary text-white"
              >
                Search Again
              </Button>
            </div>
          </div>
        </div>
      </ModernLayout>
    );
  }

  return (
    <>
      <ModernLayout>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            {/* Header */}
            <div className="mb-8">
              <Button
                onClick={() => router.back()}
                variant="outline"
                className="border-gray-300 mb-4"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Certificate Verification
                </h1>
                <p className="text-gray-600">
                  Certificate Number: <span className="font-medium">{certificate.certificate_no}</span>
                </p>
              </motion.div>
            </div>

            {/* Certificate Details */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
                {/* Certificate Image */}
                <div className="p-6 bg-gray-50">
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

                {/* Certificate Information */}
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
              </div>
            </motion.div>
        </div>
      </ModernLayout>

      {/* Full Image Preview Modal */}
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
