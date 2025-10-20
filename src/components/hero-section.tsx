"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { getCertificateByNumber, Certificate } from "@/lib/supabase/certificates";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ArrowRight, Search } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
 

export default function HeroSection() {
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [certificateId, setCertificateId] = useState("");
  const [searching, setSearching] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewCert, setPreviewCert] = useState<Certificate | null>(null);
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>("");
  useEffect(() => setMounted(true), []);

  // Landing stats removed from minimal landing

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut" as const
      }
    }
  };

  return (
    <>
    <section className="relative w-full flex-1 flex items-center justify-center overflow-hidden">
      {/* Enhanced Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800">
        {/* Animated Background Pattern */}
        {mounted && (
          <div className="absolute inset-0">
            {/* Floating Geometric Shapes */}
            {[...Array(15)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-3 h-3 bg-white/10 rounded-full"
                style={{
                  left: `${(i * 47) % 100}%`,
                  top: `${(i * 61) % 100}%`,
                }}
                animate={{
                  y: [0, -30, 0],
                  x: [0, 15, 0],
                  opacity: [0.1, 0.6, 0.1],
                  scale: [1, 1.2, 1],
                }}
                transition={{
                  duration: 4 + ((i * 17) % 30) / 10,
                  repeat: Infinity,
                  delay: ((i * 23) % 30) / 10,
                  ease: "easeInOut" as const
                }}
              />
            ))}
            
            {/* Gradient Orbs */}
            <motion.div
              className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-full blur-3xl"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: "easeInOut" as const
              }}
            />
            <motion.div
              className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-r from-indigo-400/20 to-pink-400/20 rounded-full blur-3xl"
              animate={{
                scale: [1.2, 1, 1.2],
                opacity: [0.2, 0.5, 0.2],
              }}
              transition={{
                duration: 10,
                repeat: Infinity,
                ease: "easeInOut" as const
              }}
            />
          </div>
        )}
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center py-0">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-5xl mx-auto"
        >
          {/* Enhanced Main Title */}
          <motion.div variants={itemVariants} className="mb-5">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-3 leading-tight">
              <span className="block bg-gradient-to-r from-white via-blue-100 to-white bg-clip-text text-transparent">
                E-Certificate
              </span>
            </h1>
          </motion.div>


          {/* Enhanced Certificate Search */}
          <motion.div
            variants={itemVariants}
            className="mx-auto max-w-xl"
          >
            <form
              onSubmit={async (e: React.FormEvent) => {
                e.preventDefault();
                let q = certificateId.trim();
                if (!q) return;
                
                // Extract certificate number from link format
                // Support formats: /certificate/CERT-XXX, certificate/CERT-XXX, or just CERT-XXX
                const linkMatch = q.match(/(?:\/certificate\/|certificate\/)([A-Za-z0-9-_]+)/);
                if (linkMatch) {
                  q = linkMatch[1]; // Extract the certificate number from the link
                  console.log('Extracted certificate number from link:', q);
                }
                
                try {
                  setSearching(true);
                  const cert = await getCertificateByNumber(q);
                  if (!cert) {
                    toast.error("Certificate not found");
                    setPreviewCert(null);
                    setPreviewOpen(false);
                    return;
                  }
                  setPreviewCert(cert);
                  setPreviewOpen(true);
                } catch (err) {
                  console.error(err);
                  toast.error(err instanceof Error ? err.message : "Search failed");
                } finally {
                  setSearching(false);
                }
              }}
              className="flex items-center gap-2.5 bg-white/10 backdrop-blur-md rounded-2xl p-1.5 border border-white/20"
            >
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/70" />
                <Input
                  value={certificateId}
                  onChange={(e) => setCertificateId(e.target.value)}
                  placeholder={t('hero.searchPlaceholder')}
                  className="h-10 pl-9 bg-transparent border-0 text-white placeholder:text-white/70 focus-visible:ring-0 text-sm sm:text-base"
                />
              </div>
              <Button
                type="submit"
                className="h-10 px-4 sm:h-11 sm:px-5 gradient-primary text-white rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]"
              >
                {searching ? "Searching..." : t('hero.searchButton')}
                <ArrowRight className="ml-2 w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
            </form>
          </motion.div>
        </motion.div>
      </div>
    </section>
    {previewOpen && previewCert && (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-4" onClick={() => setPreviewOpen(false)}>
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <div>
              <div className="text-lg font-semibold">Certificate Preview</div>
              <div className="text-sm text-gray-500">{previewCert!.certificate_no} · {new Date(previewCert!.issue_date).toLocaleDateString()}</div>
            </div>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>Close</Button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
            <div className="p-4 bg-gray-50">
              {previewCert!.certificate_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewCert!.certificate_image_url ?? undefined} alt="Certificate" className="w-full h-auto rounded-lg border" />
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-500 border rounded-lg bg-white">No preview image</div>
              )}
            </div>
            <div className="p-6">
              <div className="space-y-2">
                <div className="text-sm text-gray-500">Recipient</div>
                <div className="text-base font-medium">{previewCert!.members?.name || previewCert!.name}</div>
                {previewCert!.members?.organization && (
                  <div className="text-sm text-gray-600">{previewCert!.members.organization}</div>
                )}
              </div>
              <div className="mt-4 space-y-1 text-sm">
                <div><span className="text-gray-500">Category:</span> {previewCert!.category || "—"}</div>
                <div><span className="text-gray-500">Template:</span> {(previewCert as unknown as { templates?: { name?: string } }).templates?.name || "—"}</div>
                <div><span className="text-gray-500">Issued:</span> {new Date(previewCert!.issue_date).toLocaleDateString()}</div>
                {previewCert!.expired_date && (
                  <div><span className="text-gray-500">Expires:</span> {new Date(previewCert!.expired_date as string).toLocaleDateString()}</div>
                )}
              </div>
              <div className="mt-6 flex gap-3">
                <Button
                  onClick={() => {
                    if (previewCert!.certificate_image_url) {
                      setImagePreviewUrl(previewCert!.certificate_image_url);
                      setImagePreviewOpen(true);
                    }
                  }}
                  className="px-4 py-2 rounded-md bg-blue-600 text-white"
                >
                  View Full Image
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )}
    {imagePreviewOpen && (
      <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4" onClick={() => setImagePreviewOpen(false)}>
        <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div className="text-sm text-gray-600">Certificate Image</div>
            <Button variant="outline" onClick={() => setImagePreviewOpen(false)}>Close</Button>
          </div>
          <div className="p- bg-gray-50">
            {imagePreviewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imagePreviewUrl} alt="Certificate" className="w-full h-auto rounded-lg border" />
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500 border rounded-lg bg-white">No image</div>
            )}
          </div>
        </div>
      </div>
    )}
  </>
  );
}
