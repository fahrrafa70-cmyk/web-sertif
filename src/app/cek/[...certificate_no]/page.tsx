"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getCertificateByNumber, Certificate } from "@/lib/supabase/certificates";
import { Button } from "@/components/ui/button";
import { Link2, Share2, FileText, Calendar, Building2, User, Clock, CheckCircle2, Image as ImageIcon } from "lucide-react";
import { toast, Toaster } from "sonner";
import Image from "next/image";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/language-context";
import { formatReadableDate } from "@/lib/utils/certificate-formatters";
import ModernHeader from "@/components/modern-header";
import { supabaseClient } from "@/lib/supabase/client";

export default function PublicCertificatePage() {
  const params = useParams();
  const router = useRouter();
  const { language } = useLanguage();

  // Support catch-all route: /cek/[...certificate_no]
  // params.certificate_no can be string | string[]
  const rawCertParam = params?.certificate_no as string | string[] | undefined;
  const certificate_no = Array.isArray(rawCertParam)
    ? rawCertParam.join("/")
    : (rawCertParam || "");
  
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Helper: detect if certificate is expired (same logic as certificates page)
  const isExpired = useMemo(() => {
    if (!certificate?.expired_date) return false;
    try {
      const expiredDate = new Date(certificate.expired_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      expiredDate.setHours(0, 0, 0, 0);
      return expiredDate < today;
    } catch {
      return false;
    }
  }, [certificate?.expired_date]);

  // Get expired overlay image URL from Supabase storage (shared with other pages)
  const expiredOverlayUrl = useMemo(() => {
    try {
      const { data } = supabaseClient.storage
        .from("templates")
        .getPublicUrl("expired.png");
      const url = data?.publicUrl || null;
      return url;
    } catch {
      return null;
    }
  }, []);

  // Remove all spacing to make header stick to top
  useEffect(() => {
    // Force remove body margin/padding with !important via setAttribute
    const bodyStyle = document.body.style;
    bodyStyle.setProperty('margin', '0', 'important');
    bodyStyle.setProperty('padding', '0', 'important');
    bodyStyle.setProperty('padding-top', '0', 'important');
    
    // Remove html margin/padding
    const htmlStyle = document.documentElement.style;
    htmlStyle.setProperty('margin', '0', 'important');
    htmlStyle.setProperty('padding', '0', 'important');
    
    return () => {
      bodyStyle.removeProperty('margin');
      bodyStyle.removeProperty('padding');
      bodyStyle.removeProperty('padding-top');
      htmlStyle.removeProperty('margin');
      htmlStyle.removeProperty('padding');
    };
  }, []);

  useEffect(() => {
    async function loadCertificate() {
      if (!certificate_no) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Lookup by certificate number
        const cert = await getCertificateByNumber(certificate_no);
        
        if (!cert) {
          setNotFound(true);
        } else {
          setCertificate(cert);
        }
      } catch (error) {
        console.error("Error loading certificate:", error);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }

    loadCertificate();
  }, [certificate_no]);

  // Set document title dinamis robust berdasarkan certificate
  useEffect(() => {
    const setTitle = (title: string) => {
      if (typeof document !== 'undefined') {
        document.title = title;
      }
    };
    
    let titleToSet: string;
    if (certificate?.name) {
      titleToSet = `Certificate - ${certificate.name} | Certify - Certificate Platform`;
    } else if (loading) {
      titleToSet = "Loading Certificate | Certify - Certificate Platform";
    } else if (notFound) {
      titleToSet = "Certificate Not Found | Certify - Certificate Platform";
    } else {
      titleToSet = "Certificate Verification | Certify - Certificate Platform";
    }
    
    // Set immediately
    setTitle(titleToSet);
    
    // Set with multiple delays to ensure override
    const timeouts = [
      setTimeout(() => setTitle(titleToSet), 50),
      setTimeout(() => setTitle(titleToSet), 200),
      setTimeout(() => setTitle(titleToSet), 500)
    ];
    
    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, [certificate, loading, notFound]);

  // Export both certificate and score images to a single PDF
  async function exportToPDF() {
    if (!certificate?.certificate_image_url) {
      toast.error("Certificate image not available");
      return;
    }

    try {
      const mod = (await import("jspdf").catch(() => null)) as null | typeof import("jspdf");
      if (!mod || !("jsPDF" in mod)) {
        toast.error("PDF library missing");
        return;
      }
      const { jsPDF } = mod;

      async function fetchImage(urlRaw: string) {
        let srcRaw = urlRaw || "";
        if (srcRaw && !/^https?:\/\//i.test(srcRaw) && !srcRaw.startsWith('/') && !srcRaw.startsWith('data:')) {
          srcRaw = `/${srcRaw}`;
        }
        const cacheBust = certificate?.updated_at ? `?v=${new Date(certificate.updated_at).getTime()}` : '';
        const localWithBust = srcRaw.startsWith('/') ? `${srcRaw}${cacheBust}` : srcRaw;
        const src = localWithBust.startsWith('/') && typeof window !== 'undefined'
          ? `${window.location.origin}${localWithBust}`
          : localWithBust;
        const resp = await fetch(src);
        if (!resp.ok) throw new Error(`Failed to fetch image: ${resp.status}`);
        const blob = await resp.blob();
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        const bitmap = await createImageBitmap(blob);
        const dims = { w: bitmap.width, h: bitmap.height };
        bitmap.close();
        return { dataUrl, dims, mime: blob.type };
      }

      // Fetch main certificate
      const main = await fetchImage(certificate.certificate_image_url);
      const isPNG = main.mime.includes('png');
      const imgType = isPNG ? 'PNG' : 'JPEG';

      // Create PDF with orientation of first image
      const orientation = main.dims.w >= main.dims.h ? 'l' : 'p';
      const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' });

      function addCenteredImage(dataUrl: string, dims: { w: number; h: number }) {
        const pageW = doc.internal.pageSize.getWidth();
        const pageH = doc.internal.pageSize.getHeight();
        const margin = 8;
        const maxW = pageW - margin * 2;
        const maxH = pageH - margin * 2;
        const scale = Math.min(maxW / dims.w, maxH / dims.h);
        const drawW = dims.w * scale;
        const drawH = dims.h * scale;
        const x = (pageW - drawW) / 2;
        const y = (pageH - drawH) / 2;
        doc.addImage(dataUrl, imgType, x, y, drawW, drawH, undefined, 'FAST');
      }

      // Page 1: main certificate
      addCenteredImage(main.dataUrl, main.dims);

      // Page 2: score certificate if available
      if (certificate.score_image_url) {
        doc.addPage();
        const score = await fetchImage(certificate.score_image_url);
        addCenteredImage(score.dataUrl, score.dims);
      }

      const fileName = `${certificate.certificate_no || 'certificate'}-combined.pdf`;
      doc.save(fileName);
      toast.success("PDF downloaded successfully");
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to export PDF");
    }
  }

  // Export both certificate and score to PNG (two files)
  async function exportToPNG() {
    if (!certificate?.certificate_image_url) {
      toast.error("Certificate image not available");
      return;
    }

    async function downloadPng(urlRaw: string, name: string) {
      let srcRaw = urlRaw || "";
      if (srcRaw && !/^https?:\/\//i.test(srcRaw) && !srcRaw.startsWith('/') && !srcRaw.startsWith('data:')) {
        srcRaw = `/${srcRaw}`;
      }
      const cacheBust = certificate?.updated_at ? `?v=${new Date(certificate.updated_at).getTime()}` : '';
      const localWithBust = srcRaw.startsWith('/') ? `${srcRaw}${cacheBust}` : srcRaw;
      const src = localWithBust.startsWith('/') && typeof window !== 'undefined'
        ? `${window.location.origin}${localWithBust}`
        : localWithBust;
      const resp = await fetch(src);
      if (!resp.ok) throw new Error(`Failed to fetch image: ${resp.status}`);
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }

    try {
      const base = certificate.certificate_no || 'certificate';
      await downloadPng(certificate.certificate_image_url, `${base}.png`);
      if (certificate.score_image_url) {
        await downloadPng(certificate.score_image_url, `${base}-score.png`);
      }
      toast.success("PNGs downloaded successfully");
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to export PNGs");
    }
  }

  // Copy public link to clipboard
  async function copyPublicLink() {
    if (!certificate) return;

    // Use environment variable for production URL, fallback to window.location.origin
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                    (typeof window !== 'undefined' ? window.location.origin : '');
    
    // Use certificate number for URL
    const identifier = certificate.certificate_no;
    const publicUrl = `${baseUrl}/cek/${identifier}`;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(publicUrl);
        toast.success("Link copied to clipboard!");
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = publicUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        toast.success("Link copied to clipboard!");
      }
    } catch (err) {
      console.error('Failed to copy link:', err);
      toast.error('Failed to copy link');
    }
  }

  // Share certificate
  async function shareCertificate() {
    if (!certificate) return;

    // Use environment variable for production URL, fallback to window.location.origin
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                    (typeof window !== 'undefined' ? window.location.origin : '');
    
    // Use certificate number for URL
    const identifier = certificate.certificate_no;
    const publicUrl = `${baseUrl}/cek/${identifier}`;

    const shareData = {
      title: `Certificate - ${certificate.certificate_no}`,
      text: `Certificate for ${certificate.name}`,
      url: publicUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        toast.success("Shared successfully");
      } else {
        // Fallback: copy to clipboard
        await copyPublicLink();
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('Error sharing:', err);
        toast.error('Failed to share');
      }
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen w-full bg-white flex items-center justify-center" style={{ minHeight: '100vh', width: '100%', backgroundColor: '#ffffff' }}>
        <div className="text-center">
          <svg
            className="animate-spin mx-auto mb-4"
            width="64"
            height="64"
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              className="stroke-blue-500 dark:stroke-blue-400"
              cx="32"
              cy="32"
              r="28"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray="175.93"
              strokeDashoffset="43.98"
            />
          </svg>
          <p className="text-gray-600 dark:text-gray-400 text-lg font-medium">Loading certificate...</p>
        </div>
      </div>
    );
  }

  // Not found state
  if (notFound || !certificate) {
    return (
      <div className="min-h-screen w-full bg-white flex items-center justify-center p-4" style={{ minHeight: '100vh', width: '100%', backgroundColor: '#ffffff' }}>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <FileText className="w-12 h-12 text-red-500" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Certificate Not Found</h1>
          <p className="text-gray-600 mb-6">
            The certificate you&apos;re looking for doesn&apos;t exist or is no longer publicly available.
          </p>
          <Button
            onClick={() => router.push('/')}
            className="gradient-primary text-white"
          >
            Go to Home
          </Button>
        </motion.div>
      </div>
    );
  }

  // Success state - Display certificate
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
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Certificate Status Badge */}
            <div className="flex items-center justify-center mb-6">
              <div className="inline-flex items-center space-x-2 bg-green-100 text-green-800 px-4 py-2 rounded-full">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-semibold">Verified Certificate</span>
              </div>
            </div>

            {/* Certificate Card */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden border border-gray-200 dark:border-gray-700">
              {/* Top: Certificate Images - Centered for single, side by side for double */}
              <div className="p-4 bg-gray-50 dark:bg-gray-900">
                {/* Single-sided: Center the certificate image */}
                {!certificate.score_image_url && certificate.certificate_image_url ? (
                  <div className="flex justify-center">
                    <div
                      className="relative w-full max-w-4xl rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden bg-gray-100 dark:bg-gray-900"
                      style={{
                        backgroundImage: `url(${certificate.certificate_image_url})`,
                        backgroundSize: "contain",
                        backgroundRepeat: "no-repeat",
                        backgroundPosition: "center",
                        aspectRatio: "4 / 3",
                      }}
                      onContextMenu={(e) => e.preventDefault()}
                    >
                      {/* Expired Overlay on front side */}
                      {isExpired && expiredOverlayUrl && (
                        <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden flex items-center justify-center">
                          <Image
                            src={expiredOverlayUrl}
                            alt="Expired"
                            className="max-w-full max-h-full"
                            style={{
                              objectFit: "contain",
                              width: "100%",
                              height: "auto",
                            }}
                            width={800}
                            height={600}
                            onError={(e) => {
                              // Fallback: hide overlay image if it fails to load
                              console.error(
                                "Failed to load expired overlay image:",
                                expiredOverlayUrl,
                              );
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        </div>
                      )}
                      {isExpired && !expiredOverlayUrl && (
                        <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center bg-red-500/20">
                          <div className="text-xs text-red-600 dark:text-red-400 font-bold">
                            EXPIRED
                          </div>
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
                        style={{
                          backgroundImage: `url(${certificate.certificate_image_url})`,
                          backgroundSize: "contain",
                          backgroundRepeat: "no-repeat",
                          backgroundPosition: "center",
                          aspectRatio: "4 / 3",
                        }}
                        onContextMenu={(e) => e.preventDefault()}
                      >
                        {/* Expired Overlay on front side */}
                        {isExpired && expiredOverlayUrl && (
                          <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden flex items-center justify-center">
                            <Image
                              src={expiredOverlayUrl}
                              alt="Expired"
                              className="max-w-full max-h-full"
                              style={{
                                objectFit: "contain",
                                width: "100%",
                                height: "auto",
                              }}
                              width={800}
                              height={600}
                              onError={(e) => {
                                console.error(
                                  "Failed to load expired overlay image:",
                                  expiredOverlayUrl,
                                );
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          </div>
                        )}
                        {isExpired && !expiredOverlayUrl && (
                          <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center bg-red-500/20">
                            <div className="text-xs text-red-600 dark:text-red-400 font-bold">
                              EXPIRED
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="w-full h-48 flex items-center justify-center text-gray-400 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
                        <div className="text-center">
                          <FileText className="w-12 h-12 mx-auto mb-2" />
                          <p className="text-sm">No preview available</p>
                        </div>
                      </div>
                    )}

                    {/* Score Image (back side) */}
                    {certificate.score_image_url && (
                      <div
                        className="relative w-full rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden bg-gray-100 dark:bg-gray-900"
                        style={{
                          backgroundImage: `url(${certificate.score_image_url})`,
                          backgroundSize: "contain",
                          backgroundRepeat: "no-repeat",
                          backgroundPosition: "center",
                          aspectRatio: "4 / 3",
                        }}
                        onContextMenu={(e) => e.preventDefault()}
                      >
                        {/* Expired Overlay on back side as well */}
                        {isExpired && expiredOverlayUrl && (
                          <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden flex items-center justify-center">
                            <Image
                              src={expiredOverlayUrl}
                              alt="Expired"
                              className="max-w-full max-h-full"
                              style={{
                                objectFit: "contain",
                                width: "100%",
                                height: "auto",
                              }}
                              width={800}
                              height={600}
                              onError={(e) => {
                                console.error(
                                  "Failed to load expired overlay image:",
                                  expiredOverlayUrl,
                                );
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          </div>
                        )}
                        {isExpired && !expiredOverlayUrl && (
                          <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center bg-red-500/20">
                            <div className="text-xs text-red-600 dark:text-red-400 font-bold">
                              EXPIRED
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Bottom: Certificate Details */}
              <div className="p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700">
                {/* Top Row: Name (Left) and Certificate Number (Right) */}
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

                {/* Grid 2 Columns for Dates */}
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
                    <Button
                      onClick={exportToPDF}
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700"
                      size="lg"
                    >
                      <FileText className="w-5 h-5 mr-2" />
                      Download PDF
                    </Button>
                    <Button
                      onClick={exportToPNG}
                      className="bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700"
                      size="lg"
                    >
                      <ImageIcon className="w-5 h-5 mr-2" />
                      Download PNG
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      onClick={copyPublicLink}
                      className="bg-white text-gray-900 border border-gray-200 shadow-md hover:shadow-lg transition-shadow"
                      size="lg"
                    >
                      <Link2 className="w-4 h-4 mr-2" />
                      Copy Link
                    </Button>
                    <Button
                      onClick={shareCertificate}
                      className="bg-white text-gray-900 border border-gray-200 shadow-md hover:shadow-lg transition-shadow"
                      size="lg"
                    >
                      <Share2 className="w-4 h-4 mr-2" />
                      Share
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Toast Notifications */}
      <Toaster position="top-right" richColors />
    </div>
  );
}
