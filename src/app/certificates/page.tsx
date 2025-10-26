"use client";

import Header from "@/components/header";
import Footer from "@/components/footer";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/contexts/language-context";
import { useCertificates } from "@/hooks/use-certificates";
import { Certificate, TextLayer as CertificateTextLayer } from "@/lib/supabase/certificates";
import { Eye, Edit, Trash2, FileText, Download, ChevronDown, Link, Image as ImageIcon } from "lucide-react";
import { toast, Toaster } from "sonner";
import {
  getTemplate,
  getTemplateImageUrl,
  Template,
} from "@/lib/supabase/templates";
import { getTemplateDefaults, TemplateDefaults, TextLayerDefault } from '@/lib/storage/template-defaults';
import Image from "next/image";
import { confirmToast } from "@/lib/ui/confirm";
import { Suspense } from "react";

function CertificatesContent() {
  const { t } = useLanguage();
  const params = useSearchParams();
  const certQuery = (params?.get("cert") || "").toLowerCase();
  const [role, setRole] = useState<"Admin" | "Team" | "Public">("Public");
  const [searchInput, setSearchInput] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  // Use certificates hook for Supabase integration
  const {
    certificates,
    loading,
    error,
    update,
    delete: deleteCert,
    refresh,
  } = useCertificates();

  // Send Email Modal state
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [sendFormErrors, setSendFormErrors] = useState<{ email?: string; subject?: string; message?: string }>({});
  const [sendForm, setSendForm] = useState<{ email: string; subject: string; message: string }>({
    email: "",
    subject: "",
    message: "",
  });
  const [sendPreviewSrc, setSendPreviewSrc] = useState<string | null>(null);
  const [sendCert, setSendCert] = useState<Certificate | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("ecert-role") || "";
      console.log("🔍 Checking role from localStorage:", raw);
      const normalized = raw.toLowerCase();
      const mapped = normalized === "admin" ? "Admin" : normalized === "team" ? "Team" : normalized === "public" ? "Public" : "Public";
      setRole(mapped);
      console.log("✅ Role set to:", mapped);
    } catch (error) {
      console.error("❌ Error reading role from localStorage:", error);
      setRole("Public");
    }
  }, []);

  // Auto-refresh certificates when page becomes visible (after returning from generate page)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log("🔄 Page became visible, refreshing certificates...");
        refresh();
      }
    };

    const handleFocus = () => {
      console.log("🔄 Window focused, refreshing certificates...");
      refresh();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [refresh]);

  // Export certificate to PDF using its generated image
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

      // Normalize URL (local relative -> absolute) similar to preview logic
      let srcRaw = certificate.certificate_image_url || "";
      if (srcRaw && !/^https?:\/\//i.test(srcRaw) && !srcRaw.startsWith('/') && !srcRaw.startsWith('data:')) {
        srcRaw = `/${srcRaw}`;
      }
      const cacheBust = certificate.updated_at ? `?v=${new Date(certificate.updated_at).getTime()}` : '';
      const localWithBust = srcRaw.startsWith('/') ? `${srcRaw}${cacheBust}` : srcRaw;
      const src = localWithBust.startsWith('/') && typeof window !== 'undefined'
        ? `${window.location.origin}${localWithBust}`
        : localWithBust;

      // Fetch image as blob to avoid CORS addImage issues
      const resp = await fetch(src);
      if (!resp.ok) throw new Error(`Failed to fetch image: ${resp.status}`);
      const blob = await resp.blob();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      // Create PDF sized to A4, fit image preserving aspect ratio
      const isPNG = blob.type.includes('png');
      const imgType = isPNG ? 'PNG' : 'JPEG';

      const imgBitmap = await createImageBitmap(blob);
      const imgW = imgBitmap.width;
      const imgH = imgBitmap.height;
      imgBitmap.close();

      // Decide orientation based on image
      const orientation = imgW >= imgH ? 'l' : 'p';
      const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();

      // Fit image into page while preserving aspect ratio with small margin
      const margin = 8; // mm
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

  // Export certificate to PNG
  async function exportToPNG(certificate: Certificate) {
    try {
      if (!certificate.certificate_image_url) {
        toast.error("Certificate image not available to export");
        return;
      }

      // Normalize URL (local relative -> absolute) similar to PDF logic
      let srcRaw = certificate.certificate_image_url || "";
      if (srcRaw && !/^https?:\/\//i.test(srcRaw) && !srcRaw.startsWith('/') && !srcRaw.startsWith('data:')) {
        srcRaw = `/${srcRaw}`;
      }
      const cacheBust = certificate.updated_at ? `?v=${new Date(certificate.updated_at).getTime()}` : '';
      const localWithBust = srcRaw.startsWith('/') ? `${srcRaw}${cacheBust}` : srcRaw;
      const src = localWithBust.startsWith('/') && typeof window !== 'undefined'
        ? `${window.location.origin}${localWithBust}`
        : localWithBust;

      // Fetch image as blob
      const resp = await fetch(src);
      if (!resp.ok) throw new Error(`Failed to fetch image: ${resp.status}`);
      const blob = await resp.blob();

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${certificate.certificate_no || 'certificate'}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("PNG downloaded successfully");
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to export PNG");
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
      
      // Copy to clipboard
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(certificateLink);
        toast.success(`Public certificate link copied!\n${certificateLink}`);
      } else {
        // Fallback for older browsers
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

      // Normalize image URL (local public path -> absolute), similar to preview
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
        email: "",
        subject: certificate.certificate_no ? `Certificate #${certificate.certificate_no}` : "Your Certificate",
        message: 
        `Certificate Information:

• Certificate Number: ${certificate.certificate_no || "N/A"}
• Recipient Name: ${certificate.name || "N/A"}
• Issue Date: ${new Date(certificate.issue_date).toLocaleDateString()}${certificate.expired_date ? `
• Expiry Date: ${new Date(certificate.expired_date).toLocaleDateString()}` : ""}${certificate.category ? `
• Category: ${certificate.category}` : ""}`,
      });
      setSendModalOpen(true);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Failed to prepare email');
    }
  }

  // Confirm and send from modal
  async function confirmSendEmail() {
    if (!sendCert || !sendPreviewSrc || isSendingEmail) return;
    
    // Clear previous errors
    setSendFormErrors({});
    
    // Validate fields
    const errors: { email?: string; subject?: string; message?: string } = {};
    const recipientEmail = (sendForm.email || '').trim();
    
    if (!recipientEmail) {
      errors.email = 'Recipient email is required';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(recipientEmail)) {
        errors.email = 'Please enter a valid email address';
      }
    }
    
    if (!sendForm.subject.trim()) {
      errors.subject = 'Subject is required';
    }
    
    if (!sendForm.message.trim()) {
      errors.message = 'Message is required';
    }
    
    // If there are errors, show them and return
    if (Object.keys(errors).length > 0) {
      setSendFormErrors(errors);
      return;
    }
    
    setIsSendingEmail(true);
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
        // More specific error messages
        if (res.status === 400) {
          throw new Error('Invalid email address or missing required fields');
        } else if (res.status === 404) {
          throw new Error('Email service not available');
        } else if (res.status === 500) {
          throw new Error('Server error. Please try again later');
        }
        throw new Error(json?.error || `Failed to send email (status ${res.status})`);
      }
      if (json.previewUrl) {
        toast.success('Email queued successfully! Preview opened in new tab');
        try { window.open(json.previewUrl, '_blank'); } catch {}
      } else {
        toast.success(`Email sent successfully to ${recipientEmail}`);
      }
      setSendModalOpen(false);
      setSendCert(null);
      setSendPreviewSrc(null);
      setSendForm({ email: '', subject: '', message: '' });
    } catch (err) {
      console.error('Email send error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to send email. Please try again.');
    } finally {
      setIsSendingEmail(false);
    }
  }

  const filtered = useMemo(() => {
    let filteredCerts = certificates;

    // Search filter
    const searchQuery = (searchInput || certQuery).toLowerCase();
    if (searchQuery) {
      filteredCerts = filteredCerts.filter(
        (cert) =>
          cert.certificate_no.toLowerCase().includes(searchQuery) ||
          cert.name.toLowerCase().includes(searchQuery) ||
          (cert.description &&
            cert.description.toLowerCase().includes(searchQuery)),
      );
    }

    // Category filter
    if (categoryFilter) {
      filteredCerts = filteredCerts.filter(
        (cert) => cert.category === categoryFilter,
      );
    }

    // Date filter
    if (dateFilter) {
      filteredCerts = filteredCerts.filter(
        (cert) => cert.issue_date === dateFilter,
      );
    }

    return filteredCerts;
  }, [certificates, searchInput, certQuery, categoryFilter, dateFilter]);

  const [isEditOpen, setIsEditOpen] = useState<null | string>(null);
  const [draft, setDraft] = useState<Certificate | null>(null);
  const [previewCertificate, setPreviewCertificate] =
    useState<Certificate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [previewMode, setPreviewMode] = useState<'certificate' | 'score' | 'combined'>('certificate');
  const [scoreDefaults, setScoreDefaults] = useState<TemplateDefaults | null>(null);
  const [deletingCertificateId, setDeletingCertificateId] = useState<
    string | null
  >(null);
  const canDelete = role === "Admin"; // Only Admin can delete
  
  // State for template image dimensions
  const [templateImageDimensions, setTemplateImageDimensions] = useState<{
    width: number;
    height: number;
    aspectRatio: number;
  } | null>(null);

  // Standard canvas dimensions used in generation (must match generator)
  const STANDARD_CANVAS_WIDTH = 800;
  const STANDARD_CANVAS_HEIGHT = 600;

  // Ref for preview container to calculate actual dimensions
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [containerDimensions, setContainerDimensions] = useState<{ width: number; height: number } | null>(null);

  // Update container dimensions when it changes
  useEffect(() => {
    const updateDimensions = () => {
      if (previewContainerRef.current) {
        const rect = previewContainerRef.current.getBoundingClientRect();
        const dimensions = { width: rect.width, height: rect.height };
        setContainerDimensions(dimensions);
      }
    };

    // Initial update with multiple attempts
    updateDimensions();
    const timeout1 = setTimeout(updateDimensions, 50);
    const timeout2 = setTimeout(updateDimensions, 200);
    
    // Update on window resize
    window.addEventListener('resize', updateDimensions);
    
    // Use ResizeObserver for more accurate tracking
    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });
    
    if (previewContainerRef.current) {
      resizeObserver.observe(previewContainerRef.current);
    }
    
    return () => {
      clearTimeout(timeout1);
      clearTimeout(timeout2);
      window.removeEventListener('resize', updateDimensions);
      resizeObserver.disconnect();
    };
  }, [previewMode, previewCertificate]);

  // Handler untuk mendapatkan dimensi gambar template
  const handleTemplateImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const naturalWidth = img.naturalWidth;
    const naturalHeight = img.naturalHeight;
    
    console.log('Loading template image in certificates preview:', { 
      naturalWidth, 
      naturalHeight, 
      aspectRatio: naturalWidth / naturalHeight,
      previewMode,
      isScoreMode: previewMode === 'score',
      templateHasScore: previewTemplate?.score_image_url
    });
    
    setTemplateImageDimensions({
      width: naturalWidth,
      height: naturalHeight,
      aspectRatio: naturalWidth / naturalHeight
    });
  }, [previewMode, previewTemplate]);

  // Function to calculate consistent dimensions for text scaling
  const getConsistentDimensions = useMemo(() => {
    if (!previewTemplate) return { width: 800, height: 600, scale: 1 };
    
    // Use the same logic as template generator
    const maxWidth = 800; // Maksimal lebar container
    const maxHeight = 600; // Maksimal tinggi container
    
    // For score mode, always use STANDARD canvas dimensions (800x600)
    // Score images are generated at exactly 800x600, regardless of template image size
    if (previewMode === 'score') {
      const scaleX = maxWidth / STANDARD_CANVAS_WIDTH; // 800/800 = 1
      const scaleY = maxHeight / STANDARD_CANVAS_HEIGHT; // 600/600 = 1
      const scale = Math.min(scaleX, scaleY); // Should be 1
      
      return {
        width: STANDARD_CANVAS_WIDTH,
        height: STANDARD_CANVAS_HEIGHT,
        scale: scale
      };
    }
    
    // For certificate mode, calculate scale based on actual template image dimensions
    if (templateImageDimensions) {
      const scaleX = maxWidth / templateImageDimensions.width;
      const scaleY = maxHeight / templateImageDimensions.height;
      const scale = Math.min(scaleX, scaleY);
      
      return {
        width: templateImageDimensions.width * scale,
        height: templateImageDimensions.height * scale,
        scale: scale
      };
    }
    
    // Fallback to default scale if dimensions not available
    return {
      width: 800,
      height: 600,
      scale: 1
    };
  }, [previewTemplate, templateImageDimensions, previewMode]);
  
  // Disable any emergency override for production
  const forceCanDelete = false;
  
  // Debug logging
  console.log("🔍 Certificates Page Debug:", {
    role,
    canDelete,
    forceCanDelete,
    localStorageRole:
      typeof window !== "undefined" ? window.localStorage.getItem("ecert-role") : null,
    certificatesCount: certificates.length,
    deletingCertificateId
  });

  function openEdit(certificate: Certificate) {
    setDraft({ ...certificate });
    setIsEditOpen(certificate.id);
  }

  async function submitEdit() {
    if (!draft || !isEditOpen) return;

    try {
      await update(isEditOpen, {
        certificate_no: draft.certificate_no,
        name: draft.name,
        description: draft.description || undefined,
        issue_date: draft.issue_date,
        expired_date: draft.expired_date || undefined,
        category: draft.category || undefined,
      });

      toast.success("Certificate updated successfully!");
      setIsEditOpen(null);
      setDraft(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update certificate",
      );
    }
  }

  async function requestDelete(id: string) {
    console.log("🗑️ Delete request initiated:", { 
      id, 
      role, 
      canDelete,
      localStorageRole:
        typeof window !== "undefined" ? window.localStorage.getItem("ecert-role") : null,
      timestamp: new Date().toISOString()
    });
    
    if (!canDelete && !forceCanDelete) {
      console.log("❌ Delete blocked: User doesn't have permission", {
        role,
        canDelete,
        forceCanDelete,
        localStorageRole:
          typeof window !== "undefined" ? window.localStorage.getItem("ecert-role") : null
      });
      toast.error("You don't have permission to delete certificates");
      return;
    }

    const certificate = certificates.find((c) => c.id === id);
    const certificateName = certificate?.name || "this certificate";

    console.log("📋 Certificate to delete:", {
      id,
      name: certificateName,
      certificate_no: certificate?.certificate_no
    });

    const confirmed = await confirmToast(
      `Are you sure you want to delete certificate for "${certificateName}"?\n\nCertificate Number: ${certificate?.certificate_no}\n\nThis action cannot be undone.`,
      { confirmText: "Delete", tone: "destructive" }
    );

    if (confirmed) {
      try {
        console.log("✅ User confirmed deletion, starting delete process...");
        setDeletingCertificateId(id);
        await deleteCert(id);
        console.log("✅ Delete successful!");
        toast.success(
          `Certificate for "${certificateName}" deleted successfully!`,
        );
      } catch (error) {
        console.error("❌ Delete error:", error);
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to delete certificate. Please try again.",
        );
      } finally {
        setDeletingCertificateId(null);
      }
    } else {
      console.log("❌ User cancelled deletion");
    }
  }

  async function openPreview(certificate: Certificate) {
    setPreviewCertificate(certificate);
    setPreviewMode('certificate');

    // Load template if available
    if (certificate.template_id) {
      try {
        const template = await getTemplate(certificate.template_id);
        setPreviewTemplate(template);
            // load score defaults from localStorage if available
            try {
              const defaults = template ? getTemplateDefaults(`${template.id}_score`) : null;
              setScoreDefaults(defaults);
            } catch (err) {
              console.warn('Failed to load score defaults', err);
              setScoreDefaults(null);
            }
      } catch (error) {
        console.error("Failed to load template:", error);
        setPreviewTemplate(null);
      }
    } else {
      setPreviewTemplate(null);
    }
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-16">
        <section className="bg-white py-14">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {t("certificates.title")}
                </h1>
                <p className="text-gray-500 mt-1">
                  {t("certificates.subtitle")}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Input
                  placeholder={t("certificates.search")}
                  className="w-64"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-48 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">{t('templates.allCategories')}</option>
                  <option value="MoU">MoU</option>
                  <option value="Magang">Magang</option>
                  <option value="Pelatihan">Pelatihan</option>
                  <option value="Kunjungan Industri">Kunjungan Industri</option>
                  <option value="Sertifikat">Sertifikat</option>
                  <option value="Surat">Surat</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
                <Input
                  placeholder="Filter by date"
                  className="w-40"
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                />
              </div>
            </div>

            {/* Loading State */}
            {loading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-16"
              >
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                  <FileText className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-600 mb-2">
                  Loading certificates...
                </h3>
                <p className="text-gray-500">
                  Please wait while we fetch your certificates.
                </p>
              </motion.div>
            )}

            {/* Error State */}
            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-16"
              >
                <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <FileText className="w-12 h-12 text-red-400" />
                </div>
                <h3 className="text-xl font-semibold text-red-600 mb-2">
                  Error loading certificates
                </h3>
                <p className="text-red-500 mb-6">{error}</p>
                <Button
                  onClick={() => refresh()}
                  className="gradient-primary text-white shadow-lg hover:shadow-xl"
                >
                  Try Again
                </Button>
              </motion.div>
            )}

            {/* Certificates Table */}
            {!loading && !error && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4 }}
                className="mt-8 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden"
              >
                <Table>
                  
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("certificates.certificateId")}</TableHead>
                      <TableHead>{t("certificates.recipient")}</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>{t("certificates.issuedDate")}</TableHead>
                      <TableHead>Expiry Date</TableHead>
                      <TableHead className="text-right">
                        {t("certificates.actions")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((certificate) => (
                      <TableRow key={certificate.id}>
                        <TableCell className="font-medium">
                          {certificate.certificate_no}
                        </TableCell>
                        <TableCell>{certificate.name}</TableCell>
                        <TableCell>{certificate.category || "—"}</TableCell>
                        <TableCell>
                          {new Date(
                            certificate.issue_date,
                          ).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {certificate.expired_date
                            ? new Date(
                                certificate.expired_date,
                              ).toLocaleDateString()
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              className="border-gray-300"
                              onClick={() => openPreview(certificate)}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              {t("common.preview")}
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
                                <DropdownMenuItem onClick={() => exportToPDF(certificate)}>
                                  <FileText className="w-4 h-4 mr-2" />
                                  Export as PDF
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => exportToPNG(certificate)}>
                                  <ImageIcon className="w-4 h-4 mr-2" />
                                  Download PNG
                                </DropdownMenuItem>
                                {certificate.certificate_image_url && (
                                  <DropdownMenuItem onClick={() => openSendEmailModal(certificate)}>
                                    <FileText className="w-4 h-4 mr-2" />
                                    Send via Email
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => generateCertificateLink(certificate)}>
                                  <Link className="w-4 h-4 mr-2" />
                                  Generate Certificate Link
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                            {(role === "Admin" || role === "Team") && (
                              <Button
                                variant="outline"
                                className="border-gray-300"
                                onClick={() => openEdit(certificate)}
                              >
                                <Edit className="w-4 h-4 mr-1" />
                                {t("common.edit")}
                              </Button>
                            )}
                            {canDelete && (
                              <button
                                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-4 py-2 shadow-sm hover:shadow-md"
                                onClick={() => requestDelete(certificate.id)}
                                disabled={deletingCertificateId === certificate.id}
                                style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                              >
                                {deletingCertificateId === certificate.id ? (
                                  <>
                                    <div className="w-4 h-4 mr-1 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Deleting...
                                  </>
                                ) : (
                                  <>
                                    <Trash2 className="w-4 h-4 mr-1" />
                                    {t("common.delete")}
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </motion.div>
            )}

            {/* Empty State */}
            {!loading && !error && filtered.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-16"
              >
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <FileText className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-600 mb-2">
                  No certificates found
                </h3>
                <p className="text-gray-500 mb-6">
                  Try adjusting your search criteria or create a new
                  certificate.
                </p>
                {(role === "Admin" || role === "Team") && (
                  <Button
                    onClick={() => (window.location.href = "/templates")}
                    className="gradient-primary text-white shadow-lg hover:shadow-xl"
                  >
                    <FileText className="w-5 h-5 mr-2" />
                    Create Certificate
                  </Button>
                )}
              </motion.div>
            )}
          </div>
        </section>
      </main>
      <Footer />

      {/* Edit Certificate Sheet */}
      <Sheet
        open={!!isEditOpen}
        onOpenChange={(o) => setIsEditOpen(o ? isEditOpen : null)}
      >
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>
              {t("common.edit")} {t("certificates.title")}
            </SheetTitle>
            <SheetDescription>Update certificate details.</SheetDescription>
          </SheetHeader>
          <div className="p-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-gray-600">
                Certificate Number
              </label>
              <Input
                value={draft?.certificate_no ?? ""}
                onChange={(e) =>
                  setDraft((d) =>
                    d ? { ...d, certificate_no: e.target.value } : d,
                  )
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-600">
                {t("certificates.recipient")}
              </label>
              <Input
                value={draft?.name ?? ""}
                onChange={(e) =>
                  setDraft((d) => (d ? { ...d, name: e.target.value } : d))
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-600">Description</label>
              <textarea
                value={draft?.description ?? ""}
                onChange={(e) =>
                  setDraft((d) =>
                    d ? { ...d, description: e.target.value } : d,
                  )
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-600">Category</label>
              <select
                value={draft?.category ?? ""}
                onChange={(e) =>
                  setDraft((d) => (d ? { ...d, category: e.target.value } : d))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select category</option>
                <option value="MoU">MoU</option>
                <option value="Magang">Magang</option>
                <option value="Pelatihan">Pelatihan</option>
                <option value="Kunjungan Industri">Kunjungan Industri</option>
                <option value="Sertifikat">Sertifikat</option>
                <option value="Surat">Surat</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-600">
                {t("certificates.issuedDate")}
              </label>
              <Input
                type="date"
                value={draft?.issue_date ?? ""}
                onChange={(e) =>
                  setDraft((d) =>
                    d ? { ...d, issue_date: e.target.value } : d,
                  )
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-600">Expiry Date</label>
              <Input
                type="date"
                value={draft?.expired_date ?? ""}
                onChange={(e) =>
                  setDraft((d) =>
                    d ? { ...d, expired_date: e.target.value } : d,
                  )
                }
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                className="border-gray-300"
                onClick={() => setIsEditOpen(null)}
              >
                {t("common.cancel")}
              </Button>
              <Button
                className="bg-gradient-to-r from-orange-500 to-red-500 text-white"
                onClick={submitEdit}
              >
                {t("common.save")}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Certificate Preview Modal */}
      <Dialog
        open={!!previewCertificate}
        onOpenChange={(o) =>
          setPreviewCertificate(o ? previewCertificate : null)
        }
      >
        <DialogContent 
          className="preview-modal-content max-w-4xl w-full max-h-[90vh] overflow-y-auto"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              setPreviewCertificate(null);
            }
          }}
        >
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gradient">
              Certificate Preview
            </DialogTitle>
            <DialogDescription className="text-lg">
              View certificate details and information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-8">
            {previewCertificate && (
              <>
                {/* Certificate Info */}
                <motion.div
                  className="grid grid-cols-1 lg:grid-cols-2 gap-8"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <div className="space-y-6">
                    <motion.div
                      className="space-y-3"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: 0.1 }}
                    >
                      <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                        Certificate Number
                      </label>
                      <div className="text-2xl font-bold text-gray-900">
                        {previewCertificate.certificate_no}
                      </div>
                    </motion.div>

                    <motion.div
                      className="space-y-3"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: 0.2 }}
                    >
                      <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                        Recipient Name
                      </label>
                      <div className="text-2xl font-bold text-gray-900">
                        {previewCertificate.name}
                      </div>
                    </motion.div>

                    {previewCertificate.category && (
                      <motion.div
                        className="space-y-3"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4, delay: 0.3 }}
                      >
                        <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                          Category
                        </label>
                        <div className="inline-block px-4 py-2 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium">
                          {previewCertificate.category}
                        </div>
                      </motion.div>
                    )}

                    {previewCertificate.description && (
                      <motion.div
                        className="space-y-3"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4, delay: 0.4 }}
                      >
                        <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                          Description
                        </label>
                        <div className="text-gray-700 leading-relaxed">
                          {previewCertificate.description}
                        </div>
                      </motion.div>
                    )}

                    <motion.div
                      className="grid grid-cols-2 gap-4"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: 0.5 }}
                    >
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                          Issue Date
                        </label>
                        <div className="text-lg text-gray-700">
                          {new Date(
                            previewCertificate.issue_date,
                          ).toLocaleDateString()}
                        </div>
                      </div>
                      {previewCertificate.expired_date && (
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                            Expiry Date
                          </label>
                          <div className="text-lg text-gray-700">
                            {new Date(
                              previewCertificate.expired_date,
                            ).toLocaleDateString()}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  </div>

                  {/* Certificate / Score Preview */}
                  <motion.div
                    className="space-y-4"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                  >
                    <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                      Certificate Preview
                    </label>
                    {/* Toggle for dual templates - only show if score image exists */}
                    {previewTemplate && (previewTemplate.is_dual_template) && previewCertificate?.score_image_url && (
                      <div className="flex gap-2 mb-2">
                        <button
                          onClick={() => setPreviewMode('certificate')}
                          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${previewMode === 'certificate' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                        >
                          Certificate
                        </button>
                        <button
                          onClick={() => setPreviewMode('score')}
                          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${previewMode === 'score' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                        >
                          Score
                        </button>
                      </div>
                    )}
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border-2 border-dashed border-blue-200">
                      <div
                        ref={previewContainerRef}
                        className="bg-white rounded-xl shadow-xl relative"
                        style={{
                          width: "100%",
                          maxWidth: "100%",
                          aspectRatio: "800 / 600",
                          minHeight: 300,
                        }}
                      >
                        {/* FIX: Show merged certificate or score image with consistent aspect ratio */}
                        {(() => {
                          const hasGeneratedImage = (previewMode === 'certificate' && previewCertificate?.certificate_image_url) || 
                                                     (previewMode === 'score' && previewCertificate?.score_image_url);
                          console.log('Preview render decision:', {
                            previewMode,
                            hasCertImage: !!previewCertificate?.certificate_image_url,
                            hasScoreImage: !!previewCertificate?.score_image_url,
                            hasGeneratedImage
                          });
                          return hasGeneratedImage;
                        })() ? (
                          (() => {
                            let srcRaw = previewMode === 'score' ? (previewCertificate?.score_image_url || '') : (previewCertificate.certificate_image_url || "");
                            // Normalize local relative path like "generate/file.png" => "/generate/file.png"
                            if (srcRaw && !/^https?:\/\//i.test(srcRaw) && !srcRaw.startsWith('/') && !srcRaw.startsWith('data:')) {
                              srcRaw = `/${srcRaw}`;
                            }
                            const cacheBust = previewCertificate?.updated_at
                              ? `?v=${new Date(previewCertificate.updated_at).getTime()}`
                              : '';
                            // Only append cache bust for local public paths. Do NOT append for data URLs.
                            const localWithBust = srcRaw.startsWith('/')
                              ? `${srcRaw}${cacheBust}`
                              : srcRaw;
                            // Build absolute URL for local paths in the browser
                            const src = localWithBust.startsWith('/') && typeof window !== 'undefined'
                              ? `${window.location.origin}${localWithBust}`
                              : localWithBust;

                            // Use Next.js Image for all cases. For remote/data URLs, disable optimization.
                              const isRemote = /^https?:\/\//i.test(srcRaw);
                            const isData = srcRaw.startsWith('data:');
                            return (
                              <Image
                                src={src}
                                alt={previewMode === 'score' ? "Score" : "Certificate"}
                                fill
                                sizes="100vw"
                                className="object-contain absolute inset-0"
                                style={{ objectFit: 'contain' }}
                                onError={() => {
                                  console.warn('Preview image failed to load', src);
                                }}
                                priority
                                unoptimized={isRemote || isData}
                              />
                            );
                          })()
                        ) : (
                          <>
                            {/* FIX: Template Image with consistent aspect ratio */}
                            {previewMode === 'score' && previewTemplate && previewTemplate.score_image_url ? (
                              <Image
                                src={previewTemplate.score_image_url}
                                alt="Score Template"
                                fill
                                className="object-contain absolute inset-0"
                                onLoad={handleTemplateImageLoad}
                              />
                            ) : previewTemplate && getTemplateImageUrl(previewTemplate) ? (
                              <Image
                                src={getTemplateImageUrl(previewTemplate)!}
                                alt="Certificate Template"
                                fill
                                className="object-contain absolute inset-0"
                                onLoad={handleTemplateImageLoad}
                              />
                            ) : (
                              <>
                                {/* Decorative Corners */}
                                <div className="absolute top-0 left-0 w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-br-2xl"></div>
                                <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-yellow-400 to-orange-500 rounded-bl-2xl"></div>
                                <div className="absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-tr from-yellow-400 to-orange-500 rounded-tr-2xl"></div>
                                <div className="absolute bottom-0 right-0 w-16 h-16 bg-gradient-to-tl from-yellow-400 to-orange-500 rounded-tl-2xl"></div>
                              </>
                            )}

                            {/* FIX: Text Layers with consistent positioning using normalized coordinates */}
                            {previewMode === 'certificate' && previewCertificate.text_layers &&
                              previewCertificate.text_layers.map(
                                (layer: CertificateTextLayer) => {
                                  const actualX = layer.xPercent * 100 + "%";
                                  const actualY = layer.yPercent * 100 + "%";
                                  
                                  // Apply consistent scaling to match template generator
                                  // Use the same scale factor that would be applied in the template generator
                                  const scaledFontSize = layer.fontSize * (getConsistentDimensions.scale || 1);

                                  return (
                                    <div
                                      key={layer.id}
                                      className="absolute select-none"
                                      style={{
                                        left: actualX,
                                        top: actualY,
                                        fontSize: scaledFontSize,
                                        color: layer.color,
                                        fontWeight: layer.fontWeight,
                                        fontFamily: layer.fontFamily,
                                        userSelect: "none",
                                        pointerEvents: "none",
                                        transform: "translate(-50%, -50%)",
                                      }}
                                    >
                                      {layer.text}
                                    </div>
                                  );
                                },
                              )}

                            {previewMode === 'score' && scoreDefaults && scoreDefaults.textLayers && scoreDefaults.textLayers.map((layer: TextLayerDefault) => {
                              const actualX = (typeof layer.xPercent === 'number' ? layer.xPercent : (layer.xPercent || 0)) * 100 + "%";
                              const actualY = (typeof layer.yPercent === 'number' ? layer.yPercent : (layer.yPercent || 0)) * 100 + "%";
                              // Decide content: try to map known IDs to certificate data, otherwise show placeholder id
                              let content = '';
                              if (layer.id === 'pembina_nama') content = previewCertificate.members?.name || previewCertificate.created_by || '';
                              else if (layer.id === 'score_date') content = previewCertificate.issue_date ? new Date(previewCertificate.issue_date).toLocaleDateString() : '';
                              else if (layer.id === 'nilai_prestasi') content = '';
                              else content = layer.id.replace(/_/g, ' ');

                              // IMPORTANT: Preview scale calculation for score text overlay
                              // Generator uses 800x600 canvas with pixel-based fontSize
                              // Preview needs to match this, so scale fontSize based on container width
                              // Example: fontSize 50 at 800px should appear as fontSize 25 at 400px container
                              
                              const containerWidth = containerDimensions?.width || 800;
                              const scoreScale = containerWidth / STANDARD_CANVAS_WIDTH;
                              
                              // Only log for first layer to avoid console spam
                              if (layer.id === scoreDefaults.textLayers[0]?.id) {
                                console.log('🔍 Score overlay scale:', {
                                  containerWidth,
                                  standardWidth: STANDARD_CANVAS_WIDTH,
                                  scale: scoreScale,
                                  fontSize: layer.fontSize,
                                  scaledFontSize: layer.fontSize * scoreScale
                                });
                              }

                              // Apply scale to fontSize for proper proportional scaling
                              const finalFontSize = layer.fontSize * scoreScale;
                              
                              return (
                                <div
                                  key={layer.id}
                                  className="absolute select-none"
                                  style={{
                                    left: actualX,
                                    top: actualY,
                                    fontSize: `${finalFontSize}px`,
                                    color: layer.color,
                                    fontWeight: layer.fontWeight,
                                    fontFamily: layer.fontFamily,
                                    userSelect: "none",
                                    pointerEvents: "none",
                                    transform: "translate(-50%, -50%)",
                                  }}
                                >
                                  {content}
                                </div>
                              );
                            })}

                            {/* Fallback Certificate Content - Only show if no text layers */}
                            {(!previewCertificate.text_layers ||
                              previewCertificate.text_layers.length === 0) && (
                              <div className="relative z-10 text-center p-6 xl:p-10">
                                <div className="mb-4 xl:mb-6">
                                  <h3 className="text-2xl xl:text-3xl font-bold text-gray-800 mb-2">
                                    CERTIFICATE
                                  </h3>
                                  <div className="w-16 xl:w-20 h-1 bg-gradient-to-r from-blue-500 to-blue-600 mx-auto rounded-full"></div>
                                </div>

                                <p className="text-gray-600 mb-3 xl:mb-4">
                                  This is to certify that
                                </p>
                                <h4 className="text-xl xl:text-2xl font-bold text-gray-800 mb-3 xl:mb-4">
                                  {previewCertificate.name}
                                </h4>
                                {previewCertificate.description && (
                                  <p className="text-gray-600 mb-6">
                                    has successfully completed the
                                    <br />
                                    <span className="font-semibold">
                                      {previewCertificate.description}
                                    </span>
                                  </p>
                                )}

                                <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-6">
                                  <div>
                                    <p className="font-semibold">
                                      Certificate No:
                                    </p>
                                    <p>{previewCertificate.certificate_no}</p>
                                  </div>
                                  <div>
                                    <p className="font-semibold">Issue Date:</p>
                                    <p>
                                      {new Date(
                                        previewCertificate.issue_date,
                                      ).toLocaleDateString()}
                                    </p>
                                  </div>
                                  {previewCertificate.expired_date && (
                                    <div>
                                      <p className="font-semibold">
                                        Expiry Date:
                                      </p>
                                      <p>
                                        {new Date(
                                          previewCertificate.expired_date,
                                        ).toLocaleDateString()}
                                      </p>
                                    </div>
                                  )}
                                </div>

                                {/* QR Code Placeholder */}
                                <div className="w-16 h-16 bg-gray-200 rounded-lg mx-auto mb-4 flex items-center justify-center">
                                  <div className="w-12 h-12 bg-gray-300 rounded grid grid-cols-3 gap-1 p-1">
                                    {[...Array(9)].map((_, i) => (
                                      <div
                                        key={i}
                                        className="bg-gray-600 rounded-sm"
                                      ></div>
                                    ))}
                                  </div>
                                </div>

                                <p className="text-xs text-gray-500">
                                  Verify at: e-certificate.my.id/verify
                                </p>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </motion.div>
                </motion.div>

                {/* Action Buttons */}
                <motion.div
                  className="flex justify-between gap-4 pt-6 border-t border-gray-200"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.6 }}
                >
                  <div className="flex gap-2">
                    {(canDelete || forceCanDelete) && previewCertificate && (
                      <button
                        className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-4 py-2 shadow-sm hover:shadow-md disabled:pointer-events-none disabled:opacity-50"
                        onClick={() => {
                          setPreviewCertificate(null);
                          requestDelete(previewCertificate.id);
                        }}
                        disabled={deletingCertificateId === previewCertificate.id}
                        style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                      >
                        {deletingCertificateId === previewCertificate.id ? (
                          <>
                            <div className="w-4 h-4 mr-1 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Deleting...
                          </>
                        ) : (
                          <>
                            <Trash2 className="w-4 h-4 mr-1" />
                            Delete Certificate
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="border-gray-300 hover:border-gray-400 px-6"
                      onClick={() => setPreviewCertificate(null)}
                    >
                      Close
                    </Button>
                    {(role === "Admin" || role === "Team") && (
                      <Button
                        variant="outline"
                        className="border-blue-300 text-blue-600 hover:bg-blue-50 px-6"
                        onClick={() => {
                          setPreviewCertificate(null);
                          openEdit(previewCertificate);
                        }}
                      >
                        Edit Certificate
                      </Button>
                    )}
                  </div>
                </motion.div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Send Certificate Email Modal */}
      <Dialog open={sendModalOpen} onOpenChange={setSendModalOpen}>
        <DialogContent 
          className="max-w-xl w-full"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && e.target instanceof HTMLInputElement) {
              e.preventDefault();
              confirmSendEmail();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              setSendModalOpen(false);
            }
          }}
        >
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Send Certificate via Email</DialogTitle>
            <DialogDescription>Review and customize the email before sending.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-gray-600">Recipient Email</label>
              <Input
                value={sendForm.email}
                onChange={(e) => {
                  setSendForm((f) => ({ ...f, email: e.target.value }));
                  if (sendFormErrors.email) setSendFormErrors((e) => ({ ...e, email: undefined }));
                }}
                placeholder=""
                disabled={isSendingEmail}
                className={sendFormErrors.email ? 'border-red-500' : ''}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isSendingEmail) {
                    e.preventDefault();
                    confirmSendEmail();
                  }
                }}
              />
              {sendFormErrors.email && (
                <p className="text-xs text-red-500 mt-1">{sendFormErrors.email}</p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-600">Subject</label>
              <Input
                value={sendForm.subject}
                onChange={(e) => {
                  setSendForm((f) => ({ ...f, subject: e.target.value }));
                  if (sendFormErrors.subject) setSendFormErrors((e) => ({ ...e, subject: undefined }));
                }}
                placeholder="Subject"
                disabled={isSendingEmail}
                className={sendFormErrors.subject ? 'border-red-500' : ''}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isSendingEmail) {
                    e.preventDefault();
                    confirmSendEmail();
                  }
                }}
              />
              {sendFormErrors.subject && (
                <p className="text-xs text-red-500 mt-1">{sendFormErrors.subject}</p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-600">Message</label>
              <textarea
                value={sendForm.message}
                onChange={(e) => {
                  setSendForm((f) => ({ ...f, message: e.target.value }));
                  if (sendFormErrors.message) setSendFormErrors((e) => ({ ...e, message: undefined }));
                }}
                rows={4}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed ${sendFormErrors.message ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="Message"
                disabled={isSendingEmail}
                onKeyDown={(e) => {
                  // Allow Shift+Enter for new line in textarea
                  if (e.key === 'Enter' && !e.shiftKey && !isSendingEmail) {
                    e.preventDefault();
                    confirmSendEmail();
                  }
                }}
              />
              {sendFormErrors.message && (
                <p className="text-xs text-red-500 mt-1">{sendFormErrors.message}</p>
              )}
            </div>
            {sendPreviewSrc && (
              <div className="space-y-2">
                <label className="text-sm text-gray-600">Attachment Preview</label>
                <div className="border rounded-lg p-2 bg-gray-50">
                  <div className="relative w-full h-64">
                    <Image
                      src={sendPreviewSrc}
                      alt="Certificate preview"
                      fill
                      sizes="(max-width: 768px) 100vw, 640px"
                      className="object-contain"
                    />
                  </div>
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button 
                variant="outline" 
                className="border-gray-300" 
                onClick={() => setSendModalOpen(false)}
                disabled={isSendingEmail}
              >
                Cancel
              </Button>
               <Button 
                 className="gradient-primary text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all duration-300" 
                 onClick={confirmSendEmail}
                 disabled={isSendingEmail}
               >
                {isSendingEmail ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Sending...
                  </>
                ) : (
                  'Send Email'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Toast Notifications */}
      <Toaster position="top-right" richColors />
    </div>
  );
}

export default function CertificatesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading certificates...</p>
        </div>
      </div>
    }>
      <CertificatesContent />
    </Suspense>
  );
}
