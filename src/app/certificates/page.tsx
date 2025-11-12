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
import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useDebounce } from "@/hooks/use-debounce";
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
import { supabaseClient } from "@/lib/supabase/client";
import { TemplateLayoutConfig, TextLayerConfig, PhotoLayerConfig } from "@/types/template-layout";
import { Edit, Trash2, FileText, Download, ChevronDown, Link, Image as ImageIcon, ChevronLeft, ChevronRight, Zap, Award, Filter, X } from "lucide-react";
import { toast, Toaster } from "sonner";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  getTemplate,
  getTemplateImageUrl,
  Template,
  getTemplateLayout,
} from "@/lib/supabase/templates";
import { getTemplateDefaults, TemplateDefaults, TextLayerDefault, PhotoLayerDefault } from '@/lib/storage/template-defaults';
import Image from "next/image";
import { confirmToast } from "@/lib/ui/confirm";
import { Suspense } from "react";
import { QuickGenerateModal, QuickGenerateParams } from "@/components/certificate/QuickGenerateModal";
import { getTemplates } from "@/lib/supabase/templates";
import { getMembers } from "@/lib/supabase/members";
import { renderCertificateToDataURL, RenderTextLayer } from "@/lib/render/certificate-render";
import { STANDARD_CANVAS_WIDTH, STANDARD_CANVAS_HEIGHT } from "@/lib/constants/canvas";
import { formatDateString, formatReadableDate } from "@/lib/utils/certificate-formatters";
import { generateCertificateNumber } from "@/lib/supabase/certificates";

function CertificatesContent() {
  const { t, language } = useLanguage();
  // Format: 2 Nov 2025
  const formatDateShort = useCallback((input?: string | null) => {
    if (!input) return "—";
    const d = new Date(input);
    if (isNaN(d.getTime())) return "—";
    const day = d.getDate();
    const month = d.toLocaleString(language === 'id' ? 'id-ID' : 'en-US', { month: 'short' });
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  }, [language]);

  // Helper function to check if certificate is expired
  const isCertificateExpired = useCallback((certificate: Certificate): boolean => {
    if (!certificate.expired_date) return false;
    try {
      const expiredDate = new Date(certificate.expired_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      expiredDate.setHours(0, 0, 0, 0);
      return expiredDate < today;
    } catch (error) {
      console.error('Error checking expired date:', error, certificate.expired_date);
      return false;
    }
  }, []);

  // Get expired overlay image URL from Supabase storage
  const getExpiredOverlayUrl = useCallback(() => {
    try {
      const { data } = supabaseClient.storage
        .from('templates')
        .getPublicUrl('expired.png');
      const url = data?.publicUrl || null;
      if (url) {
        console.log('Expired overlay URL:', url);
      } else {
        console.warn('Expired overlay URL not found');
      }
      return url;
    } catch (error) {
      console.error('Error getting expired overlay URL:', error);
      return null;
    }
  }, []);
  const params = useSearchParams();
  const certQuery = (params?.get("cert") || "").toLowerCase();
  const [role, setRole] = useState<"Admin" | "Team" | "Public">("Public");
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearchInput = useDebounce(searchInput, 300);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  
  // Filter modal state
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [tempCategoryFilter, setTempCategoryFilter] = useState("");
  const [tempDateFilter, setTempDateFilter] = useState("");
  
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  
  useEffect(() => {
    const checkMobile = () => {
      const isMobile = window.innerWidth < 768; // md breakpoint
      setItemsPerPage(isMobile ? 5 : 10);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Quick Generate state
  const [quickGenerateOpen, setQuickGenerateOpen] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [, setLoadingQuickGenData] = useState(false);

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

  // Loading states for export and generate operations
  const [exportingPDF, setExportingPDF] = useState<string | null>(null);
  const [exportingPNG, setExportingPNG] = useState<string | null>(null);
  const [generatingLink, setGeneratingLink] = useState<string | null>(null);

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

  // Auto-refresh certificates only when explicitly needed (removed aggressive refresh)
  // Users can manually refresh if needed, or refresh happens after create/update/delete

  // Export both certificate and score as a single PDF (main first, score second)
  async function exportToPDF(certificate: Certificate) {
    if (!certificate.certificate_image_url) {
      toast.error("Certificate image not available to export");
      return;
    }

    try {
      setExportingPDF(certificate.id);

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
    } finally {
      setExportingPDF(null);
    }
  }

  // Export both certificate and score to PNG (two files)
  async function exportToPNG(certificate: Certificate) {
    if (!certificate.certificate_image_url) {
      toast.error("Certificate image not available to export");
      return;
    }

    try {
      setExportingPNG(certificate.id);

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
    } finally {
      setExportingPNG(null);
    }
  }

  // Generate public certificate link using public_id
  async function generateCertificateLink(certificate: Certificate) {
    if (!certificate.public_id) {
      toast.error(t('certificates.generateLink') + ' - ' + t('hero.noPublicLink'));
      return;
    }

    try {
      setGeneratingLink(certificate.id);

      // Get base URL - prefer environment variable, then use current origin
      let baseUrl = process.env.NEXT_PUBLIC_APP_URL;
      
      // If no env variable, use current window location
      if (!baseUrl && typeof window !== 'undefined') {
        baseUrl = window.location.origin;
      }
      
      // Ensure base URL has protocol (http:// or https://)
      if (baseUrl && !baseUrl.match(/^https?:\/\//i)) {
        baseUrl = `https://${baseUrl.replace(/^\/\//, '')}`;
      }
      
      // Generate absolute public link
      const certificateLink = `${baseUrl}/cek/${certificate.public_id}`;
      
      // Copy to clipboard
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(certificateLink);
        toast.success(t('hero.linkCopied'));
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = certificateLink;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        toast.success(t('hero.linkCopied'));
      }
      
      console.log('Generated public certificate link:', certificateLink);
    } catch (err) {
      console.error('Failed to generate certificate link:', err);
      toast.error(t('hero.linkGenerateFailed'));
    } finally {
      setGeneratingLink(null);
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
    console.log('Opening Generate Modal...');
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
        console.error('❌ Failed to load Generate data:', error);
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
    const loadingToast = toast.loading(t('quickGenerate.generatingCertificates'));
    
    try {
      // PRIORITY 1: Try to load layout from database (NEW)
      console.log('📊 Checking template layout configuration...');
      const layoutConfig = await getTemplateLayout(params.template.id);
      
      let defaults: TemplateDefaults | null = null;
      
      if (layoutConfig && layoutConfig.certificate) {
        // Use database layout (NEW METHOD)
        console.log('✅ Using layout from database');
        
        // Migrate old data: ensure all layers have dual coordinates and defaults
        const migratedLayers = layoutConfig.certificate.textLayers.map(layer => ({
          ...layer,
          // CRITICAL: Ensure absolute coordinates exist (convert from percentage if needed)
          x: layer.x !== undefined ? layer.x : (layer.xPercent || 0) * STANDARD_CANVAS_WIDTH,
          y: layer.y !== undefined ? layer.y : (layer.yPercent || 0) * STANDARD_CANVAS_HEIGHT,
          // CRITICAL: Ensure percentage coordinates exist (convert from absolute if needed)
          xPercent: layer.xPercent !== undefined ? layer.xPercent : (layer.x || 0) / STANDARD_CANVAS_WIDTH,
          yPercent: layer.yPercent !== undefined ? layer.yPercent : (layer.y || 0) / STANDARD_CANVAS_HEIGHT,
          maxWidth: layer.maxWidth || 300, // Default maxWidth if missing
          lineHeight: layer.lineHeight || 1.2, // Default lineHeight if missing
        }));
        
        // CRITICAL FIX: Handle both nested and flat photoLayers structure for backward compatibility
        // New structure: layoutConfig.certificate.photoLayers (nested)
        // Old structure: layoutConfig.photoLayers (flat - current database structure)
        const photoLayersRaw = layoutConfig.certificate.photoLayers || (layoutConfig as unknown as { photoLayers?: PhotoLayerConfig[] }).photoLayers;
        const photoLayersFromConfig: PhotoLayerDefault[] = (photoLayersRaw || []).map((layer: PhotoLayerConfig) => ({
          id: layer.id,
          type: layer.type,
          src: layer.src,
          x: layer.x,
          y: layer.y,
          xPercent: layer.xPercent,
          yPercent: layer.yPercent,
          width: layer.width,
          height: layer.height,
          widthPercent: layer.widthPercent,
          heightPercent: layer.heightPercent,
          zIndex: layer.zIndex,
          fitMode: layer.fitMode,
          crop: layer.crop,
          mask: layer.mask,
          opacity: layer.opacity,
          rotation: layer.rotation,
          maintainAspectRatio: layer.maintainAspectRatio,
          originalWidth: layer.originalWidth,
          originalHeight: layer.originalHeight,
          storagePath: layer.storagePath,
        }));
        
        defaults = {
          templateId: params.template.id,
          templateName: params.template.name,
          textLayers: migratedLayers,
          overlayImages: layoutConfig.certificate.overlayImages,
          photoLayers: photoLayersFromConfig, // Use extracted photo layers
          savedAt: layoutConfig.lastSavedAt
        };
        console.log('✅ Migrated certificate layers with dual coordinates');
        if (photoLayersFromConfig && photoLayersFromConfig.length > 0) {
          console.log('📸 Loaded', photoLayersFromConfig.length, 'photo layers for generation');
          console.log('📸 Photo layers data:', JSON.stringify(photoLayersFromConfig, null, 2));
        } else {
          console.warn('⚠️ No photo layers found in layout config');
          console.warn('⚠️ Layout structure:', Object.keys(layoutConfig));
          console.warn('⚠️ Certificate keys:', Object.keys(layoutConfig.certificate || {}));
        }
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

      if (params.dataSource === 'member') {
        // Member-based generation (single or multiple)
        if (params.members && params.members.length > 0 && params.certificateData) {
          // Multiple members - show progress like Excel
          const total = params.members.length;
          let generated = 0;
          const currentToast = loadingToast;
          
          for (const member of params.members) {
            try {
              // Get score data for this member (if dual template)
              const memberScoreData = params.scoreDataMap?.[member.id];
              
              console.log('🔄 Processing member in batch:', {
                memberName: member.name,
                memberID: member.id,
                hasScoreData: !!memberScoreData,
                scoreDataKeys: memberScoreData ? Object.keys(memberScoreData) : [],
                scoreDataSample: memberScoreData
              });
              
              await generateSingleCertificate(
                params.template,
                member,
                params.certificateData,
                defaults,
                params.dateFormat,
                memberScoreData, // Pass score data for dual template
                layoutConfig // Pass layout config for score generation
              );
              
              generated++;
              // Update the same toast instead of creating new ones
              toast.loading(`${t('quickGenerate.generatingCertificates')} ${generated}/${total}`, { id: currentToast });
            } catch (error) {
              console.error('Failed to generate certificate for member:', member.name, error);
            }
          }
          
          toast.dismiss(currentToast);
          toast.success(`${t('quickGenerate.successMultiple')} ${generated}/${total} ${t('quickGenerate.certificatesGenerated')}`);
        } else if (params.member && params.certificateData) {
          // Single certificate generation from member
          await generateSingleCertificate(
            params.template,
            params.member,
            params.certificateData,
            defaults,
            params.dateFormat
          );
          toast.dismiss(loadingToast);
          toast.success(t('quickGenerate.successSingle'));
        } else {
          throw new Error('No member(s) provided for certificate generation');
        }
      } else if (params.dataSource === 'excel' && params.excelData) {
        // Bulk certificate generation from Excel
        const total = params.excelData.length;
        let generated = 0;
        let currentToast = loadingToast;
        
        for (const row of params.excelData) {
          try {
            // Extract data from Excel row
            const name = String(row.name || row.recipient || '');
            const description = String(row.description || '');
            let issueDate = String(row.issue_date || row.date || '');
            
            // CRITICAL: Auto-generate issue_date if empty (use current date)
            if (!issueDate) {
              issueDate = new Date().toISOString().split('T')[0];
            }
            
            // CRITICAL: certificate_no will be auto-generated in generateSingleCertificate if empty
            const certNo = String(row.certificate_no || row.cert_no || '');
            
            // CRITICAL: expired_date will be auto-generated in generateSingleCertificate if empty
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
            
            // generateSingleCertificate will auto-generate certificate_no and expired_date if empty
            await generateSingleCertificate(
              params.template,
              tempMember,
              { certificate_no: certNo, description, issue_date: issueDate, expired_date: expiredDate },
              defaults,
              params.dateFormat
            );
            
            generated++;
            // Update the same toast instead of creating new ones
            toast.loading(`${t('quickGenerate.generatingCertificates')} ${generated}/${total}`, { id: currentToast });
          } catch (error) {
            console.error('Failed to generate certificate for row:', row, error);
          }
        }
        
        toast.dismiss(currentToast);
        toast.success(`${t('quickGenerate.successMultiple')} ${generated}/${total} ${t('quickGenerate.certificatesGenerated')}`);
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
    dateFormat: string,
    scoreData?: Record<string, string>, // Score data for dual template: { field_id -> value }
    layoutConfig?: TemplateLayoutConfig | null // Layout config for score generation
  ) => {
    console.log('🎨 Generating certificate:', { 
      template: template.name, 
      member: member.name, 
      memberID: member.id,
      certData 
    });
    console.log('🗓️ Using date format:', dateFormat);
    console.log('🎯 Score data received:', scoreData ? Object.keys(scoreData).length + ' fields' : 'none', scoreData);
    
    // CRITICAL: Auto-generate certificate_no if empty
    let finalCertificateNo = certData.certificate_no?.trim();
    if (!finalCertificateNo && certData.issue_date) {
      console.log('📝 Auto-generating certificate number...');
      try {
        const issueDate = new Date(certData.issue_date);
        finalCertificateNo = await generateCertificateNumber(issueDate);
        console.log('✨ Auto-generated certificate number:', finalCertificateNo);
      } catch (error) {
        console.error('❌ Failed to auto-generate certificate number:', error);
        // Fallback: use timestamp-based number
        finalCertificateNo = `CERT-${Date.now()}`;
      }
    }
    
    // CRITICAL: Auto-generate expired_date if empty (3 years from issue_date)
    let finalExpiredDate = certData.expired_date?.trim();
    if (!finalExpiredDate && certData.issue_date) {
      console.log('📅 Auto-generating expired date...');
      const issue = new Date(certData.issue_date);
      const expiry = new Date(issue);
      expiry.setFullYear(expiry.getFullYear() + 3);
      finalExpiredDate = expiry.toISOString().split('T')[0];
      console.log('✨ Auto-generated expired date:', finalExpiredDate);
    }
    
    // CRITICAL: Ensure issue_date is set (use current date if empty)
    let finalIssueDate = certData.issue_date?.trim();
    if (!finalIssueDate) {
      console.log('📅 Setting default issue date (today)...');
      finalIssueDate = new Date().toISOString().split('T')[0];
      console.log('✨ Default issue date:', finalIssueDate);
    }
    
    // Use final values for rendering
    const finalCertData = {
      certificate_no: finalCertificateNo || certData.certificate_no,
      description: certData.description || '',
      issue_date: finalIssueDate,
      expired_date: finalExpiredDate || certData.expired_date
    };
    
    console.log('✅ Final certificate data for rendering:', finalCertData);
    
    // Get template image URL
    const templateImageUrl = await getTemplateImageUrl(template);
    
    if (!templateImageUrl) {
      throw new Error(`Template image not found for ${template.name}`);
    }
    
    // Prepare text layers with member data
    const textLayers: RenderTextLayer[] = defaults.textLayers.map((layer) => {
      let text = '';
      
      // Check if layer uses default text
      if (layer.useDefaultText && layer.defaultText) {

        text = layer.defaultText;
      } else {
        // Map common field IDs to certificate data (use finalCertData which has auto-generated values)
        if (layer.id === 'name') text = member.name;
        else if (layer.id === 'certificate_no') text = finalCertData.certificate_no || '';
        else if (layer.id === 'description') text = finalCertData.description || '';
        else if (layer.id === 'issue_date') {
          // CRITICAL FIX: Apply date format to issue_date
          text = formatDateString(finalCertData.issue_date, dateFormat);
        } else if (layer.id === 'expired_date') {
          // CRITICAL FIX: Apply date format to expired_date if available
          text = finalCertData.expired_date ? formatDateString(finalCertData.expired_date, dateFormat) : '';
        }
        // For custom layers without mapping, use defaultText if available
        else if (layer.defaultText) text = layer.defaultText;
      }
      
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
        textAlign: layer.textAlign,
        maxWidth: layer.maxWidth,
        lineHeight: layer.lineHeight,
        richText: layer.richText, // CRITICAL: Pass richText for inline formatting
        hasInlineFormatting: layer.hasInlineFormatting, // CRITICAL: Flag to use rich text renderer
      };
    });
    
    // Render certificate to WebP DataURL
    console.log('🖼️ Rendering certificate image...');
    console.log('📊 Text layers to render:', textLayers.map(l => ({
      id: l.id,
      text: l.text?.substring(0, 20) + '...',
      xPercent: l.xPercent,
      yPercent: l.yPercent,
      textAlign: l.textAlign,
      maxWidth: l.maxWidth,
      hasRichText: !!l.richText,
      richTextSpans: l.richText?.length || 0,
      hasInlineFormatting: l.hasInlineFormatting
    })));
    
    // Prepare photo layers (convert PhotoLayerDefault → RenderPhotoLayer)
    const photoLayersForRender = defaults.photoLayers?.map(layer => ({
      id: layer.id,
      type: layer.type,
      src: layer.src,
      x: layer.x,
      y: layer.y,
      xPercent: layer.xPercent,
      yPercent: layer.yPercent,
      width: layer.width,
      height: layer.height,
      widthPercent: layer.widthPercent,
      heightPercent: layer.heightPercent,
      zIndex: layer.zIndex,
      fitMode: layer.fitMode,
      opacity: layer.opacity,
      rotation: layer.rotation,
      crop: layer.crop,
      mask: layer.mask
    })) || [];
    
    console.log('📸 Photo layers for rendering:', photoLayersForRender.length);
    
    // DYNAMIC CANVAS SIZE: Let renderer use template's natural dimensions
    // No width/height specified → uses template.naturalWidth × template.naturalHeight
    // Result: Output matches template resolution exactly (no scaling/distortion)
    const certificateImageDataUrl = await renderCertificateToDataURL({
      templateImageUrl,
      textLayers,
      photoLayers: photoLayersForRender, // Add photo layers to rendering
      // width & height omitted → auto-detect from template
    });
    
    // CRITICAL FIX: Upload to Supabase Storage BEFORE saving to database
    console.log('📤 Uploading certificate WebP to Supabase Storage...');
    // CRITICAL: Add timestamp to filename to prevent Supabase CDN cache collision
    // Without timestamp, regenerating same cert_no will be served from CDN cache (old version)
    const timestamp = Date.now();
    const fileName = `${finalCertificateNo.replace(/[^a-zA-Z0-9-_]/g, '_')}_${timestamp}.webp`;
    const uploadResponse = await fetch('/api/upload-to-storage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageData: certificateImageDataUrl,
        fileName: fileName,
        bucketName: 'certificates',
      }),
    });
    
    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`Failed to upload certificate to storage: ${errorText}`);
    }
    
    const uploadResult = await uploadResponse.json();
    if (!uploadResult.success) {
      throw new Error(`Upload failed: ${uploadResult.error}`);
    }
    
    const finalCertificateImageUrl = uploadResult.url;
    console.log('✅ Certificate PNG uploaded to Supabase Storage:', finalCertificateImageUrl);
    
    // Prepare certificate text layers for database (includes text data)
    // Remove textAlign for certificate_no and issue_date (they always use left alignment)
    const certificateTextLayers: CertificateTextLayer[] = textLayers.map(layer => {
      const baseLayer = {
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
        maxWidth: layer.maxWidth,
        lineHeight: layer.lineHeight,
      };
      // Only include textAlign if it's not certificate_no or issue_date
      if (layer.id !== 'certificate_no' && layer.id !== 'issue_date') {
        return { ...baseLayer, textAlign: layer.textAlign };
      }
      return baseLayer;
    });
    
    // Create certificate data to save (use finalCertData which has auto-generated values)
    const certificateDataToSave: CreateCertificateData = {
      certificate_no: finalCertData.certificate_no,
      name: member.name.trim(),
      description: finalCertData.description.trim() || undefined,
      issue_date: finalCertData.issue_date,
      expired_date: finalCertData.expired_date || undefined,
      category: template.category || undefined,
      template_id: template.id,
      member_id: member.id.startsWith('temp-') ? undefined : member.id, // Don't save temp IDs from Excel
      text_layers: certificateTextLayers,
      merged_image: finalCertificateImageUrl, // Supabase Storage URL
      certificate_image_url: finalCertificateImageUrl, // Supabase Storage URL
    };
    
    // Save certificate to database
    console.log('💾 Saving certificate to database...');
    const savedCertificate = await createCertificate(certificateDataToSave);
    console.log('✅ Certificate created successfully:', savedCertificate.certificate_no);
    
    // DUAL TEMPLATE: Generate score certificate if template has score image and scoreData
    if (template.score_image_url && scoreData && Object.keys(scoreData).length > 0) {
      console.log('🎯 Generating score certificate for dual template...');
      console.log('👤 CRITICAL: Using member data:', {
        memberName: member.name,
        memberID: member.id,
        certificateNo: finalCertData.certificate_no
      });
      
      try {
        // Load score layout from database
        const scoreLayoutConfig = layoutConfig?.score;
        
        if (scoreLayoutConfig && scoreLayoutConfig.textLayers) {
          console.log('✅ Score layout found, generating score certificate...');
          console.log('📋 Score text layers to process:', scoreLayoutConfig.textLayers.length);
          
          // Migrate score layers: ensure dual coordinates
          const migratedScoreLayers = scoreLayoutConfig.textLayers.map(layer => ({
            ...layer,
            // CRITICAL: Ensure absolute coordinates exist (convert from percentage if needed)
            x: layer.x !== undefined ? layer.x : (layer.xPercent || 0) * STANDARD_CANVAS_WIDTH,
            y: layer.y !== undefined ? layer.y : (layer.yPercent || 0) * STANDARD_CANVAS_HEIGHT,
            // CRITICAL: Ensure percentage coordinates exist (convert from absolute if needed)
            xPercent: layer.xPercent !== undefined ? layer.xPercent : (layer.x || 0) / STANDARD_CANVAS_WIDTH,
            yPercent: layer.yPercent !== undefined ? layer.yPercent : (layer.y || 0) / STANDARD_CANVAS_HEIGHT,
            maxWidth: layer.maxWidth || 300,
            lineHeight: layer.lineHeight || 1.2,
          }));
          console.log('✅ Migrated score layers with dual coordinates');
          
          // Load score photo layers from layout config
          const scorePhotoLayersRaw = scoreLayoutConfig.photoLayers || [];
          const scorePhotoLayersForRender = scorePhotoLayersRaw.map(layer => ({
            id: layer.id,
            type: layer.type,
            src: layer.src,
            x: layer.x,
            y: layer.y,
            xPercent: layer.xPercent,
            yPercent: layer.yPercent,
            width: layer.width,
            height: layer.height,
            widthPercent: layer.widthPercent,
            heightPercent: layer.heightPercent,
            zIndex: layer.zIndex,
            fitMode: layer.fitMode,
            opacity: layer.opacity,
            rotation: layer.rotation,
            crop: layer.crop,
            mask: layer.mask
          }));
          
          // Prepare score text layers with scoreData
          const scoreTextLayers: RenderTextLayer[] = migratedScoreLayers.map((layer: TextLayerConfig) => {
            let text = '';
            
            // Check if layer uses default text
            if (layer.useDefaultText && layer.defaultText) {
              text = layer.defaultText;
            } else if (scoreData[layer.id]) {
              // Use score data from user input
              text = scoreData[layer.id];
            } else {
              // Map common fields (name, date, etc.)
              if (layer.id === 'name') {
                text = member.name;
                console.log('✨ Setting name layer:', { layerId: layer.id, text, memberName: member.name });
              }
              else if (layer.id === 'certificate_no') text = finalCertData.certificate_no || '';
              else if (layer.id === 'issue_date' || layer.id === 'score_date') {
                text = formatDateString(finalCertData.issue_date, dateFormat);
              } else if (layer.id === 'expired_date' || layer.id === 'expiry_date') {
                // Add support for expired/expiry date
                text = finalCertData.expired_date ? formatDateString(finalCertData.expired_date, dateFormat) : '';
              } else if (layer.defaultText) {
                text = layer.defaultText;
              }
            }
            
            // Debug logging for each layer
            console.log(`📝 Score layer [${layer.id}]:`, {
              id: layer.id,
              text: text || '(empty)',
              textAlign: layer.textAlign,
              x: layer.x,
              y: layer.y,
              xPercent: layer.xPercent,
              yPercent: layer.yPercent,
              useDefaultText: layer.useDefaultText,
              defaultText: layer.defaultText,
              hasScoreData: !!scoreData[layer.id]
            });
            
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
              textAlign: layer.textAlign,
              maxWidth: layer.maxWidth,
              lineHeight: layer.lineHeight,
              richText: layer.richText, // CRITICAL: Pass richText for inline formatting
              hasInlineFormatting: layer.hasInlineFormatting, // CRITICAL: Flag to use rich text renderer
            };
          });
          
          console.log('📊 Score text layers:', scoreTextLayers.map(l => ({ id: l.id, text: l.text })));
          
          // Render score certificate with DYNAMIC CANVAS SIZE
          // Uses score template's natural dimensions (no scaling)
          const scoreImageDataUrl = await renderCertificateToDataURL({
            templateImageUrl: template.score_image_url,
            textLayers: scoreTextLayers,
            photoLayers: scorePhotoLayersForRender,
            // width & height omitted → auto-detect from template
          });
          
          // CRITICAL FIX: Upload score WebP to Supabase Storage
          console.log('📤 Uploading score WebP to Supabase Storage...');
          // CRITICAL: Use same timestamp as certificate to keep them paired
          const scoreFileName = `${finalCertificateNo.replace(/[^a-zA-Z0-9-_]/g, '_')}_${timestamp}_score.webp`;
          console.log('📁 Score file name:', scoreFileName);
          console.log('🔗 For member:', member.name, 'Certificate ID:', savedCertificate.id);
          
          const scoreUploadResponse = await fetch('/api/upload-to-storage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imageData: scoreImageDataUrl,
              fileName: scoreFileName,
              bucketName: 'certificates',
            }),
          });
          
          if (!scoreUploadResponse.ok) {
            const errorText = await scoreUploadResponse.text();
            throw new Error(`Failed to upload score certificate to storage: ${errorText}`);
          }
          
          const scoreUploadResult = await scoreUploadResponse.json();
          if (!scoreUploadResult.success) {
            throw new Error(`Score upload failed: ${scoreUploadResult.error}`);
          }
          
          const finalScoreImageUrl = scoreUploadResult.url;
          console.log('✅ Score WebP uploaded to Supabase Storage:', finalScoreImageUrl);
          
          // Update certificate with score_image_url (Supabase Storage URL)
          console.log('💾 Updating certificate with score URL:', {
            certificateID: savedCertificate.id,
            certificateNo: savedCertificate.certificate_no,
            memberName: member.name,
            scoreImageUrl: finalScoreImageUrl
          });
          
          const { error: updateError } = await supabaseClient
            .from('certificates')
            .update({ score_image_url: finalScoreImageUrl })
            .eq('id', savedCertificate.id);
          
          if (updateError) {
            console.error('❌ Failed to update score certificate:', updateError);
          } else {
            console.log('✅ Score certificate saved successfully');
          }
        } else {
          console.warn('⚠️ Score layout not configured, skipping score generation');
        }
      } catch (error) {
        console.error('❌ Failed to generate score certificate:', error);
        // Don't throw - main certificate is already saved
      }
    }
    
    // Refresh certificates list and wait for completion to prevent race condition
    await refresh();
    
    return savedCertificate;
  };

  const filtered = useMemo(() => {
    let filteredCerts = certificates;

    // Search filter - use debounced search input for better performance
    const searchQuery = (debouncedSearchInput || certQuery || "").toLowerCase();
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
  }, [certificates, debouncedSearchInput, certQuery, categoryFilter, dateFilter]);

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
  
  // Reset to first page when itemsPerPage changes (mobile/desktop switch)
  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage]);

  // Filter modal handlers
  const openFilterModal = () => {
    setTempCategoryFilter(categoryFilter);
    setTempDateFilter(dateFilter);
    setFilterModalOpen(true);
  };

  const applyFilters = () => {
    setCategoryFilter(tempCategoryFilter);
    setDateFilter(tempDateFilter);
    setFilterModalOpen(false);
  };

  const cancelFilters = () => {
    setTempCategoryFilter(categoryFilter);
    setTempDateFilter(dateFilter);
    setFilterModalOpen(false);
  };

  const clearFilters = () => {
    setTempCategoryFilter("");
    setTempDateFilter("");
  };

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

  // Ref for preview container to calculate actual dimensions
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [containerDimensions, setContainerDimensions] = useState<{ width: number; height: number } | null>(null);

  // Update container dimensions when it changes
  useEffect(() => {
    const updateDimensions = () => {
      if (previewContainerRef.current) {
        const rect = previewContainerRef.current.getBoundingClientRect();
        
        // CRITICAL: Calculate actual image display size considering object-contain behavior
        // The image maintains 800/600 aspect ratio and fits within the container
        const containerWidth = rect.width;
        const containerHeight = rect.height;
        const containerAspect = containerWidth / containerHeight;
        const imageAspect = STANDARD_CANVAS_WIDTH / STANDARD_CANVAS_HEIGHT; // 800/600 = 1.333...
        
        // Calculate actual image dimensions within container (object-contain behavior)
        let imageDisplayWidth = containerWidth;
        let imageDisplayHeight = containerHeight;
        
        if (containerAspect > imageAspect) {
          // Container is wider than image aspect ratio - height is the constraint
          imageDisplayWidth = containerHeight * imageAspect;
          imageDisplayHeight = containerHeight;
        } else {
          // Container is taller than image aspect ratio - width is the constraint
          imageDisplayWidth = containerWidth;
          imageDisplayHeight = containerWidth / imageAspect;
        }
        
        const dimensions = { 
          width: imageDisplayWidth, 
          height: imageDisplayHeight 
        };
        
        console.log('📐 Container dimensions updated:', {
          container: { width: containerWidth, height: containerHeight },
          imageDisplay: dimensions,
          containerAspect: containerAspect.toFixed(3),
          imageAspect: imageAspect.toFixed(3),
          scale: Math.min(dimensions.width / STANDARD_CANVAS_WIDTH, dimensions.height / STANDARD_CANVAS_HEIGHT).toFixed(3)
        });
        
        setContainerDimensions(dimensions);
      }
    };

    // CRITICAL FIX for mobile: Use requestAnimationFrame for initial layout calculation
    // This ensures dimensions are calculated after browser has finished layout
    const updateDimensionsWithRAF = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          updateDimensions();
        });
      });
    };
    
    // Immediate synchronous attempt first (for cases where container is already rendered)
    updateDimensions();
    
    // Initial update with multiple attempts to ensure accurate dimensions
    // Use requestAnimationFrame for better mobile compatibility
    updateDimensionsWithRAF();
    const timeout1 = setTimeout(updateDimensionsWithRAF, 16); // ~1 frame at 60fps
    const timeout2 = setTimeout(updateDimensionsWithRAF, 50);
    const timeout3 = setTimeout(updateDimensionsWithRAF, 100);
    const timeout4 = setTimeout(updateDimensionsWithRAF, 200);
    const timeout5 = setTimeout(updateDimensionsWithRAF, 500); // Extra delay for mobile
    const timeout6 = setTimeout(updateDimensionsWithRAF, 1000); // Additional delay for slower mobile devices
    
    // Update on window resize
    window.addEventListener('resize', updateDimensionsWithRAF);
    
    // Use ResizeObserver for more accurate tracking
    const resizeObserver = new ResizeObserver(() => {
      // Use requestAnimationFrame for better timing on mobile
      requestAnimationFrame(() => {
        updateDimensions();
      });
    });
    
    if (previewContainerRef.current) {
      resizeObserver.observe(previewContainerRef.current);
    }
    
    // Also listen for image load events to recalculate dimensions
    const container = previewContainerRef.current;
    const imageLoadListeners: Array<{ img: HTMLImageElement; handler: () => void }> = [];
    
    if (container) {
      const images = container.querySelectorAll('img');
      images.forEach(img => {
        if (img.complete) {
          updateDimensionsWithRAF();
        } else {
          const handler = () => updateDimensionsWithRAF();
          img.addEventListener('load', handler, { once: true });
          imageLoadListeners.push({ img, handler });
        }
      });
    }
    
    return () => {
      clearTimeout(timeout1);
      clearTimeout(timeout2);
      clearTimeout(timeout3);
      clearTimeout(timeout4);
      clearTimeout(timeout5);
      clearTimeout(timeout6);
      window.removeEventListener('resize', updateDimensionsWithRAF);
      resizeObserver.disconnect();
      
      // Cleanup image load listeners
      imageLoadListeners.forEach(({ img, handler }) => {
        img.removeEventListener('load', handler);
      });
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

      toast.success(t("certificates.updateSuccess"));
      setIsEditOpen(null);
      setDraft(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("certificates.updateFailed"),
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
      toast.error(t("certificates.deleteNoPermission"));
      return;
    }

    const certificate = certificates.find((c) => c.id === id);
    const certificateName = certificate?.name || "this certificate";

    console.log("📋 Certificate to delete:", {
      id,
      name: certificateName,
      certificate_no: certificate?.certificate_no
    });

    const deleteMessage = t("certificates.deleteConfirm")
      .replace("{name}", certificateName)
      .replace("{number}", certificate?.certificate_no || "");

    const confirmed = await confirmToast(
      deleteMessage,
      { confirmText: t("common.delete"), tone: "destructive" }
    );

    if (confirmed) {
      try {
        console.log("✅ User confirmed deletion, starting delete process...");
        setDeletingCertificateId(id);
        await deleteCert(id);
        console.log("✅ Delete successful!");
        const successMessage = t("certificates.deleteSuccess")
          .replace("{name}", certificateName);
        toast.success(successMessage);
      } catch (error) {
        console.error("❌ Delete error:", error);
        toast.error(
          error instanceof Error
            ? error.message
            : t("certificates.deleteFailed"),
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

  async function _openMemberDetail(memberId: string | null) {
    if (!memberId) {
      toast.error(t('certificates.memberInfoNotAvailable'));
      return;
    }
    
    try {
      setLoadingMemberDetail(true);
      setMemberDetailOpen(true);
      const member = await getMember(memberId);
      setDetailMember(member);
    } catch (error) {
      console.error('Failed to load member details:', error);
      toast.error(t('certificates.loadMemberDetailsFailed'));
      setMemberDetailOpen(false);
    } finally {
      setLoadingMemberDetail(false);
    }
  }

  return (
    <ModernLayout>
      <section className="relative -mt-4 pb-6 sm:-mt-5 sm:pb-8 bg-gray-50 dark:bg-gray-900">
        <div className="w-full max-w-[1280px] mx-auto px-2 sm:px-3 lg:px-0 relative">
            {/* Header */}
            <div className="mb-3">
              <div className="flex flex-col gap-3 mb-4">
                {/* Title and Button Row - Horizontal on desktop, vertical on mobile */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-2">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-lg shadow-md flex-shrink-0 bg-blue-500">
                      <Award className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <h1 className="text-xl sm:text-3xl md:text-4xl font-bold text-[#2563eb] dark:text-blue-400">
                      {t("certificates.title")}
                    </h1>
                  </div>
                  
                  {/* Quick Generate Button */}
                  {(role === "Admin" || role === "Team") && (
                    <Button
                      onClick={handleOpenQuickGenerate}
                      className="gradient-primary text-white shadow-lg hover:shadow-xl flex items-center justify-center gap-2 w-full sm:w-auto"
                    >
                      <Zap className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span className="text-sm sm:text-base">{t("certificates.generate")}</span>
                    </Button>
                  )}
                </div>
                
                {/* Search and Filter Row */}
                <div className="flex gap-2">
                  <Input
                    placeholder={t("certificates.search")}
                    className="flex-1 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 text-sm sm:text-base"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                  />
                  <Button
                    onClick={openFilterModal}
                    variant="outline"
                    size="icon"
                    className={`flex-shrink-0 h-10 w-10 ${
                      categoryFilter || dateFilter
                        ? 'bg-green-500 hover:bg-green-600 text-white border-green-500'
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <Filter className="h-5 w-5" />
                  </Button>
                </div>
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
                  <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    {t("certificates.loading")}
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    {t("certificates.loadingMessage")}
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
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    {t("certificates.errorLoading")}
                  </h3>
                  <p className="text-gray-500 text-sm mb-6">{error}</p>
                  <Button
                    onClick={() => refresh()}
                    className="bg-[#2563eb] text-white"
                  >
                    {t("certificates.tryAgain")}
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
              >
                {/* Desktop Table View */}
                <div className="hidden md:block bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-md dark:shadow-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50/50 dark:bg-gray-800/50">
                          <TableHead className="min-w-[180px]">{t("certificates.certificateId")}</TableHead>
                          <TableHead className="min-w-[200px]">{t("certificates.recipient")}</TableHead>
                          <TableHead className="min-w-[100px]">{t("certificates.category")}</TableHead>
                          <TableHead className="min-w-[140px]">{t("certificates.issuedDate")}</TableHead>
                          <TableHead className="min-w-[140px]">{t("certificates.expiryDate")}</TableHead>
                          <TableHead className="text-center min-w-[280px]">
                            {t("certificates.actions")}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {currentCertificates.map((certificate) => {
                          const isExpired = isCertificateExpired(certificate);
                          return (
                          <TableRow 
                            key={certificate.id}
                            onClick={() => openPreview(certificate)}
                            className={`cursor-pointer transition-colors ${
                              isExpired 
                                ? 'bg-red-500/30 dark:bg-red-600/30 border-b-2 border-red-400 dark:border-red-500 hover:bg-red-500/40 dark:hover:bg-red-600/40' 
                                : 'bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 hover:bg-blue-50/50 dark:hover:bg-gray-700/50'
                            } last:border-0`}
                          >
                            <TableCell className="font-medium text-gray-900 dark:text-gray-100">
                              {certificate.certificate_no}
                            </TableCell>
                            <TableCell className="text-gray-700 dark:text-gray-300">{certificate.name}</TableCell>
                            <TableCell className="text-gray-700 dark:text-gray-300">{certificate.category || "—"}</TableCell>
                            <TableCell className="text-gray-700 dark:text-gray-300">
                              {formatDateShort(certificate.issue_date)}
                            </TableCell>
                            <TableCell className="text-gray-700 dark:text-gray-300">
                              {certificate.expired_date
                                ? formatDateShort(certificate.expired_date)
                                : "—"}
                            </TableCell>
                            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex justify-end gap-2">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className={`border-gray-300 ${isCertificateExpired(certificate) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    disabled={isCertificateExpired(certificate)}
                                  >
                                    <Download className="w-4 h-4 mr-1" />
                                    {t("certificates.export")}
                                    <ChevronDown className="w-4 h-4 ml-1" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem 
                                    onClick={() => !isCertificateExpired(certificate) && exportToPDF(certificate)}
                                    disabled={isCertificateExpired(certificate) || exportingPDF === certificate.id}
                                    className={isCertificateExpired(certificate) ? 'opacity-50 cursor-not-allowed' : ''}
                                  >
                                    <FileText className="w-4 h-4 mr-2" />
                                    {exportingPDF === certificate.id 
                                      ? (language === 'id' ? 'Mengekspor PDF...' : 'Exporting PDF...')
                                      : t("certificates.exportPdf")}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => !isCertificateExpired(certificate) && exportToPNG(certificate)}
                                    disabled={isCertificateExpired(certificate) || exportingPNG === certificate.id}
                                    className={isCertificateExpired(certificate) ? 'opacity-50 cursor-not-allowed' : ''}
                                  >
                                    <ImageIcon className="w-4 h-4 mr-2" />
                                    {exportingPNG === certificate.id 
                                      ? (language === 'id' ? 'Mengunduh PNG...' : 'Downloading PNG...')
                                      : t("certificates.downloadPng")}
                                  </DropdownMenuItem>
                                  {certificate.certificate_image_url && (
                                    <DropdownMenuItem 
                                      onClick={() => !isCertificateExpired(certificate) && openSendEmailModal(certificate)}
                                      disabled={isCertificateExpired(certificate)}
                                      className={isCertificateExpired(certificate) ? 'opacity-50 cursor-not-allowed' : ''}
                                    >
                                      <FileText className="w-4 h-4 mr-2" />
                                      {t("certificates.sendEmail")}
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem 
                                    onClick={() => !isCertificateExpired(certificate) && generateCertificateLink(certificate)}
                                    disabled={isCertificateExpired(certificate) || generatingLink === certificate.id}
                                    className={isCertificateExpired(certificate) ? 'opacity-50 cursor-not-allowed' : ''}
                                  >
                                    <Link className="w-4 h-4 mr-2" />
                                    {generatingLink === certificate.id 
                                      ? (language === 'id' ? 'Membuat link...' : 'Generating link...')
                                      : t("certificates.generateLink")}
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
                                      {t("certificates.deleting")}
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
                          );
                        })}
                    </TableBody>
                  </Table>
                </div>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-3">
                  {currentCertificates.map((certificate) => {
                    const isExpired = isCertificateExpired(certificate);
                    return (
                    <div
                      key={certificate.id}
                      onClick={() => openPreview(certificate)}
                      className={`rounded-lg border p-3 sm:p-4 shadow-md dark:shadow-lg cursor-pointer transition-colors ${
                        isExpired 
                          ? 'bg-red-500/30 dark:bg-red-600/30 border-2 border-red-400 dark:border-red-500 hover:bg-red-500/40 dark:hover:bg-red-600/40' 
                          : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-blue-50/50 dark:hover:bg-gray-700/50'
                      }`}
                    >
                      {/* Certificate Details - Grid 2 Columns */}
                      <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 mb-3">
                        {/* Certificate Number */}
                        <div className="space-y-0.5">
                          <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                            {t("certificates.certificateId")}
                          </div>
                          <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                            {certificate.certificate_no}
                          </div>
                        </div>

                        {/* Recipient */}
                        <div className="space-y-0.5">
                          <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                            {t("certificates.recipient")}
                          </div>
                          <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">
                            {certificate.name}
                          </div>
                        </div>

                        {/* Category */}
                        <div className="space-y-0.5">
                          <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                            {t("certificates.category")}
                          </div>
                          <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                            {certificate.category || "—"}
                          </div>
                        </div>

                        {/* Issued Date */}
                        <div className="space-y-0.5">
                          <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                            {t("certificates.issuedDate")}
                          </div>
                          <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                            {formatReadableDate(certificate.issue_date, language)}
                          </div>
                        </div>

                        {/* Expiry Date */}
                        {certificate.expired_date && (
                          <div className="space-y-0.5 col-span-2">
                            <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                              {t("certificates.expiryDate")}
                            </div>
                            <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                              {formatReadableDate(certificate.expired_date, language)}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons - Grid 2 Columns Mobile, 4 Columns Desktop */}
                      <div className="pt-3 border-t border-gray-200 dark:border-gray-700" onClick={(e) => e.stopPropagation()}>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className={`border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-xs h-8 w-full ${isCertificateExpired(certificate) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                disabled={isCertificateExpired(certificate)}
                              >
                                <Download className="w-3 h-3 mr-1" />
                                {t("certificates.export")}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem 
                                onClick={() => !isCertificateExpired(certificate) && exportToPDF(certificate)}
                                disabled={isCertificateExpired(certificate) || exportingPDF === certificate.id}
                                className={isCertificateExpired(certificate) ? 'opacity-50 cursor-not-allowed' : ''}
                              >
                                <FileText className="w-4 h-4 mr-2" />
                                {exportingPDF === certificate.id 
                                  ? (language === 'id' ? 'Mengekspor PDF...' : 'Exporting PDF...')
                                  : t("certificates.exportPdf")}
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => !isCertificateExpired(certificate) && exportToPNG(certificate)}
                                disabled={isCertificateExpired(certificate) || exportingPNG === certificate.id}
                                className={isCertificateExpired(certificate) ? 'opacity-50 cursor-not-allowed' : ''}
                              >
                                <ImageIcon className="w-4 h-4 mr-2" />
                                {exportingPNG === certificate.id 
                                  ? (language === 'id' ? 'Mengunduh PNG...' : 'Downloading PNG...')
                                  : t("certificates.downloadPng")}
                              </DropdownMenuItem>
                              {certificate.certificate_image_url && (
                                <DropdownMenuItem 
                                  onClick={() => !isCertificateExpired(certificate) && openSendEmailModal(certificate)}
                                  disabled={isCertificateExpired(certificate)}
                                  className={isCertificateExpired(certificate) ? 'opacity-50 cursor-not-allowed' : ''}
                                >
                                  <FileText className="w-4 h-4 mr-2" />
                                  {t("certificates.sendEmail")}
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem 
                                onClick={() => !isCertificateExpired(certificate) && generateCertificateLink(certificate)}
                                disabled={isCertificateExpired(certificate) || generatingLink === certificate.id}
                                className={isCertificateExpired(certificate) ? 'opacity-50 cursor-not-allowed' : ''}
                              >
                                <Link className="w-4 h-4 mr-2" />
                                {generatingLink === certificate.id 
                                  ? (language === 'id' ? 'Membuat link...' : 'Generating link...')
                                  : t("certificates.generateLink")}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>

                          {(role === "Admin" || role === "Team") && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-xs h-8"
                              onClick={() => openEdit(certificate)}
                            >
                              <Edit className="w-3 h-3 mr-1" />
                              {t("common.edit")}
                            </Button>
                          )}
                          
                          {canDelete && (
                            <button
                              className="inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-lg text-xs font-medium transition-all duration-200 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-3 h-8 shadow-sm hover:shadow-md"
                              onClick={() => requestDelete(certificate.id)}
                              disabled={deletingCertificateId === certificate.id}
                              style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                            >
                              {deletingCertificateId === certificate.id ? (
                                <>
                                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                  <span className="hidden sm:inline">Deleting...</span>
                                </>
                              ) : (
                                <>
                                  <Trash2 className="w-3 h-3" />
                                  <span>{t("common.delete")}</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                  })}
                </div>
              </motion.div>
            )}

            {/* Pagination Controls */}
            {!loading && !error && filtered.length > 0 && (
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mt-4 px-2">
                <div className="text-xs sm:text-sm text-gray-500">
                  {t("certificates.showing")
                    .replace("{start}", String(indexOfFirstItem + 1))
                    .replace("{end}", String(Math.min(indexOfLastItem, filtered.length)))
                    .replace("{total}", String(filtered.length))}
                  {(searchInput || categoryFilter || dateFilter) && (
                    <span className="ml-1 text-gray-400 hidden sm:inline">
                      {t("certificates.filteredFrom").replace("{total}", String(certificates.length))}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    {t("certificates.previous")}
                  </Button>
                  <div className="text-sm text-gray-600 dark:text-gray-400 px-3">
                    {t("certificates.page")
                      .replace("{current}", String(currentPage))
                      .replace("{total}", String(totalPages))}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                  >
                    {t("certificates.next")}
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
                  {t("certificates.noCertificates")}
                </h3>
                <p className="text-gray-500 mb-6">
                  {t("certificates.noCertificatesMessage")}
                </p>
                {(role === "Admin" || role === "Team") && (
                  <Button
                    onClick={() => (window.location.href = "/templates")}
                    className="gradient-primary text-white shadow-lg hover:shadow-xl"
                  >
                    <FileText className="w-5 h-5 mr-2" />
                    {t("certificates.create")}
                  </Button>
                )}
              </motion.div>
            )}
        </div>
      </section>

      {/* Edit Certificate Dialog */}
      <Dialog
        open={!!isEditOpen}
        onOpenChange={(o) => setIsEditOpen(o ? isEditOpen : null)}
      >
        <DialogContent className="w-[95vw] sm:w-auto sm:max-w-6xl max-h-[92vh] overflow-hidden flex flex-col p-0 gap-0 data-[state=open]:bg-white data-[state=open]:dark:bg-gray-800">
          {/* Header */}
          <DialogHeader className="px-5 pt-4 pb-3 pr-12 border-b border-gray-200 dark:border-gray-700">
            <DialogTitle className="text-base font-semibold text-gray-900 dark:text-gray-100">
              {t('certificates.editCertificate')}
            </DialogTitle>
          </DialogHeader>
          
          {/* Content */}
          <div className="flex-1 overflow-y-auto px-4 py-3">
            <div className="space-y-2.5">
              {/* Certificate Number */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                  {t('certificates.certificateId')}
                </label>
                <Input
                  value={draft?.certificate_no ?? ""}
                  onChange={(e) =>
                    setDraft((d) =>
                      d ? { ...d, certificate_no: e.target.value } : d,
                    )
                  }
                  className="h-8 text-sm bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                  placeholder="251102038"
                />
              </div>

              {/* Recipient */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                  {t('certificates.recipient')}
                </label>
                <Input
                  value={draft?.name ?? ""}
                  onChange={(e) =>
                    setDraft((d) => (d ? { ...d, name: e.target.value } : d))
                  }
                  className="h-8 text-sm bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                  placeholder="Naufal Hafizh Ghani Afandi"
                />
              </div>

              {/* Category & Issue Date */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                    {t('certificates.category')}
                  </label>
                  <select
                    value={draft?.category ?? ""}
                    onChange={(e) =>
                      setDraft((d) => (d ? { ...d, category: e.target.value } : d))
                    }
                    className="h-8 w-full px-3 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">{t('certificates.selectCategoryOption')}</option>
                    <option value="MoU">MoU</option>
                    <option value="Magang">Magang</option>
                    <option value="Pelatihan">Pelatihan</option>
                    <option value="Kunjungan Industri">Kunjungan Industri</option>
                    <option value="Sertifikat">Sertifikat</option>
                    <option value="Surat">Surat</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                    {t('certificates.issuedDate')}
                  </label>
                  <Input
                    type="date"
                    value={draft?.issue_date ?? ""}
                    onChange={(e) =>
                      setDraft((d) =>
                        d ? { ...d, issue_date: e.target.value } : d,
                      )
                    }
                    className="h-8 text-sm bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                  />
                </div>
              </div>

              {/* Expiry Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                  {t('certificates.expiryDate')}
                </label>
                <Input
                  type="date"
                  value={draft?.expired_date ?? ""}
                  onChange={(e) =>
                    setDraft((d) =>
                      d ? { ...d, expired_date: e.target.value } : d,
                    )
                  }
                  className="h-8 text-sm bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                  {t('certificates.description')}
                </label>
                <textarea
                  value={draft?.description ?? ""}
                  onChange={(e) =>
                    setDraft((d) =>
                      d ? { ...d, description: e.target.value } : d,
                    )
                  }
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none"
                  rows={2}
                  placeholder={t('certificates.descriptionPlaceholder')}
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-2">
            <Button
              className="h-8 px-3 text-sm gradient-primary text-white shadow-sm hover:shadow-md transition-shadow"
              onClick={submitEdit}
            >
              {t('certificates.saveChanges')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Certificate Preview Modal */}
      <Dialog
        open={!!previewCertificate}
        onOpenChange={(o) =>
          setPreviewCertificate(o ? previewCertificate : null)
        }
      >
        <DialogContent 
          className="preview-modal-content relative max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 p-4 sm:p-6"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              setPreviewCertificate(null);
            }
          }}
        >
          <DialogHeader className="space-y-1 sm:space-y-1.5 flex-shrink-0 pb-2 sm:pb-4">
            <DialogTitle className="text-xl sm:text-2xl font-bold text-gradient dark:text-white">
              {t("certificates.preview")}
            </DialogTitle>
          </DialogHeader>
          <div 
            className="flex-1 space-y-4 sm:space-y-6 md:space-y-8 pr-1 -mr-1 scrollbar-smooth" 
            style={{ 
              scrollbarGutter: 'stable', 
              overflowY: 'hidden',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            {previewCertificate && (
              <>
                {/* Certificate Info */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
                  <div className="space-y-4 sm:space-y-6">
                    <div className="space-y-2 sm:space-y-3">
                      <label className="text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
                        Certificate Number
                      </label>
                      <div className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100 break-words">
                        {previewCertificate.certificate_no}
                      </div>
                    </div>

                    <div className="space-y-2 sm:space-y-3">
                      <label className="text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
                        Recipient Name
                      </label>
                      <div className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100 break-words">
                        {previewCertificate.name}
                      </div>
                    </div>

                    {previewCertificate.category && (
                      <div className="space-y-2 sm:space-y-3">
                        <label className="text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
                          Category
                        </label>
                        <div className="inline-block px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-[#2563eb] text-white text-sm sm:text-base font-medium">
                          {previewCertificate.category}
                        </div>
                      </div>
                    )}

                    {previewCertificate.description && (
                      <div className="space-y-2 sm:space-y-3">
                        <label className="text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
                          Description
                        </label>
                        <div className="text-sm sm:text-base text-gray-700 dark:text-gray-300 leading-relaxed break-words">
                          {previewCertificate.description}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                      <div className="space-y-1 sm:space-y-2">
                        <label className="text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
                          {t('hero.issued')}
                        </label>
                        <div className="text-sm sm:text-base md:text-lg text-gray-700 dark:text-gray-300">
                          {formatDateShort(previewCertificate.issue_date)}
                        </div>
                      </div>
                      {previewCertificate.expired_date && (
                        <div className="space-y-1 sm:space-y-2">
                          <label className="text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
                            {t('hero.expires')}
                          </label>
                          <div className="text-sm sm:text-base md:text-lg text-gray-700 dark:text-gray-300">
                            {formatDateShort(previewCertificate.expired_date)}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Certificate / Score Preview */}
                  <div className="space-y-2 sm:space-y-4">
                    <label className="text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
                      {t('hero.certificate')}
                    </label>
                    {/* Toggle for dual templates - only show if score image exists */}
                    {previewTemplate && (previewTemplate.is_dual_template) && previewCertificate?.score_image_url && (
                      <div className="flex gap-2 mb-2">
                        <button
                          onClick={() => setPreviewMode('certificate')}
                          className={`px-2 sm:px-3 py-1 text-xs font-medium rounded-md transition-colors focus:outline-none ${previewMode === 'certificate' ? 'bg-white text-gray-900 dark:bg-gray-700 dark:text-gray-100 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'}`}
                        >
                          Certificate
                        </button>
                        <button
                          onClick={() => setPreviewMode('score')}
                          className={`px-2 sm:px-3 py-1 text-xs font-medium rounded-md transition-colors focus:outline-none ${previewMode === 'score' ? 'bg-white text-gray-900 dark:bg-gray-700 dark:text-gray-100 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'}`}
                        >
                          Score
                        </button>
                      </div>
                    )}
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-6 border-2 border-dashed border-blue-200 dark:border-blue-500/40">
                      <div
                        ref={previewContainerRef}
                        className="bg-white dark:bg-gray-950 rounded-lg sm:rounded-xl shadow-xl relative"
                        style={{
                          width: "100%",
                          maxWidth: "100%",
                          aspectRatio: "800 / 600",
                          minHeight: 200,
                          maxHeight: "min(50vh, calc(100vw * 600 / 800))", // Ensure aspect ratio is maintained even with maxHeight
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
                            const isExpired = previewMode === 'certificate' && previewCertificate ? isCertificateExpired(previewCertificate) : false;
                            const expiredOverlayUrl = isExpired ? getExpiredOverlayUrl() : null;
                            return (
                              <>
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
                                {/* Expired Overlay - Same as /search */}
                                {isExpired && expiredOverlayUrl && (
                                  <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden flex items-center justify-center">
                                    <img
                                      src={expiredOverlayUrl}
                                      alt="Expired"
                                      className="max-w-full max-h-full"
                                      style={{
                                        objectFit: 'contain',
                                        opacity: 0.85,
                                        pointerEvents: 'none',
                                        width: 'auto',
                                        height: 'auto',
                                      }}
                                      onError={(e) => {
                                        console.error('Failed to load expired overlay image:', expiredOverlayUrl);
                                        e.currentTarget.style.display = 'none';
                                      }}
                                      onLoad={() => {
                                        console.log('Expired overlay image loaded successfully');
                                      }}
                                    />
                                  </div>
                                )}
                                {/* Debug overlay indicator - Same as /search */}
                                {isExpired && !expiredOverlayUrl && (
                                  <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center bg-red-500/20">
                                    <div className="text-xs text-red-600 dark:text-red-400 font-bold">EXPIRED</div>
                                  </div>
                                )}
                              </>
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

                            {/* CRITICAL: Only render text overlay for certificate if NO generated PNG exists (showing template preview)
                                If certificate_image_url exists, the generated PNG already has text baked in - don't overlay! */}
                            {previewMode === 'certificate' && !previewCertificate?.certificate_image_url && previewCertificate.text_layers &&
                              previewCertificate.text_layers.map(
                                (layer: CertificateTextLayer) => {
                                  // CRITICAL: Prioritize absolute coordinates (x, y) to match rendering logic
                                  // Fallback to percentage (xPercent, yPercent) for backward compatibility with old layers
                                  
                                  // Calculate container scale for positioning
                                  let containerScale = 1;
                                  let hasValidDimensions = false;
                                  
                                  // Try to get dimensions from state first
                                  if (containerDimensions && containerDimensions.width > 0 && containerDimensions.height > 0) {
                                    const widthScale = containerDimensions.width / STANDARD_CANVAS_WIDTH;
                                    const heightScale = containerDimensions.height / STANDARD_CANVAS_HEIGHT;
                                    containerScale = Math.min(widthScale, heightScale);
                                    hasValidDimensions = true;
                                  }
                                  
                                  // Fallback: Calculate from actual container DOM element
                                  if (!hasValidDimensions && previewContainerRef.current) {
                                    const rect = previewContainerRef.current.getBoundingClientRect();
                                    
                                    // Only use if rect has valid dimensions (not 0 or very small)
                                    if (rect.width > 10 && rect.height > 10) {
                                      const containerWidth = rect.width;
                                      const containerHeight = rect.height;
                                      const containerAspect = containerWidth / containerHeight;
                                      const imageAspect = STANDARD_CANVAS_WIDTH / STANDARD_CANVAS_HEIGHT;
                                      
                                      let imageDisplayWidth = containerWidth;
                                      let imageDisplayHeight = containerHeight;
                                      
                                      if (containerAspect > imageAspect) {
                                        imageDisplayWidth = containerHeight * imageAspect;
                                        imageDisplayHeight = containerHeight;
                                      } else {
                                        imageDisplayWidth = containerWidth;
                                        imageDisplayHeight = containerWidth / imageAspect;
                                      }
                                      
                                      const widthScale = imageDisplayWidth / STANDARD_CANVAS_WIDTH;
                                      const heightScale = imageDisplayHeight / STANDARD_CANVAS_HEIGHT;
                                      containerScale = Math.min(widthScale, heightScale);
                                      hasValidDimensions = true;
                                    }
                                  }
                                  
                                  // CRITICAL: If still no valid dimensions, use conservative mobile-friendly fallback
                                  // Mobile viewport is typically 320-430px wide, so scale would be ~0.4-0.5
                                  // Use 0.4 as safe fallback to prevent oversized text
                                  if (!hasValidDimensions || containerScale <= 0 || isNaN(containerScale) || !isFinite(containerScale)) {
                                    // Estimate mobile scale: typical mobile width ~375px, maxHeight 50vh ~400px
                                    // Container will be constrained by width, so: 375 / 800 = 0.47
                                    // Use slightly more conservative value to be safe
                                    const estimatedMobileScale = typeof window !== 'undefined' && window.innerWidth < 768
                                      ? Math.min(window.innerWidth / STANDARD_CANVAS_WIDTH, (window.innerHeight * 0.5) / STANDARD_CANVAS_HEIGHT)
                                      : 0.4;
                                    containerScale = Math.max(0.2, Math.min(1.0, estimatedMobileScale)); // Clamp between 0.2 and 1.0
                                    console.warn('⚠️ Using fallback containerScale:', containerScale, 'for layer:', layer.id);
                                  }
                                  
                                  // CRITICAL: Use absolute coordinates with scaleFactor (matching certificate-render.ts)
                                  // Fallback to percentage for backward compatibility with old layers
                                  const actualX = layer.x !== undefined && layer.x !== null
                                    ? `${layer.x * containerScale}px`  // Absolute with scale
                                    : `${(layer.xPercent || 0) * 100}%`; // Fallback percentage
                                  
                                  const actualY = layer.y !== undefined && layer.y !== null
                                    ? `${layer.y * containerScale}px`  // Absolute with scale
                                    : `${(layer.yPercent || 0) * 100}%`; // Fallback percentage
                                  
                                  const scaledFontSize = layer.fontSize * containerScale;
                                  const scaledMaxWidth = layer.maxWidth ? layer.maxWidth * containerScale : undefined;

                                  // CRITICAL FIX: Match configure page transform behavior based on textAlign
                                  // Configure page uses:
                                  // - center: translate(-50%, -50%) → (x,y) is the CENTER
                                  // - right: translate(-100%, -50%) → (x,y) is the RIGHT edge, center Y
                                  // - left: translate(0%, -50%) → (x,y) is the LEFT edge, center Y
                                  const textAlign = (layer.id === 'certificate_no' || layer.id === 'issue_date') 
                                    ? 'left' 
                                    : (layer.textAlign || 'left');
                                  
                                  const getTransform = () => {
                                    if (textAlign === 'center') return 'translate(-50%, -50%)';
                                    if (textAlign === 'right') return 'translate(-100%, -50%)';
                                    // For left: Use simple percentage-based transform (uniform for all layers)
                                    return 'translate(0%, -50%)';
                                  };

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
                                        textAlign: textAlign,
                                        whiteSpace: scaledMaxWidth ? 'normal' : 'nowrap',
                                        width: scaledMaxWidth ? `${scaledMaxWidth}px` : 'auto',
                                        lineHeight: layer.lineHeight || 1.2,
                                        wordWrap: 'break-word',
                                        overflowWrap: 'break-word',
                                        userSelect: "none",
                                        pointerEvents: "none",
                                        transform: getTransform(),
                                      }}
                                    >
                                      {layer.text}
                                    </div>
                                  );
                                },
                              )}

                            {/* CRITICAL: Only render text overlay for score if NO generated PNG exists (showing template preview)
                                If score_image_url exists, the generated PNG already has text baked in - don't overlay! */}
                            {previewMode === 'score' && !previewCertificate?.score_image_url && scoreDefaults && scoreDefaults.textLayers && scoreDefaults.textLayers.map((layer: TextLayerDefault) => {
                              // CRITICAL: Prioritize absolute coordinates (x, y) to match rendering logic
                              // Fallback to percentage (xPercent, yPercent) for backward compatibility
                              
                              // Decide content: try to map known IDs to certificate data, otherwise show placeholder id
                              let content = '';
                              if (layer.id === 'pembina_nama') content = previewCertificate.members?.name || previewCertificate.created_by || '';
                              else if (layer.id === 'score_date') content = previewCertificate.issue_date ? new Date(previewCertificate.issue_date).toLocaleDateString() : '';
                              else if (layer.id === 'nilai_prestasi') content = '';
                              else content = layer.id.replace(/_/g, ' ');

                              // CRITICAL: Use absolute coordinates with scaleFactor (matching certificate-render.ts)
                              // Fallback to percentage for backward compatibility with old layers
                              // Also includes robust fallback calculation for mobile initial render
                              let containerScale = 1;
                              let hasValidDimensions = false;
                              
                              // Try to get dimensions from state first
                              if (containerDimensions && containerDimensions.width > 0 && containerDimensions.height > 0) {
                                const widthScale = containerDimensions.width / STANDARD_CANVAS_WIDTH;
                                const heightScale = containerDimensions.height / STANDARD_CANVAS_HEIGHT;
                                containerScale = Math.min(widthScale, heightScale);
                                hasValidDimensions = true;
                              }
                              
                              // Fallback: Calculate from actual container DOM element
                              if (!hasValidDimensions && previewContainerRef.current) {
                                const rect = previewContainerRef.current.getBoundingClientRect();
                                
                                // Only use if rect has valid dimensions (not 0 or very small)
                                if (rect.width > 10 && rect.height > 10) {
                                  const containerWidth = rect.width;
                                  const containerHeight = rect.height;
                                  const containerAspect = containerWidth / containerHeight;
                                  const imageAspect = STANDARD_CANVAS_WIDTH / STANDARD_CANVAS_HEIGHT;
                                  
                                  let imageDisplayWidth = containerWidth;
                                  let imageDisplayHeight = containerHeight;
                                  
                                  if (containerAspect > imageAspect) {
                                    imageDisplayWidth = containerHeight * imageAspect;
                                    imageDisplayHeight = containerHeight;
                                  } else {
                                    imageDisplayWidth = containerWidth;
                                    imageDisplayHeight = containerWidth / imageAspect;
                                  }
                                  
                                  const widthScale = imageDisplayWidth / STANDARD_CANVAS_WIDTH;
                                  const heightScale = imageDisplayHeight / STANDARD_CANVAS_HEIGHT;
                                  containerScale = Math.min(widthScale, heightScale);
                                  hasValidDimensions = true;
                                }
                              }
                              
                              // CRITICAL: If still no valid dimensions, use conservative mobile-friendly fallback
                              if (!hasValidDimensions || containerScale <= 0 || isNaN(containerScale) || !isFinite(containerScale)) {
                                const estimatedMobileScale = typeof window !== 'undefined' && window.innerWidth < 768
                                  ? Math.min(window.innerWidth / STANDARD_CANVAS_WIDTH, (window.innerHeight * 0.5) / STANDARD_CANVAS_HEIGHT)
                                  : 0.4;
                                containerScale = Math.max(0.2, Math.min(1.0, estimatedMobileScale)); // Clamp between 0.2 and 1.0
                              }
                              
                              // CRITICAL: Use absolute coordinates with scaleFactor (matching certificate-render.ts)
                              // Fallback to percentage for backward compatibility with old layers
                              const actualX = layer.x !== undefined && layer.x !== null
                                ? `${layer.x * containerScale}px`  // Absolute with scale
                                : `${(layer.xPercent || 0) * 100}%`; // Fallback percentage
                              
                              const actualY = layer.y !== undefined && layer.y !== null
                                ? `${layer.y * containerScale}px`  // Absolute with scale
                                : `${(layer.yPercent || 0) * 100}%`; // Fallback percentage
                              
                              const scaledFontSize = layer.fontSize * containerScale;
                              const scaledMaxWidth = layer.maxWidth ? layer.maxWidth * containerScale : undefined;

                              // CRITICAL FIX: Match configure page transform behavior based on textAlign
                              // Configure page uses:
                              // - center: translate(-50%, -50%) → (x,y) is the CENTER
                              // - right: translate(-100%, -50%) → (x,y) is the RIGHT edge, center Y
                              // - left: translate(0%, -50%) → (x,y) is the LEFT edge, center Y
                              const textAlign = layer.textAlign || 'left';
                              const getTransform = () => {
                                if (textAlign === 'center') return 'translate(-50%, -50%)';
                                if (textAlign === 'right') return 'translate(-100%, -50%)';
                                return 'translate(0%, -50%)'; // left
                              };
                              
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
                                    textAlign: textAlign,
                                    whiteSpace: scaledMaxWidth ? 'normal' : 'nowrap',
                                    width: scaledMaxWidth ? `${scaledMaxWidth}px` : 'auto',
                                    lineHeight: layer.lineHeight || 1.2,
                                    wordWrap: 'break-word',
                                    overflowWrap: 'break-word',
                                    userSelect: "none",
                                    pointerEvents: "none",
                                    transform: getTransform(),
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
                                  <h3 className="text-2xl xl:text-3xl font-bold text-gray-800 dark:text-gray-100 mb-2">
                                     {t("certificates.certificateTitle")}
                                   </h3>
                                   <div className="w-16 xl:w-20 h-1 bg-[#2563eb] mx-auto rounded-full"></div>
                                 </div>
 
                                <p className="text-gray-600 dark:text-gray-400 mb-3 xl:mb-4">
                                   {t("certificates.certifyText")}
                                 </p>
                                <h4 className="text-xl xl:text-2xl font-bold text-gray-800 dark:text-gray-100 mb-3 xl:mb-4">
                                  {previewCertificate.name}
                                </h4>
                                {previewCertificate.description && (
                                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                                    {t("certificates.completedText")}
                                    <br />
                                    <span className="font-semibold">
                                      {previewCertificate.description}
                                    </span>
                                  </p>
                                )}
 
                                <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-400 mb-6">
                                  <div>
                                    <p className="font-semibold">
                                      {t("certificates.certificateNo")}
                                    </p>
                                    <p>{previewCertificate.certificate_no}</p>
                                  </div>
                                  <div>
                                    <p className="font-semibold">{t("certificates.issueDate")}</p>
                                    <p>
                                      {new Date(
                                        previewCertificate.issue_date,
                                      ).toLocaleDateString()}
                                    </p>
                                  </div>
                                </div>
 
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {t("certificates.fallbackPreview")}
                                </p>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-4 pt-4 sm:pt-6 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
                  <div className="flex flex-wrap gap-2">
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
                    {(role === "Admin" || role === "Team") && (
                      <Button
                        variant="outline"
                        className="border-blue-300 text-blue-600 hover:bg-blue-50 dark:border-blue-500/60 dark:text-blue-300 dark:hover:bg-blue-500/10 px-6"
                        onClick={() => {
                          setPreviewCertificate(null);
                          openEdit(previewCertificate);
                        }}
                      >
                        Edit Certificate
                      </Button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Send Certificate Email Modal */}
      <Dialog open={sendModalOpen} onOpenChange={setSendModalOpen}>
        <DialogContent 
          className="max-w-xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col p-4 sm:p-6"
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
          <DialogHeader className="flex-shrink-0 pb-2 sm:pb-4">
            <DialogTitle className="text-xl sm:text-2xl font-bold">{t('hero.sendEmailTitle')}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-3 sm:space-y-4 pr-1 -mr-1">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-white">{t('hero.recipientEmail')}</label>
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
              <label className="text-sm font-medium text-gray-700 dark:text-white">{t('hero.subject')}</label>
              <Input
                value={sendForm.subject}
                onChange={(e) => {
                  setSendForm((f) => ({ ...f, subject: e.target.value }));
                  if (sendFormErrors.subject) setSendFormErrors((e) => ({ ...e, subject: undefined }));
                }}
                placeholder={t('hero.emailSubjectPlaceholder')}
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
              <label className="text-sm font-medium text-gray-700 dark:text-white">{t('hero.message')}</label>
              <textarea
                value={sendForm.message}
                onChange={(e) => {
                  setSendForm((f) => ({ ...f, message: e.target.value }));
                  if (sendFormErrors.message) setSendFormErrors((e) => ({ ...e, message: undefined }));
                }}
                rows={4}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 ${sendFormErrors.message ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                placeholder={t('hero.emailMessagePlaceholder')}
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
                <label className="text-sm font-medium text-gray-700 dark:text-white">{t('hero.attachmentPreview')}</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="relative w-full h-48 sm:h-64">
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
                  <div className="relative w-full h-48 sm:h-64">
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
          </div>
            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4 border-t flex-shrink-0">
              <Button 
                variant="outline" 
                className="border-gray-300 w-full sm:w-auto" 
                onClick={() => setSendModalOpen(false)}
                disabled={isSendingEmail}
              >
                {t('hero.cancel')}
              </Button>
               <LoadingButton 
                 className="gradient-primary text-white shadow-lg hover:shadow-xl transition-all duration-300 w-full sm:w-auto" 
                 onClick={confirmSendEmail}
                 isLoading={isSendingEmail}
                 loadingText={t('hero.sending')}
                 variant="primary"
               >
                {t('hero.sendEmail')}
              </LoadingButton>
            </div>
        </DialogContent>
      </Dialog>

      {/* Member Detail Modal - Bottom Sheet for Mobile, Dialog for Desktop */}
      {memberDetailOpen && (
        <>
          {/* Mobile: Bottom Sheet */}
          <Sheet open={memberDetailOpen} onOpenChange={setMemberDetailOpen}>
            <SheetContent side="bottom" className="md:hidden max-h-[85vh] overflow-y-auto rounded-t-2xl">
              <div className="flex-shrink-0 mb-4">
                {/* Drag handle */}
                <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-4"></div>
                <SheetHeader>
                  <SheetTitle className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    Member Information
                  </SheetTitle>
                  <SheetDescription className="text-sm text-gray-600 dark:text-gray-400">
                    {detailMember?.name || 'Loading...'}
                  </SheetDescription>
                </SheetHeader>
              </div>
              <div className="overflow-y-auto">
                {loadingMemberDetail ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-full flex items-center justify-center mb-3 shadow-sm">
                      <div className="w-5 h-5 border-2 border-blue-500 dark:border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                    <span className="text-gray-600 dark:text-gray-400 text-sm font-medium">Loading...</span>
                  </div>
                ) : detailMember ? (
                  <div className="space-y-4 pb-4">
                    {/* Name & Email - Full width */}
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Full Name</label>
                        <div className="mt-1 text-base font-semibold text-gray-900 dark:text-gray-100 break-words">{detailMember.name}</div>
                      </div>
                      {detailMember.email && (
                        <div>
                          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Email</label>
                          <div className="mt-1 text-sm text-gray-900 dark:text-gray-100 break-words">{detailMember.email}</div>
                        </div>
                      )}
                    </div>

                    {/* Phone & Date of Birth - 2 columns */}
                    <div className="grid grid-cols-2 gap-3">
                      {detailMember.phone && (
                        <div>
                          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Phone</label>
                          <div className="mt-1 text-sm text-gray-900 dark:text-gray-100 break-words">{detailMember.phone}</div>
                        </div>
                      )}
                      {detailMember.date_of_birth && (
                        <div>
                          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Date of Birth</label>
                          <div className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                            {formatReadableDate(detailMember.date_of_birth, language)}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Organization & Job - 2 columns */}
                    <div className="grid grid-cols-2 gap-3">
                      {detailMember.organization && (
                        <div>
                          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Organization</label>
                          <div className="mt-1 text-sm text-gray-900 dark:text-gray-100 break-words">{detailMember.organization}</div>
                        </div>
                      )}
                      {detailMember.job && (
                        <div>
                          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Job / Position</label>
                          <div className="mt-1 text-sm text-gray-900 dark:text-gray-100 break-words">{detailMember.job}</div>
                        </div>
                      )}
                    </div>

                    {/* City - Full width or 2 columns */}
                    {detailMember.city && (
                      <div>
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400">City</label>
                        <div className="mt-1 text-sm text-gray-900 dark:text-gray-100">{detailMember.city}</div>
                      </div>
                    )}

                    {/* Address - Full width */}
                    {detailMember.address && (
                      <div>
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Address</label>
                        <div className="mt-1 text-sm text-gray-900 dark:text-gray-100 break-words leading-relaxed">{detailMember.address}</div>
                      </div>
                    )}

                    {/* Notes - Full width */}
                    {detailMember.notes && (
                      <div>
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Notes</label>
                        <div className="mt-1 text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words leading-relaxed">{detailMember.notes}</div>
                      </div>
                    )}

                    {/* Metadata */}
                    {(detailMember.created_at || detailMember.updated_at) && (
                      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                        <div className="grid grid-cols-2 gap-3 text-xs text-gray-500 dark:text-gray-400">
                          {detailMember.created_at && (
                            <div>
                              <span className="font-medium">Created:</span>{' '}
                              {formatReadableDate(detailMember.created_at, language)}
                            </div>
                          )}
                          {detailMember.updated_at && (
                            <div>
                              <span className="font-medium">Updated:</span>{' '}
                              {formatReadableDate(detailMember.updated_at, language)}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </SheetContent>
          </Sheet>

          {/* Desktop: Dialog */}
          <div className="hidden md:block">
          <Dialog open={memberDetailOpen} onOpenChange={setMemberDetailOpen}>
            <DialogContent className="hidden md:flex max-w-3xl w-full max-h-[90vh] overflow-hidden flex-col p-6">
              <DialogHeader className="flex-shrink-0 pb-4">
                <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  Member Information
                </DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto pr-1 -mr-1">
                {loadingMemberDetail ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-full flex items-center justify-center mb-4 shadow-sm">
                      <div className="w-6 h-6 border-2 border-blue-500 dark:border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                    <span className="text-gray-600 dark:text-gray-400 text-sm font-medium">Loading member details...</span>
                  </div>
                ) : detailMember ? (
                  <div className="mt-6">
                    <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                      {/* Name */}
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Full Name</label>
                        <div className="mt-1 text-base text-gray-900 dark:text-gray-100 break-words">{detailMember.name}</div>
                      </div>

                      {/* Email */}
                      {detailMember.email && (
                        <div>
                          <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</label>
                          <div className="mt-1 text-base text-gray-900 dark:text-gray-100 break-words">{detailMember.email}</div>
                        </div>
                      )}

                      {/* Phone */}
                      {detailMember.phone && (
                        <div>
                          <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Phone</label>
                          <div className="mt-1 text-base text-gray-900 dark:text-gray-100">{detailMember.phone}</div>
                        </div>
                      )}

                      {/* Organization */}
                      {detailMember.organization && (
                        <div>
                          <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Organization / School</label>
                          <div className="mt-1 text-base text-gray-900 dark:text-gray-100 break-words">{detailMember.organization}</div>
                        </div>
                      )}

                      {/* Job */}
                      {detailMember.job && (
                        <div>
                          <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Job / Position</label>
                          <div className="mt-1 text-base text-gray-900 dark:text-gray-100 break-words">{detailMember.job}</div>
                        </div>
                      )}

                      {/* Date of Birth */}
                      {detailMember.date_of_birth && (
                        <div>
                          <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Date of Birth</label>
                          <div className="mt-1 text-base text-gray-900 dark:text-gray-100">
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
                          <label className="text-sm font-medium text-gray-500 dark:text-gray-400">City</label>
                          <div className="mt-1 text-base text-gray-900 dark:text-gray-100">{detailMember.city}</div>
                        </div>
                      )}

                      {/* Address */}
                      {detailMember.address && (
                        <div className="col-span-2">
                          <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Address</label>
                          <div className="mt-1 text-base text-gray-900 dark:text-gray-100 break-words">{detailMember.address}</div>
                        </div>
                      )}

                      {/* Notes */}
                      {detailMember.notes && (
                        <div className="col-span-2">
                          <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Notes</label>
                          <div className="mt-1 text-base text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words">{detailMember.notes}</div>
                        </div>
                      )}
                    </div>

                    {/* Metadata */}
                    <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-500 dark:text-gray-400">
                        {detailMember.created_at && (
                          <div>
                            <span className="font-medium">Created:</span>{' '}
                            {formatReadableDate(detailMember.created_at, language)}
                          </div>
                        )}
                        {detailMember.updated_at && (
                          <div>
                            <span className="font-medium">Updated:</span>{' '}
                            {formatReadableDate(detailMember.updated_at, language)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </DialogContent>
          </Dialog>
          </div>
        </>
      )}

      {/* Quick Generate Modal */}
      <QuickGenerateModal
        open={quickGenerateOpen}
        onClose={() => setQuickGenerateOpen(false)}
        templates={templates}
        members={members}
        onGenerate={handleQuickGenerate}
      />

      {/* Filter Modal */}
      <Dialog open={filterModalOpen} onOpenChange={setFilterModalOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <DialogHeader className="border-b border-gray-200 dark:border-gray-700 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-blue-500" />
                <DialogTitle className="text-gray-900 dark:text-white">Filter</DialogTitle>
              </div>
              <button
                onClick={cancelFilters}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Category Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
              <select
                value={tempCategoryFilter}
                onChange={(e) => setTempCategoryFilter(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All</option>
                <option value="MoU">MoU</option>
                <option value="Internship">Internship</option>
                <option value="Training">Training</option>
                <option value="Seminar">Seminar</option>
                <option value="Visit">Visit</option>
              </select>
            </div>

            {/* Date Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Issue Date</label>
              <input
                type="date"
                value={tempDateFilter}
                onChange={(e) => setTempDateFilter(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button
              onClick={cancelFilters}
              variant="outline"
              className="flex-1 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </Button>
            <Button
              onClick={applyFilters}
              className="flex-1 gradient-primary text-white"
            >
              Apply
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
