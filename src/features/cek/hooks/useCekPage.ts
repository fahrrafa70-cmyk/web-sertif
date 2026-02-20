"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { getCertificateByNumber, Certificate } from "@/lib/supabase/certificates";
import { supabaseClient } from "@/lib/supabase/client";

export function useCekPage() {
  const params = useParams();
  const router = useRouter();

  const rawCertParam = params?.certificate_no as string | string[] | undefined;
  const certificate_no = Array.isArray(rawCertParam) ? rawCertParam.join("/") : (rawCertParam || "");
  
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Detect expiration
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

  // Expired overlay URL
  const expiredOverlayUrl = useMemo(() => {
    try {
      const { data } = supabaseClient.storage.from("templates").getPublicUrl("expired.png");
      return data?.publicUrl || null;
    } catch {
      return null;
    }
  }, []);

  // Remove spacing on mount
  useEffect(() => {
    const bodyStyle = document.body.style;
    bodyStyle.setProperty('margin', '0', 'important');
    bodyStyle.setProperty('padding', '0', 'important');
    bodyStyle.setProperty('padding-top', '0', 'important');
    
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

  // Load certificate
  useEffect(() => {
    async function loadCertificate() {
      if (!certificate_no) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
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

  // Set document title dynamically
  useEffect(() => {
    const setTitle = (title: string) => {
      if (typeof document !== 'undefined') {
        document.title = title;
      }
    };
    
    let titleToSet = "Certificate Verification | Certify - Certificate Platform";
    if (certificate?.name) {
      titleToSet = `Certificate - ${certificate.name} | Certify - Certificate Platform`;
    } else if (loading) {
      titleToSet = "Loading Certificate | Certify - Certificate Platform";
    } else if (notFound) {
      titleToSet = "Certificate Not Found | Certify - Certificate Platform";
    }
    
    setTitle(titleToSet);
    const timeouts = [
      setTimeout(() => setTitle(titleToSet), 50),
      setTimeout(() => setTitle(titleToSet), 200),
      setTimeout(() => setTitle(titleToSet), 500)
    ];
    
    return () => timeouts.forEach(clearTimeout);
  }, [certificate, loading, notFound]);

  // Link actions
  const copyPublicLink = async () => {
    if (!certificate) return;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '');
    const publicUrl = `${baseUrl}/cek/${certificate.certificate_no}`;

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
  };

  const shareCertificate = async () => {
    if (!certificate) return;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '');
    const publicUrl = `${baseUrl}/cek/${certificate.certificate_no}`;
    const shareData = { title: `Certificate - ${certificate.certificate_no}`, text: `Certificate for ${certificate.name}`, url: publicUrl };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        toast.success("Shared successfully");
      } else {
        await copyPublicLink();
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('Error sharing:', err);
        toast.error('Failed to share');
      }
    }
  };

  // Export functions
  const exportToPDF = async () => {
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
        const src = localWithBust.startsWith('/') && typeof window !== 'undefined' ? `${window.location.origin}${localWithBust}` : localWithBust;
        
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

      const main = await fetchImage(certificate.certificate_image_url);
      const isPNG = main.mime.includes('png');
      const imgType = isPNG ? 'PNG' : 'JPEG';
      const orientation = main.dims.w >= main.dims.h ? 'l' : 'p';
      const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' });

      function addCenteredImage(dataUrl: string, dims: { w: number; h: number }) {
        const pageW = doc.internal.pageSize.getWidth();
        const pageH = doc.internal.pageSize.getHeight();
        const margin = 8;
        const scale = Math.min((pageW - margin * 2) / dims.w, (pageH - margin * 2) / dims.h);
        const drawW = dims.w * scale;
        const drawH = dims.h * scale;
        doc.addImage(dataUrl, imgType, (pageW - drawW) / 2, (pageH - drawH) / 2, drawW, drawH, undefined, 'FAST');
      }

      addCenteredImage(main.dataUrl, main.dims);

      if (certificate.score_image_url) {
        doc.addPage();
        const score = await fetchImage(certificate.score_image_url);
        addCenteredImage(score.dataUrl, score.dims);
      }

      doc.save(`${certificate.certificate_no || 'certificate'}-combined.pdf`);
      toast.success("PDF downloaded successfully");
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to export PDF");
    }
  };

  const exportToPNG = async () => {
    if (!certificate?.certificate_image_url) {
      toast.error("Certificate image not available");
      return;
    }
    const downloadPng = async (urlRaw: string, name: string) => {
      let srcRaw = urlRaw || "";
      if (srcRaw && !/^https?:\/\//i.test(srcRaw) && !srcRaw.startsWith('/') && !srcRaw.startsWith('data:')) {
        srcRaw = `/${srcRaw}`;
      }
      const cacheBust = certificate?.updated_at ? `?v=${new Date(certificate.updated_at).getTime()}` : '';
      const localWithBust = srcRaw.startsWith('/') ? `${srcRaw}${cacheBust}` : srcRaw;
      const src = localWithBust.startsWith('/') && typeof window !== 'undefined' ? `${window.location.origin}${localWithBust}` : localWithBust;
      
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
    };

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
  };

  return {
    certificate, loading, notFound, isExpired, expiredOverlayUrl,
    copyPublicLink, shareCertificate, exportToPDF, exportToPNG, router
  };
}
