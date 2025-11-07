"use client";

import ModernLayout from "@/components/modern-layout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/use-debounce";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/language-context";
import { Badge } from "@/components/ui/badge";
import { FileText, Plus, Search, Edit, Trash2, Layout, X, Settings, Filter } from "lucide-react";
import { useTemplates } from "@/hooks/use-templates";
import { Template, CreateTemplateData, UpdateTemplateData, getTemplatePreviewUrl } from "@/lib/supabase/templates";
import { getCertificatesByTemplate } from "@/lib/supabase/certificates";
import { toast, Toaster } from "sonner";
import { confirmToast } from "@/lib/ui/confirm";
import Image from "next/image";

export default function TemplatesPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [role, setRole] = useState<"Admin" | "Team" | "Public">("Public");
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

  // Use templates hook for Supabase integration
  const { templates, loading, error, create, update, delete: deleteTemplate, refresh } = useTemplates();

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

  // Check template usage when templates are loaded
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
  }, [templates]);

  // Sheet state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState<null | string>(null);
  const [draft, setDraft] = useState<Partial<Template> | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [previewImageFile, setPreviewImageFile] = useState<File | null>(null);
  const [previewImagePreview, setPreviewImagePreview] = useState<string | null>(null);
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);
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
      toast.error("Please fill in Template Name");
      return;
    }

    // Validate category
    if (!draft || !draft.category?.trim()) {
      toast.error("Please select a Category");
      return;
    }

    // Validate based on template mode
    if (isDualTemplate) {
      if (!certificateImageFile) {
        toast.error("Please upload Certificate Image (Front)");
        return;
      }
      if (!scoreImageFile) {
        toast.error("Please upload Score Image (Back)");
        return;
      }
    } else {
      if (!imageFile) {
        toast.error("Please upload Template Image");
        return;
      }
    }

    try {
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
      toast.success("Template created successfully!");
      // Refresh templates to show the new template immediately
      refresh();
    } catch (error) {
      console.error('💥 Template creation failed:', error);
      toast.error(error instanceof Error ? error.message : "Failed to create template");
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
      toast.error("Please fill in all required fields");
      return;
    }

    // Validate based on template mode
    if (isDualTemplate) {
      if (!certificateImageFile && !draft.certificate_image_url) {
        toast.error("Certificate image is required for dual templates");
        return;
      }
      if (!scoreImageFile && !draft.score_image_url) {
        toast.error("Score image is required for dual templates");
        return;
      }
    } else {
      if (!imageFile && !draft.image_path) {
        toast.error("Template image is required");
        return;
      }
    }

    try {
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
      toast.success("Template updated successfully!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update template");
    }
  }

  async function requestDelete(id: string) {
    if (!canDelete) {
      toast.error("You don't have permission to delete templates");
      return;
    }
    
    // Find template name for better confirmation message
    const template = templates.find(t => t.id === id);
    const templateName = template?.name || 'this template';
    
    // Check if template is being used by any certificates
    try {
      const certificates = await getCertificatesByTemplate(id);
      if (certificates && certificates.length > 0) {
        toast.error(`Cannot delete "${templateName}" because it is being used by ${certificates.length} certificate(s). Please delete the certificates first.`);
        return;
      }
    } catch (error) {
      console.error('Error checking template usage:', error);
      // Continue with deletion if check fails (don't block deletion)
      toast.warning("Could not verify if template is in use. Proceeding with deletion...");
    }
    
    const ok = await confirmToast(`Are you sure you want to delete "${templateName}"? This action cannot be undone and will also delete the associated image file.`, { confirmText: "Delete", tone: "destructive" });
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
        
        toast.success(`Template "${templateName}" deleted successfully!`);
        
        // Note: No need to call refresh() here because deleteTemplate already updates state
        // Calling refresh() can cause race condition if database hasn't propagated the delete yet
      } catch (error) {
        console.error('💥 Delete failed:', error);
        toast.error(error instanceof Error ? error.message : "Failed to delete template");
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
        toast.error('Invalid file type. Only JPG, JPEG, and PNG are allowed.');
        return;
      }
      
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size too large. Maximum size is 10MB.');
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
        className="relative -mt-4 sm:-mt-3 pb-4 sm:pb-6 overflow-hidden min-h-screen bg-gray-50 dark:bg-gray-900"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        <div className="w-full max-w-[85rem] ml-0 lg:ml-8 xl:ml-20 mr-8 xl:mr-12 px-4 sm:px-6 relative">
          {/* Header Section - Like Groups page */}
          <div className="mb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 w-full">
              <div className="min-w-0 flex-shrink flex items-center gap-3">
                <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 gradient-primary rounded-lg shadow-md">
                  <Layout className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#2563eb] dark:text-blue-400 break-words">
                  {t('templates.title')}
                </h1>
              </div>
              <div className="flex items-center gap-2">
                {(role === "Admin" || role === "Team") && (
                  <Button 
                    onClick={openCreate} 
                    className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white flex-shrink-0"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Main Content Card - Like Groups page - Centered */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-6 sm:p-8 lg:p-10 max-w-full">
            {/* Search Bar - Inside Card */}
            <div className="mb-4">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                  <Input 
                    placeholder="Cari template..." 
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
                        Category
                      </label>
                      <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                      >
                        <option value="">All Categories</option>
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
                  Found {filtered.length} template{filtered.length !== 1 ? 's' : ''}
                </p>
              </div>
            )}

            {/* Templates Grid - 3 Columns like /search */}
            {!loading && !error && filtered.length > 0 && (
            <motion.div 
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-2.5 sm:gap-x-3 gap-y-3 sm:gap-y-4 max-w-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ staggerChildren: 0.1, delayChildren: 0.2 }}
            >
              {filtered.map((tpl, index) => (
                <motion.div
                  key={tpl.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
                  whileHover={{ scale: 1.01, y: -2 }}
                  className="max-w-full"
                >
                  <div
                    onClick={() => openPreview(tpl)}
                    className="group bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm dark:shadow-none hover:shadow-md dark:hover:shadow-lg transition-all duration-200 ease-in-out hover:-translate-y-0.5 cursor-pointer flex flex-row h-[200px] will-change-transform w-full"
                  >
                    {/* Template Thumbnail - Left Side */}
                    <div className="relative w-[160px] h-[200px] flex-shrink-0 bg-gray-100 dark:bg-gray-900 overflow-hidden border-r border-gray-200 dark:border-gray-700">
                      {getTemplatePreviewUrl(tpl) && !failedImages.has(tpl.id) ? (
                        <>
                          <Image 
                            src={getTemplatePreviewUrl(tpl)!}
                            alt={tpl.name}
                            fill
                            sizes="160px"
                            className="object-contain group-hover:scale-105 transition-transform duration-200 ease-in-out will-change-transform dark:opacity-90 dark:brightness-95"
                            loading={index < 3 ? "eager" : "lazy"}
                            priority={index < 3}
                            unoptimized
                            onError={(e) => {
                              console.error('Image failed to load:', getTemplatePreviewUrl(tpl));
                              setFailedImages(prev => new Set(prev).add(tpl.id));
                            }}
                          />
                        </>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center">
                            <Layout className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                            <div className="text-xs font-medium text-gray-600 dark:text-gray-300">{tpl.orientation}</div>
                          </div>
                        </div>
                      )}
                      {/* Status Badge - Top Left */}
                      <div className="absolute top-2 left-2 z-10">
                        {/* CRITICAL: Only use is_layout_configured as fallback if status is truly undefined/null/empty */}
                        {/* If status exists (even if empty string), use it directly */}
                        {(tpl.status === "ready" || ((tpl.status === undefined || tpl.status === null || tpl.status === '') && tpl.is_layout_configured)) ? (
                          <Badge variant="default" className="bg-green-500 hover:bg-green-600 text-white text-xs shadow-sm px-1.5 py-0.5">
                            ✓ Ready
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-yellow-500 hover:bg-yellow-600 text-white text-xs shadow-sm px-1.5 py-0.5">
                            Draft
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Template Info - Right Side */}
                    <div className="flex-1 flex flex-col justify-between min-w-0 p-4 w-full">
                      {/* Top Section - Title and Metadata */}
                      <div className="min-w-0 flex-1 w-full flex flex-col">
                        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mb-2 w-full text-left">
                          {tpl.name}
                        </h3>
                        {/* Category Badge - Moved from thumbnail */}
                        <div className="mb-2 w-full text-left">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium bg-gradient-to-r ${getCategoryColor(tpl.category)} text-white shadow-sm`}>
                            {tpl.category}
                          </span>
                        </div>
                        {/* Metadata - Vertical Layout */}
                        <div className="flex flex-col gap-1 text-xs text-gray-500 dark:text-gray-400 w-full text-left">
                          <div className="flex items-center gap-1.5">
                            <Layout className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="font-medium">{tpl.orientation}</span>
                          </div>
                          {tpl.created_at && (
                            <div className="text-gray-500 dark:text-gray-400">
                              {new Date(tpl.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Bottom Section - Action Buttons */}
                      {(role === "Admin" || role === "Team") && (
                        <div className="flex items-center gap-2 mt-auto pt-3 border-t border-gray-100 dark:border-gray-700 w-full">
                          <Button 
                            size="sm"
                            className="h-8 px-3 text-xs font-medium gradient-primary text-white shadow-sm hover:shadow-md transition-all duration-300 flex-shrink-0" 
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/templates/configure?template=${tpl.id}`);
                            }}
                          >
                            <Settings className="w-3.5 h-3.5 mr-1.5" />
                            Configure
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="h-8 w-8 p-0 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 flex-shrink-0" 
                            onClick={(e) => {
                              e.stopPropagation();
                              openEdit(tpl);
                            }}
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className={`h-8 w-8 p-0 border-gray-200 dark:border-gray-700 flex-shrink-0 ${canDelete && !templateUsageMap.has(tpl.id) ? 'hover:border-red-300 dark:hover:border-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400' : 'opacity-50 cursor-not-allowed'}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (canDelete && !templateUsageMap.has(tpl.id)) {
                                requestDelete(tpl.id);
                              } else if (templateUsageMap.has(tpl.id)) {
                                const count = templateUsageMap.get(tpl.id) || 0;
                                toast.error(`Cannot delete "${tpl.name}" because it is being used by ${count} certificate(s). Please delete the certificates first.`);
                              }
                            }}
                            disabled={!canDelete || deletingTemplateId === tpl.id || templateUsageMap.has(tpl.id)}
                            title={templateUsageMap.has(tpl.id) ? `This template is being used by ${templateUsageMap.get(tpl.id)} certificate(s)` : undefined}
                          >
                            {deletingTemplateId === tpl.id ? (
                              <div className="w-3.5 h-3.5 border-2 border-red-300 border-t-red-600 rounded-full animate-spin"></div>
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
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
                    Belum ada template
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Buat template sertifikat pertama Anda untuk memulai
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
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="text-xl font-bold text-gradient">Create Template</SheetTitle>
            <SheetDescription>Define the basic details of your template.</SheetDescription>
          </SheetHeader>
          <div className="p-4 space-y-6">
            <motion.div 
              className="space-y-2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              <label className="text-sm font-semibold text-gray-700">Template Name</label>
              <Input 
                value={draft?.name ?? ""} 
                onChange={(e) => setDraft((d) => (d ? { ...d, name: e.target.value } : d))} 
                placeholder="Enter template name"
                className="rounded-lg border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
              />
            </motion.div>
            
            <motion.div 
              className="space-y-2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <label className="text-sm font-semibold text-gray-700">Category</label>
              <select 
                value={draft?.category ?? ""} 
                onChange={(e) => setDraft((d) => (d ? { ...d, category: e.target.value } : d))} 
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            </motion.div>
            
            <motion.div 
              className="space-y-3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <label className="text-sm font-semibold text-gray-700">Orientation</label>
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  variant={draft?.orientation === "Landscape" ? "default" : "outline"} 
                  onClick={() => setDraft((d) => (d ? { ...d, orientation: "Landscape" } : d))}
                  className="rounded-lg"
                >
                  <Layout className="w-4 h-4 mr-2" />
                  Landscape
                </Button>
                <Button 
                  variant={draft?.orientation === "Portrait" ? "default" : "outline"} 
                  onClick={() => setDraft((d) => (d ? { ...d, orientation: "Portrait" } : d))}
                  className="rounded-lg"
                >
                  <Layout className="w-4 h-4 mr-2" />
                  Portrait
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
              <label className="text-sm font-semibold text-gray-700">Template Mode</label>
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  variant={!isDualTemplate ? "default" : "outline"} 
                  onClick={() => setIsDualTemplate(false)}
                  className="rounded-lg"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Single Side
                </Button>
                <Button 
                  variant={isDualTemplate ? "default" : "outline"} 
                  onClick={() => setIsDualTemplate(true)}
                  className="rounded-lg"
                >
                  <Layout className="w-4 h-4 mr-2" />
                  Double Side
                </Button>
              </div>
              {isDualTemplate && (
                <p className="text-xs text-blue-600 bg-blue-50 p-2 rounded-lg">
                  Dual templates support both certificate and score views. You will need to upload both images.
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
              <label className="text-sm font-semibold text-gray-700">Template Image</label>
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
                        className="object-cover rounded-lg border border-gray-200"
                        unoptimized
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="absolute top-2 right-2 bg-white/90 hover:bg-white"
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
                  <label className="text-sm font-semibold text-gray-700">Certificate Image (Front)</label>
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
                            className="object-cover rounded-lg border border-gray-200"
                            unoptimized
                          />
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="absolute top-2 right-2 bg-white/90 hover:bg-white"
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
                  <label className="text-sm font-semibold text-gray-700">Score Image (Back)</label>
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
                            className="object-cover rounded-lg border border-gray-200"
                            unoptimized
                          />
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="absolute top-2 right-2 bg-white/90 hover:bg-white"
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
              <label className="text-sm font-semibold text-gray-700">Preview Image (Thumbnail)</label>
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
                        className="object-cover rounded-lg border border-gray-200" 
                        unoptimized
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="absolute top-2 right-2 bg-white/90 hover:bg-white"
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
                className="border-gray-300 hover:border-gray-400" 
                onClick={() => setIsCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                className="gradient-primary text-white shadow-lg hover:shadow-xl" 
                onClick={submitCreate}
              >
                Create Template
              </Button>
            </motion.div>
          </div>
        </SheetContent>
      </Sheet>

      

          {/* Enhanced Edit Template Sheet */}
          <Sheet open={!!isEditOpen} onOpenChange={(o) => setIsEditOpen(o ? isEditOpen : null)}>
            <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
              <SheetHeader>
                <SheetTitle className="text-xl font-bold text-gradient">Edit Template</SheetTitle>
                <SheetDescription>Update template details.</SheetDescription>
              </SheetHeader>
              <div className="p-4 space-y-6">
                {/* Template Name */}
                <motion.div 
                  className="space-y-2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Template Name</label>
                  <Input 
                    value={draft?.name ?? ""} 
                    onChange={(e) => setDraft((d) => (d ? { ...d, name: e.target.value } : d))} 
                    placeholder="Enter template name"
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
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Category</label>
                  <select 
                    value={draft?.category ?? ""} 
                    onChange={(e) => setDraft((d) => (d ? { ...d, category: e.target.value } : d))} 
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                </motion.div>

                {/* Orientation */}
                <motion.div 
                  className="space-y-3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                >
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Orientation</label>
                  <div className="grid grid-cols-2 gap-3">
                    <Button 
                      variant={draft?.orientation === "Landscape" ? "default" : "outline"} 
                      onClick={() => setDraft((d) => (d ? { ...d, orientation: "Landscape" } : d))}
                      className="rounded-lg"
                    >
                      <Layout className="w-4 h-4 mr-2" />
                      Landscape
                    </Button>
                    <Button 
                      variant={draft?.orientation === "Portrait" ? "default" : "outline"} 
                      onClick={() => setDraft((d) => (d ? { ...d, orientation: "Portrait" } : d))}
                      className="rounded-lg"
                    >
                      <Layout className="w-4 h-4 mr-2" />
                      Portrait
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
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Status</label>
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
                    <option value="draft">Draft</option>
                    <option value="ready">Ready</option>
                  </select>
                </motion.div>

                {/* Dual Template Mode Selector */}
                <motion.div 
                  className="space-y-3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.25 }}
                >
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Template Mode</label>
                  <div className="grid grid-cols-2 gap-3">
                    <Button 
                      variant={!isDualTemplate ? "default" : "outline"} 
                      onClick={() => setIsDualTemplate(false)}
                      className="rounded-lg"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Single Side
                    </Button>
                    <Button 
                      variant={isDualTemplate ? "default" : "outline"} 
                      onClick={() => setIsDualTemplate(true)}
                      className="rounded-lg"
                    >
                      <Layout className="w-4 h-4 mr-2" />
                      Double Side
                    </Button>
                  </div>
                  {isDualTemplate && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 p-2 rounded-lg">
                      Dual templates support both certificate and score views. You will need to upload both images.
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
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Current Template Image</label>
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
                            {draft && getTemplatePreviewUrl(draft as Template) ? (
                              <div className="relative w-full h-40 bg-gray-50 dark:bg-gray-800">
                                <Image
                                  src={getTemplatePreviewUrl(draft as Template)!}
                                  alt="Current template"
                                  fill
                                  className="object-contain"
                                  unoptimized
                                />
                              </div>
                            ) : (
                              <div className="w-full h-40 flex items-center justify-center text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800">
                                <Layout className="w-6 h-6 mr-2" />
                                No template image
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
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Change Template Image</label>
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
                            Remove New Image
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
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Current Certificate Image (Front)</label>
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
                                No certificate image
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
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Change Certificate Image</label>
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
                            Remove New Certificate Image
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
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Current Score Image (Back)</label>
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
                                No score image
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
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Change Score Image</label>
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
                            Remove New Score Image
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
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Current Preview Image (Thumbnail)</label>
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
                            No preview image
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
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Change Preview Image</label>
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
                        Remove New Preview
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
                    className="border-gray-300 hover:border-gray-400 px-6" 
                    onClick={() => setIsEditOpen(null)}
                  >
                    Cancel
                  </Button>
                  {(role === "Admin" || role === "Team") && (
                    <Button 
                      className="gradient-primary text-white shadow-lg hover:shadow-xl px-6" 
                      onClick={submitEdit}
                    >
                      Save Changes
                    </Button>
                  )}
                </motion.div>
              </div>
            </SheetContent>
          </Sheet>

          {/* Template Preview Modal */}
          <Dialog open={!!previewTemplate} onOpenChange={(o) => setPreviewTemplate(o ? previewTemplate : null)}>
            <DialogContent 
              className="preview-modal-content relative max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 p-0"
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
                      {getTemplatePreviewUrl(previewTemplate) ? (
                        <div className="relative w-full aspect-auto bg-gray-100 dark:bg-gray-900 rounded-lg">
                          <Image
                            src={getTemplatePreviewUrl(previewTemplate)!}
                            alt={previewTemplate.name}
                            width={800}
                            height={600}
                            className="w-full h-auto rounded-lg border border-gray-200 dark:border-gray-700 transition-transform duration-200"
                            style={{
                              backgroundColor: 'transparent',
                            }}
                            priority
                            unoptimized
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>
                      ) : (
                        <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
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
                        <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Template Name:</div>
                        <div className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-900 dark:text-gray-100">
                          {previewTemplate.name}
                        </div>
                      </div>

                      <div className="mt-4 space-y-1 text-xs sm:text-sm">
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Category:</span>{' '}
                          <Badge className={`ml-2 bg-gradient-to-r ${getCategoryColor(previewTemplate.category)} text-white text-xs`}>
                            {previewTemplate.category}
                          </Badge>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Orientation:</span>{' '}
                          <span className="text-gray-900 dark:text-gray-100 font-medium">{previewTemplate.orientation}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Status:</span>{' '}
                          {(previewTemplate.status === "ready" || ((previewTemplate.status === undefined || previewTemplate.status === null || previewTemplate.status === '') && previewTemplate.is_layout_configured)) ? (
                            <Badge className="ml-2 bg-green-500 hover:bg-green-600 text-white text-xs">
                              ✓ Ready
                            </Badge>
                          ) : (
                            <Badge className="ml-2 bg-yellow-500 hover:bg-yellow-600 text-white text-xs">
                              Draft
                            </Badge>
                          )}
                        </div>
                        {previewTemplate.created_at && (
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Created:</span>{' '}
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
                            <span className="text-gray-500 dark:text-gray-400">Type:</span>{' '}
                            <span className="text-gray-900 dark:text-gray-100 font-medium">Double-sided (Certificate + Score)</span>
                          </div>
                        )}
                        {templateUsageMap.has(previewTemplate.id) && (
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Usage:</span>{' '}
                            <span className="text-gray-900 dark:text-gray-100 font-medium">
                              Used by {templateUsageMap.get(previewTemplate.id)} certificate(s)
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
                            Configure Layout
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


