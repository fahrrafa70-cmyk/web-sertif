"use client";

import ModernLayout from "@/components/modern-layout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useEffect, useMemo, useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/use-debounce";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/language-context";
import { Badge } from "@/components/ui/badge";
import { FileText, Plus, Search, Edit, Trash2, Layout, X, Settings, Filter, RefreshCw } from "lucide-react";
import { useTemplates } from "@/hooks/use-templates";
import { Template, CreateTemplateData, UpdateTemplateData } from "@/lib/supabase/templates";
import { debugTemplateImages, checkAllTemplatesOptimization } from "@/lib/debug/template-debug";
import { useTemplateImageCache, persistentCache } from "@/lib/cache/template-cache";
import { preloadCriticalTemplates, getOptimizedTemplateUrl, prefetchOnHover } from "@/lib/supabase/template-optimization";
import { getCertificatesByTemplate } from "@/lib/supabase/certificates";
import { toast, Toaster } from "sonner";
import { confirmToast } from "@/lib/ui/confirm";
import { LoadingButton } from "@/components/ui/loading-button";
import Image from "next/image";
import TemplateCard from "@/components/template-card";
// import { useSmartPreloader } from "@/hooks/use-smart-preloader"; // ✅ TEMPORARILY DISABLED

export default function TemplatesPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [role, setRole] = useState<"Admin" | "Team" | "Public">("Public");
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [generatingThumbnails, setGeneratingThumbnails] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

  // Use templates hook for Supabase integration
  const { templates, loading, error, create, update, delete: deleteTemplate, refresh } = useTemplates();
  
  // Use template image cache
  const { isCached, getCachedUrl, cacheTemplate, preloadImages } = useTemplateImageCache();

  // Filter templates based on search query and category
  const filtered = useMemo(() => {
    let list = templates;
    if (debouncedQuery) {
      const q = debouncedQuery.toLowerCase();
      list = list.filter((i) => i.name.toLowerCase().includes(q));
    }
    if (categoryFilter) {
      list = list.filter((i) => i.category === categoryFilter);
    }
    return list;
  }, [templates, debouncedQuery, categoryFilter]);
  
  // ✅ PHASE 2: Smart preloader for next page templates - TEMPORARILY DISABLED
  // const { preloadTemplate, preloadOnHover, preloadNextPage, getStats } = useSmartPreloader({
  //   templates: filtered,
  //   itemsPerPage: 12, // Assuming 12 templates per page
  //   preloadDistance: 6, // Preload 6 templates ahead
  //   maxConcurrentPreloads: 3 // Max 3 concurrent preloads
  // });
  
  // ✅ OPTIMIZED: Preload critical templates on mount
  useEffect(() => {
    if (templates.length > 0) {
      preloadCriticalTemplates(templates);
    }
  }, [templates]);

  // ✅ OPTIMIZED: Preload on hover function
  const preloadOnHover = useCallback((template: Template) => {
    // Use the optimized prefetch function
    prefetchOnHover(template);
  }, []);

  // derive role from localStorage to match header behavior without changing layout
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("ecert-role");
      // Accept both lowercase and capitalized role values
      const normalized = (saved || "").toLowerCase();
      if (normalized === "admin") setRole("Admin");
      else if (normalized === "team") setRole("Team");
      else if (normalized === "public") setRole("Public");
    } catch {}
  }, []);

  // Debug template optimization status - only run once when templates first load
  useEffect(() => {
    if (templates && templates.length > 0 && !loading) {
      console.log('🔍 Debugging template optimization status...');
      const stats = checkAllTemplatesOptimization(templates);
      
      if (stats.needsOptimization > 0) {
        console.warn(`⚠️ ${stats.needsOptimization} template(s) masih menggunakan gambar asli!`);
        console.log('💡 Untuk mempercepat loading, jalankan: npm run thumbnails:regenerate');
      }
    }
  }, [templates.length]); // Only depend on length to avoid rerunning on every template change

  // Preload template images for better performance - only when filtered list changes significantly
  useEffect(() => {
    if (filtered.length > 0) {
      const urlsToPreload = filtered.slice(0, 6).map(tpl => getOptimizedTemplateUrl(tpl)).filter(Boolean) as string[];
      if (urlsToPreload.length > 0) {
        preloadImages(urlsToPreload);
      }
    }
  }, [filtered.length, debouncedQuery, categoryFilter]); // Depend on specific filters instead of entire filtered array

  // Optimized function to get template URL with caching - memoized to prevent recreation
  const getCachedTemplateUrl = useCallback((template: Template): string | null => {
    // Check cache first
    if (isCached(template.id)) {
      const cachedUrl = getCachedUrl(template.id);
      if (cachedUrl) return cachedUrl;
    }

    // Check persistent storage
    const persistent = persistentCache.load(template.id);
    if (persistent) {
      cacheTemplate(template.id, persistent.url, persistent.isOptimized);
      return persistent.url;
    }

    // Get URL from template data
    const url = getOptimizedTemplateUrl(template);
    if (url) {
      const isOptimized = !!(template.thumbnail_path || template.preview_thumbnail_path);
      cacheTemplate(template.id, url, isOptimized);
      persistentCache.save(template.id, url, isOptimized);
    }

    return url;
  }, [isCached, getCachedUrl, cacheTemplate]);

  // Function to generate thumbnail in background
  const generateThumbnailInBackground = async (template: Template) => {
    if (generatingThumbnails.has(template.id)) return; // Already generating
    
    setGeneratingThumbnails(prev => new Set(prev).add(template.id));
    
    try {
      console.log(`🔄 Generating thumbnail for ${template.name}...`);
      
      const response = await fetch('/api/generate-single-thumbnail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: template.id }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log(`✅ Thumbnail generated for ${template.name}: ${result.thumbnailUrl}`);
        // Refresh templates to get updated thumbnail path
        refresh();
      } else {
        console.warn(`⚠️ Thumbnail generation failed for ${template.name}:`, result.error);
      }
    } catch (error) {
      console.error(`❌ Error generating thumbnail for ${template.name}:`, error);
    } finally {
      setGeneratingThumbnails(prev => {
        const newSet = new Set(prev);
        newSet.delete(template.id);
        return newSet;
      });
    }
  };

  // Check template usage when templates are loaded - only when length changes
  useEffect(() => {
    if (templates.length === 0) return;
    
    const checkTemplateUsage = async () => {
      const usageMap = new Map<string, number>();
      
      // Check usage for each template in parallel
      const checks = templates.map(async (template) => {
        try {
          const certificates = await getCertificatesByTemplate(template.id);
          if (certificates && certificates.length > 0) {
            usageMap.set(template.id, certificates.length);
          }
        } catch (error) {
          console.error(`Error checking usage for template ${template.id}:`, error);
        }
      });
      
      await Promise.all(checks);
      setTemplateUsageMap(usageMap);
    };
    
    checkTemplateUsage();
  }, [templates.length]); // Only depend on length to avoid rerunning on every template update

  // Sheet state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState<null | string>(null);
  const [draft, setDraft] = useState<Partial<Template> | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [previewImageFile, setPreviewImageFile] = useState<File | null>(null);
  const [previewImagePreview, setPreviewImagePreview] = useState<string | null>(null);
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);
  const [creatingTemplate, setCreatingTemplate] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(false);
  const [templateUsageMap, setTemplateUsageMap] = useState<Map<string, number>>(new Map()); // Map<templateId, certificateCount>
  
  // Dual template mode state
  const [isDualTemplate, setIsDualTemplate] = useState(false);
  const [certificateImageFile, setCertificateImageFile] = useState<File | null>(null);
  const [certificateImagePreview, setCertificateImagePreview] = useState<string | null>(null);
  const [scoreImageFile, setScoreImageFile] = useState<File | null>(null);
  const [scoreImagePreview, setScoreImagePreview] = useState<string | null>(null);
  
  // Preview modal state
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  
  const canDelete = role === "Admin"; // Only Admin can delete

  // Stable callback functions to prevent unnecessary rerenders
  const handleImageError = useCallback((templateId: string) => {
    setFailedImages(prev => new Set(prev).add(templateId));
  }, []);

  const handleImageLoad = useCallback((templateId: string) => {
    setLoadedImages(prev => new Set(prev).add(templateId));
  }, []);

  // Helper function to get image URL for template (now using the imported function)
  // This function is kept for backward compatibility but now uses the proper implementation

  function openCreate() {
    setDraft({ name: "", orientation: "Landscape", category: "" });
    setImageFile(null);
    setImagePreview(null);
    setPreviewImageFile(null);
    setPreviewImagePreview(null);
    setIsDualTemplate(false);
    setCertificateImageFile(null);
    setCertificateImagePreview(null);
    setScoreImageFile(null);
    setScoreImagePreview(null);
    setIsCreateOpen(true);
  }

  async function submitCreate() {
    // Validate name
    if (!draft || !draft.name?.trim()) {
      toast.error(t('templates.fillTemplateName'));
      return;
    }

    // Validate category
    if (!draft || !draft.category?.trim()) {
      toast.error(t('templates.selectCategory'));
      return;
    }

    // Validate based on template mode
    if (isDualTemplate) {
      if (!certificateImageFile) {
        toast.error(t('templates.uploadCertificateImage'));
        return;
      }
      if (!scoreImageFile) {
        toast.error(t('templates.uploadScoreImage'));
        return;
      }
    } else {
      if (!imageFile) {
        toast.error(t('templates.uploadTemplateImage'));
        return;
      }
    }

    try {
      setCreatingTemplate(true);
      const templateData: CreateTemplateData = {
        name: draft.name.trim(),
        category: draft.category.trim(),
        orientation: draft.orientation || "Landscape",
        is_dual_template: isDualTemplate,
        preview_image_file: previewImageFile || undefined
      };

      // Add appropriate image files based on mode
      if (isDualTemplate) {
        templateData.certificate_image_file = certificateImageFile || undefined;
        templateData.score_image_file = scoreImageFile || undefined;
      } else {
        templateData.image_file = imageFile || undefined;
      }

      // Template data prepared, calling create function
      
      await create(templateData);
      // Template created successfully
      
      setIsCreateOpen(false);
      setDraft(null);
      setImageFile(null);
      setImagePreview(null);
      setPreviewImageFile(null);
      setPreviewImagePreview(null);
      setIsDualTemplate(false);
      setCertificateImageFile(null);
      setCertificateImagePreview(null);
      setScoreImageFile(null);
      setScoreImagePreview(null);
      toast.success(t('templates.createSuccess'));
      // Refresh templates to show the new template immediately
      refresh();
    } catch (error) {
      console.error('💥 Template creation failed:', error);
      toast.error(error instanceof Error ? error.message : t('templates.createFailed'));
    } finally {
      setCreatingTemplate(false);
    }
  }

  function openEdit(item: Template) {
    // CRITICAL: Only use is_layout_configured as fallback if status is truly undefined/null
    // If status exists (even if empty string), use it directly
    // This ensures that once status is set, it won't be overridden by is_layout_configured
    const initialStatus = (item.status !== undefined && item.status !== null && item.status !== '')
      ? item.status 
      : (item.is_layout_configured ? "ready" : "draft");
    setDraft({ 
      ...item, 
      status: initialStatus // Explicitly set status to ensure it's always present
    });
    console.log('📝 Opening edit for template:', item.name, 'with status:', initialStatus, 'from item.status:', item.status, 'is_layout_configured:', item.is_layout_configured);
    setImageFile(null);
    setImagePreview(null);
    setPreviewImageFile(null);
    setPreviewImagePreview(null);
    setIsDualTemplate(item.is_dual_template || false);
    setCertificateImageFile(null);
    setCertificateImagePreview(null);
    setScoreImageFile(null);
    setScoreImagePreview(null);
    setIsEditOpen(item.id);
  }

  async function submitEdit() {
    if (!draft || !isEditOpen || !draft.name || !draft.category) {
      toast.error(t('templates.fillRequiredFields'));
      return;
    }

    // Validate based on template mode
    if (isDualTemplate) {
      if (!certificateImageFile && !draft.certificate_image_url) {
        toast.error(t('templates.certificateImageRequired'));
        return;
      }
      if (!scoreImageFile && !draft.score_image_url) {
        toast.error(t('templates.scoreImageRequired'));
        return;
      }
    } else {
      if (!imageFile && !draft.image_path) {
        toast.error(t('templates.templateImageRequired'));
        return;
      }
    }

    try {
      setEditingTemplate(true);
      // Get status from draft - CRITICAL: Always use draft.status if it exists (even if empty string)
      // This ensures the user's selection is always sent to the API
      // Only use fallback if draft.status is truly undefined or null
      const statusValue = (draft.status !== undefined && draft.status !== null && draft.status !== '')
        ? draft.status 
        : (draft.is_layout_configured ? "ready" : "draft");
      
      console.log('📝 Submitting edit with status:', statusValue, 'from draft.status:', draft.status, 'is_layout_configured:', draft.is_layout_configured, 'full draft:', draft);
      
      const templateData: UpdateTemplateData = {
        name: draft.name,
        category: draft.category,
        orientation: draft.orientation,
        is_dual_template: isDualTemplate,
        preview_image_file: previewImageFile || undefined,
        status: statusValue // CRITICAL: Always include status to ensure it's updated in database
      };
      
      console.log('📤 Template data to update (including status):', JSON.stringify(templateData, null, 2));

      // Add appropriate image files based on mode
      if (isDualTemplate) {
        templateData.certificate_image_file = certificateImageFile || undefined;
        templateData.score_image_file = scoreImageFile || undefined;
      } else {
        templateData.image_file = imageFile || undefined;
      }

      const updatedTemplate = await update(isEditOpen, templateData);
      console.log('✅ Template updated, returned data:', updatedTemplate, 'with status:', updatedTemplate?.status);
      
      // Update draft with the latest data including status before closing
      if (updatedTemplate && draft) {
        setDraft({
          ...draft,
          ...updatedTemplate,
          status: updatedTemplate.status || draft.status || (updatedTemplate.is_layout_configured ? "ready" : "draft")
        });
        console.log('✅ Draft updated with latest data, status:', updatedTemplate.status);
      }
      
      // Force refresh templates to ensure we have the latest data including status
      // Clear cache first, then small delay to ensure database is updated before refresh
      if (typeof window !== 'undefined') {
        try {
          const { dataCache, CACHE_KEYS } = await import('@/lib/cache/data-cache');
          dataCache.delete(CACHE_KEYS.TEMPLATES);
          console.log('✅ Cache cleared before refresh');
        } catch (e) {
          console.warn('⚠️ Could not clear cache:', e);
        }
      }
      // Small delay to ensure database is updated before refresh
      await new Promise(resolve => setTimeout(resolve, 500));
      // IMPORTANT: Use bypassCache=true to force fresh data from database
      await refresh(true);
      
      setIsEditOpen(null);
      setDraft(null);
      setImageFile(null);
      setImagePreview(null);
      setPreviewImageFile(null);
      setPreviewImagePreview(null);
      setIsDualTemplate(false);
      setCertificateImageFile(null);
      setCertificateImagePreview(null);
      setScoreImageFile(null);
      setScoreImagePreview(null);
      toast.success(t('templates.updateSuccess'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('templates.updateFailed'));
    } finally {
      setEditingTemplate(false);
    }
  }

  async function requestDelete(id: string) {
    if (!canDelete) {
      toast.error(t('templates.deleteNoPermission'));
      return;
    }
    
    // Find template name for better confirmation message
    const template = templates.find(t => t.id === id);
    const templateName = template?.name || 'this template';
    
    // Check if template is being used by any certificates
    try {
      const certificates = await getCertificatesByTemplate(id);
      if (certificates && certificates.length > 0) {
        toast.error(t('templates.cannotDeleteInUse').replace('{name}', templateName).replace('{count}', certificates.length.toString()));
        return;
      }
    } catch (error) {
      console.error('Error checking template usage:', error);
      // Continue with deletion if check fails (don't block deletion)
      toast.warning(t('templates.cannotVerifyUsage'));
    }
    
    const ok = await confirmToast(t('templates.deleteConfirm').replace('{name}', templateName), { confirmText: t('common.delete'), tone: "destructive" });
  if (ok) {
      try {
        // User confirmed deletion
        setDeletingTemplateId(id);
        await deleteTemplate(id);
        
        // Clear failed image state for deleted template
        setFailedImages(prev => {
          const newSet = new Set(prev);
          newSet.delete(id);
          return newSet;
        });
        
        toast.success(t('templates.deleteSuccess').replace('{name}', templateName));
        
        // Note: No need to call refresh() here because deleteTemplate already updates state
        // Calling refresh() can cause race condition if database hasn't propagated the delete yet
      } catch (error) {
        console.error('💥 Delete failed:', error);
        toast.error(error instanceof Error ? error.message : t('templates.deleteFailed'));
      } finally {
        setDeletingTemplateId(null);
      }
    }
  }

  function openPreview(template: Template) {
    setPreviewTemplate(template);
  }

  function handleImageUpload(file: File | null) {
    if (file) {
      // Validate file type
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      if (!fileExt || !['jpg', 'jpeg', 'png'].includes(fileExt)) {
        toast.error(t('templates.invalidFileType'));
        return;
      }
      
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error(t('templates.fileTooLarge'));
        return;
      }
      
      setImageFile(file);
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    } else {
      setImageFile(null);
      setImagePreview(null);
    }
  }

  function handlePreviewImageUpload(file: File | null) {
    if (file) {
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      if (!fileExt || !['jpg', 'jpeg', 'png'].includes(fileExt)) {
        toast.error('Invalid file type. Only JPG, JPEG, and PNG are allowed.');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size too large. Maximum size is 10MB.');
        return;
      }
      setPreviewImageFile(file);
      const url = URL.createObjectURL(file);
      setPreviewImagePreview(url);
    } else {
      setPreviewImageFile(null);
      setPreviewImagePreview(null);
    }
  }

  function handleCertificateImageUpload(file: File | null) {
    if (file) {
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      if (!fileExt || !['jpg', 'jpeg', 'png'].includes(fileExt)) {
        toast.error('Invalid file type. Only JPG, JPEG, and PNG are allowed.');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size too large. Maximum size is 10MB.');
        return;
      }
      setCertificateImageFile(file);
      const url = URL.createObjectURL(file);
      setCertificateImagePreview(url);
    } else {
      setCertificateImageFile(null);
      setCertificateImagePreview(null);
    }
  }

  function handleScoreImageUpload(file: File | null) {
    if (file) {
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      if (!fileExt || !['jpg', 'jpeg', 'png'].includes(fileExt)) {
        toast.error('Invalid file type. Only JPG, JPEG, and PNG are allowed.');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size too large. Maximum size is 10MB.');
        return;
      }
      setScoreImageFile(file);
      const url = URL.createObjectURL(file);
      setScoreImagePreview(url);
    } else {
      setScoreImageFile(null);
      setScoreImagePreview(null);
    }
  }

  const getCategoryColor = (category: string) => {
    const colors = {
      Training: "from-blue-500 to-blue-600",
      Internship: "from-green-500 to-green-600", 
      MoU: "from-purple-500 to-purple-600",
      Visit: "from-orange-500 to-orange-600"
    };
    return colors[category as keyof typeof colors] || "from-gray-500 to-gray-600";
  };

  return (
    <ModernLayout>
      {/* Main Content Section */}
      <motion.section 
        className="relative -mt-4 pb-6 sm:-mt-5 sm:pb-8 bg-gray-50 dark:bg-gray-900"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        <div className="w-full max-w-[1280px] mx-auto px-2 sm:px-3 lg:px-0 relative">
          {/* Header Section - Like Groups page */}
          <div className="mb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-2 w-full">
              {/* Title */}
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-lg shadow-md flex-shrink-0 bg-blue-500">
                  <Layout className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <h1 className="text-xl sm:text-3xl md:text-4xl font-bold text-[#2563eb] dark:text-blue-400">
                  {t('templates.title')}
                </h1>
              </div>
              
              {/* Create Button */}
              {(role === "Admin" || role === "Team") && (
                <Button 
                  onClick={openCreate} 
                  className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white w-full sm:w-auto"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  <span>{t('templates.create')}</span>
                </Button>
              )}
            </div>
          </div>

          {/* Main Content Card - Like Groups page - Centered */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-md dark:shadow-lg p-4 sm:p-6 max-w-full">
            {/* Search Bar - Inside Card */}
            <div className="mb-4">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                  <Input 
                    placeholder={t('templates.search')} 
                    className="pl-10 h-10 rounded-lg border-gray-200 dark:border-gray-700 focus:border-blue-500 focus:ring-blue-500/20 text-sm bg-white dark:bg-gray-800" 
                    value={query} 
                    onChange={(e) => setQuery(e.target.value)} 
                  />
                </div>
                <Button
                  type="button"
                  variant={categoryFilter ? "default" : "outline"}
                  onClick={() => setShowFilters(!showFilters)}
                  className="h-10 w-10 p-0 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 flex-shrink-0"
                  aria-label="Toggle filters"
                >
                  <Filter className="w-4 h-4" />
                  {categoryFilter && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full" />
                  )}
                </Button>
              </div>

              {/* Filter Panel */}
              {showFilters && (
                <div className="mt-4 pb-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t('templates.category')}
                      </label>
                      <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
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
                    </div>
                  </div>
                </div>
              )}
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
                    {t("templates.loading")}
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    {t("templates.loadingMessage")}
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
                    {t("templates.errorLoading")}
                  </h3>
                  <p className="text-gray-500 text-sm mb-6">{error}</p>
                  <Button
                    onClick={() => refresh()}
                    className="bg-[#2563eb] text-white"
                  >
                    {t("templates.tryAgain")}
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Results Count */}
            {!loading && !error && filtered.length > 0 && (
              <div className="mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('templates.found').replace('{count}', filtered.length.toString()).replace('{plural}', filtered.length !== 1 ? 's' : '')}
                </p>
              </div>
            )}

            {/* Templates Grid - 3 Columns like /search */}
            {!loading && !error && filtered.length > 0 && (
            <motion.div 
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 max-w-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ staggerChildren: 0.1, delayChildren: 0.2 }}
            >
              {filtered.map((tpl, index) => (
                <div key={tpl.id} className="max-w-full">
                  <TemplateCard
                    template={tpl}
                    index={index}
                    failedImages={failedImages}
                    loadedImages={loadedImages}
                    generatingThumbnails={generatingThumbnails}
                    getOptimizedTemplateUrl={getCachedTemplateUrl}
                    generateThumbnailInBackground={generateThumbnailInBackground}
                    onPreview={openPreview}
                    onImageError={handleImageError}
                    onImageLoad={handleImageLoad}
                    onHoverPreload={preloadOnHover}
                    role={role}
                    templateUsageMap={templateUsageMap}
                    canDelete={canDelete}
                    deletingTemplateId={deletingTemplateId}
                    onEdit={openEdit}
                    onDelete={requestDelete}
                    router={router}
                    t={t}
                  />
                </div>
              ))}
            </motion.div>
          )}

            {/* Empty State */}
            {!loading && !error && filtered.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-12 sm:p-16"
              >
                <div className="text-center max-w-md mx-auto">
                  <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center mx-auto mb-6">
                    <FileText className="w-10 h-10 text-gray-400 dark:text-gray-500" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    {t('templates.noTemplates')}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    {t('templates.noTemplatesMessage')}
                  </p>
                  {(role === "Admin" || role === "Team") && (
                    <Button 
                      onClick={openCreate} 
                      className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
                    >
                      <Plus className="w-5 h-5 mr-2" />
                      {t('templates.createNew')}
                    </Button>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </motion.section>

      {/* Enhanced Create Template Sheet */}
      <Sheet open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
          <SheetHeader className="flex-shrink-0">
            <SheetTitle className="text-xl font-bold text-gradient">{t('templates.createTitle')}</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-6">
            <motion.div 
              className="space-y-2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('templates.templateName')}</label>
              <Input 
                value={draft?.name ?? ""} 
                onChange={(e) => setDraft((d) => (d ? { ...d, name: e.target.value } : d))} 
                placeholder={t('templates.templateNamePlaceholder')}
                className="rounded-lg border-gray-200 dark:border-gray-700 focus:border-blue-500 focus:ring-blue-500/20 dark:bg-gray-900 dark:text-gray-100"
              />
            </motion.div>
            
            <motion.div 
              className="space-y-2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('templates.category')}</label>
              <select 
                value={draft?.category ?? ""} 
                onChange={(e) => setDraft((d) => (d ? { ...d, category: e.target.value } : d))} 
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">{t('templates.selectCategory')}</option>
                <option value="MoU">MoU</option>
                <option value="Magang">Magang</option>
                <option value="Pelatihan">Pelatihan</option>
                <option value="Kunjungan Industri">Kunjungan Industri</option>
                <option value="Sertifikat">Sertifikat</option>
                <option value="Surat">Surat</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </motion.div>
            
            <motion.div 
              className="space-y-3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('templates.orientation')}</label>
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  variant={draft?.orientation === "Landscape" ? "default" : "outline"} 
                  onClick={() => setDraft((d) => (d ? { ...d, orientation: "Landscape" } : d))}
                  className="rounded-lg"
                >
                  <Layout className="w-4 h-4 mr-2" />
                  {t('templates.landscape')}
                </Button>
                <Button 
                  variant={draft?.orientation === "Portrait" ? "default" : "outline"} 
                  onClick={() => setDraft((d) => (d ? { ...d, orientation: "Portrait" } : d))}
                  className="rounded-lg"
                >
                  <Layout className="w-4 h-4 mr-2" />
                  {t('templates.portrait')}
                </Button>
              </div>
            </motion.div>

            {/* Dual Template Mode Selector */}
            <motion.div 
              className="space-y-3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.25 }}
            >
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('templates.templateMode')}</label>
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  variant={!isDualTemplate ? "default" : "outline"} 
                  onClick={() => setIsDualTemplate(false)}
                  className="rounded-lg"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  {t('templates.singleSide')}
                </Button>
                <Button 
                  variant={isDualTemplate ? "default" : "outline"} 
                  onClick={() => setIsDualTemplate(true)}
                  className="rounded-lg"
                >
                  <Layout className="w-4 h-4 mr-2" />
                  {t('templates.doubleSide')}
                </Button>
              </div>
              {isDualTemplate && (
                <p className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 p-2 rounded-lg">
                  {t('templates.dualTemplateInfo')}
                </p>
              )}
            </motion.div>

            {/* Single Template Image */}
            {!isDualTemplate && (
            <motion.div 
              className="space-y-2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.3 }}
            >
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('templates.templateImage')}</label>
              <div className="space-y-3">
                <input
                  type="file"
                  accept=".png,.jpg,.jpeg"
                  onChange={(e) => handleImageUpload(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-gray-700 dark:text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 dark:file:bg-blue-900/30 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/50"
                />
                {imagePreview && (
                  <div className="relative">
                    <div className="relative w-full h-32">
                      <Image 
                        src={imagePreview} 
                        alt="Template preview" 
                        fill
                        className="object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                        unoptimized
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="absolute top-2 right-2 bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-gray-800"
                      onClick={() => handleImageUpload(null)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
            )}

            {/* Dual Template Images */}
            {isDualTemplate && (
              <>
                {/* Certificate Image */}
                <motion.div 
                  className="space-y-2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.3 }}
                >
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('templates.certificateImage')}</label>
                  <div className="space-y-3">
                    <input
                      type="file"
                      accept=".png,.jpg,.jpeg"
                      onChange={(e) => handleCertificateImageUpload(e.target.files?.[0] || null)}
                      className="block w-full text-sm text-gray-700 dark:text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 dark:file:bg-blue-900/30 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/50"
                    />
                    {certificateImagePreview && (
                      <div className="relative">
                        <div className="relative w-full h-32">
                          <Image 
                            src={certificateImagePreview} 
                            alt="Certificate preview" 
                            fill
                            className="object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                            unoptimized
                          />
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="absolute top-2 right-2 bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-gray-800"
                          onClick={() => handleCertificateImageUpload(null)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </motion.div>

                {/* Score Image */}
                <motion.div 
                  className="space-y-2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.35 }}
                >
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('templates.scoreImage')}</label>
                  <div className="space-y-3">
                    <input
                      type="file"
                      accept=".png,.jpg,.jpeg"
                      onChange={(e) => handleScoreImageUpload(e.target.files?.[0] || null)}
                      className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                    />
                    {scoreImagePreview && (
                      <div className="relative">
                        <div className="relative w-full h-32">
                          <Image 
                            src={scoreImagePreview} 
                            alt="Score preview" 
                            fill
                            className="object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                            unoptimized
                          />
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="absolute top-2 right-2 bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-gray-800"
                          onClick={() => handleScoreImageUpload(null)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </motion.div>
              </>
            )}

            

            {/* Preview Image Upload */}
            <motion.div 
              className="space-y-2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.35 }}
            >
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('templates.previewImage')}</label>
              <div className="space-y-3">
                <input
                  type="file"
                  accept=".png,.jpg,.jpeg"
                  onChange={(e) => handlePreviewImageUpload(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                />
                {previewImagePreview && (
                  <div className="relative">
                    <div className="relative w-full h-24">
                      <Image 
                        src={previewImagePreview} 
                        alt="Preview image" 
                        fill
                        className="object-cover rounded-lg border border-gray-200 dark:border-gray-700" 
                        unoptimized
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="absolute top-2 right-2 bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-gray-800"
                      onClick={() => handlePreviewImageUpload(null)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
            
            <motion.div 
              className="flex justify-end gap-3 pt-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.4 }}
            >
              <Button 
                variant="outline" 
                className="border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600 dark:text-gray-100" 
                onClick={() => setIsCreateOpen(false)}
              >
                {t('common.cancel')}
              </Button>
              <LoadingButton 
                className="gradient-primary text-white shadow-lg hover:shadow-xl" 
                onClick={submitCreate}
                isLoading={creatingTemplate}
                loadingText={t('common.saving')}
                variant="primary"
              >
                {t('templates.create')}
              </LoadingButton>
            </motion.div>
          </div>
        </SheetContent>
      </Sheet>

      

          {/* Enhanced Edit Template Sheet */}
          <Sheet open={!!isEditOpen} onOpenChange={(o) => setIsEditOpen(o ? isEditOpen : null)}>
            <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
              <SheetHeader>
                <SheetTitle className="text-xl font-bold text-gradient">{t('templates.editTitle')}</SheetTitle>
                <SheetDescription>{t('templates.editDescription')}</SheetDescription>
              </SheetHeader>
              <div className="p-4 space-y-6">
                {/* Template Name */}
                <motion.div 
                  className="space-y-2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('templates.templateName')}</label>
                  <Input 
                    value={draft?.name ?? ""} 
                    onChange={(e) => setDraft((d) => (d ? { ...d, name: e.target.value } : d))} 
                    placeholder={t('templates.templateNamePlaceholder')}
                    className="rounded-lg border-gray-200 dark:border-gray-700 focus:border-blue-500 focus:ring-blue-500/20 dark:bg-gray-900 dark:text-gray-100"
                  />
                </motion.div>

                {/* Category */}
                <motion.div 
                  className="space-y-2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                >
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('templates.category')}</label>
                  <select 
                    value={draft?.category ?? ""} 
                    onChange={(e) => setDraft((d) => (d ? { ...d, category: e.target.value } : d))} 
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">{t('templates.selectCategory')}</option>
                    <option value="MoU">MoU</option>
                    <option value="Magang">Magang</option>
                    <option value="Pelatihan">Pelatihan</option>
                    <option value="Kunjungan Industri">Kunjungan Industri</option>
                    <option value="Sertifikat">Sertifikat</option>
                    <option value="Surat">Surat</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </motion.div>

                {/* Orientation */}
                <motion.div 
                  className="space-y-3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                >
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('templates.orientation')}</label>
                  <div className="grid grid-cols-2 gap-3">
                    <Button 
                      variant={draft?.orientation === "Landscape" ? "default" : "outline"} 
                      onClick={() => setDraft((d) => (d ? { ...d, orientation: "Landscape" } : d))}
                      className="rounded-lg"
                    >
                      <Layout className="w-4 h-4 mr-2" />
                      {t('templates.landscape')}
                    </Button>
                    <Button 
                      variant={draft?.orientation === "Portrait" ? "default" : "outline"} 
                      onClick={() => setDraft((d) => (d ? { ...d, orientation: "Portrait" } : d))}
                      className="rounded-lg"
                    >
                      <Layout className="w-4 h-4 mr-2" />
                      {t('templates.portrait')}
                    </Button>
                  </div>
                </motion.div>

                {/* Status */}
                <motion.div 
                  className="space-y-2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.22 }}
                >
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('templates.status')}</label>
                  <select 
                    value={(draft?.status !== undefined && draft?.status !== null && draft?.status !== '') 
                      ? draft.status 
                      : (draft?.is_layout_configured ? "ready" : "draft")} 
                    onChange={(e) => {
                      const newStatus = e.target.value;
                      setDraft((d) => {
                        const updated = d ? { ...d, status: newStatus } : null;
                        console.log('📝 Status changed to:', newStatus, 'updated draft:', updated);
                        return updated;
                      });
                    }} 
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="draft">{t('templates.status.draft')}</option>
                    <option value="ready">{t('templates.status.ready')}</option>
                  </select>
                </motion.div>

                {/* Dual Template Mode Selector */}
                <motion.div 
                  className="space-y-3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.25 }}
                >
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('templates.templateMode')}</label>
                  <div className="grid grid-cols-2 gap-3">
                    <Button 
                      variant={!isDualTemplate ? "default" : "outline"} 
                      onClick={() => setIsDualTemplate(false)}
                      className="rounded-lg"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      {t('templates.singleSide')}
                    </Button>
                    <Button 
                      variant={isDualTemplate ? "default" : "outline"} 
                      onClick={() => setIsDualTemplate(true)}
                      className="rounded-lg"
                    >
                      <Layout className="w-4 h-4 mr-2" />
                      {t('templates.doubleSide')}
                    </Button>
                  </div>
                  {isDualTemplate && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 p-2 rounded-lg">
                      {t('templates.dualTemplateInfo')}
                    </p>
                  )}
                </motion.div>

                {/* Single Template Image */}
                {!isDualTemplate && (
                  <>
                    {/* Current Template Image */}
                    <motion.div 
                      className="space-y-2"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: 0.3 }}
                    >
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('templates.currentTemplateImage')}</label>
                      <div className="relative border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-900">
                        {imagePreview ? (
                          <div className="relative w-full h-40 bg-gray-50 dark:bg-gray-800">
                            <Image
                              src={imagePreview}
                              alt="New template image"
                              fill
                              className="object-contain"
                              unoptimized
                            />
                          </div>
                        ) : (
                          <>
                            {draft && getCachedTemplateUrl(draft as Template) ? (
                              <div className="relative w-full h-40 bg-gray-50 dark:bg-gray-800">
                                <Image
                                  src={getCachedTemplateUrl(draft as Template)!}
                                  alt="Current template"
                                  fill
                                  className="object-contain"
                                  unoptimized
                                />
                              </div>
                            ) : (
                              <div className="w-full h-40 flex items-center justify-center text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800">
                                <Layout className="w-6 h-6 mr-2" />
                                {t('templates.noTemplateImage')}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </motion.div>

                    {/* Upload New Template Image */}
                    <motion.div 
                      className="space-y-2"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: 0.4 }}
                    >
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('templates.changeTemplateImage')}</label>
                      <div className="space-y-3">
                        <input
                          type="file"
                          accept=".png,.jpg,.jpeg"
                          onChange={(e) => handleImageUpload(e.target.files?.[0] || null)}
                          className="block w-full text-sm text-gray-700 dark:text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-indigo-50 dark:file:bg-indigo-900/30 file:text-indigo-700 dark:file:text-indigo-300 hover:file:bg-indigo-100 dark:hover:file:bg-indigo-900/50 cursor-pointer"
                        />
                        {imagePreview && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => handleImageUpload(null)}
                          >
                            <X className="w-4 h-4 mr-2" />
                            {t('templates.removeNewImage')}
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  </>
                )}

                {/* Dual Template Images */}
                {isDualTemplate && (
                  <>
                    {/* Current Certificate Image */}
                    <motion.div 
                      className="space-y-2"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: 0.3 }}
                    >
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('templates.currentCertificateImage')}</label>
                      <div className="relative border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-900">
                        {certificateImagePreview ? (
                          <div className="relative w-full h-40 bg-gray-50 dark:bg-gray-800">
                            <Image
                              src={certificateImagePreview}
                              alt="New certificate image"
                              fill
                              className="object-contain"
                              unoptimized
                            />
                          </div>
                        ) : (
                          <>
                            {draft && (draft as Template).certificate_image_url ? (
                              <div className="relative w-full h-40 bg-gray-50 dark:bg-gray-800">
                                <Image
                                  src={`${(draft as Template).certificate_image_url}?v=${Date.now()}`}
                                  alt="Current certificate"
                                  fill
                                  className="object-contain"
                                  unoptimized
                                />
                              </div>
                            ) : (
                              <div className="w-full h-40 flex items-center justify-center text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800">
                                <Layout className="w-6 h-6 mr-2" />
                                {t('templates.noCertificateImage')}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </motion.div>

                    {/* Upload New Certificate Image */}
                    <motion.div 
                      className="space-y-2"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: 0.4 }}
                    >
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('templates.changeCertificateImage')}</label>
                      <div className="space-y-3">
                        <input
                          type="file"
                          accept=".png,.jpg,.jpeg"
                          onChange={(e) => handleCertificateImageUpload(e.target.files?.[0] || null)}
                          className="block w-full text-sm text-gray-700 dark:text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 dark:file:bg-blue-900/30 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/50 cursor-pointer"
                        />
                        {certificateImagePreview && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => handleCertificateImageUpload(null)}
                          >
                            <X className="w-4 h-4 mr-2" />
                            {t('templates.removeNewCertificateImage')}
                          </Button>
                        )}
                      </div>
                    </motion.div>

                    {/* Current Score Image */}
                    <motion.div 
                      className="space-y-2"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: 0.5 }}
                    >
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('templates.currentScoreImage')}</label>
                      <div className="relative border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-900">
                        {scoreImagePreview ? (
                          <div className="relative w-full h-40 bg-gray-50 dark:bg-gray-800">
                            <Image
                              src={scoreImagePreview}
                              alt="New score image"
                              fill
                              className="object-contain"
                              unoptimized
                            />
                          </div>
                        ) : (
                          <>
                            {draft && (draft as Template).score_image_url ? (
                              <div className="relative w-full h-40 bg-gray-50 dark:bg-gray-800">
                                <Image
                                  src={`${(draft as Template).score_image_url}?v=${Date.now()}`}
                                  alt="Current score"
                                  fill
                                  className="object-contain"
                                  unoptimized
                                />
                              </div>
                            ) : (
                              <div className="w-full h-40 flex items-center justify-center text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800">
                                <Layout className="w-6 h-6 mr-2" />
                                {t('templates.noScoreImage')}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </motion.div>

                    {/* Upload New Score Image */}
                    <motion.div 
                      className="space-y-2"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: 0.6 }}
                    >
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('templates.changeScoreImage')}</label>
                      <div className="space-y-3">
                        <input
                          type="file"
                          accept=".png,.jpg,.jpeg"
                          onChange={(e) => handleScoreImageUpload(e.target.files?.[0] || null)}
                          className="block w-full text-sm text-gray-700 dark:text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-green-50 dark:file:bg-green-900/30 file:text-green-700 dark:file:text-green-300 hover:file:bg-green-100 dark:hover:file:bg-green-900/50 cursor-pointer"
                        />
                        {scoreImagePreview && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => handleScoreImageUpload(null)}
                          >
                            <X className="w-4 h-4 mr-2" />
                            {t('templates.removeNewScoreImage')}
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  </>
                )}

                {/* Current Preview Image */}
                <motion.div 
                  className="space-y-2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.5 }}
                >
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('templates.currentPreviewImage')}</label>
                  <div className="relative border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-900">
                    {previewImagePreview ? (
                      <div className="relative w-full h-32 bg-gray-50 dark:bg-gray-800">
                        <Image
                          src={previewImagePreview}
                          alt="New preview image"
                          fill
                          className="object-contain"
                          unoptimized
                        />
                      </div>
                    ) : (
                      <>
                        {draft && (draft as Template).preview_image_path ? (
                          <div className="relative w-full h-32 bg-gray-50 dark:bg-gray-800">
                            <Image
                              src={`${(draft as Template).preview_image_path}?v=${Date.now()}`}
                              alt="Current preview"
                              fill
                              className="object-contain"
                              unoptimized
                            />
                          </div>
                        ) : (
                          <div className="w-full h-32 flex items-center justify-center text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800">
                            <Layout className="w-6 h-6 mr-2" />
                            {t('templates.noPreviewImage')}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </motion.div>

                {/* Upload New Preview Image */}
                <motion.div 
                  className="space-y-2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.6 }}
                >
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('templates.changePreviewImage')}</label>
                  <div className="space-y-3">
                    <input
                      type="file"
                      accept=".png,.jpg,.jpeg"
                      onChange={(e) => handlePreviewImageUpload(e.target.files?.[0] || null)}
                      className="block w-full text-sm text-gray-700 dark:text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-purple-50 dark:file:bg-purple-900/30 file:text-purple-700 dark:file:text-purple-300 hover:file:bg-purple-100 dark:hover:file:bg-purple-900/50 cursor-pointer"
                    />
                    {previewImagePreview && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => handlePreviewImageUpload(null)}
                      >
                        <X className="w-4 h-4 mr-2" />
                        {t('templates.removeNewPreview')}
                      </Button>
                    )}
                  </div>
                </motion.div>

                {/* Action Buttons */}
                <motion.div 
                  className="flex justify-end gap-4 pt-6 border-t border-gray-200 dark:border-gray-700"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.7 }}
                >
                  <Button 
                    variant="outline" 
                    className="border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600 dark:text-gray-100 px-6" 
                    onClick={() => setIsEditOpen(null)}
                  >
                    {t('common.cancel')}
                  </Button>
                  {(role === "Admin" || role === "Team") && (
                    <LoadingButton 
                      className="gradient-primary text-white shadow-lg hover:shadow-xl px-6" 
                      onClick={submitEdit}
                      isLoading={editingTemplate}
                      loadingText={t('common.saving')}
                      variant="primary"
                    >
                      {t('members.saveChanges')}
                    </LoadingButton>
                  )}
                </motion.div>
              </div>
            </SheetContent>
          </Sheet>

          {/* Template Preview Modal */}
          <Dialog open={!!previewTemplate} onOpenChange={(o) => setPreviewTemplate(o ? previewTemplate : null)}>
            <DialogContent 
              className="preview-modal-content relative max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 p-0 animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-4 duration-300"
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.preventDefault();
                  setPreviewTemplate(null);
                }
              }}
            >
              <DialogHeader className="space-y-1 sm:space-y-1.5 flex-shrink-0 pb-2 sm:pb-4 px-4 sm:px-6 pt-4 sm:pt-6 border-b border-gray-200 dark:border-gray-700">
                <DialogTitle className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {t('templates.preview') || 'Template Preview'}
                </DialogTitle>
              </DialogHeader>
              
              <div className="flex-1 overflow-y-auto">
                {previewTemplate && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
                    {/* Preview Image - Left Side */}
                    <div className="p-2 sm:p-4 bg-gray-50 dark:bg-gray-900">
                      {getCachedTemplateUrl(previewTemplate) ? (
                        <div className="relative w-full aspect-[4/3] bg-gray-100 dark:bg-gray-900 rounded-lg overflow-hidden">
                          {/* Skeleton loader - shown while image loads */}
                          <div className="absolute inset-0 bg-gray-200 dark:bg-gray-800 animate-pulse" />
                          <Image
                            src={getCachedTemplateUrl(previewTemplate)!}
                            alt={previewTemplate.name}
                            fill
                            className="object-contain rounded-lg border border-gray-200 dark:border-gray-700 transition-opacity duration-300"
                            style={{
                              backgroundColor: 'transparent',
                            }}
                            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 800px"
                            priority
                            unoptimized
                            onLoadingComplete={(img) => {
                              // Hide skeleton when image loads
                              const skeleton = img.parentElement?.querySelector('.animate-pulse');
                              if (skeleton) {
                                (skeleton as HTMLElement).style.display = 'none';
                              }
                            }}
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              const skeleton = e.currentTarget.parentElement?.querySelector('.animate-pulse');
                              if (skeleton) {
                                (skeleton as HTMLElement).style.display = 'none';
                              }
                            }}
                          />
                        </div>
                      ) : (
                        <div className="aspect-[4/3] flex items-center justify-center text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
                          <div className="text-center">
                            <Layout className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                            <p className="text-sm">No preview image</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Template Info - Right Side */}
                    <div className="p-4 sm:p-6">
                      <div className="space-y-2">
                        <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{t('templates.templateNameLabel')}</div>
                        <div className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-900 dark:text-gray-100">
                          {previewTemplate.name}
                        </div>
                      </div>

                      <div className="mt-4 space-y-1 text-xs sm:text-sm">
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">{t('templates.categoryLabel')}</span>{' '}
                          <Badge className={`ml-2 bg-gradient-to-r ${getCategoryColor(previewTemplate.category)} text-white text-xs`}>
                            {previewTemplate.category}
                          </Badge>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">{t('templates.orientationLabel')}</span>{' '}
                          <span className="text-gray-900 dark:text-gray-100 font-medium">{previewTemplate.orientation}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">{t('templates.statusLabel')}</span>{' '}
                          {(previewTemplate.status === "ready" || ((previewTemplate.status === undefined || previewTemplate.status === null || previewTemplate.status === '') && previewTemplate.is_layout_configured)) ? (
                            <Badge className="ml-2 bg-green-500 hover:bg-green-600 text-white text-xs">
                              ✓ {t('templates.status.ready')}
                            </Badge>
                          ) : (
                            <Badge className="ml-2 bg-yellow-500 hover:bg-yellow-600 text-white text-xs">
                              {t('templates.status.draft')}
                            </Badge>
                          )}
                        </div>
                        {previewTemplate.created_at && (
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">{t('templates.createdLabel')}</span>{' '}
                            <span className="text-gray-900 dark:text-gray-100">
                              {new Date(previewTemplate.created_at).toLocaleDateString('en-US', { 
                                day: 'numeric', 
                                month: 'short', 
                                year: 'numeric'
                              })}
                            </span>
                          </div>
                        )}
                        {previewTemplate.is_dual_template && (
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">{t('templates.typeLabel')}</span>{' '}
                            <span className="text-gray-900 dark:text-gray-100 font-medium">{t('templates.doubleSidedType')}</span>
                          </div>
                        )}
                        {templateUsageMap.has(previewTemplate.id) && (
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">{t('templates.usageLabel')}</span>{' '}
                            <span className="text-gray-900 dark:text-gray-100 font-medium">
                              {t('templates.usedBy').replace('{count}', (templateUsageMap.get(previewTemplate.id) || 0).toString())}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="mt-4 sm:mt-6 flex flex-wrap gap-2 sm:gap-3">
                        {(role === "Admin" || role === "Team") && previewTemplate && (
                          <Button 
                            className="gradient-primary text-white shadow-lg hover:shadow-xl transition-all duration-300" 
                            onClick={() => {
                              router.push(`/templates/configure?template=${previewTemplate.id}`);
                              setPreviewTemplate(null);
                            }}
                          >
                            <Settings className="w-4 h-4 mr-2" />
                            {t('templates.configureLayout')}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

    {/* Toast Notifications */}
    <Toaster position="top-right" richColors />
  </ModernLayout>
  );
}


