"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { getCertificateByNumber, Certificate } from "@/lib/supabase/certificates";

export function useCertificateDetailPage() {
  const params = useParams();
  const router = useRouter();
  
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

  // Set document title dinamis robust berdasarkan certificate
  useEffect(() => {
    const setTitle = (title: string) => {
      if (typeof document !== 'undefined') {
        document.title = title;
      }
    };
    
    let titleToSet: string;
    if (certificate?.name && certificate?.certificate_no) {
      titleToSet = `${certificate.certificate_no} - ${certificate.name} | Certify - Certificate Platform`;
    } else if (certificate?.certificate_no) {
      titleToSet = `${certificate.certificate_no} | Certify - Certificate Platform`;
    } else if (loading) {
      titleToSet = "Loading Certificate | Certify - Certificate Platform";
    } else {
      titleToSet = "Certificate Not Found | Certify - Certificate Platform";
    }
    
    setTitle(titleToSet);
    
    const timeouts = [
      setTimeout(() => setTitle(titleToSet), 50),
      setTimeout(() => setTitle(titleToSet), 200),
      setTimeout(() => setTitle(titleToSet), 500)
    ];
    
    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, [certificate, loading]);

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

  return {
    certificate,
    certificateNo,
    loading,
    imagePreviewOpen,
    setImagePreviewOpen,
    router
  };
}
