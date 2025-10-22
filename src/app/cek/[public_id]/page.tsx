"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getCertificateByPublicId, Certificate } from "@/lib/supabase/certificates";
import { Button } from "@/components/ui/button";
import { Download, Link2, Share2, FileText, Calendar, Building2, User, Tag, Clock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import { motion } from "framer-motion";

export default function PublicCertificatePage() {
  const params = useParams();
  const router = useRouter();
  const public_id = params?.public_id as string;
  
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function loadCertificate() {
      if (!public_id) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const cert = await getCertificateByPublicId(public_id);
        
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
  }, [public_id]);

  // Export certificate to PDF
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

      let srcRaw = certificate.certificate_image_url || "";
      if (srcRaw && !/^https?:\/\//i.test(srcRaw) && !srcRaw.startsWith('/') && !srcRaw.startsWith('data:')) {
        srcRaw = `/${srcRaw}`;
      }
      const cacheBust = certificate.updated_at ? `?v=${new Date(certificate.updated_at).getTime()}` : '';
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

      const isPNG = blob.type.includes('png');
      const imgType = isPNG ? 'PNG' : 'JPEG';

      const imgBitmap = await createImageBitmap(blob);
      const imgW = imgBitmap.width;
      const imgH = imgBitmap.height;
      imgBitmap.close();

      const orientation = imgW >= imgH ? 'l' : 'p';
      const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();

      const margin = 8;
      const maxW = pageW - margin * 2;
      const maxH = pageH - margin * 2;
      const scale = Math.min(maxW / imgW, maxH / imgH);
      const drawW = imgW * scale;
      const drawH = imgH * scale;
      const x = (pageW - drawW) / 2;
      const y = (pageH - drawH) / 2;

      doc.addImage(dataUrl, imgType, x, y, drawW, drawH, undefined, 'FAST');
      const fileName = `${certificate.certificate_no || 'certificate'}.pdf`;
      doc.save(fileName);
      toast.success("PDF downloaded successfully");
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to export PDF");
    }
  }

  // Copy public link to clipboard
  async function copyPublicLink() {
    if (!certificate) return;
    
    // Use environment variable for production URL, fallback to window.location.origin
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                    (typeof window !== 'undefined' ? window.location.origin : '');
    const publicUrl = `${baseUrl}/cek/${certificate.public_id}`;

    try {
      if (navigator.clipboard) {
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
    const publicUrl = `${baseUrl}/cek/${certificate.public_id}`;

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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading certificate...</p>
        </div>
      </div>
    );
  }

  // Not found state
  if (notFound || !certificate) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
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
            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
          >
            Go to Home
          </Button>
        </motion.div>
      </div>
    );
  }

  // Success state - Display certificate
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex flex-col">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-md border-b border-gray-200 sticky top-0 z-[100] shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-xl">e</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">E-Certificate</h1>
                <p className="text-sm text-gray-500">Public Certificate View</p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => router.push('/')}
              className="hidden sm:flex"
            >
              Back to Home
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-8 md:py-12">
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
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
              {/* Left: Certificate Image */}
              <div className="p-6 bg-gray-50 flex items-center justify-center">
                {certificate.certificate_image_url ? (
                  <div className="relative w-full">
                    <Image
                      src={certificate.certificate_image_url}
                      alt="Certificate"
                      width={800}
                      height={600}
                      className="w-full h-auto rounded-lg border-2 border-gray-200 shadow-md"
                      priority
                    />
                  </div>
                ) : (
                  <div className="w-full h-64 flex items-center justify-center text-gray-400 border-2 border-dashed border-gray-300 rounded-lg">
                    <div className="text-center">
                      <FileText className="w-16 h-16 mx-auto mb-2" />
                      <p>No preview available</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Right: Certificate Details */}
              <div className="p-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-6">Certificate Details</h2>

                <div className="space-y-6">
                  {/* Certificate Number */}
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-500 mb-1">Certificate Number</p>
                      <p className="text-lg font-semibold text-gray-900">{certificate.certificate_no}</p>
                    </div>
                  </div>

                  {/* Recipient Name */}
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-500 mb-1">Recipient</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {certificate.members?.name || certificate.name}
                      </p>
                      {certificate.members?.organization && (
                        <p className="text-sm text-gray-600 mt-1 flex items-center">
                          <Building2 className="w-4 h-4 mr-1" />
                          {certificate.members.organization}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Category */}
                  {certificate.category && (
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Tag className="w-5 h-5 text-orange-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-500 mb-1">Category</p>
                        <p className="text-lg font-semibold text-gray-900">{certificate.category}</p>
                      </div>
                    </div>
                  )}

                  {/* Issue Date */}
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-500 mb-1">Issue Date</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {new Date(certificate.issue_date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Expiry Date */}
                  {certificate.expired_date && (
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Clock className="w-5 h-5 text-red-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-500 mb-1">Expiry Date</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {new Date(certificate.expired_date).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Description */}
                  {certificate.description && (
                    <div className="pt-4 border-t border-gray-200">
                      <p className="text-sm text-gray-500 mb-2">Description</p>
                      <p className="text-gray-700">{certificate.description}</p>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="mt-8 space-y-3">
                  <Button
                    onClick={exportToPDF}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700"
                    size="lg"
                  >
                    <Download className="w-5 h-5 mr-2" />
                    Download PDF
                  </Button>

                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      onClick={copyPublicLink}
                      variant="outline"
                      className="border-gray-300"
                    >
                      <Link2 className="w-4 h-4 mr-2" />
                      Copy Link
                    </Button>
                    <Button
                      onClick={shareCertificate}
                      variant="outline"
                      className="border-gray-300"
                    >
                      <Share2 className="w-4 h-4 mr-2" />
                      Share
                    </Button>
                  </div>
                </div>
              </div>
              </div>
            </div>

            {/* Footer Info */}
            <div className="mt-8 text-center text-sm text-gray-500">
              <p>This is an official certificate issued by E-Certificate Platform</p>
              <p className="mt-1">Certificate ID: {certificate.public_id}</p>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
