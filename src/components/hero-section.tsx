"use client";

import { motion } from "framer-motion";
import { useState, useEffect, useCallback, useRef } from "react";
import { Input } from "@/components/ui/input";
import { getCertificateByNumber, getCertificateByPublicId, Certificate, advancedSearchCertificates, getCertificateCategories, SearchFilters } from "@/lib/supabase/certificates";
import { toast, Toaster } from "sonner";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { ArrowRight, Search, Download, ChevronDown, FileText, Link, Filter, X, Image as ImageIcon } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import { useRouter } from "next/navigation";
import { formatReadableDate } from "@/lib/utils/certificate-formatters";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
 

export default function HeroSection() {
  const { t, language } = useLanguage();
  const router = useRouter();
  const [certificateId, setCertificateId] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewCert, setPreviewCert] = useState<Certificate | null>(null);
  
  // New states for advanced search
  const [searchResults, setSearchResults] = useState<Certificate[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [filters, setFilters] = useState<SearchFilters>({
    keyword: "",
    category: "",
    startDate: "",
    endDate: "",
  });
  
  // Temporary filter values for modal
  const [tempCategory, setTempCategory] = useState("");
  const [tempStartDate, setTempStartDate] = useState("");
  const [tempEndDate, setTempEndDate] = useState("");
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>("");
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
  
  // Refs and state for scrollable area height calculation
  const resultsHeaderRef = useRef<HTMLDivElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);
  const [scrollableHeight, setScrollableHeight] = useState<string>('calc(80vh - 7rem)');
  
  // Calculate scrollable area height dynamically with proper measurement
  useEffect(() => {
    if (showResults && searchResults.length > 0) {
      const calculateHeight = () => {
        if (resultsHeaderRef.current && resultsContainerRef.current) {
          // Measure actual rendered heights
          const headerHeight = resultsHeaderRef.current.offsetHeight;
          const containerMaxHeight = window.innerHeight * 0.8 - 32; // 80vh - 2rem (mt-2)
          
          // Calculate available height: container max height minus header
          // Use actual container height if available for more accuracy
          const actualContainerHeight = resultsContainerRef.current.offsetHeight || containerMaxHeight;
          
          // Calculate available height: use full available space
          // No buffer reduction to maximize scroll area height
          const availableHeight = actualContainerHeight - headerHeight;
          
          // Set height with pixel value for accuracy
          setScrollableHeight(`${Math.max(availableHeight, 200)}px`);
        }
      };
      
      // Calculate multiple times to ensure accurate measurement
      const timeoutId1 = setTimeout(calculateHeight, 0);
      const timeoutId2 = setTimeout(calculateHeight, 50);
      
      // Use requestAnimationFrame for DOM measurement
      requestAnimationFrame(() => {
        calculateHeight();
        requestAnimationFrame(() => {
          calculateHeight();
        });
      });
      
      // Recalculate on window resize
      window.addEventListener('resize', calculateHeight);
      
      return () => {
        clearTimeout(timeoutId1);
        clearTimeout(timeoutId2);
        window.removeEventListener('resize', calculateHeight);
      };
    }
  }, [showResults, searchResults.length]);
  

  // Export certificate to PDF
  async function exportToPDF(certificate: Certificate) {
    try {
      if (!certificate.certificate_image_url) {
        toast.error(t('hero.imageNotAvailable'));
        return;
      }

      const mod = (await import("jspdf").catch(() => null)) as null | typeof import("jspdf");
      if (!mod || !("jsPDF" in mod)) {
        toast.error(t('hero.pdfLibraryMissing'));
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
      if (!resp.ok) throw new Error(`${t('hero.fetchImageFailed')}: ${resp.status}`);
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
      toast.success(t('hero.pdfExported'));
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : t('hero.exportPdfFailed'));
    }
  }

  // Export certificate to PNG
  async function exportToPNG(certificate: Certificate) {
    try {
      if (!certificate.certificate_image_url) {
        toast.error(t('hero.imageNotAvailable'));
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
      if (!resp.ok) throw new Error(`${t('hero.fetchImageFailed')}: ${resp.status}`);
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

      toast.success(t('hero.pngDownloaded'));
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : t('hero.exportPngFailed'));
    }
  }

  // Generate public certificate link using public_id
  async function generateCertificateLink(certificate: Certificate) {
    try {
      // PRIORITY 1: Jika certificate sudah di Supabase Storage, langsung pakai URL gambar
      // URL ini bisa langsung dibuka tanpa perlu deploy aplikasi
      if (certificate.certificate_image_url && 
          (certificate.certificate_image_url.includes('supabase.co/storage') || 
           certificate.certificate_image_url.includes('supabase.co/storage/v1/object/public'))) {
        const directImageLink = certificate.certificate_image_url;
        
        // Copy to clipboard
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(directImageLink);
          toast.success(t('hero.linkCopied'));
        } else {
          // Fallback for older browsers
          const textArea = document.createElement('textarea');
          textArea.value = directImageLink;
          textArea.style.position = 'fixed';
          textArea.style.opacity = '0';
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
          toast.success(t('hero.linkCopied'));
        }
        
        console.log('Generated direct image link from Supabase Storage:', directImageLink);
        return;
      }

      // PRIORITY 2: Jika tidak ada Supabase Storage URL, gunakan link ke halaman app
      if (!certificate.public_id) {
        toast.error(t('hero.noPublicLink'));
        return;
      }

      // Get base URL - prefer environment variable, then localStorage, then current origin
      let baseUrl = process.env.NEXT_PUBLIC_APP_URL;
      
      // If no env variable, check localStorage for saved production URL
      if (!baseUrl && typeof window !== 'undefined') {
        const savedUrl = window.localStorage.getItem('production-url');
        if (savedUrl) {
          baseUrl = savedUrl;
        } else {
          baseUrl = window.location.origin;
        }
      }
      
      // Check if we're on localhost and warn user
      if (typeof window !== 'undefined' && baseUrl && (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1'))) {
        const savedUrl = window.localStorage.getItem('production-url');
        if (!savedUrl) {
          toast.warning(
            <div className="flex flex-col gap-1">
              <span className="font-semibold">Localhost Detected</span>
              <span className="text-xs">Go to Certificates page to set production URL for shareable links.</span>
            </div>,
            { duration: 5000 }
          );
          // Still copy localhost link but warn user
        } else {
          // Use saved production URL
          baseUrl = savedUrl;
        }
      }
      
      // Ensure base URL has protocol (http:// or https://)
      if (baseUrl && !baseUrl.match(/^https?:\/\//i)) {
        baseUrl = `https://${baseUrl.replace(/^\/\//, '')}`;
      }
      
      // Generate absolute public link to app page
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
      
      // Link generated successfully
    } catch (err) {
      console.error('Failed to generate certificate link:', err);
      toast.error(t('hero.linkGenerateFailed'));
    }
  }

  // Open modal to send certificate via email
  async function openSendEmailModal(certificate: Certificate) {
    try {
      if (!certificate.certificate_image_url) {
        toast.error(t('hero.imageNotAvailableShort'));
        return;
      }

      let srcRaw = certificate.certificate_image_url || "";
      if (srcRaw && !/^https?:\/\//i.test(srcRaw) && !srcRaw.startsWith('/') && !srcRaw.startsWith('data:')) {
        srcRaw = `/${srcRaw}`;
      }
      const src = srcRaw.startsWith('/') && typeof window !== 'undefined'
        ? `${window.location.origin}${srcRaw}`
        : srcRaw;
      setSendCert(certificate);
      setSendPreviewSrc(src);
      const issueDate = formatReadableDate(certificate.created_at || new Date(), language);
      const subject = certificate.certificate_no 
        ? t('hero.emailDefaultSubject').replace('{number}', certificate.certificate_no)
        : t('hero.emailDefaultSubjectNoNumber');
      const message = `${t('hero.emailDefaultGreeting')} ${certificate.name || t('hero.emailDefaultNA')},

${t('hero.emailDefaultInfo')}
- ${t('hero.emailDefaultCertNumber')}: ${certificate.certificate_no || t('hero.emailDefaultNA')}\n
- ${t('hero.emailDefaultRecipient')}: ${certificate.name || t('hero.emailDefaultNA')}\n
- ${t('hero.emailDefaultIssueDate')}: ${issueDate}\n
${certificate.category ? `- ${t('hero.emailDefaultCategory')}: ${certificate.category}` : ""}\n
${certificate.description ? `- ${t('hero.emailDefaultDescription')}: ${certificate.description}` : ""}`;
      
      setSendForm({
        email: "",
        subject: subject,
        message: message,
      });
      setSendModalOpen(true);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : t('hero.emailPrepareFailed'));
    }
  }

  // Confirm and send from modal
  const confirmSendEmail = useCallback(async () => {
    if (!sendCert || !sendPreviewSrc || isSendingEmail) return;
    
    // Clear previous errors
    setSendFormErrors({});
    
    // Validate fields
    const errors: { email?: string; subject?: string; message?: string } = {};
    const recipientEmail = (sendForm.email || '').trim();
    
    if (!recipientEmail) {
      errors.email = t('hero.emailValidationRequired');
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(recipientEmail)) {
        errors.email = t('hero.emailValidationInvalid');
      }
    }
    
    if (!sendForm.subject.trim()) {
      errors.subject = t('hero.subjectRequired');
    }
    
    if (!sendForm.message.trim()) {
      errors.message = t('hero.messageRequired');
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
          throw new Error(t('hero.emailInvalidFields'));
        } else if (res.status === 404) {
          throw new Error(t('hero.emailServiceUnavailable'));
        } else if (res.status === 500) {
          throw new Error(t('hero.emailServerError'));
        }
        throw new Error(json?.error || t('hero.emailSendFailed'));
      }
      if (json.previewUrl) {
        toast.success(t('hero.emailQueued'));
        try { window.open(json.previewUrl, '_blank'); } catch {}
      } else {
        toast.success(`${t('hero.emailSentSuccess')} ${recipientEmail}`);
      }
      setSendModalOpen(false);
      setSendCert(null);
      setSendPreviewSrc(null);
      setSendForm({ email: '', subject: '', message: '' });
    } catch (err) {
      console.error('Email send error:', err);
      toast.error(err instanceof Error ? err.message : t('hero.emailSendFailed'));
    } finally {
      setIsSendingEmail(false);
    }
  }, [sendCert, sendPreviewSrc, sendForm, isSendingEmail, t]);

  // Load categories on mount
  useEffect(() => {
    async function loadCategories() {
      try {
        const cats = await getCertificateCategories();
        // Categories loaded successfully
        setCategories(cats);
      } catch (err) {
        console.error('Failed to load categories:', err);
        toast.error(t('hero.loadCategoriesFailed'));
      }
    }
    loadCategories();
  }, [t]);

  // Handle keyboard events for preview modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (previewOpen && e.key === "Escape") {
        setPreviewOpen(false);
      }
    };

    if (previewOpen) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [previewOpen]);

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

  // Handle keyboard events for send email modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (sendModalOpen) {
        if (e.key === "Escape") {
          setSendModalOpen(false);
        } else if (e.key === "Enter" && e.ctrlKey) {
          // Ctrl+Enter to send email
          confirmSendEmail();
        }
      }
    };

    if (sendModalOpen) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [sendModalOpen, confirmSendEmail]);

  // Debounced search function
  const performSearch = useCallback(async (searchFilters: SearchFilters, showToast = false) => {
    try {
      setSearching(true);
      setSearchError("");
      
      const results = await advancedSearchCertificates(searchFilters);
      setSearchResults(results);
      setShowResults(results.length > 0);
      
      if (results.length === 0 && (searchFilters.keyword || searchFilters.category || searchFilters.startDate || searchFilters.endDate)) {
        const errorMsg = searchFilters.keyword 
          ? `${t('search.noResults')} "${searchFilters.keyword}"${searchFilters.category ? ` ${t('search.inCategory')} "${searchFilters.category}"` : ''}`
          : searchFilters.category 
            ? `${t('search.noResults')} ${t('search.inCategory')} "${searchFilters.category}"`
            : t('search.noResultsGeneral');
        setSearchError(errorMsg);
        if (showToast) {
          toast.info(errorMsg);
        }
      }
    } catch (err) {
      console.error('Search error:', err);
      setSearchError(t('error.search.failed'));
      if (showToast) {
        toast.error(t('error.search.failed'));
      }
    } finally {
      setSearching(false);
    }
  }, [t]);
  
  // Live filter effect - auto search when filters change (after initial search)
  const hasSearchedRef = useRef(false);
  
  useEffect(() => {
    // Track if user has performed at least one search
    if (searchResults.length > 0 || showResults) {
      hasSearchedRef.current = true;
    }
  }, [searchResults.length, showResults]);
  
  useEffect(() => {
    // Only trigger live search if user has already searched and there's a keyword
    const hasKeyword = certificateId.trim();
    const hasFilters = filters.category || filters.startDate || filters.endDate;
    
    if (hasSearchedRef.current && hasKeyword && hasFilters) {
      // Debounce the live search
      const timeoutId = setTimeout(() => {
        const searchFilters: SearchFilters = {
          keyword: certificateId.trim(),
          category: filters.category,
          startDate: filters.startDate,
          endDate: filters.endDate,
        };
        performSearch(searchFilters, true);
      }, 300); // 300ms debounce
      
      return () => clearTimeout(timeoutId);
    } else if (hasSearchedRef.current && hasKeyword && !hasFilters) {
      // If filters are cleared, search again with just keyword
      const timeoutId = setTimeout(() => {
        const searchFilters: SearchFilters = {
          keyword: certificateId.trim(),
          category: "",
          startDate: "",
          endDate: "",
        };
        performSearch(searchFilters, true);
      }, 300);
      
      return () => clearTimeout(timeoutId);
    }
  }, [filters.category, filters.startDate, filters.endDate, certificateId, performSearch]);

  // Reusable search handler for both Enter key and button click
  const handleSearch = useCallback(async () => {
    const q = certificateId.trim();
    if (!q) {
      // Show validation error for empty search
      setSearchError(t('error.search.empty'));
      setSearchResults([]);
      setShowResults(false);
      return;
    }
    
    // Check if it's a direct link/ID search
    const publicLinkMatch = q.match(/(?:\/cek\/|cek\/)([a-f0-9-]{36})/i);
    const oldLinkMatch = q.match(/(?:\/certificate\/|certificate\/)([A-Za-z0-9-_]+)/);
    const isCertId = q.match(/^CERT-/i);
    
    if (publicLinkMatch || oldLinkMatch || isCertId) {
      // Direct search by ID/link
      setSearching(true);
      setSearchError("");
      try {
        let cert: Certificate | null = null;
        if (publicLinkMatch) {
          cert = await getCertificateByPublicId(publicLinkMatch[1]);
        } else {
          const certNo = oldLinkMatch ? oldLinkMatch[1] : q;
          cert = await getCertificateByNumber(certNo);
        }
        
        if (!cert) {
          setSearchError(t('error.search.notFound'));
        } else {
          setPreviewCert(cert);
          setPreviewOpen(true);
        }
      } catch (err) {
        console.error(err);
        setSearchError(t('error.search.failed'));
      } finally {
        setSearching(false);
      }
    } else {
      // Keyword search - redirect to search results page with smooth transition
      setSearching(true); // Show loading state during redirect
      setSearchError("");
      
      const params = new URLSearchParams();
      params.set('q', q);
      if (filters.category) params.set('category', filters.category);
      if (filters.startDate) params.set('startDate', filters.startDate);
      if (filters.endDate) params.set('endDate', filters.endDate);
      
      // Smooth transition: scroll to top first, then navigate
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        // Small delay for smooth transition before navigation
        setTimeout(() => {
          router.push(`/search?${params.toString()}`);
          // Note: searching state will persist until page navigation completes
        }, 150);
      } else {
        router.push(`/search?${params.toString()}`);
      }
    }
  }, [certificateId, filters, router, t]);

  // Remove auto-search on typing - only search when button clicked

  // Filter modal handlers
  const openFilterModal = useCallback(() => {
    setTempCategory(filters.category || "");
    setTempStartDate(filters.startDate || "");
    setTempEndDate(filters.endDate || "");
    setFilterModalOpen(true);
  }, [filters]);

  const applyFilters = useCallback(() => {
    const newFilters: SearchFilters = {
      keyword: certificateId.trim(),
      category: tempCategory,
      startDate: tempStartDate,
      endDate: tempEndDate,
    };
    setFilters(newFilters);
    if (certificateId.trim()) {
      performSearch(newFilters, true);
    }
    setFilterModalOpen(false);
  }, [certificateId, tempCategory, tempStartDate, tempEndDate, performSearch]);

  const cancelFilters = useCallback(() => {
    setTempCategory(filters.category || "");
    setTempStartDate(filters.startDate || "");
    setTempEndDate(filters.endDate || "");
    setFilterModalOpen(false);
  }, [filters]);

  // Removed unused clearTempFilters function

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilters({
      keyword: "",
      category: "",
      startDate: "",
      endDate: "",
    });
    // Don't clear certificateId or search results when clearing filters
    // Only clear if explicitly resetting everything
    if (certificateId.trim()) {
      // If there's a keyword, search again without filters
      const searchFilters: SearchFilters = {
        keyword: certificateId.trim(),
        category: "",
        startDate: "",
        endDate: "",
      };
      performSearch(searchFilters, true);
    } else {
      setSearchResults([]);
      setShowResults(false);
      setSearchError("");
      hasSearchedRef.current = false;
    }
  }, [certificateId, performSearch]);

  // Landing stats removed from minimal landing

  // Optimized animation variants with GPU-accelerated properties
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1,
        ease: [0.4, 0, 0.2, 1] as const
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        ease: [0.4, 0, 0.2, 1] as const
      }
    }
  };

  return (
    <>
    <section className="relative w-full flex-1 flex items-center justify-center" style={{ backgroundColor: 'var(--background)' }}>
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 text-center py-8 sm:py-12 md:py-20">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          style={{ willChange: 'opacity' }}
          className="max-w-5xl mx-auto"
        >
          {/* Enhanced Main Title */}
          <motion.div variants={itemVariants} className="mb-4 sm:mb-5">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold text-gradient mb-2 sm:mb-3 leading-tight">
              {t('hero.title')}
            </h1>
          </motion.div>


          {/* Enhanced Certificate Search with Filters */}
          <motion.div
            variants={itemVariants}
            className="mx-auto max-w-2xl relative"
          >
            {/* Search Bar */}
            <div className="relative mb-2">
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 sm:gap-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl sm:rounded-2xl p-1.5 border border-gray-200 dark:border-gray-700 shadow-sm transition-all duration-200">
                  <div className="flex-1 relative">
                    <Search className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                    <Input
                      value={certificateId}
                      onChange={(e) => {
                        const value = e.target.value;
                        setCertificateId(value);
                        setSearchError("");
                        // Clear search results when input is emptied
                        if (!value.trim()) {
                          setSearchResults([]);
                          setShowResults(false);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleSearch();
                        }
                      }}
                      placeholder={t('search.searchByName')}
                      className="h-9 sm:h-10 pl-8 sm:pl-9 bg-transparent border-0 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus-visible:ring-0 text-sm sm:text-base text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={handleSearch}
                    disabled={searching}
                    className="h-9 sm:h-10 px-3 sm:px-4 md:h-11 md:px-5 gradient-primary text-white rounded-lg sm:rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm flex items-center gap-1 sm:gap-2"
                  >
                    <span className="hidden sm:inline">{t('hero.searchButton')}</span>
                    <span className="sm:hidden">{t('hero.searchButton')}</span>
                    {searching ? (
                      <div className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5" />
                    )}
                  </Button>
                </div>
                
                {/* Filter Icon Button */}
                <Button
                  type="button"
                  onClick={openFilterModal}
                  variant="outline"
                  size="icon"
                  className={`flex-shrink-0 h-9 sm:h-10 md:h-12 w-9 sm:w-10 md:w-12 ${
                    filters.category || filters.startDate || filters.endDate
                      ? 'bg-green-500 hover:bg-green-600 text-white border-green-500'
                      : 'border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <Filter className="w-4 h-4 md:w-5 md:h-5" />
                </Button>
              </div>
              
            </div>

            {/* Error Message - Show below search bar if no filters */}
            {searchError && !(filters.category || filters.startDate || filters.endDate) && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-2 mb-3 text-sm text-red-600 dark:text-red-400"
              >
                {searchError}
              </motion.p>
            )}

            {/* Active Filters Indicator */}
            {(filters.category || filters.startDate || filters.endDate) && (
              <>
                <div className="mt-4 mb-3 flex flex-wrap items-center gap-2 sm:gap-3 text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium flex-shrink-0">{t('search.filteredBy')}:</span>
                  <div className="flex flex-wrap items-center gap-2">
                    {filters.category && (
                      <span className="px-2.5 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-md text-xs sm:text-sm">
                        {filters.category}
                      </span>
                    )}
                    {filters.startDate && (
                      <span className="px-2.5 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-md text-xs sm:text-sm">
                        {filters.startDate}
                      </span>
                    )}
                    {filters.endDate && (
                      <span className="px-2.5 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-md text-xs sm:text-sm">
                        {filters.endDate}
                      </span>
                    )}
                  </div>
                  <button 
                    onClick={clearFilters} 
                    className="ml-1 sm:ml-2 p-1.5 rounded-lg text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex-shrink-0"
                    aria-label={t('search.clearFilters')}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                {/* Error Message - Show below filters if filters exist */}
                {searchError && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-3 text-sm text-red-600 dark:text-red-400"
                  >
                    {searchError}
                  </motion.p>
                )}
              </>
            )}

            {/* Search Results - Absolute positioned to prevent layout shift */}
            {showResults && searchResults.length > 0 && (
              <div 
                ref={resultsContainerRef}
                className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 flex flex-col overflow-hidden"
                style={{ 
                  maxHeight: 'calc(80vh - 2rem)',
                  height: 'calc(80vh - 2rem)'
                }}
              >
                {/* Header - Fixed height, measured for calculation */}
                <div 
                  ref={resultsHeaderRef}
                  className="text-sm text-gray-600 dark:text-gray-400 p-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0"
                >
                  {t('search.showingResults')}: {searchResults.length} {searchResults.length === 1 ? t('hero.certificate') : t('hero.certificates')}
                </div>
                {/* Scrollable Content - Explicit height calculation for accurate scrolling */}
                <div 
                  className="overflow-y-auto overscroll-contain"
                  style={{ 
                    height: scrollableHeight,
                    WebkitOverflowScrolling: 'touch',
                    overflowX: 'hidden'
                  }}
                >
                  <div className="p-3" style={{ paddingBottom: '23rem' }}>
                    <div className="grid grid-cols-1 gap-3" style={{ marginBottom: '2rem' }}>
                    {searchResults.map((cert) => (
                      <motion.div
                        key={cert.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer text-left"
                        onClick={() => {
                          setPreviewCert(cert);
                          setPreviewOpen(true);
                        }}
                      >
                        <div className="flex items-start gap-4 p-4">
                          {/* Certificate Thumbnail */}
                          {cert.certificate_image_url ? (
                            <div className="flex-shrink-0 w-32 h-24 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img 
                                src={cert.certificate_image_url} 
                                alt={cert.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  // Hide image if failed to load
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            </div>
                          ) : (
                            <div className="flex-shrink-0 w-32 h-24 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg flex items-center justify-center">
                              <FileText className="w-8 h-8 text-blue-400" />
                            </div>
                          )}
                          
                          {/* Certificate Info */}
                          <div className="flex-1 min-w-0 text-left">
                            <div className="font-semibold text-gray-900 dark:text-gray-100 truncate">{cert.members?.name || cert.name}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{cert.certificate_no}</div>
                            <div className="flex items-center gap-2 mt-2">
                              {cert.category && (
                                <span className="inline-block px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-md">
                                  {cert.category}
                                </span>
                              )}
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {formatReadableDate(cert.issue_date, language)}
                              </span>
                            </div>
                            {cert.members?.organization && (
                              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 truncate">{cert.members.organization}</div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      </div>
    </section>
    {previewOpen && previewCert && (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-2 sm:p-4" onClick={() => setPreviewOpen(false)}>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b dark:border-gray-700">
            <div>
              <div className="text-base sm:text-lg font-semibold dark:text-gray-100">{t('hero.certificatePreview')}</div>
            </div>
            <Button variant="outline" onClick={() => setPreviewOpen(false)} size="icon" aria-label="Close" className="h-8 w-8 sm:h-10 sm:w-10">
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
            <div className="p-2 sm:p-4 bg-gray-50 dark:bg-gray-900">
              {previewCert!.certificate_image_url ? (
                <div
                  className="relative w-full aspect-[4/3] cursor-zoom-in group overflow-hidden rounded-lg"
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setImagePreviewUrl(previewCert!.certificate_image_url!);
                    setImagePreviewOpen(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setImagePreviewUrl(previewCert!.certificate_image_url!);
                      setImagePreviewOpen(true);
                    }
                  }}
                >
                  {/* Skeleton loader */}
                  <div className="absolute inset-0 bg-gray-200 dark:bg-gray-800 animate-pulse" />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewCert!.certificate_image_url ?? undefined}
                    alt="Certificate"
                    className="absolute inset-0 w-full h-full object-contain rounded-lg border transition-transform duration-200 group-hover:scale-[1.01]"
                    onLoad={(e) => {
                      // Hide skeleton when image loads
                      const skeleton = e.currentTarget.parentElement?.querySelector('.animate-pulse');
                      if (skeleton) {
                        (skeleton as HTMLElement).style.display = 'none';
                      }
                    }}
                    onError={(e) => {
                      const skeleton = e.currentTarget.parentElement?.querySelector('.animate-pulse');
                      if (skeleton) {
                        (skeleton as HTMLElement).style.display = 'none';
                      }
                    }}
                  />
                  <div className="absolute bottom-3 right-3 px-3 py-1 rounded-md bg-black/60 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    {t('hero.viewFullImage')}
                  </div>
                </div>
              ) : (
                <div className="aspect-[4/3] flex items-center justify-center text-gray-500 dark:text-gray-400 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">{t('hero.noPreviewImage')}</div>
              )}
            </div>
            <div className="p-4 sm:p-6">
              <div className="space-y-2">
                <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{t('hero.recipient')}</div>
                <div className="text-lg sm:text-xl md:text-2xl font-semibold dark:text-gray-100">{previewCert!.members?.name || previewCert!.name}</div>
                {previewCert!.members?.organization && (
                  <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{previewCert!.members.organization}</div>
                )}
              </div>
              <div className="mt-4 space-y-1 text-xs sm:text-sm">
                <div><span className="text-gray-500 dark:text-gray-400">{t('hero.category')}:</span> {previewCert!.category || "—"}</div>
                <div><span className="text-gray-500 dark:text-gray-400">{t('hero.template')}:</span> {(previewCert as unknown as { templates?: { name?: string } }).templates?.name || "—"}</div>
                <div><span className="text-gray-500 dark:text-gray-400">{t('hero.issued')}:</span> {formatReadableDate(previewCert!.issue_date, language)}</div>
                {previewCert!.expired_date && (
                  <div><span className="text-gray-500 dark:text-gray-400">{t('hero.expires')}:</span> {formatReadableDate(previewCert!.expired_date, language)}</div>
                )}
              </div>
              <div className="mt-4 sm:mt-6 flex flex-wrap gap-2 sm:gap-3">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="border-gray-300"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      {t('hero.export')}
                      <ChevronDown className="w-4 h-4 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => exportToPDF(previewCert!)}>
                      <FileText className="w-4 h-4 mr-2" />
                      {t('hero.exportAsPDF')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => exportToPNG(previewCert!)}>
                      <ImageIcon className="w-4 h-4 mr-2" />
                      {t('hero.downloadPNG')}
                    </DropdownMenuItem>
                    {previewCert!.certificate_image_url && (
                      <DropdownMenuItem onClick={() => openSendEmailModal(previewCert!)}>
                        <FileText className="w-4 h-4 mr-2" />
                        {t('hero.sendViaEmail')}
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => generateCertificateLink(previewCert!)}>
                      <Link className="w-4 h-4 mr-2" />
                      {t('hero.generateLink')}
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
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between px-4 py-3 border-b dark:border-gray-700 flex-shrink-0">
            <div className="text-sm text-gray-600 dark:text-gray-400">{t('hero.certificateImage')}</div>
            <Button variant="outline" onClick={() => setImagePreviewOpen(false)} size="icon" aria-label="Close">
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-900 overflow-auto flex-1">
            {imagePreviewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imagePreviewUrl} alt="Certificate" className="w-full h-auto rounded-lg border" />
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">{t('hero.noPreviewImage')}</div>
            )}
          </div>
        </div>
      </div>
    )}
    {sendModalOpen && (
      <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4" onClick={() => setSendModalOpen(false)}>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between px-6 py-4 border-b dark:border-gray-700">
            <div>
              <div className="text-lg font-semibold dark:text-gray-100">{t('hero.sendEmailTitle')}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">{t('hero.sendEmailSubtitle')}</div>
            </div>
            <Button variant="outline" onClick={() => setSendModalOpen(false)} size="icon" aria-label="Close">
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="p-6 space-y-4">
            {sendPreviewSrc && (
              <div className="mb-4">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">{t('hero.certificatePreviewLabel')}</div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={sendPreviewSrc} alt="Certificate Preview" className="w-full h-auto rounded-lg border max-h-48 object-contain" />
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-white">{t('hero.recipientEmail')}</label>
              <Input
                type="email"
                value={sendForm.email}
                onChange={(e) => {
                  setSendForm({ ...sendForm, email: e.target.value });
                  if (sendFormErrors.email) setSendFormErrors((err) => ({ ...err, email: undefined }));
                }}
                placeholder=""
                className={`w-full ${sendFormErrors.email ? 'border-red-500' : ''}`}
                disabled={isSendingEmail}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isSendingEmail) {
                    e.preventDefault();
                    confirmSendEmail();
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    setSendModalOpen(false);
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
                  setSendForm({ ...sendForm, subject: e.target.value });
                  if (sendFormErrors.subject) setSendFormErrors((err) => ({ ...err, subject: undefined }));
                }}
                placeholder={t('hero.emailSubjectPlaceholder')}
                className={`w-full ${sendFormErrors.subject ? 'border-red-500' : ''}`}
                disabled={isSendingEmail}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isSendingEmail) {
                    e.preventDefault();
                    confirmSendEmail();
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    setSendModalOpen(false);
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
                  setSendForm({ ...sendForm, message: e.target.value });
                  if (sendFormErrors.message) setSendFormErrors((err) => ({ ...err, message: undefined }));
                }}
                placeholder={t('hero.emailMessagePlaceholder')}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 ${sendFormErrors.message ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                rows={4}
                disabled={isSendingEmail}
                onKeyDown={(e) => {
                  // Allow Shift+Enter for new line
                  if (e.key === 'Enter' && !e.shiftKey && !isSendingEmail) {
                    e.preventDefault();
                    confirmSendEmail();
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    setSendModalOpen(false);
                  }
                }}
              />
              {sendFormErrors.message && (
                <p className="text-xs text-red-500 mt-1">{sendFormErrors.message}</p>
              )}
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setSendModalOpen(false)}
                disabled={isSendingEmail}
              >
                {t('hero.cancel')}
              </Button>
               <LoadingButton 
                 onClick={confirmSendEmail} 
                 isLoading={isSendingEmail}
                 loadingText={t('hero.sending')}
                 variant="primary"
                 className="gradient-primary text-white shadow-lg hover:shadow-xl transition-all duration-300"
               >
                {t('hero.sendEmail')}
              </LoadingButton>
            </div>
          </div>
        </div>
      </div>
    )}
    
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
              value={tempCategory}
              onChange={(e) => setTempCategory(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Start Date Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Start Date</label>
            <input
              type="date"
              value={tempStartDate}
              onChange={(e) => setTempStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* End Date Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">End Date</label>
            <input
              type="date"
              value={tempEndDate}
              onChange={(e) => setTempEndDate(e.target.value)}
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
  </>
  );
}
