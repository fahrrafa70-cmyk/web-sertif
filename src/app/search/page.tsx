"use client";

import { useState, useEffect, useCallback, useRef, Suspense, useMemo, memo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Search, Filter, X as XIcon, Download, ChevronDown, FileText as FileTextIcon, Image as ImageIcon, Link as LinkIcon, Mail } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import { useModal } from "@/contexts/modal-context";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce";
import ModernHeader from "@/components/modern-header";
import { 
  advancedSearchCertificates, 
  getCertificateCategories, 
  Certificate, 
  SearchFilters,
  getCertificateByNumber,
  getCertificateByPublicId
} from "@/lib/supabase/certificates";
import Image from "next/image";
import { formatReadableDate } from "@/lib/utils/certificate-formatters";
import { supabaseClient } from "@/lib/supabase/client";
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


function SearchResultsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, language } = useLanguage();
  const { setIsModalOpen } = useModal();
  
  // Local date formatter to ensure format like "2 Nov 2025"
  const formatDateShort = useCallback((input?: string | null) => {
    if (!input) return "—";
    const d = new Date(input);
    if (isNaN(d.getTime())) return "—";
    const day = d.getDate();
    const month = d.toLocaleString(language === 'id' ? 'id-ID' : 'en-US', { month: 'short' });
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  }, [language]);
  
  // Get initial query from URL
  const initialQuery = searchParams.get('q') || '';
  
  // State management with optimized input handling
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [inputValue, setInputValue] = useState(initialQuery); // Separate input state for immediate updates
  const [searching, setSearching] = useState(false);
  const [isTyping, setIsTyping] = useState(false); // Track if user is actively typing
  const [searchResults, setSearchResults] = useState<Certificate[]>([]);
  const [searchError, setSearchError] = useState("");
  const [hasSearched, setHasSearched] = useState(false); // Track if user has performed initial search
  // Optimized debounce with abort controller
  const abortControllerRef = useRef<AbortController | null>(null);
  const debouncedSearchQuery = useDebounce(searchQuery, 400); // Increased for better performance
  const isInitialMount = useRef(true); // Track if this is the initial mount
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null); // DIAGNOSIS 1.2: Store loading timeout
  
  // Virtualization with pagination
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 9; // Show 9 items per page (3x3 grid) for optimal performance
  
  // Input optimization refs
  const inputTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // CRITICAL FIX: Use ref to store searchResults to prevent unmount/mount flicker
  // Only update state if results actually changed (by ID comparison)
  const searchResultsRef = useRef<Certificate[]>([]);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  
  // Temporary filter values for modal
  const [tempCategory, setTempCategory] = useState("");
  const [tempStartDate, setTempStartDate] = useState("");
  const [tempEndDate, setTempEndDate] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewCert, setPreviewCert] = useState<Certificate | null>(null);
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
  
  // Smooth scroll to top on mount and when query changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const timer = setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [initialQuery]);

  // Handle Escape key to go back to home
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Close modal on Escape
      if (e.key === 'Escape') {
        if (sendModalOpen) {
          setSendModalOpen(false);
          // Close certificate modal completely
          setPreviewOpen(false);
          setPreviewCert(null);
          setIsModalOpen(false); // Clear modal context
          e.preventDefault();
          return;
        }
        if (previewOpen) {
          setPreviewOpen(false);
          setPreviewCert(null);
          setIsModalOpen(false); // Update modal context for header blur
          e.preventDefault();
          return;
        }
        if (filterModalOpen) {
          setFilterModalOpen(false);
          e.preventDefault();
          return;
        }
        // Only go back to home if no modal is open
        router.push('/');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router, previewOpen, sendModalOpen, filterModalOpen, setIsModalOpen]);

  // Lock scroll when modal is open
  const scrollYRef = useRef(0);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    if (previewOpen || sendModalOpen) {
      // Save current scroll position
      scrollYRef.current = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollYRef.current}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      
      return () => {
        // Restore scroll position
        const savedScrollY = scrollYRef.current;
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        window.scrollTo(0, savedScrollY);
      };
    }
  }, [previewOpen, sendModalOpen]);
  const [filters, setFilters] = useState<SearchFilters>({
    keyword: initialQuery,
    category: "",
    startDate: "",
    endDate: "",
  });

  // Sync inputValue with searchQuery on mount
  useEffect(() => {
    setInputValue(searchQuery);
  }, [searchQuery]);
  
  // Cleanup input timeout on unmount
  useEffect(() => {
    return () => {
      if (inputTimeoutRef.current) {
        clearTimeout(inputTimeoutRef.current);
      }
    };
  }, []);

  // Load categories on mount
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const cats = await getCertificateCategories();
        if (Array.isArray(cats)) {
          setCategories(cats);
        } else {
          console.warn('Categories is not an array:', cats);
          setCategories([]);
        }
      } catch (error) {
        console.error('Failed to load categories:', error);
        setCategories([]);
      }
    };
    loadCategories();
  }, []);

  // Abort previous search requests
  const abortPreviousSearch = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  // Perform search function with abort controller
  const performSearch = useCallback(async (searchFilters: SearchFilters, markAsSearched = false) => {
    // Abort any ongoing search
    abortPreviousSearch();
    
    // Create new abort controller
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;
    // DIAGNOSIS 1.2: Delay loading state to prevent flicker on fast searches
    // Only show loading if search takes more than 100ms
    // Clear any existing timeout
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
    
    // Set timeout to show loading state after 100ms
    loadingTimeoutRef.current = setTimeout(() => {
      setSearching(true);
    }, 100); // Delay 100ms before showing loading state
    
    setSearchError("");
    
    try {
      // Check if request was aborted
      if (signal.aborted) {
        return;
      }
      
      // Check if it's a direct link/ID search
      const q = searchFilters.keyword || '';
      
      // Validate query
      if (!q || typeof q !== 'string') {
        setSearchError(t('error.search.empty'));
        setSearchResults([]);
        return;
      }
      
      const publicLinkMatch = q.match(/(?:\/cek\/|cek\/)([a-f0-9-]{36})/i);
      const oldLinkMatch = q.match(/(?:\/certificate\/|certificate\/)([A-Za-z0-9-_]+)/);
      const isCertId = q.match(/^CERT-/i);
      
      if (publicLinkMatch || oldLinkMatch || isCertId) {
        // Direct search by ID/link - redirect to certificate page
        try {
          let cert: Certificate | null = null;
          if (publicLinkMatch) {
            cert = await getCertificateByPublicId(publicLinkMatch[1]);
            if (cert) {
              router.push(`/cek/${publicLinkMatch[1]}`);
              return;
            }
          } else {
            const certNo = oldLinkMatch ? oldLinkMatch[1] : q;
            cert = await getCertificateByNumber(certNo);
            if (cert) {
              router.push(`/certificate/${certNo}`);
              return;
            }
          }
          
          if (!cert) {
            setSearchError(t('error.search.notFound'));
            setSearchResults([]);
          }
        } catch (error) {
          console.error('Direct search error:', error);
          setSearchError(t('error.search.failed') || 'Search failed. Please try again.');
          setSearchResults([]);
        }
      } else {
        // Keyword search - perform advanced search
        if (!q.trim()) {
          setSearchError(t('error.search.empty'));
          setSearchResults([]);
          return;
        }
        
        try {
          const results = await advancedSearchCertificates(searchFilters);
          
          // Validate results
          if (Array.isArray(results)) {
            // CRITICAL FIX: Only update if results actually changed (by ID comparison)
            // This prevents unnecessary unmount/mount which causes flicker 
            const currentIds = searchResultsRef.current.map(r => r.id).sort().join(',');
            const newIds = results.map(r => r.id).sort().join(',');
            
            if (currentIds !== newIds) {
              // Results actually changed, update ref and state
              searchResultsRef.current = results;
              setSearchResults(results);
              // Reset to first page on new search results
              setCurrentPage(1);
            }
            // If results are the same, don't update to prevent flicker
            
            if (results.length === 0) {
              const errorMsg = searchFilters.keyword 
                ? `${t('search.noResults')} "${searchFilters.keyword}"${searchFilters.category ? ` ${t('search.inCategory')} "${searchFilters.category}"` : ''}`
                : searchFilters.category 
                  ? `${t('search.noResults')} ${t('search.inCategory')} "${searchFilters.category}"`
                  : t('search.noResultsGeneral');
              setSearchError(errorMsg);
              toast.info(errorMsg);
            } else {
              setSearchError('');
            }
          } else {
            console.error('Invalid search results format:', results);
            const errorMsg = t('error.search.failed') || 'Search failed. Please try again.';
            setSearchError(errorMsg);
            toast.error(errorMsg);
            searchResultsRef.current = [];
            setSearchResults([]);
          }
        } catch (searchError) {
          // Don't show error if request was aborted
          if (searchError instanceof Error && searchError.name === 'AbortError') {
            console.log('Search request aborted');
            return;
          }
          
          console.error('Advanced search error:', searchError);
          const errorMsg = t('error.search.failed') || 'Search failed. Please try again.';
          setSearchError(errorMsg);
          toast.error(errorMsg);
          setSearchResults([]);
        }
      }
    } catch (error) {
      // Don't show error if request was aborted
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Search request aborted');
        return;
      }
      
      console.error('Unexpected search error:', error);
      setSearchError(t('error.search.failed') || 'Search failed. Please try again.');
      setSearchResults([]);
    } finally {
      // DIAGNOSIS 1.2: Clear loading timeout and reset loading state
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
      setSearching(false);
      // Mark as searched after search completes (for auto-search on edit)
      if (markAsSearched) {
        setHasSearched(true);
      }
    }
  }, [t, router, abortPreviousSearch]);

  // Search on mount if query exists (from URL) - for backward compatibility
  // URL will stay as /search without query params going forward
  useEffect(() => {
    if (initialQuery && initialQuery.trim()) {
      try {
        const urlCategory = searchParams.get('category') || '';
        const urlStartDate = searchParams.get('startDate') || '';
        const urlEndDate = searchParams.get('endDate') || '';
        setFilters({
          keyword: initialQuery,
          category: urlCategory,
          startDate: urlStartDate,
          endDate: urlEndDate,
        });
        performSearch({
          keyword: initialQuery,
          category: urlCategory,
          startDate: urlStartDate,
          endDate: urlEndDate,
        }, true); // Mark as searched after initial search from URL
        setHasSearched(true); // Set immediately since this is from URL (user already searched)
        // Clean URL to /search without query params after reading from URL
        if (typeof window !== 'undefined') {
          window.history.replaceState({}, '', '/search');
        }
      } catch (error) {
        console.error('Error during initial search:', error);
        setSearchError(t('error.search.failed') || 'Search failed. Please try again.');
        setSearching(false);
      }
    } else {
      // If no initial query, ensure hasSearched is false
      setHasSearched(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  // Mark initial mount as complete after first render
  useEffect(() => {
    isInitialMount.current = false;
  }, []);

  // Auto-search only after first search has been performed (when user edits input)
  // IMPORTANT: This should NOT trigger on initial mount or when user first types
  // Only trigger if user has explicitly searched before (hasSearched = true)
  useEffect(() => {
    // CRITICAL: Skip on initial mount
    if (isInitialMount.current) {
      return;
    }
    
    // CRITICAL: Skip entirely if user hasn't performed a manual search yet
    // This prevents auto-search when user first types
    if (!hasSearched) {
      return;
    }
    
    // Additional check: if debouncedSearchQuery is empty, don't search
    if (!debouncedSearchQuery.trim()) {
      return;
    }
    
    // Only auto-search if the debounced query is different from current keyword in filters
    // This prevents duplicate searches
    if (debouncedSearchQuery.trim() === filters.keyword) {
      return;
    }
    
    // All conditions met: perform auto-search
    const newFilters: SearchFilters = {
      keyword: debouncedSearchQuery.trim(),
      category: filters.category,
      startDate: filters.startDate,
      endDate: filters.endDate,
    };
    setFilters(newFilters);
    performSearch(newFilters, true); // Mark as searched for auto-search
  }, [debouncedSearchQuery, hasSearched, filters.category, filters.startDate, filters.endDate, filters.keyword, performSearch]);

  // Handle search submission
  const handleSearch = useCallback(() => {
    const q = searchQuery.trim();
    if (!q) {
      setSearchError(t('error.search.empty'));
      setSearchResults([]);
      setHasSearched(false); // Reset if search query is empty
      return;
    }

    // Update filters and perform search (URL stays as /search without query params)
    const newFilters: SearchFilters = {
      keyword: q,
      category: filters.category,
      startDate: filters.startDate,
      endDate: filters.endDate,
    };
    setFilters(newFilters);
    performSearch(newFilters, true); // Mark as searched after user clicks search or presses Enter
  }, [searchQuery, filters, performSearch, t]);

  // Handle Enter key
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  }, [handleSearch]);

  // Clear filters
  const clearFilters = useCallback(() => {
    const clearedFilters: SearchFilters = {
      keyword: searchQuery,
      category: "",
      startDate: "",
      endDate: "",
    };
    setFilters(clearedFilters);
    if (searchQuery.trim()) {
      performSearch(clearedFilters, true); // Keep hasSearched true when clearing filters
    }
  }, [searchQuery, performSearch]);

  // Filter modal handlers
  const openFilterModal = useCallback(() => {
    setTempCategory(filters.category || "");
    setTempStartDate(filters.startDate || "");
    setTempEndDate(filters.endDate || "");
    setFilterModalOpen(true);
  }, [filters]);

  const applyFilters = useCallback(() => {
    const newFilters: SearchFilters = {
      keyword: searchQuery,
      category: tempCategory,
      startDate: tempStartDate,
      endDate: tempEndDate,
    };
    setFilters(newFilters);
    if (searchQuery.trim()) {
      performSearch(newFilters, true);
    }
    setFilterModalOpen(false);
  }, [searchQuery, tempCategory, tempStartDate, tempEndDate, performSearch]);

  const cancelFilters = useCallback(() => {
    setTempCategory(filters.category || "");
    setTempStartDate(filters.startDate || "");
    setTempEndDate(filters.endDate || "");
    setFilterModalOpen(false);
  }, [filters]);

  const clearTempFilters = useCallback(() => {
    setTempCategory("");
    setTempStartDate("");
    setTempEndDate("");
  }, []);

  // Check if filters are active - memoized
  const hasActiveFilters = useMemo(() => {
    return !!(filters.category || filters.startDate || filters.endDate);
  }, [filters.category, filters.startDate, filters.endDate]);

  // Export certificate to PDF
  const exportToPDF = useCallback(async (certificate: Certificate) => {
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
  }, [t]);

  // Export certificate to PNG
  const exportToPNG = useCallback(async (certificate: Certificate) => {
    try {
      if (!certificate.certificate_image_url) {
        toast.error(t('hero.imageNotAvailable'));
        return;
      }

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
  }, [t]);

  // Generate certificate link
  const generateCertificateLink = useCallback(async (certificate: Certificate) => {
    try {
      if (!certificate.public_id) {
        toast.error(t('hero.noPublicLink'));
        return;
      }

      const link = `${window.location.origin}/cek/${certificate.public_id}`;
      await navigator.clipboard.writeText(link);
      toast.success(t('hero.linkCopied'));
    } catch (err) {
      console.error(err);
      toast.error(t('hero.linkGenerateFailed'));
    }
  }, [t]);

  // Open send email modal
  const openSendEmailModal = useCallback(async (certificate: Certificate) => {
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
      const issueDate = formatReadableDate(certificate.issue_date || certificate.created_at || new Date(), language);
      const subject = certificate.certificate_no 
        ? t('hero.emailDefaultSubject').replace('{number}', certificate.certificate_no)
        : t('hero.emailDefaultSubjectNoNumber');
      const message = `${t('hero.emailDefaultGreeting')} ${certificate.name || t('hero.emailDefaultNA')},

${t('hero.emailDefaultInfo')}
- ${t('hero.emailDefaultCertNumber')}: ${certificate.certificate_no || t('hero.emailDefaultNA')}
- ${t('hero.emailDefaultRecipient')}: ${certificate.name || t('hero.emailDefaultNA')}
- ${t('hero.emailDefaultIssueDate')}: ${issueDate}
${certificate.category ? `- ${t('hero.emailDefaultCategory')}: ${certificate.category}` : ''}
${certificate.description ? `- ${t('hero.emailDefaultDescription')}: ${certificate.description}` : ''}`;
      
      setSendForm({
        email: "",
        subject: subject,
        message: message,
      });
      setSendModalOpen(true);
      // Keep certificate modal open but hide its content - backdrop remains active
      // setPreviewOpen(false); // Don't close certificate modal
      // setPreviewCert(null);
      // setIsModalOpen(true); // Modal context already active from certificate modal
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : t('hero.emailPrepareFailed'));
    }
  }, [t, language]);

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
      // Close certificate modal completely when email is sent
      setPreviewOpen(false);
      setPreviewCert(null);
      setIsModalOpen(false); // Clear modal context when email modal closes
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

  // Capitalize first letter helper
  // Pagination calculations
  const totalItems = searchResults.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentResults = searchResults.slice(startIndex, endIndex);

  // Optimized input handlers to prevent lag
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value); // Update input immediately for smooth typing
    setIsTyping(true); // User is actively typing
    
    // Clear previous search results immediately to prevent race condition
    // This prevents old results from showing when user types new query
    if (value.trim() !== searchQuery.trim()) {
      setSearchResults([]);
      setSearchError('');
      searchResultsRef.current = [];
      setCurrentPage(1); // Reset pagination
    }
    
    // Clear previous timeout
    if (inputTimeoutRef.current) {
      clearTimeout(inputTimeoutRef.current);
    }
    
    // Debounce the searchQuery update and stop typing state
    inputTimeoutRef.current = setTimeout(() => {
      setSearchQuery(value);
      setIsTyping(false); // User finished typing
    }, 500); // Longer delay to ensure user finished typing
  }, [searchQuery]);
  

  const capitalize = useCallback((str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }, []);

  // Helper function to normalize image URL and determine optimization strategy
  const normalizeImageUrl = useCallback((url: string | null | undefined, updatedAt?: string | null): { src: string; shouldOptimize: boolean } => {
    if (!url) {
      return { src: '', shouldOptimize: false };
    }

    let srcRaw = url;
    
    // Normalize local relative path like "generate/file.png" => "/generate/file.png"
    if (!/^https?:\/\//i.test(srcRaw) && !srcRaw.startsWith('/') && !srcRaw.startsWith('data:')) {
      srcRaw = `/${srcRaw}`;
    }

    // Add cache bust for local paths if updated_at is available
    const cacheBust = updatedAt && srcRaw.startsWith('/')
      ? `?v=${new Date(updatedAt).getTime()}`
      : '';
    
    const src = srcRaw.startsWith('/')
      ? `${srcRaw}${cacheBust}`
      : srcRaw;

    // Determine if we should optimize:
    // - Optimize: local paths (/generate/...), Supabase Storage URLs
    // - Don't optimize: data URLs, remote URLs that might not support optimization
    const isDataUrl = srcRaw.startsWith('data:');
    const isSupabase = /supabase\.(co|in)\/storage/i.test(srcRaw);
    const isLocal = srcRaw.startsWith('/');
    const shouldOptimize = (isLocal || isSupabase) && !isDataUrl;

    return { src, shouldOptimize };
  }, []);

  // Helper function to check if certificate is expired
  const isCertificateExpired = useCallback((certificate: Certificate): boolean => {
    if (!certificate.expired_date) return false;
    try {
      const expiredDate = new Date(certificate.expired_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      expiredDate.setHours(0, 0, 0, 0);
      const isExpired = expiredDate < today;
      // Debug log
      if (isExpired) {
        console.log('Certificate expired:', certificate.certificate_no, 'expired_date:', certificate.expired_date, 'today:', today.toISOString());
      }
      return isExpired;
    } catch (error) {
      console.error('Error checking expired date:', error, certificate.expired_date);
      return false;
    }
  }, []);

  // Get expired overlay image URL from Supabase storage - Calculate once at component level
  const expiredOverlayUrl = useMemo(() => {
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

  // Memoized certificate card component for better performance
  const CertificateCard = memo(({ 
    certificate, 
    onPreview,
    language,
    t,
    index = 0,
    expiredOverlayUrl: overlayUrl
  }: { 
    certificate: Certificate; 
    onPreview: (cert: Certificate) => void;
    language: 'en' | 'id';
    t: (key: string) => string;
    index?: number;
    expiredOverlayUrl: string | null;
  }) => {
    const handleClick = useCallback(() => {
      onPreview(certificate);
    }, [certificate, onPreview]);

    const formattedDate = useMemo(() => {
      if (!certificate.issue_date) return null;
      return formatReadableDate(certificate.issue_date, language);
    }, [certificate.issue_date, language]);

    const imageConfig = useMemo(() => {
      return normalizeImageUrl(certificate.certificate_image_url, certificate.updated_at);
    }, [certificate.certificate_image_url, certificate.updated_at]);

    const isExpired = useMemo(() => isCertificateExpired(certificate), [certificate]);

    // FINAL FIX: Remove ALL JavaScript manipulation - use pure CSS only
    // CSS class handles background color automatically via dark mode selector
    // No inline styles, no DOM manipulation, no JavaScript - pure CSS solution

    return (
      <div
        onClick={handleClick}
        className="group bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 ease-in-out cursor-pointer flex flex-row h-[180px] transform will-change-transform relative"
      >
        {/* Certificate Thumbnail - Left Side - Fixed background to prevent flicker */}
        {/* FINAL FIX: Use same approach as template page - Tailwind class directly */}
        {/* Template page uses bg-gray-100 dark:bg-gray-900 without flicker */}
        {/* Add CSS class to prevent black background during Next.js Image loading */}
        <div 
          className="relative w-[170px] flex-shrink-0 flex items-center justify-center overflow-hidden bg-gray-100 dark:bg-gray-900 cert-thumbnail-bg"
        >
          {/* Certificate Image - Always show even if expired */}
          {imageConfig.src ? (
            <div className="relative w-full h-full" style={{ backgroundColor: 'transparent !important', background: 'transparent !important' }}>
              {/* Certificate Thumbnail Image - Bottom Layer */}
              <Image
                key={`cert-image-${certificate.id}-${imageConfig.src}`}
                src={imageConfig.src}
                alt={certificate.name}
                fill
                sizes="170px"
                className="object-contain"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  backgroundColor: 'transparent !important',
                  background: 'transparent !important',
                }}
                loading={index < 3 ? "eager" : "lazy"}
                priority={index < 3}
                unoptimized={!imageConfig.shouldOptimize}
                onError={(e) => {
                  console.error('Certificate image failed to load:', imageConfig.src);
                  e.currentTarget.style.display = 'none';
                }}
                onLoad={() => {
                  console.log('Certificate image loaded successfully:', imageConfig.src);
                }}
              />
              {/* EXPIRED Overlay - Top Layer (Transparent PNG from bucket storage) - Different approach: use div with background-image and CSS filter */}
              {isExpired && overlayUrl && (
                <div 
                  className="absolute inset-0 pointer-events-none z-10 overflow-hidden flex items-center justify-center"
                  style={{
                    backgroundImage: `url(${overlayUrl})`,
                    backgroundSize: 'contain',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                    opacity: 0.85,
                    mixBlendMode: 'multiply',
                    filter: 'brightness(1.1) contrast(1.2)',
                  }}
                />
              )}
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400 dark:text-gray-500" style={{ zIndex: 1 }}>
              <div className="text-center">
                <div className="text-2xl mb-1">📄</div>
                <div className="text-xs">{t('hero.noPreviewImage')}</div>
              </div>
            </div>
          )}
        </div>

        {/* Content Section - Right Side */}
        <div className="flex-1 p-4 flex flex-col justify-center gap-1.5 relative z-0">
          {/* Recipient Name - Primary */}
          <div>
            <h3 className="font-semibold text-base text-gray-900 dark:text-gray-100 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-tight">
              {certificate.name}
            </h3>
          </div>

          {/* Certificate Number - Secondary */}
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 truncate">
              {certificate.certificate_no}
            </p>
          </div>

          {/* Status Badge */}
          {certificate.category && (
            <div>
              <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                {certificate.category}
              </span>
            </div>
          )}

          {/* Metadata */}
          <div className="space-y-0.5 pt-1 border-t border-gray-200 dark:border-gray-700">
            {formattedDate && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t('hero.issued')}: {formattedDate}
              </p>
            )}
            {certificate.members?.organization && (
              <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                {certificate.members.organization}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }, (prevProps, nextProps) => {
    // Only re-render if certificate data actually changed
    // Return true if props are equal (should NOT re-render), false if different (should re-render)
    if (prevProps.certificate.id !== nextProps.certificate.id) return false;
    if (prevProps.certificate.certificate_image_url !== nextProps.certificate.certificate_image_url) return false;
    if (prevProps.certificate.updated_at !== nextProps.certificate.updated_at) return false;
    if (prevProps.certificate.expired_date !== nextProps.certificate.expired_date) return false;
    if (prevProps.certificate.issue_date !== nextProps.certificate.issue_date) return false;
    if (prevProps.language !== nextProps.language) return false;
    if (prevProps.expiredOverlayUrl !== nextProps.expiredOverlayUrl) return false;
    // Don't compare t function, onPreview, or index as they may change but don't affect rendering
    // The key is that certificate data hasn't changed, so we don't need to re-render
    // All important props are equal, don't re-render
    return true;
  });

  CertificateCard.displayName = 'CertificateCard';

  // Memoized preview handler
  const handlePreview = useCallback((cert: Certificate) => {
    setPreviewCert(cert);
    setPreviewOpen(true);
    setIsModalOpen(true); // Update modal context for header blur
  }, [setIsModalOpen]);

  // Clear search handler - memoized
  const handleClearSearch = useCallback(() => {
    // Clear input timeout
    if (inputTimeoutRef.current) {
      clearTimeout(inputTimeoutRef.current);
      inputTimeoutRef.current = null;
    }
    
    setInputValue(''); // Clear input immediately
    setSearchQuery('');
    setSearchError('');
    setSearchResults([]);
    setHasSearched(false);
    setCurrentPage(1);
    setIsTyping(false); // Reset typing state
  }, []);

  // Empty state back to home handler
  const handleBackToHome = useCallback(() => {
    setSearchQuery('');
    setFilters({ keyword: '', category: '', startDate: '', endDate: '' });
    router.push('/');
  }, [router]);

  // Modal handlers - memoized
  const handleClosePreview = useCallback(() => {
    setPreviewOpen(false);
    setPreviewCert(null);
    setIsModalOpen(false); // Update modal context for header blur
  }, [setIsModalOpen]);

  const handleOpenImagePreview = useCallback((url: string | null | undefined, updatedAt?: string | null) => {
    if (!url) return;
    
    // Normalize URL untuk memastikan URL lengkap
    let imageUrl = url;
    
    // Jika sudah full URL (http/https) atau data URL, gunakan langsung
    if (/^https?:\/\//i.test(imageUrl) || imageUrl.startsWith('data:')) {
      // URL Supabase atau external URL sudah lengkap, gunakan langsung
      window.open(imageUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    
    // Normalize local relative path like "generate/file.png" => "/generate/file.png"
    if (!imageUrl.startsWith('/')) {
      imageUrl = `/${imageUrl}`;
    }
    
    // Add cache bust for local paths if updated_at is available
    if (updatedAt) {
      const cacheBust = `?v=${new Date(updatedAt).getTime()}`;
      imageUrl = `${imageUrl}${cacheBust}`;
    }
    
    // Convert relative path to absolute URL
    if (typeof window !== 'undefined') {
      imageUrl = `${window.location.origin}${imageUrl}`;
    }
    
    // Open image in new tab
    window.open(imageUrl, '_blank', 'noopener,noreferrer');
  }, []);

  // Memoized results count text
  const resultsCountText = useMemo(() => {
    if (!searchQuery.trim() || searchResults.length === 0) return null;
    const certText = searchResults.length === 1 ? t('hero.certificate') : t('hero.certificates');
    return `${searchResults.length} ${certText} ${t('search.foundFor')} "${searchQuery}"`;
  }, [searchResults.length, searchQuery, t]);

  // Memoized loading skeleton items
  const loadingSkeletons = useMemo(() => 
    [...Array(6)].map((_, i) => (
      <div
        key={i}
        className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden animate-pulse flex flex-row h-[150px]"
      >
        <div className="w-[170px] flex-shrink-0 bg-gray-200 dark:bg-gray-700" />
        <div className="flex-1 p-4 flex flex-col justify-center gap-1.5">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
        </div>
      </div>
    )), []
  );

  return (
    <div className="bg-gray-50 dark:bg-gray-900 w-full overflow-x-hidden">
      {/* Header - Full Width */}
      <ModernHeader />

      {/* Main Content Area - Search bar is now part of the page content, not fixed header */}
      <div className="w-full px-4 sm:px-6 pt-4 sm:pt-6 pb-4 sm:pb-5 relative z-[10]">
        {/* Search Bar - Part of page content */}
        <div className="mb-8 sm:mb-10">
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Back Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/')}
              className="flex-shrink-0 h-9 sm:h-10 w-9 sm:w-10 self-center"
              aria-label="Go back to home"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>

            {/* Search Bar - Matching home page design exactly */}
            <div className="flex-1 max-w-[600px] relative">
              <div className="flex items-center gap-2 sm:gap-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl sm:rounded-2xl p-1.5 border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="relative flex-1">
                  <Search className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                  <Input
                    type="text"
                    placeholder={t('search.searchByName') || 'Search certificates...'}
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    className="h-9 sm:h-10 pl-8 sm:pl-9 pr-8 sm:pr-9 bg-transparent border-0 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus-visible:ring-0 text-sm sm:text-base text-gray-900 dark:text-gray-100"
                  />
                  {inputValue && (
                    <button
                      onClick={handleClearSearch}
                      className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      aria-label="Clear search"
                    >
                      <XIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <Button
                  onClick={handleSearch}
                  disabled={searching}
                  className="h-9 sm:h-10 px-3 sm:px-4 md:h-11 md:px-5 gradient-primary text-white rounded-lg sm:rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm flex items-center gap-2"
                >
                  <span>{t('hero.searchButton')}</span>
                  {searching ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <ArrowRight className="w-4 h-4" />
                  )}
                </Button>
              </div>
              {/* Error Message - Right below input field, absolute positioned */}
              {searchError && (
                <p className="absolute top-full left-0 mt-1 text-xs sm:text-sm text-red-600 dark:text-red-400 px-1 whitespace-nowrap">{searchError}</p>
              )}
            </div>

            {/* Filter Icon Button */}
            <Button
              type="button"
              onClick={openFilterModal}
              variant="outline"
              size="icon"
              className={`flex-shrink-0 h-9 sm:h-10 w-9 sm:w-10 ${
                hasActiveFilters
                  ? 'bg-green-500 hover:bg-green-600 text-white border-green-500'
                  : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700'
              }`}
              aria-label="Filter"
            >
              <Filter className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </div>
        </div>

        {/* Results Count */}
        {resultsCountText && (
          <div className="mb-4 sm:mb-5">
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              {resultsCountText}
            </p>
          </div>
        )}

        {/* Typing Skeleton - Show while user is actively typing */}
        {isTyping && inputValue.trim() && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 sm:gap-x-5 gap-y-5 sm:gap-y-6">
            {loadingSkeletons}
          </div>
        )}

        {/* Results Grid - Only show when NOT typing and have results */}
        {!isTyping && searchResults.length > 0 && searchQuery.trim() && (
          <>
            {/* Results count and pagination info */}
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {language === 'id' 
                  ? `Menampilkan ${startIndex + 1}-${Math.min(endIndex, totalItems)} dari ${totalItems} hasil`
                  : `Showing ${startIndex + 1}-${Math.min(endIndex, totalItems)} of ${totalItems} results`}
              </p>
              {totalPages > 1 && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {language === 'id' ? `Halaman ${currentPage} dari ${totalPages}` : `Page ${currentPage} of ${totalPages}`}
                </p>
              )}
            </div>
            
            {/* Results Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 sm:gap-x-5 gap-y-5 sm:gap-y-6">
              {currentResults.map((certificate, index) => (
                <CertificateCard
                  key={certificate.id}
                  certificate={certificate}
                  onPreview={handlePreview}
                  language={language}
                  t={t}
                  index={startIndex + index} // Adjust index for pagination
                  expiredOverlayUrl={expiredOverlayUrl}
                />
              ))}
            </div>
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-8">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCurrentPage(prev => Math.max(1, prev - 1));
                    // Scroll to top smoothly when changing page
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  {language === 'id' ? 'Sebelumnya' : 'Previous'}
                </Button>
                
                {/* Page numbers */}
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setCurrentPage(pageNum);
                          // Scroll to top smoothly when changing page
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="w-10"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCurrentPage(prev => Math.min(totalPages, prev + 1));
                    // Scroll to top smoothly when changing page
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-1"
                >
                  {language === 'id' ? 'Selanjutnya' : 'Next'}
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </>
        )}

        {/* Loading Skeleton - Only show if searching and NOT typing */}
        {!isTyping && searching && searchResults.length === 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 sm:gap-x-5 gap-y-5 sm:gap-y-6">
            {loadingSkeletons}
          </div>
        )}

        {/* Empty State - Only show when NOT typing */}
        {!isTyping && !searching && searchResults.length === 0 && !searchError && initialQuery && (
          <div className="text-center py-12 sm:py-16">
            <div className="max-w-md mx-auto">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                {t('error.search.noResults') || 'No certificates found'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {t('error.search.tryDifferent') || 'Try adjusting your search terms or filters'}
              </p>
              <Button
                variant="outline"
                onClick={handleBackToHome}
              >
                {t('nav.home') || 'Back to Home'}
              </Button>
            </div>
          </div>
        )}

        {/* Initial State - No Search Yet - Minimal, no empty state shown */}
        {/* Empty state removed for better UX - search bar is already visible */}

        {/* Certificate Preview Modal */}
        {previewOpen && previewCert && (
          <>
            {/* Backdrop - covers everything including header */}
            <div 
              className="fixed inset-0 bg-black/20 dark:bg-black/40 animate-in fade-in-0 duration-200"
              onClick={handleClosePreview}
              style={{ 
                top: 0, 
                left: 0, 
                right: 0, 
                bottom: 0,
                zIndex: 9999,
                position: 'fixed'
              }}
            />
            {/* Modal Content */}
            <div 
              className="fixed inset-0 flex items-center justify-center p-2 sm:p-4 pointer-events-none animate-in fade-in-0 duration-200"
              onClick={handleClosePreview}
              style={{
                zIndex: 10000,
              }}
            >
              <div 
                className={`bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-auto pointer-events-auto animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 ${sendModalOpen ? 'opacity-0 pointer-events-none' : ''}`}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b dark:border-gray-700">
                  <div>
                    <div className="text-base sm:text-lg font-semibold dark:text-gray-100">{capitalize(t('hero.certificate'))}</div>
                  </div>
                  <Button variant="outline" onClick={handleClosePreview} size="icon" aria-label="Close" className="h-8 w-8 sm:h-10 sm:w-10">
                    <XIcon className="w-4 h-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
                  <div className="p-2 sm:p-4 bg-gray-50 dark:bg-gray-900">
                    {previewCert.certificate_image_url ? (
                      (() => {
                        const isExpired = isCertificateExpired(previewCert);
                        return (
                          <div
                            className={`relative w-full ${isExpired ? 'cursor-default' : 'cursor-zoom-in group'}`}
                            role={isExpired ? undefined : "button"}
                            tabIndex={isExpired ? undefined : 0}
                            onClick={() => {
                              if (!isExpired && previewCert.certificate_image_url) {
                                handleOpenImagePreview(previewCert.certificate_image_url, previewCert.updated_at);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (!isExpired && (e.key === 'Enter' || e.key === ' ')) {
                                e.preventDefault();
                                if (previewCert.certificate_image_url) {
                                  handleOpenImagePreview(previewCert.certificate_image_url, previewCert.updated_at);
                                }
                              }
                            }}
                          >
                            {(() => {
                              const { src, shouldOptimize } = normalizeImageUrl(previewCert.certificate_image_url, previewCert.updated_at);
                              return (
                                <div className="relative w-full aspect-auto">
                                  <Image
                                    src={src}
                                    alt="Certificate"
                                    width={800}
                                    height={600}
                                    className={`w-full h-auto rounded-lg border transition-transform duration-200 ${isExpired ? '' : 'group-hover:scale-[1.01]'}`}
                                    priority
                                    unoptimized={!shouldOptimize}
                                    placeholder="blur"
                                    blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                    }}
                                  />
                                  {/* Expired Overlay - Same as thumbnail */}
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
                                  {/* Debug overlay indicator - Same as thumbnail */}
                                  {isExpired && !expiredOverlayUrl && (
                                    <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center bg-red-500/20">
                                      <div className="text-xs text-red-600 dark:text-red-400 font-bold">EXPIRED</div>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                            {/* View Full Image tooltip - Only show if not expired */}
                            {!isExpired && (
                              <div className="absolute bottom-3 right-3 px-3 py-1 rounded-md bg-black/60 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                {t('hero.viewFullImage')}
                              </div>
                            )}
                          </div>
                        );
                      })()
                    ) : (
                      <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">{t('hero.noPreviewImage')}</div>
                    )}
                  </div>
                  <div className="p-4 sm:p-6">
                    <div className="space-y-2">
                      <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{t('hero.noCertificate') || 'No Certificate'}:</div>
                      <div className="text-sm sm:text-base font-medium text-gray-900 dark:text-gray-100">{previewCert.certificate_no || "—"}</div>
                      <div className="text-lg sm:text-xl md:text-2xl font-semibold dark:text-gray-100 mt-2">{previewCert.members?.name || previewCert.name}</div>
                      {previewCert.members?.organization && (
                        <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{previewCert.members.organization}</div>
                      )}
                    </div>
                    <div className="mt-4 space-y-1 text-xs sm:text-sm">
                      <div><span className="text-gray-500 dark:text-gray-400">{t('hero.category')}:</span> {previewCert.category || "—"}</div>
                      <div><span className="text-gray-500 dark:text-gray-400">{t('hero.issued')}:</span> {formatDateShort(previewCert.issue_date)}</div>
                      {previewCert.expired_date && (
                        <div><span className="text-gray-500 dark:text-gray-400">{t('hero.expires')}:</span> {formatDateShort(previewCert.expired_date)}</div>
                      )}
                    </div>
                    <div className="mt-4 sm:mt-6 flex flex-wrap gap-2 sm:gap-3">
                      {isCertificateExpired(previewCert) ? (
                        <div className="w-full p-3 sm:p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                          <p className="text-sm sm:text-base font-medium text-red-700 dark:text-red-400 text-center">
                            {language === 'id' ? 'Sertifikat ini telah kadaluarsa' : 'This certificate has expired'}
                          </p>
                        </div>
                      ) : (
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
                            <DropdownMenuItem onClick={() => exportToPDF(previewCert)}>
                              <FileTextIcon className="w-4 h-4 mr-2" />
                              {t('hero.exportAsPDF')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => exportToPNG(previewCert)}>
                              <ImageIcon className="w-4 h-4 mr-2" />
                              {t('hero.downloadPNG')}
                            </DropdownMenuItem>
                            {previewCert.certificate_image_url && (
                              <DropdownMenuItem onClick={() => openSendEmailModal(previewCert)}>
                                <Mail className="w-4 h-4 mr-2" />
                                {t('hero.sendViaEmail')}
                              </DropdownMenuItem>
                            )}
                            {previewCert.public_id && (
                              <DropdownMenuItem onClick={() => generateCertificateLink(previewCert)}>
                                <LinkIcon className="w-4 h-4 mr-2" />
                                {t('hero.generateLink')}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            </>
          )}

        {/* Send Email Modal */}
        {sendModalOpen && (
          <>
            {/* No backdrop needed - use certificate modal's backdrop */}
            {/* Email Modal Content - above certificate modal */}
            <div className="fixed top-0 left-0 right-0 bottom-0 w-screen h-screen flex items-center justify-center p-4 pointer-events-none animate-in fade-in-0 duration-200" 
              onClick={() => {
                setSendModalOpen(false);
                // Close certificate modal completely
                setPreviewOpen(false);
                setPreviewCert(null);
                setIsModalOpen(false); // Clear modal context
              }}
              style={{ zIndex: 10201 }}
            >
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden pointer-events-auto animate-in zoom-in-95 slide-in-from-bottom-4 duration-300" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 border-b dark:border-gray-700">
                <div>
                  <div className="text-lg font-semibold dark:text-gray-100">{t('hero.sendEmailTitle')}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">{t('hero.sendEmailSubtitle')}</div>
                </div>
                <Button variant="outline" onClick={() => {
                  setSendModalOpen(false);
                  // Close certificate modal completely
                  setPreviewOpen(false);
                  setPreviewCert(null);
                  setIsModalOpen(false); // Clear modal context
                }} size="icon" aria-label="Close">
                  <XIcon className="w-4 h-4" />
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
                        // Close certificate modal completely
                        setPreviewOpen(false);
                        setPreviewCert(null);
                        setIsModalOpen(false); // Clear modal context
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
                        // Close certificate modal completely
                        setPreviewOpen(false);
                        setPreviewCert(null);
                        setIsModalOpen(false); // Clear modal context
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
                        // Close certificate modal completely
                        setPreviewOpen(false);
                        setPreviewCert(null);
                        setIsModalOpen(false); // Clear modal context
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
                    onClick={() => {
                      setSendModalOpen(false);
                      // Close certificate modal completely
                      setPreviewOpen(false);
                      setPreviewCert(null);
                      setIsModalOpen(false); // Clear modal context
                    }}
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
          </>
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
                      <XIcon className="h-5 w-5" />
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
      </div>
    </div>
  );
}

export default function SearchResultsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    }>
      <SearchResultsContent />
    </Suspense>
  );
}

