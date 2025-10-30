"use client";

import ModernLayout from "@/components/modern-layout";
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
import { useEffect, useMemo, useState, useRef } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { getMember, Member } from "@/lib/supabase/members";
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
import { Certificate, TextLayer as CertificateTextLayer, createCertificate, CreateCertificateData } from "@/lib/supabase/certificates";
import { Eye, Edit, Trash2, FileText, Download, ChevronDown, Link, Image as ImageIcon, ChevronLeft, ChevronRight, Zap } from "lucide-react";
import { toast, Toaster } from "sonner";
import {
  getTemplate,
  getTemplateImageUrl,
  Template,
  getTemplateLayout,
  isTemplateReadyForQuickGenerate,
} from "@/lib/supabase/templates";
import { getTemplateDefaults, TemplateDefaults, TextLayerDefault } from '@/lib/storage/template-defaults';
import type { TemplateLayoutConfig } from '@/types/template-layout';
import Image from "next/image";
import { confirmToast } from "@/lib/ui/confirm";
import { Suspense } from "react";
import { QuickGenerateModal, QuickGenerateParams } from "@/components/certificate/QuickGenerateModal";
import { getTemplates } from "@/lib/supabase/templates";
import { getMembers } from "@/lib/supabase/members";
import { renderCertificateToDataURL, RenderTextLayer } from "@/lib/render/certificate-render";
import { STANDARD_CANVAS_WIDTH, STANDARD_CANVAS_HEIGHT } from "@/lib/constants/canvas";

function CertificatesContent() {
  const { t } = useLanguage();
  const params = useSearchParams();
  const certQuery = (params?.get("cert") || "").toLowerCase();
  const [role, setRole] = useState<"Admin" | "Team" | "Public">("Public");
  const [searchInput, setSearchInput] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(10);
  
  // Quick Generate state
  const [quickGenerateOpen, setQuickGenerateOpen] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loadingQuickGenData, setLoadingQuickGenData] = useState(false);

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
  const sendingRef = useRef(false);
  const [sendFormErrors, setSendFormErrors] = useState<{ email?: string; subject?: string; message?: string }>({});
  const [sendForm, setSendForm] = useState<{ email: string; subject: string; message: string }>({
    email: "",
    subject: "",
    message: "",
  });
  const [sendPreviewSrcs, setSendPreviewSrcs] = useState<{ cert: string | null; score: string | null }>({ cert: null, score: null });
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

  // Export both certificate and score as a single PDF (main first, score second)
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

      async function fetchImage(urlRaw: string) {
        let srcRaw = urlRaw || "";
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
        const bitmap = await createImageBitmap(blob);
        const dims = { w: bitmap.width, h: bitmap.height };
        bitmap.close();
        return { dataUrl, dims, mime: blob.type };
      }

      const main = await fetchImage(certificate.certificate_image_url);
      const imgType = main.mime.includes('png') ? 'PNG' : 'JPEG';

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

      // Page 1: main
      addCenteredImage(main.dataUrl, main.dims);
      // Page 2: score if available
      if (certificate.score_image_url) {
        doc.addPage();
        const score = await fetchImage(certificate.score_image_url);
        addCenteredImage(score.dataUrl, score.dims);
      }

      const fileName = `${certificate.certificate_no || 'certificate'}-combined.pdf`;
      doc.save(fileName);
      toast.success("PDF exported");
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to export PDF");
    }
  }

  // Export both certificate and score to PNG (two files)
  async function exportToPNG(certificate: Certificate) {
    try {
      if (!certificate.certificate_image_url) {
        toast.error("Certificate image not available to export");
        return;
      }

      async function downloadPng(urlRaw: string, name: string) {
        let srcRaw = urlRaw || "";
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
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }

      const base = certificate.certificate_no || 'certificate';
      await downloadPng(certificate.certificate_image_url, `${base}.png`);
      if (certificate.score_image_url) {
        await downloadPng(certificate.score_image_url, `${base}-score.png`);
      }

      toast.success("PNGs downloaded successfully");
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
      const src = srcRaw.startsWith('/') && typeof window !== 'undefined' ? `${window.location.origin}${srcRaw}` : srcRaw;

      // Normalize score url if exists
      let scoreRaw = certificate.score_image_url || "";
      if (scoreRaw && !/^https?:\/\//i.test(scoreRaw) && !scoreRaw.startsWith('/') && !scoreRaw.startsWith('data:')) {
        scoreRaw = `/${scoreRaw}`;
      }
      const scoreSrc = scoreRaw
        ? (scoreRaw.startsWith('/') && typeof window !== 'undefined' ? `${window.location.origin}${scoreRaw}` : scoreRaw)
        : null;
      setSendCert(certificate);
      setSendPreviewSrcs({ cert: src, score: scoreSrc });
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
    if (!sendCert || !sendPreviewSrcs.cert) return;
    if (isSendingEmail || sendingRef.current) return;
    
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
    sendingRef.current = true;
    try {
      const payload = {
        recipientEmail,
        recipientName: sendCert.name,
        imageUrl: sendPreviewSrcs.cert,
        scoreImageUrl: sendPreviewSrcs.score,
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
      setSendPreviewSrcs({ cert: null, score: null });
      setSendForm({ email: '', subject: '', message: '' });
    } catch (err) {
      console.error('Email send error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to send email. Please try again.');
    } finally {
      setIsSendingEmail(false);
      sendingRef.current = false;
    }
  }

  // Quick Generate: Load templates and members when modal opens
  const handleOpenQuickGenerate = async () => {
    console.log('🚀 Opening Quick Generate Modal...');
    setQuickGenerateOpen(true);
    
    if (templates.length === 0 || members.length === 0) {
      console.log('📥 Loading templates and members...');
      const loadingToast = toast.loading('Loading templates and members...');
      
      try {
        setLoadingQuickGenData(true);
        const [templatesData, membersData] = await Promise.all([
          getTemplates(),
          getMembers()
        ]);
        
        console.log('✅ Data loaded:', {
          templates: templatesData.length,
          members: membersData.length
        });
        
        setTemplates(templatesData);
        setMembers(membersData);
        toast.dismiss(loadingToast);
        toast.success(`Loaded ${templatesData.length} templates and ${membersData.length} members`);
      } catch (error) {
        console.error('❌ Failed to load Quick Generate data:', error);
        toast.dismiss(loadingToast);
        toast.error('Failed to load templates and members');
      } finally {
        setLoadingQuickGenData(false);
      }
    } else {
      console.log('✅ Using cached data:', {
        templates: templates.length,
        members: members.length
      });
    }
  };

  // Quick Generate: Handle certificate generation
  const handleQuickGenerate = async (params: QuickGenerateParams) => {
    const loadingToast = toast.loading('Generating certificate(s)...');
    
    try {
      // PRIORITY 1: Try to load layout from database (NEW)
      console.log('📊 Checking template layout configuration...');
      const layoutConfig = await getTemplateLayout(params.template.id);
      
      let defaults: TemplateDefaults | null = null;
      
      if (layoutConfig && layoutConfig.certificate) {
        // Use database layout (NEW METHOD)
        console.log('✅ Using layout from database');
        defaults = {
          templateId: params.template.id,
          templateName: params.template.name,
          textLayers: layoutConfig.certificate.textLayers,
          overlayImages: layoutConfig.certificate.overlayImages,
          savedAt: layoutConfig.lastSavedAt
        };
      } else {
        // FALLBACK: Try localStorage (OLD METHOD - deprecated)
        console.warn('⚠️ No database layout found, trying localStorage fallback...');
        const templateId = params.template.is_dual_template 
          ? `${params.template.id}_certificate` 
          : params.template.id;
        defaults = getTemplateDefaults(templateId);
        
        if (defaults) {
          console.warn('⚠️ Using localStorage layout - please migrate to database');
        }
      }
      
      // Validate we have layout configuration
      if (!defaults || !defaults.textLayers || defaults.textLayers.length === 0) {
        throw new Error('Template layout not configured. Please configure the template layout first in Templates page.');
      }
      
      console.log(`✅ Layout loaded: ${defaults.textLayers.length} text layers`);

      if (params.dataSource === 'member' && params.member && params.certificateData) {
        // Single certificate generation from member
        await generateSingleCertificate(
          params.template,
          params.member,
          params.certificateData,
          defaults,
          params.dateFormat
        );
        toast.dismiss(loadingToast);
        toast.success('Certificate generated successfully!');
      } else if (params.dataSource === 'excel' && params.excelData) {
        // Bulk certificate generation from Excel
        const total = params.excelData.length;
        let generated = 0;
        let currentToast = loadingToast;
        
        for (const row of params.excelData) {
          try {
            const certNo = String(row.certificate_no || row.cert_no || `CERT-${Date.now()}`);
            const name = String(row.name || row.recipient || '');
            const description = String(row.description || '');
            const issueDate = String(row.issue_date || row.date || new Date().toISOString().split('T')[0]);
            const expiredDate = String(row.expired_date || row.expiry || '');
            
            // Create temporary member object from Excel data
            const tempMember: Member = {
              id: `temp-${Date.now()}-${generated}`,
              name,
              email: String(row.email || ''),
              organization: String(row.organization || ''),
              phone: String(row.phone || ''),
              job: String(row.job || ''),
              date_of_birth: null,
              address: String(row.address || ''),
              city: String(row.city || ''),
              notes: '',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            
            await generateSingleCertificate(
              params.template,
              tempMember,
              { certificate_no: certNo, description, issue_date: issueDate, expired_date: expiredDate },
              defaults,
              params.dateFormat
            );
            
            generated++;
            // Update the same toast instead of creating new ones
            toast.dismiss(currentToast);
            currentToast = toast.loading(`Generating certificates... ${generated}/${total}`);
          } catch (error) {
            console.error('Failed to generate certificate for row:', row, error);
          }
        }
        
        toast.dismiss(currentToast);
        toast.success(`Successfully generated ${generated}/${total} certificate(s)!`);
      }
      
      // Refresh certificates list
      await refresh();
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error('Quick Generate error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate certificate');
    }
  };

  // Helper: Generate single certificate with full canvas rendering
  const generateSingleCertificate = async (
    template: Template,
    member: Member,
    certData: { certificate_no: string; description: string; issue_date: string; expired_date: string },
    defaults: TemplateDefaults,
    dateFormat: string
  ) => {
    console.log('🎨 Generating certificate:', { 
      template: template.name, 
      member: member.name, 
      certData 
    });
    
    // Get template image URL
    const templateImageUrl = await getTemplateImageUrl(template);
    
    if (!templateImageUrl) {
      throw new Error(`Template image not found for ${template.name}`);
    }
    
    // Prepare text layers with member data
    const textLayers: RenderTextLayer[] = defaults.textLayers.map((layer) => {
      let text = '';
      
      // Map common field IDs to certificate data
      if (layer.id === 'name') text = member.name;
      if (layer.id === 'certificate_no') text = certData.certificate_no;
      if (layer.id === 'description') text = certData.description;
      if (layer.id === 'issue_date') text = certData.issue_date;
      if (layer.id === 'expired_date') text = certData.expired_date;
      
      return {
        id: layer.id,
        text: text,
        x: layer.x,
        y: layer.y,
        xPercent: layer.xPercent,
        yPercent: layer.yPercent,
        fontSize: layer.fontSize,
        color: layer.color,
        fontWeight: layer.fontWeight,
        fontFamily: layer.fontFamily,
      };
    });
    
    // Render certificate to PNG DataURL
    console.log('🖼️ Rendering certificate image...');
    const certificateImageDataUrl = await renderCertificateToDataURL({
      templateImageUrl,
      textLayers,
      width: STANDARD_CANVAS_WIDTH,
      height: STANDARD_CANVAS_HEIGHT,
    });
    
    // Prepare certificate text layers for database (includes text data)
    const certificateTextLayers: CertificateTextLayer[] = textLayers.map(layer => ({
      id: layer.id,
      text: layer.text,
      x: layer.x || 0,
      y: layer.y || 0,
      xPercent: layer.xPercent || 0,
      yPercent: layer.yPercent || 0,
      fontSize: layer.fontSize,
      color: layer.color,
      fontWeight: layer.fontWeight || 'normal',
      fontFamily: layer.fontFamily || 'Arial',
    }));
    
    // Create certificate data to save
    const certificateDataToSave: CreateCertificateData = {
      certificate_no: certData.certificate_no,
      name: member.name.trim(),
      description: certData.description.trim() || undefined,
      issue_date: certData.issue_date,
      expired_date: certData.expired_date || undefined,
      category: template.category || undefined,
      template_id: template.id,
      member_id: member.id.startsWith('temp-') ? undefined : member.id, // Don't save temp IDs from Excel
      text_layers: certificateTextLayers,
      merged_image: certificateImageDataUrl,
      certificate_image_url: certificateImageDataUrl,
    };
    
    // Save certificate to database
    console.log('💾 Saving certificate to database...');
    const savedCertificate = await createCertificate(certificateDataToSave);
    console.log('✅ Certificate created successfully:', savedCertificate.certificate_no);
    
    return savedCertificate;
  };

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

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentCertificates = useMemo(() => 
    filtered.slice(indexOfFirstItem, indexOfLastItem), 
    [filtered, indexOfFirstItem, indexOfLastItem]
  );
  const totalPages = useMemo(() => 
    Math.ceil(filtered.length / itemsPerPage), 
    [filtered, itemsPerPage]
  );

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchInput, categoryFilter, dateFilter]);

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
  
  // Member detail modal state
  const [memberDetailOpen, setMemberDetailOpen] = useState<boolean>(false);
  const [detailMember, setDetailMember] = useState<Member | null>(null);
  const [loadingMemberDetail, setLoadingMemberDetail] = useState<boolean>(false);
  
  // REMOVED: templateImageDimensions state - no longer needed
  // We now use container dimensions directly for text scaling

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

  // REMOVED: handleTemplateImageLoad - no longer needed
  // We now use container dimensions directly for text scaling

  // REMOVED: getConsistentDimensions - no longer used
  // We now use containerScale directly based on actual container dimensions
  // This ensures text scales proportionally with the image in the preview
  
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

  async function openMemberDetail(memberId: string | null) {
    if (!memberId) {
      toast.error('Member information not available');
      return;
    }
    
    try {
      setLoadingMemberDetail(true);
      setMemberDetailOpen(true);
      const member = await getMember(memberId);
      setDetailMember(member);
    } catch (error) {
      console.error('Failed to load member details:', error);
      toast.error('Failed to load member details');
      setMemberDetailOpen(false);
    } finally {
      setLoadingMemberDetail(false);
    }
  }

  return (
    <ModernLayout>
      <section className="min-h-screen py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                <div>
                  <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                    {t("certificates.title")}
                  </h1>
                  <p className="text-gray-600 mt-1 text-base">
                    {t("certificates.subtitle")}
                  </p>
                </div>
                {/* Quick Generate Button */}
                {(role === "Admin" || role === "Team") && (
                  <Button
                    onClick={handleOpenQuickGenerate}
                    className="gradient-primary text-white shadow-lg hover:shadow-xl flex items-center gap-2"
                  >
                    <Zap className="w-5 h-5" />
                    Quick Generate
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Input
                  placeholder={t("certificates.search")}
                  className="w-64 bg-white border-gray-200"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-48 px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  className="w-40 bg-white border-gray-200"
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
                className="min-h-[400px] flex items-center justify-center"
              >
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Loading certificates...
                  </h3>
                  <p className="text-gray-500 text-sm">
                    Please wait while we fetch your certificates.
                  </p>
                </div>
              </motion.div>
            )}

            {/* Error State */}
            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="min-h-[400px] flex items-center justify-center"
              >
                <div className="text-center max-w-md">
                  <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <span className="text-3xl">⚠️</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Error loading certificates
                  </h3>
                  <p className="text-gray-500 text-sm mb-6">{error}</p>
                  <Button
                    onClick={() => refresh()}
                    className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white"
                  >
                    Try Again
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Certificates Table */}
            {!loading && !error && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4 }}
                className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
              >
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50/50">
                        <TableHead className="min-w-[180px]">{t("certificates.certificateId")}</TableHead>
                        <TableHead className="min-w-[200px]">{t("certificates.recipient")}</TableHead>
                        <TableHead className="min-w-[150px]">Category</TableHead>
                        <TableHead className="min-w-[140px]">{t("certificates.issuedDate")}</TableHead>
                        <TableHead className="min-w-[140px]">Expiry Date</TableHead>
                        <TableHead className="text-right min-w-[280px]">
                          {t("certificates.actions")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentCertificates.map((certificate) => (
                        <TableRow 
                          key={certificate.id}
                          onClick={() => certificate.member_id && openMemberDetail(certificate.member_id)}
                          className={certificate.member_id ? "cursor-pointer hover:bg-blue-50/50 transition-colors border-b border-gray-100 last:border-0" : "border-b border-gray-100 last:border-0"}
                        >
                          <TableCell className="font-medium text-gray-900">
                            {certificate.certificate_no}
                          </TableCell>
                          <TableCell className="text-gray-700">{certificate.name}</TableCell>
                          <TableCell className="text-gray-700">{certificate.category || "—"}</TableCell>
                          <TableCell className="text-gray-700">
                            {new Date(
                              certificate.issue_date,
                            ).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-gray-700">
                            {certificate.expired_date
                              ? new Date(
                                  certificate.expired_date,
                                ).toLocaleDateString()
                              : "—"}
                          </TableCell>
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
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
                                    size="sm"
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
                                  size="sm"
                                  className="border-gray-300"
                                  onClick={() => openEdit(certificate)}
                                >
                                  <Edit className="w-4 h-4 mr-1" />
                                  {t("common.edit")}
                                </Button>
                              )}
                              {canDelete && (
                                <button
                                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-3 py-1.5 shadow-sm hover:shadow-md"
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
                </div>
              </motion.div>
            )}

            {/* Pagination Controls */}
            {!loading && !error && filtered.length > 0 && (
              <div className="flex justify-between items-center mt-4 px-2">
                <div className="text-sm text-gray-500">
                  Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filtered.length)} of {filtered.length} certificates
                  {(searchInput || categoryFilter || dateFilter) && <span className="ml-1 text-gray-400">(filtered from {certificates.length})</span>}
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <div className="text-sm text-gray-600 px-3">
                    Page {currentPage} of {totalPages}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
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
                className="gradient-primary text-white"
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
                            const src = srcRaw.startsWith('/')
                              ? `${srcRaw}${cacheBust}`
                              : srcRaw;

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
                              />
                            ) : previewTemplate && getTemplateImageUrl(previewTemplate) ? (
                              <Image
                                src={getTemplateImageUrl(previewTemplate)!}
                                alt="Certificate Template"
                                fill
                                className="object-contain absolute inset-0"
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
                                  
                                  // CRITICAL FIX: Container uses aspectRatio: "800/600" and image uses object-contain
                                  // This means the image scales proportionally with the container
                                  // Since generated images are at fixed 800x600, we need to scale the fontSize
                                  // to match how the image is scaled in the container
                                  // Calculate the actual container dimensions based on aspect ratio
                                  const containerScale = containerDimensions 
                                    ? Math.min(containerDimensions.width / STANDARD_CANVAS_WIDTH, containerDimensions.height / STANDARD_CANVAS_HEIGHT)
                                    : 1;
                                  
                                  const scaledFontSize = layer.fontSize * containerScale;

                                  return (
                                    <div
                                      key={layer.id}
                                      className="absolute select-none"
                                      style={{
                                        left: actualX,
                                        top: actualY,
                                        fontSize: `${scaledFontSize}px`,
                                        color: layer.color,
                                        fontWeight: layer.fontWeight,
                                        fontFamily: layer.fontFamily,
                                        userSelect: "none",
                                        pointerEvents: "none",
                                        transform: "translate(0, 0)",
                                        textAlign: "left",
                                      }}
                                    >
                                      {layer.text}
                                    </div>
                                  );
                                },
                              )}

                            {previewMode === 'score' && scoreDefaults && scoreDefaults.textLayers && scoreDefaults.textLayers.map((layer: TextLayerDefault) => {
                              // CRITICAL FIX: Use the same positioning logic as certificate mode for consistency
                              const actualX = layer.xPercent * 100 + "%";
                              const actualY = layer.yPercent * 100 + "%";
                              
                              // Decide content: try to map known IDs to certificate data, otherwise show placeholder id
                              let content = '';
                              if (layer.id === 'pembina_nama') content = previewCertificate.members?.name || previewCertificate.created_by || '';
                              else if (layer.id === 'score_date') content = previewCertificate.issue_date ? new Date(previewCertificate.issue_date).toLocaleDateString() : '';
                              else if (layer.id === 'nilai_prestasi') content = '';
                              else content = layer.id.replace(/_/g, ' ');

                              // CRITICAL FIX: Container uses aspectRatio: "800/600" and image uses object-contain
                              // This means the image scales proportionally with the container
                              // Since generated images are at fixed 800x600, we need to scale the fontSize
                              // to match how the image is scaled in the container
                              // Calculate the actual container dimensions based on aspect ratio
                              const containerScale = containerDimensions 
                                ? Math.min(containerDimensions.width / STANDARD_CANVAS_WIDTH, containerDimensions.height / STANDARD_CANVAS_HEIGHT)
                                : 1;
                              
                              const scaledFontSize = layer.fontSize * containerScale;
                              
                              return (
                                <div
                                  key={layer.id}
                                  className="absolute select-none"
                                  style={{
                                    left: actualX,
                                    top: actualY,
                                    fontSize: `${scaledFontSize}px`,
                                    color: layer.color,
                                    fontWeight: layer.fontWeight,
                                    fontFamily: layer.fontFamily,
                                    userSelect: "none",
                                    pointerEvents: "none",
                                    // CRITICAL FIX: Use same positioning as Certificate system for consistency
                                    transform: "translate(0, 0)",
                                    textAlign: "left",
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
          className="max-w-xl w-full max-h-[90vh] overflow-y-auto"
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
            {(sendPreviewSrcs.cert || sendPreviewSrcs.score) && (
              <div className="space-y-2">
                <label className="text-sm text-gray-600">Attachment Preview</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="relative w-full h-64">
                    {sendPreviewSrcs.cert && (
                      <Image
                        src={sendPreviewSrcs.cert}
                        alt="Certificate preview"
                        fill
                        className="object-contain rounded-md border border-gray-200"
                        unoptimized
                      />
                    )}
                  </div>
                  <div className="relative w-full h-64">
                    {sendPreviewSrcs.score && (
                      <Image
                        src={sendPreviewSrcs.score}
                        alt="Score preview"
                        fill
                        className="object-contain rounded-md border border-gray-200"
                        unoptimized
                      />
                    )}
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

      {/* Member Detail Modal */}
      {memberDetailOpen && (
        <Dialog open={memberDetailOpen} onOpenChange={setMemberDetailOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-gray-900">
                Member Information
              </DialogTitle>
              <DialogDescription>
                {detailMember ? `Detailed information about ${detailMember.name}` : 'Loading...'}
              </DialogDescription>
            </DialogHeader>
            
            {loadingMemberDetail ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-full flex items-center justify-center mb-4 shadow-sm">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
                <span className="text-gray-600 text-sm font-medium">Loading member details...</span>
              </div>
            ) : detailMember ? (
              <div className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  {/* Name */}
                  <div>
                    <label className="text-sm font-medium text-gray-500">Full Name</label>
                    <div className="mt-1 text-base text-gray-900">{detailMember.name}</div>
                  </div>

                  {/* Email */}
                  {detailMember.email && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Email</label>
                      <div className="mt-1 text-base text-gray-900">{detailMember.email}</div>
                    </div>
                  )}

                  {/* Phone */}
                  {detailMember.phone && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Phone</label>
                      <div className="mt-1 text-base text-gray-900">{detailMember.phone}</div>
                    </div>
                  )}

                  {/* Organization */}
                  {detailMember.organization && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Organization / School</label>
                      <div className="mt-1 text-base text-gray-900">{detailMember.organization}</div>
                    </div>
                  )}

                  {/* Job */}
                  {detailMember.job && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Job / Position</label>
                      <div className="mt-1 text-base text-gray-900">{detailMember.job}</div>
                    </div>
                  )}

                  {/* Date of Birth */}
                  {detailMember.date_of_birth && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Date of Birth</label>
                      <div className="mt-1 text-base text-gray-900">
                        {new Date(detailMember.date_of_birth).toLocaleDateString('id-ID', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </div>
                    </div>
                  )}

                  {/* City */}
                  {detailMember.city && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">City</label>
                      <div className="mt-1 text-base text-gray-900">{detailMember.city}</div>
                    </div>
                  )}

                  {/* Address */}
                  {detailMember.address && (
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-gray-500">Address</label>
                      <div className="mt-1 text-base text-gray-900">{detailMember.address}</div>
                    </div>
                  )}

                  {/* Notes */}
                  {detailMember.notes && (
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-gray-500">Notes</label>
                      <div className="mt-1 text-base text-gray-900 whitespace-pre-wrap">{detailMember.notes}</div>
                    </div>
                  )}
                </div>

                {/* Metadata */}
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <div className="grid grid-cols-2 gap-4 text-sm text-gray-500">
                    {detailMember.created_at && (
                      <div>
                        <span className="font-medium">Created:</span>{' '}
                        {new Date(detailMember.created_at).toLocaleDateString('id-ID', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    )}
                    {detailMember.updated_at && (
                      <div>
                        <span className="font-medium">Updated:</span>{' '}
                        {new Date(detailMember.updated_at).toLocaleDateString('id-ID', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            {/* Action Button */}
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
              <Button
                variant="outline"
                onClick={() => setMemberDetailOpen(false)}
              >
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Quick Generate Modal */}
      <QuickGenerateModal
        open={quickGenerateOpen}
        onClose={() => setQuickGenerateOpen(false)}
        templates={templates}
        members={members}
        onGenerate={handleQuickGenerate}
      />

      {/* Toast Notifications */}
      <Toaster position="top-right" richColors />
   </ModernLayout>
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
