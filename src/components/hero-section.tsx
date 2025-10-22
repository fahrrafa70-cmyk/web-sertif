"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { getCertificateByNumber, getCertificateByPublicId, Certificate } from "@/lib/supabase/certificates";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ArrowRight, Search, Download, ChevronDown, FileText, Link } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
 

export default function HeroSection() {
  const { t } = useLanguage();
  const [certificateId, setCertificateId] = useState("");
  const [searching, setSearching] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewCert, setPreviewCert] = useState<Certificate | null>(null);
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>("");
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [sendForm, setSendForm] = useState<{ email: string; subject: string; message: string }>({
    email: "",
    subject: "",
    message: "",
  });
  const [sendPreviewSrc, setSendPreviewSrc] = useState<string | null>(null);
  const [sendCert, setSendCert] = useState<Certificate | null>(null);

  // Export certificate to PDF
  async function exportToPDF(certificate: Certificate) {
    try {
      if (!certificate.certificate_image_url) {
        toast.error("Certificate image not available to export");
        return;
      }

      const mod = (await import("jspdf").catch(() => null)) as null | typeof import("jspdf");
      if (!mod || !("jsPDF" in mod)) {
        toast.error("PDF library missing. Please install 'jspdf' dependency.");
        console.error("jspdf not found. Run: npm i jspdf");
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
      toast.success("PDF exported");
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to export PDF");
    }
  }

  // Generate public certificate link using public_id
  async function generateCertificateLink(certificate: Certificate) {
    try {
      if (!certificate.public_id) {
        toast.error('Certificate does not have a public link ID');
        return;
      }

      // Use environment variable for production URL, fallback to window.location.origin
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                      (typeof window !== 'undefined' ? window.location.origin : '');
      const certificateLink = `${baseUrl}/cek/${certificate.public_id}`;
      
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(certificateLink);
        toast.success(`Public certificate link copied!\n${certificateLink}`);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = certificateLink;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        toast.success(`Public certificate link copied!\n${certificateLink}`);
      }
      
      console.log('Generated public certificate link:', certificateLink);
    } catch (err) {
      console.error('Failed to generate certificate link:', err);
      toast.error('Failed to generate certificate link');
    }
  }

  // Open modal to send certificate via email
  async function openSendEmailModal(certificate: Certificate) {
    try {
      if (!certificate.certificate_image_url) {
        toast.error("Certificate image not available");
        return;
      }

      const guessedEmail: string | undefined = certificate.members?.email;

      let srcRaw = certificate.certificate_image_url || "";
      if (srcRaw && !/^https?:\/\//i.test(srcRaw) && !srcRaw.startsWith('/') && !srcRaw.startsWith('data:')) {
        srcRaw = `/${srcRaw}`;
      }
      const src = srcRaw.startsWith('/') && typeof window !== 'undefined'
        ? `${window.location.origin}${srcRaw}`
        : srcRaw;
      setSendCert(certificate);
      setSendPreviewSrc(src);
      setSendForm({
        email: guessedEmail || "",
        subject: certificate.certificate_no ? `Certificate #${certificate.certificate_no}` : "Your Certificate",
        message: `Attached is your certificate${certificate.certificate_no ? ` (No: ${certificate.certificate_no})` : ''}.`,
      });
      setSendModalOpen(true);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Failed to prepare email');
    }
  }

  // Confirm and send from modal
  async function confirmSendEmail() {
    if (!sendCert || !sendPreviewSrc) return;
    const recipientEmail = (sendForm.email || '').trim();
    if (!recipientEmail) {
      toast.error('Recipient email is required');
      return;
    }
    try {
      const payload = {
        recipientEmail,
        recipientName: sendCert.name,
        imageUrl: sendPreviewSrc,
        certificateNo: sendCert.certificate_no,
        subject: (sendForm.subject || '').trim(),
        message: (sendForm.message || '').trim(),
      };
      const res = await fetch('/api/send-certificate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error || `Failed to send email (status ${res.status})`);
      }
      if (json.previewUrl) {
        toast.success('Email queued (dev preview opened in new tab)');
        try { window.open(json.previewUrl, '_blank'); } catch {}
      } else {
        toast.success('Email sent to recipient');
      }
      setSendModalOpen(false);
      setSendCert(null);
      setSendPreviewSrc(null);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Failed to send email');
    }
  }

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
    <section className="relative w-full flex-1 flex items-center justify-center bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center py-12 md:py-20">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-5xl mx-auto"
        >
          {/* Enhanced Main Title */}
          <motion.div variants={itemVariants} className="mb-5">
            <h1 className="text-6xl sm:text-7xl lg:text-8xl font-bold text-gradient mb-3 leading-tight">
              E-Certificate
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
                
                let cert: Certificate | null = null;
                
                try {
                  setSearching(true);
                  
                  // Check if input is a public link format: /cek/{public_id}
                  const publicLinkMatch = q.match(/(?:\/cek\/|cek\/)([a-f0-9-]{36})/i);
                  if (publicLinkMatch) {
                    const publicId = publicLinkMatch[1];
                    console.log('Searching by public_id:', publicId);
                    cert = await getCertificateByPublicId(publicId);
                  } 
                  // Check if input is old certificate link format: /certificate/CERT-XXX
                  else {
                    const oldLinkMatch = q.match(/(?:\/certificate\/|certificate\/)([A-Za-z0-9-_]+)/);
                    if (oldLinkMatch) {
                      q = oldLinkMatch[1];
                      console.log('Extracted certificate number from old link:', q);
                    }
                    // Search by certificate number
                    console.log('Searching by certificate_no:', q);
                    cert = await getCertificateByNumber(q);
                  }
                  
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
              className="flex items-center gap-2.5 bg-gray-50 rounded-2xl p-1.5 border border-gray-200 shadow-sm"
            >
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={certificateId}
                  onChange={(e) => setCertificateId(e.target.value)}
                  placeholder={t('hero.searchPlaceholder')}
                  className="h-10 pl-9 bg-transparent border-0 text-gray-900 placeholder:text-gray-400 focus-visible:ring-0 text-sm sm:text-base"
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
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="border-gray-300"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Export
                      <ChevronDown className="w-4 h-4 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => exportToPDF(previewCert!)}>
                      <FileText className="w-4 h-4 mr-2" />
                      Export as PDF
                    </DropdownMenuItem>
                    {previewCert!.certificate_image_url && (
                      <DropdownMenuItem onClick={() => openSendEmailModal(previewCert!)}>
                        <FileText className="w-4 h-4 mr-2" />
                        Send via Email
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => generateCertificateLink(previewCert!)}>
                      <Link className="w-4 h-4 mr-2" />
                      Generate Certificate Link
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
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
    {sendModalOpen && (
      <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4" onClick={() => setSendModalOpen(false)}>
        <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <div>
              <div className="text-lg font-semibold">Send Certificate via Email</div>
              <div className="text-sm text-gray-500">Configure email details</div>
            </div>
            <Button variant="outline" onClick={() => setSendModalOpen(false)}>Close</Button>
          </div>
          <div className="p-6 space-y-4">
            {sendPreviewSrc && (
              <div className="mb-4">
                <div className="text-sm text-gray-600 mb-2">Certificate Preview:</div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={sendPreviewSrc} alt="Certificate Preview" className="w-full h-auto rounded-lg border max-h-48 object-contain" />
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Recipient Email</label>
              <Input
                type="email"
                value={sendForm.email}
                onChange={(e) => setSendForm({ ...sendForm, email: e.target.value })}
                placeholder="recipient@example.com"
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Subject</label>
              <Input
                value={sendForm.subject}
                onChange={(e) => setSendForm({ ...sendForm, subject: e.target.value })}
                placeholder="Email subject"
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Message</label>
              <textarea
                value={sendForm.message}
                onChange={(e) => setSendForm({ ...sendForm, message: e.target.value })}
                placeholder="Email message"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setSendModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={confirmSendEmail} className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
                Send Email
              </Button>
            </div>
          </div>
        </div>
      </div>
    )}
  </>
  );
}
