"use client";

import { Toaster } from "sonner";
import ModernLayout from "@/components/modern-layout";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/language-context";
import { useCertificateDetailPage } from "@/features/certificate-detail/hooks/useCertificateDetailPage";
import { CertificateDetailLoading } from "@/features/certificate-detail/components/CertificateDetailLoading";
import { CertificateDetailNotFound } from "@/features/certificate-detail/components/CertificateDetailNotFound";
import { CertificateImagePreview } from "@/features/certificate-detail/components/CertificateImagePreview";
import { CertificateInfo } from "@/features/certificate-detail/components/CertificateInfo";

export default function CertificatePage() {
  const { language } = useLanguage();
  const {
    certificate,
    certificateNo,
    loading,
    imagePreviewOpen,
    setImagePreviewOpen,
    router
  } = useCertificateDetailPage();

  if (loading) return <CertificateDetailLoading />;
  if (!certificate) return <CertificateDetailNotFound router={router} certificateNo={certificateNo} />;

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
              <CertificateImagePreview 
                certificate={certificate} 
                imagePreviewOpen={imagePreviewOpen} 
                setImagePreviewOpen={setImagePreviewOpen} 
              />
              <CertificateInfo 
                certificate={certificate} 
                language={language} 
              />
            </div>
          </motion.div>
        </div>
      </ModernLayout>
      <Toaster position="top-right" richColors />
    </>
  );
}
