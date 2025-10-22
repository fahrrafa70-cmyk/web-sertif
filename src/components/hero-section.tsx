"use client";

import { motion } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { getCertificateByNumber, getCertificateByPublicId, Certificate, advancedSearchCertificates, getCertificateCategories, SearchFilters } from "@/lib/supabase/certificates";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ArrowRight, Search, Download, ChevronDown, FileText, Link, Filter, X } from "lucide-react";
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

  // Load categories on mount
  useEffect(() => {
    async function loadCategories() {
      try {
        const cats = await getCertificateCategories();
        console.log('Loaded categories in hero-section:', cats);
        setCategories(cats);
      } catch (err) {
        console.error('Failed to load categories:', err);
        toast.error('Failed to load categories');
      }
    }
    loadCategories();
  }, []);

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

  // Debounce effect for keyword search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (filters.keyword || filters.category || filters.startDate || filters.endDate) {
        performSearch(filters);
      } else {
        setSearchResults([]);
        setShowResults(false);
        setSearchError("");
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [filters, performSearch]);

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


          {/* Enhanced Certificate Search with Filters */}
          <motion.div
            variants={itemVariants}
            className="mx-auto max-w-2xl"
          >
            {/* Search Bar */}
            <div className="flex items-center gap-2 mb-3">
              <div className={`flex-1 flex items-center gap-2.5 bg-gray-50 rounded-2xl p-1.5 border shadow-sm transition-all duration-200 ${
                searchError ? 'border-red-300 bg-red-50/50' : 'border-gray-200'
              }`}>
                <div className="flex-1 relative">
                  <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
                    searchError ? 'text-red-400' : 'text-gray-400'
                  }`} />
                  <Input
                    value={certificateId}
                    onChange={(e) => {
                      const value = e.target.value;
                      setCertificateId(value);
                      setSearchError("");
                      
                      // Check if it's a link or ID (for direct search)
                      const isLinkOrId = value.match(/(?:\/cek\/|cek\/|\/certificate\/|certificate\/|^CERT-)/i);
                      if (!isLinkOrId) {
                        // It's a keyword search, update filters
                        setFilters(prev => ({ ...prev, keyword: value }));
                      }
                    }}
                    placeholder={t('search.searchByName')}
                    className={`h-10 pl-9 bg-transparent border-0 placeholder:text-gray-400 focus-visible:ring-0 text-sm sm:text-base ${
                      searchError ? 'text-red-900' : 'text-gray-900'
                    }`}
                  />
                </div>
                <Button
                  type="button"
                  onClick={async () => {
                    const q = certificateId.trim();
                    if (!q) return;
                    
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
                    }
                  }}
                  className="h-10 px-4 sm:h-11 sm:px-5 gradient-primary text-white rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]"
                >
                  {searching ? "Searching..." : t('hero.searchButton')}
                  <ArrowRight className="ml-2 w-4 h-4 sm:w-5 sm:h-5" />
                </Button>
              </div>
              
              {/* Filter Toggle Button */}
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="h-12 px-4 border-gray-300 hover:bg-gray-50"
              >
                <Filter className="w-4 h-4" />
              </Button>
            </div>

            {/* Filters Panel */}
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-3 p-4 bg-white border border-gray-200 rounded-xl shadow-sm"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Category Filter */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                      {t('search.category')}
                    </label>
                    <select
                      value={filters.category}
                      onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full h-10 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27currentColor%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e')] bg-[length:1.25rem] bg-[right_0.5rem_center] bg-no-repeat pr-10"
                    >
                      <option value="">{t('search.allCategories')}</option>
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  {/* Date Range */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                      {t('search.dateRange')}
                    </label>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <input
                          type="date"
                          value={filters.startDate}
                          onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                          className="w-full h-10 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 cursor-pointer"
                          placeholder={t('search.startDate')}
                        />
                      </div>
                      <div className="flex-1">
                        <input
                          type="date"
                          value={filters.endDate}
                          onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                          className="w-full h-10 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 cursor-pointer"
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
                      className="text-gray-600 hover:text-gray-900"
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
              <div className="mb-3 flex items-center gap-2 text-sm text-gray-600">
                <span className="font-medium">{t('search.filteredBy')}:</span>
                {filters.category && <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-md">{filters.category}</span>}
                {filters.startDate && <span className="px-2 py-1 bg-green-100 text-green-700 rounded-md">{filters.startDate}</span>}
                {filters.endDate && <span className="px-2 py-1 bg-green-100 text-green-700 rounded-md">{filters.endDate}</span>}
                <button onClick={clearFilters} className="text-red-600 hover:text-red-800">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            {searchError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg"
              >
                <p className="text-sm text-red-600 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  {searchError}
                </p>
              </motion.div>
            )}

            {/* Search Results */}
            {showResults && searchResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4"
              >
                <div className="text-sm text-gray-600 mb-3">
                  {t('search.showingResults')}: {searchResults.length} {searchResults.length === 1 ? 'certificate' : 'certificates'}
                </div>
                <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto">
                  {searchResults.map((cert) => (
                    <motion.div
                      key={cert.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => {
                        setPreviewCert(cert);
                        setPreviewOpen(true);
                      }}
                    >
                      <div className="flex items-start gap-4 p-4">
                        {/* Certificate Thumbnail */}
                        {cert.certificate_image_url ? (
                          <div className="flex-shrink-0 w-32 h-24 bg-gray-100 rounded-lg overflow-hidden">
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
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-900 truncate">{cert.members?.name || cert.name}</div>
                          <div className="text-sm text-gray-600 mt-1">{cert.certificate_no}</div>
                          <div className="flex items-center gap-2 mt-2">
                            {cert.category && (
                              <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-md">
                                {cert.category}
                              </span>
                            )}
                            <span className="text-xs text-gray-500">
                              {new Date(cert.issue_date).toLocaleDateString()}
                            </span>
                          </div>
                          {cert.members?.organization && (
                            <div className="mt-1 text-xs text-gray-500 truncate">{cert.members.organization}</div>
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
