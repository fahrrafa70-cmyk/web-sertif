"use client";

import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { Toaster } from "sonner";
import { useLanguage } from "@/contexts/language-context";
import ModernHeader from "@/components/modern-header";
import { useCekPage } from "@/features/cek/hooks/useCekPage";
import { CekLoading } from "@/features/cek/components/CekLoading";
import { CekNotFound } from "@/features/cek/components/CekNotFound";
import { CekImages } from "@/features/cek/components/CekImages";
import { CekDetails } from "@/features/cek/components/CekDetails";

export default function PublicCertificatePage() {
  const { language } = useLanguage();
  const {
    certificate, loading, notFound, isExpired, expiredOverlayUrl,
    copyPublicLink, shareCertificate, exportToPDF, exportToPNG, router
  } = useCekPage();

  if (loading) return <CekLoading />;
  if (notFound || !certificate) return <CekNotFound router={router} />;

  return (
    <div style={{ margin: 0, padding: 0 }}>
      {/* Header - Use ModernHeader without auth and mobile sidebar */}
      <ModernHeader hideAuth={true} hideMobileSidebar={true} />

      {/* Main Content - Add padding-top for fixed header plus extra gap for status badge */}
      <main
        className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-8 md:py-12"
        style={{ paddingTop: 'calc(var(--header-height-mobile, 72px) + 24px)' }}
      >
        <div className="w-full max-w-6xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            {/* Certificate Status Badge */}
            <div className="flex items-center justify-center mb-6">
              <div className="inline-flex items-center space-x-2 bg-green-100 text-green-800 px-4 py-2 rounded-full">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-semibold">Verified Certificate</span>
              </div>
            </div>

            {/* Certificate Card */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden border border-gray-200 dark:border-gray-700">
              <CekImages certificate={certificate} isExpired={isExpired} expiredOverlayUrl={expiredOverlayUrl} />
              
              <CekDetails 
                certificate={certificate} 
                language={language}
                exportToPDF={exportToPDF}
                exportToPNG={exportToPNG}
                copyPublicLink={copyPublicLink}
                shareCertificate={shareCertificate}
              />
            </div>
          </motion.div>
        </div>
      </main>

      <Toaster position="top-right" richColors />
    </div>
  );
}
