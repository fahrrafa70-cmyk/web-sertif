"use client";

import { motion } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { getCertificateByNumber, getCertificateByPublicId, Certificate, advancedSearchCertificates, getCertificateCategories, SearchFilters } from "@/lib/supabase/certificates";
import { toast, Toaster } from "sonner";
import { Button } from "@/components/ui/button";
import { ArrowRight, Search, Download, ChevronDown, FileText, Link, Filter, X, Image as ImageIcon } from "lucide-react";
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
  const [searchError, setSearchError] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewCert, setPreviewCert] = useState<Certificate | null>(null);
  
  // New states for advanced search
  const [searchResults, setSearchResults] = useState<Certificate[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [filters, setFilters] = useState<SearchFilters>({
    keyword: "",
    category: "",
    startDate: "",
    endDate: "",
  });
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
      toast.success(t('hero.pdfExported'));
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to export PDF");
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

      toast.success(t('hero.pngDownloaded'));
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to export PNG");
    }
  }

  // Generate public certificate link using public_id
  async function generateCertificateLink(certificate: Certificate) {
    try {
      if (!certificate.public_id) {
        toast.error(t('hero.noPublicLink'));
        return;
      }

      // Use environment variable for production URL, fallback to window.location.origin
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                      (typeof window !== 'undefined' ? window.location.origin : '');
      const certificateLink = `${baseUrl}/cek/${certificate.public_id}`;
      
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(certificateLink);
        toast.success(t('hero.linkCopied'));
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = certificateLink;
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
      setSendForm({
        email: "",
        subject: certificate.certificate_no ? `Certificate #${certificate.certificate_no}` : "Your Certificate",
        message: `Dear ${certificate.name},

Certificate Information:
- Certificate Number: ${certificate.certificate_no || "N/A"}\n
- Recipient Name: ${certificate.name || "N/A"}\n
- Issue Date: ${new Date(certificate.created_at || new Date()).toLocaleDateString()}\n
${certificate.category ? `- Category: ${certificate.category}` : ""}\n
${certificate.description ? `- Description: ${certificate.description}` : ""}`,
      });
      setSendModalOpen(true);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Failed to prepare email');
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
        toast.success(t('hero.emailQueued'));
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
  }, [sendCert, sendPreviewSrc, sendForm, isSendingEmail, t]);

  // Load categories on mount
  useEffect(() => {
    async function loadCategories() {
      try {
        const cats = await getCertificateCategories();
        console.log('Loaded categories in hero-section:', cats);
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
  const performSearch = useCallback(async (searchFilters: SearchFilters) => {
    try {
      setSearching(true);
      setSearchError("");
      
      const results = await advancedSearchCertificates(searchFilters);
      setSearchResults(results);
      setShowResults(true);
      
      if (results.length === 0 && (searchFilters.keyword || searchFilters.category || searchFilters.startDate || searchFilters.endDate)) {
        setSearchError(searchFilters.keyword ? `${t('search.noResults')} "${searchFilters.keyword}"` : t('search.noResultsGeneral'));
      }
    } catch (err) {
      console.error('Search error:', err);
      setSearchError(t('error.search.failed'));
      toast.error(t('error.search.failed'));
    } finally {
      setSearching(false);
    }
  }, [t]);

  // Reusable search handler for both Enter key and button click
  const handleSearch = useCallback(async () => {
    const q = certificateId.trim();
    if (!q) {
      // Show validation error for empty search
      setSearchError(t('error.search.empty') || 'Please enter a certificate number or name to search');
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
      // Keyword search - perform advanced search
      const searchFilters: SearchFilters = {
        keyword: q,
        category: filters.category,
        startDate: filters.startDate,
        endDate: filters.endDate,
      };
      await performSearch(searchFilters);
    }
  }, [certificateId, filters, performSearch, t]);

  // Remove auto-search on typing - only search when button clicked

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      keyword: "",
      category: "",
      startDate: "",
      endDate: "",
    });
    setCertificateId("");
    setSearchResults([]);
    setShowResults(false);
    setSearchError("");
  };

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
    <section className="relative w-full flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 text-center py-8 sm:py-12 md:py-20">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-5xl mx-auto"
        >
          {/* Enhanced Main Title */}
          <motion.div variants={itemVariants} className="mb-4 sm:mb-5">
            <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold text-gradient mb-2 sm:mb-3 leading-tight">
              {t('hero.title')}
            </h1>
          </motion.div>


          {/* Enhanced Certificate Search with Filters */}
          <motion.div
            variants={itemVariants}
            className="mx-auto max-w-2xl"
          >
            {/* Search Bar */}
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
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
                    className="h-9 sm:h-10 px-3 sm:px-4 md:h-11 md:px-5 gradient-primary text-white rounded-lg sm:rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm"
                  >
                    <span className="hidden sm:inline">{searching ? t('hero.searching') : t('hero.searchButton')}</span>
                    <span className="sm:hidden">{searching ? t('hero.searching') : t('hero.searchButton')}</span>
                    <ArrowRight className="ml-1 sm:ml-2 w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5" />
                  </Button>
                </div>
                
                {/* Filter Toggle Button */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className="h-9 sm:h-10 md:h-12 px-3 sm:px-4 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 sm:flex-shrink-0"
                >
                  <Filter className="w-4 h-4" />
                  <span className="ml-2 hidden sm:inline text-sm">Filter</span>
                </Button>
              </div>
              
              {/* Error Message */}
              {searchError && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm text-red-500 px-2"
                >
                  {searchError}
                </motion.p>
              )}
            </div>

            {/* Filters Panel */}
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-3 p-3 sm:p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Category Filter */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                      {t('search.category')}
                    </label>
                    <select
                      value={filters.category}
                      onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full h-10 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27currentColor%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e')] dark:bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27white%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e')] bg-[length:1.25rem] bg-[right_0.5rem_center] bg-no-repeat pr-10 text-gray-900 dark:text-gray-100"
                    >
                      <option value="">{t('search.allCategories')}</option>
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  {/* Date Range */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                      {t('search.dateRange')}
                    </label>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <input
                          type="date"
                          value={filters.startDate}
                          onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                          className="w-full h-10 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 cursor-pointer text-gray-900 dark:text-gray-100"
                          placeholder={t('search.startDate')}
                        />
                      </div>
                      <div className="flex-1">
                        <input
                          type="date"
                          value={filters.endDate}
                          onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                          className="w-full h-10 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 cursor-pointer text-gray-900 dark:text-gray-100"
                          placeholder={t('search.endDate')}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Clear Filters Button */}
                {(filters.category || filters.startDate || filters.endDate) && (
                  <div className="mt-3 flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                      className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                    >
                      <X className="w-4 h-4 mr-1" />
                      {t('search.clearFilters')}
                    </Button>
                  </div>
                )}
              </motion.div>
            )}

            {/* Active Filters Indicator */}
            {(filters.category || filters.startDate || filters.endDate) && !showFilters && (
              <div className="mb-3 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium">{t('search.filteredBy')}:</span>
                {filters.category && <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-md">{filters.category}</span>}
                {filters.startDate && <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-md">{filters.startDate}</span>}
                {filters.endDate && <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-md">{filters.endDate}</span>}
                <button onClick={clearFilters} className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Search Results */}
            {showResults && searchResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4"
              >
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-3 text-left">
                  {t('search.showingResults')}: {searchResults.length} {searchResults.length === 1 ? t('hero.certificate') : t('hero.certificates')}
                </div>
                <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto">
                  {searchResults.map((cert) => (
                    <motion.div
                      key={cert.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer text-left"
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
                              {new Date(cert.issue_date).toLocaleDateString()}
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
              </motion.div>
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
                  className="relative w-full cursor-zoom-in group"
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
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewCert!.certificate_image_url ?? undefined}
                    alt="Certificate"
                    className="w-full h-auto rounded-lg border transition-transform duration-200 group-hover:scale-[1.01]"
                  />
                  <div className="absolute bottom-3 right-3 px-3 py-1 rounded-md bg-black/60 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    {t('hero.viewFullImage')}
                  </div>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">{t('hero.noPreviewImage')}</div>
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
                <div><span className="text-gray-500 dark:text-gray-400">{t('hero.issued')}:</span> {new Date(previewCert!.issue_date).toLocaleDateString()}</div>
                {previewCert!.expired_date && (
                  <div><span className="text-gray-500 dark:text-gray-400">{t('hero.expires')}:</span> {new Date(previewCert!.expired_date as string).toLocaleDateString()}</div>
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
              <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">No image</div>
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
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('hero.recipientEmail')}</label>
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
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('hero.subject')}</label>
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
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('hero.message')}</label>
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
               <Button 
                 onClick={confirmSendEmail} 
                 className="gradient-primary text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all duration-300"
                 disabled={isSendingEmail}
               >
                {isSendingEmail ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {t('hero.sending')}
                  </>
                ) : (
                  t('hero.sendEmail')
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    )}
    
    {/* Toast Notifications */}
    <Toaster position="top-right" richColors />
  </>
  );
}
