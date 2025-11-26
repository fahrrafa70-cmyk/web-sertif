"use client";

import ModernLayout from "@/components/modern-layout";
import { Button } from "@/components/ui/button";
import { useEffect, useMemo, useState, useCallback, memo } from "react";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/use-debounce";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/language-context";
import { useAuth } from "@/contexts/auth-context";
import { Badge } from "@/components/ui/badge";
import { FileText, Plus, Search, Edit, Trash2, Layout, X, Settings, Filter } from "lucide-react";
import { useTemplates } from "@/hooks/use-templates";
import { Template, CreateTemplateData, UpdateTemplateData, getTemplatePreviewUrl, getTemplateImageUrl } from "@/lib/supabase/templates";
import { getCertificatesByTemplate } from "@/lib/supabase/certificates";
import { toast, Toaster } from "sonner";
import { confirmToast } from "@/lib/ui/confirm";
import { LoadingButton } from "@/components/ui/loading-button";
import Image from "next/image";
import { TemplatesPageSkeleton } from "@/components/ui/templates-skeleton";
import { getTenantsForCurrentUser, type Tenant } from "@/lib/supabase/tenants";

// Helper function for category colors
const getCategoryColor = (category: string) => {
  const colors = {
    Training: "from-blue-500 to-blue-600",
    Internship: "from-green-500 to-green-600", 
    MoU: "from-purple-500 to-purple-600",
    Visit: "from-orange-500 to-orange-600"
  };
  return colors[category as keyof typeof colors] || "from-gray-500 to-gray-600";
};

// Memoized Template Card Component to prevent unnecessary re-renders
interface TemplateCardProps {
  template: Template;
  onEdit: (template: Template) => void;
  onPreview: (template: Template) => void;
  onConfigure: (templateId: string) => void;
  onDelete: (templateId: string) => void;
  getTemplateUrl: (template: Template) => string | null;
  isConfiguring: boolean;
  canDelete: boolean;
  templateUsageMap: Map<string, number>;
  deletingTemplateId: string | null;
  t: (key: string) => string;
}

const TemplateCard = memo(({ template, onEdit, onPreview, onConfigure, onDelete, getTemplateUrl, isConfiguring, canDelete, templateUsageMap, deletingTemplateId, t }: TemplateCardProps) => {
  const imageUrl = getTemplateUrl(template);
  
  return (
    <div
      className="group bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200 ease-out cursor-pointer flex flex-row h-[200px] w-full transform will-change-transform"
      onClick={() => onPreview(template)}
    >
      {/* Template Thumbnail - Left Side */}
      <div className="relative w-[160px] h-full flex-shrink-0 bg-gray-100 dark:bg-gray-900 overflow-hidden border-r border-gray-200 dark:border-gray-700">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={template.name}
            width={160}
            height={200}
            className="w-full h-full object-contain"
            sizes="160px"
            priority={false}
            loading="lazy"
            quality={75}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <Layout className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <div className="text-xs text-gray-500">No Image</div>
            </div>
          </div>
        )}
        
        {/* Status Badge - Top Left */}
        <div className="absolute top-2 left-2 z-10">
          {template.is_layout_configured ? (
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
      <div className="flex-1 flex flex-col justify-between min-w-0 p-4 w-full overflow-hidden">
        {/* Top Section - Title and Metadata */}
        <div className="min-w-0 flex-1 w-full flex flex-col">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mb-2 w-full text-left truncate">
            {template.name}
          </h3>
          {/* Category Badge */}
          <div className="mb-2 w-full text-left">
            <span className={`inline-block px-2 py-1 rounded text-xs font-medium bg-gradient-to-r ${getCategoryColor(template.category)} text-white shadow-sm`}>
              {template.category}
            </span>
          </div>
          {/* Metadata - Compact */}
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 w-full text-left">
            <div className="flex items-center gap-1">
              <Layout className="w-3 h-3 flex-shrink-0" />
              <span className="font-medium text-xs">{template.orientation}</span>
            </div>
            {template.created_at && (
              <span className="text-gray-400 dark:text-gray-500">•</span>
            )}
            {template.created_at && (
              <span className="text-xs">
                {new Date(template.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            )}
          </div>
        </div>
        
        {/* Bottom Section - Action Buttons */}
        <div className="flex items-center gap-1.5 mt-auto pt-2 border-t border-gray-100 dark:border-gray-700 w-full">
          <LoadingButton 
            size="sm"
            className="h-7 px-2 text-xs font-medium !bg-blue-600 hover:!bg-blue-700 text-white shadow-sm transition-all duration-300 flex-1 min-w-0 relative z-10 pointer-events-auto hover:scale-[1.02] hover:shadow-md" 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('Configure button clicked for template:', template.id);
              onConfigure(template.id);
            }}
            isLoading={isConfiguring}
            loadingText="Opening..."
          >
            {!isConfiguring && <Settings className="w-3 h-3 mr-1" />}
            <span className="truncate">{isConfiguring ? "Opening..." : "Layout"}</span>
          </LoadingButton>
          <Button 
            variant="outline" 
            size="sm"
            className="h-7 w-7 p-0 border-gray-200 dark:border-gray-700 flex-shrink-0 relative z-10 pointer-events-auto" 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onEdit(template);
            }}
          >
            <Edit className="w-3 h-3" />
          </Button>
          <LoadingButton 
            variant="outline" 
            size="sm"
            className={`h-7 w-7 p-0 border-gray-200 dark:border-gray-700 flex-shrink-0 relative z-10 pointer-events-auto ${canDelete && !templateUsageMap.has(template.id) ? '' : 'opacity-50 cursor-not-allowed'}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (canDelete && !templateUsageMap.has(template.id)) {
                onDelete(template.id);
              } else if (templateUsageMap.has(template.id)) {
                const count = templateUsageMap.get(template.id) || 0;
                toast.error(t('templates.cannotDeleteInUse').replace('{name}', template.name).replace('{count}', count.toString()));
              }
            }}
            disabled={!canDelete || templateUsageMap.has(template.id)}
            isLoading={deletingTemplateId === template.id}
            loadingText=""
            title={templateUsageMap.has(template.id) ? t('templates.usedBy').replace('{count}', (templateUsageMap.get(template.id) || 0).toString()) : undefined}
          >
            {deletingTemplateId !== template.id && <Trash2 className="w-3 h-3" />}
          </LoadingButton>
        </div>
      </div>
    </div>
  );
});

TemplateCard.displayName = 'TemplateCard';

export default function TemplatesPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const { role: authRole } = useAuth();
  const [role, setRole] = useState<"owner" | "manager" | "staff" | "user" | "public">("public");
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string | "">("");
  const [loadingTenants, setLoadingTenants] = useState<boolean>(true);

  // Map authRole from AuthContext to local role state
  useEffect(() => {
    if (authRole) {
      const normalized = authRole.toLowerCase();
      const mapped: "owner" | "manager" | "staff" | "user" | "public" =
        normalized === "owner" || normalized === "manager" || normalized === "staff"
          ? (normalized as "owner" | "manager" | "staff")
          : normalized === "user"
            ? "user"
            : "public";
      setRole(mapped);
    }
  }, [authRole]);

  // Set document title robust untuk templates page
  useEffect(() => {
    const setTitle = () => {
      if (typeof document !== 'undefined') {
        document.title = "Templates | Certify - Certificate Platform";
      }
    };
    
    // Set immediately
    setTitle();
    
    // Set with multiple delays to ensure override
    const timeouts = [
      setTimeout(setTitle, 50),
      setTimeout(setTitle, 200),
      setTimeout(setTitle, 500)
    ];
    
    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, []);

  // Load tenants for selector
  useEffect(() => {
    const loadTenants = async () => {
      try {
        setLoadingTenants(true);
        const data = await getTenantsForCurrentUser();
        setTenants(data);

        let initialId = "";
        try {
          const stored = window.localStorage.getItem("ecert-selected-tenant-id") || "";
          if (stored && data.some((t) => t.id === stored)) {
            initialId = stored;
          }
        } catch {
          // ignore
        }

        if (!initialId && data.length === 1) {
          initialId = data[0].id;
        }

        setSelectedTenantId(initialId);
      } finally {
        setLoadingTenants(false);
      }
    };

    void loadTenants();
  }, []);

  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 100); // Optimized for INP performance
  const [categoryFilter, setCategoryFilter] = useState("");
  const [orientationFilter, setOrientationFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [generatingThumbnails, setGeneratingThumbnails] = useState<Set<string>>(new Set());
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [tempCategoryFilter, setTempCategoryFilter] = useState("");
  const [tempOrientationFilter, setTempOrientationFilter] = useState("");
  const [tempStatusFilter, setTempStatusFilter] = useState("");

  // Use templates hook for Supabase integration
  const { templates, loading, error, create, update, delete: deleteTemplate, refresh } = useTemplates();
  
  // Simplified without heavy caching

  // Filter modal handlers
  const openFilterModal = () => {
    setTempCategoryFilter(categoryFilter);
    setTempOrientationFilter(orientationFilter);
    setTempStatusFilter(statusFilter);
    setFilterModalOpen(true);
  };

  const applyFilters = () => {
    setCategoryFilter(tempCategoryFilter);
    setOrientationFilter(tempOrientationFilter);
    setStatusFilter(tempStatusFilter);
    setFilterModalOpen(false);
  };

  const cancelFilters = () => {
    setTempCategoryFilter(categoryFilter);
    setTempOrientationFilter(orientationFilter);
    setTempStatusFilter(statusFilter);
    setFilterModalOpen(false);
  };

  // Optimized filtering with early returns and better performance
  const filtered = useMemo(() => {
    // Early return if no templates
    if (!templates.length) return [];
    // If no tenant selected, do not show any templates (new accounts should start empty)
    if (!selectedTenantId) return [];
    
    let list = templates;

    // Filter by selected tenant (must be present here)
    list = list.filter((template) => template.tenant_id === selectedTenantId);
    if (!list.length) return [];
    
    // Apply category filter first (usually more selective)
    if (categoryFilter) {
      list = list.filter((template) => template.category === categoryFilter);
      if (!list.length) return []; // Early return if no matches
    }
    
    // Apply orientation filter
    if (orientationFilter) {
      list = list.filter((template) => template.orientation === orientationFilter);
      if (!list.length) return [];
    }
    
    // Apply status filter
    if (statusFilter) {
      if (statusFilter === "ready") {
        list = list.filter((template) => template.is_layout_configured);
      } else if (statusFilter === "draft") {
        list = list.filter((template) => !template.is_layout_configured);
      }
      if (!list.length) return [];
    }
    
    // Apply search query filter
    if (debouncedQuery) {
      const q = debouncedQuery.toLowerCase().trim();
      if (q) {
        list = list.filter((template) => 
          template.name.toLowerCase().includes(q) ||
          template.category.toLowerCase().includes(q)
        );
      }
    }
    
    return list;
  }, [templates, debouncedQuery, categoryFilter, orientationFilter, statusFilter, selectedTenantId]);
  
  // ✅ PHASE 2: Smart preloader for next page templates - TEMPORARILY DISABLED
  // const { preloadTemplate, preloadOnHover, preloadNextPage, getStats } = useSmartPreloader({
  //   templates: filtered,
  //   itemsPerPage: 12, // Assuming 12 templates per page
  //   preloadDistance: 6, // Preload 6 templates ahead
  //   maxConcurrentPreloads: 3 // Max 3 concurrent preloads
  // });
  
  // Simplified without heavy preloading

  // 🚀 PERFORMANCE: Removed initial load delay logic

  const selectedTenant = useMemo(
    () => tenants.find((t) => t.id === selectedTenantId) || null,
    [tenants, selectedTenantId],
  );

  // Simplified without debug functions

  // Simple function to get template URL
  const getTemplateUrl = useCallback((template: Template): string | null => {
    return getTemplatePreviewUrl(template);
  }, []);

  // Stable callback functions for template actions to prevent re-renders
  const handleEditClick = useCallback((template: Template) => {
    // CRITICAL: Only use is_layout_configured as fallback if status is truly undefined/null
    // If status exists (even if empty string), use it directly
    // This ensures that once status is set, it won't be overridden by is_layout_configured
    const initialStatus = (template.status !== undefined && template.status !== null && template.status !== '')
      ? template.status 
      : (template.is_layout_configured ? "ready" : "draft");
    setDraft({ 
      ...template, 
      status: initialStatus // Explicitly set status to ensure it's always present
    });
    console.log('📝 Opening edit for template:', template.name, 'with status:', initialStatus, 'from template.status:', template.status, 'is_layout_configured:', template.is_layout_configured);
    setImageFile(null);
    setImagePreview(template.image_path || null);
    setPreviewImageFile(null);
    setPreviewImagePreview(template.preview_image_path || null);
    setIsDualTemplate(template.is_dual_template || false);
    setCertificateImageFile(null);
    setCertificateImagePreview(template.certificate_image_url || null);
    setScoreImageFile(null);
    setScoreImagePreview(template.score_image_url || null);
    setIsEditOpen(template.id);
  }, []);

  const handlePreviewClick = useCallback((template: Template) => {
    setPreviewTemplate(template);
  }, []);

  const handleConfigureClick = useCallback((templateId: string) => {
    console.log('Navigating to configure page for template:', templateId);
    // Set loading state
    setConfiguringTemplateId(templateId);
    // Use setTimeout to ensure navigation happens after current event loop
    setTimeout(() => {
      try {
        router.push(`/templates/configure?template=${templateId}`);
        // Note: loading state will persist until page navigation completes
      } catch (error) {
        console.error('Error navigating to configure page:', error);
        setConfiguringTemplateId(null);
      }
    }, 0);
  }, [router]);

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
  const [configuringTemplateId, setConfiguringTemplateId] = useState<string | null>(null); // Loading state for configure navigation
  
  // Dual template mode state
  const [isDualTemplate, setIsDualTemplate] = useState(false);
  const [certificateImageFile, setCertificateImageFile] = useState<File | null>(null);
  const [certificateImagePreview, setCertificateImagePreview] = useState<string | null>(null);
  const [scoreImageFile, setScoreImageFile] = useState<File | null>(null);
  const [scoreImagePreview, setScoreImagePreview] = useState<string | null>(null);
  
  // Preview modal state
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  
  const canDelete = role === "owner" || role === "manager"; // Only owner/manager can delete

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
    // Validate tenant selection
    if (!selectedTenantId) {
      toast.error('Silakan pilih tenant terlebih dahulu sebelum membuat template');
      return;
    }

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
        tenant_id: selectedTenantId,
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
      await refresh();
      
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

  // 🚀 PERFORMANCE: Show skeleton only when actually loading
  if (loading && templates.length === 0) {
    return (
      <ModernLayout>
        <TemplatesPageSkeleton />
      </ModernLayout>
    );
  }

  return (
    <ModernLayout>
      {/* Main Content Section */}
      <section 
        className="relative -mt-4 pb-6 sm:-mt-5 sm:pb-8 duration-500"
        style={{ 
          backgroundColor: 'var(--background, #f9fafb)'
        } as React.CSSProperties}
      >
        <div className="w-full max-w-[1280px] mx-auto px-2 sm:px-3 lg:px-0 relative">
          {/* Header Section - Title + Tenant Selector */}
          <div className="mb-3 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-2 w-full">
              {/* Title */}
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-lg shadow-md flex-shrink-0 bg-blue-500">
                  <Layout className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-3xl md:text-4xl font-bold text-[#2563eb] dark:text-blue-400">
                    {t('templates.title')}
                  </h1>
                </div>
              </div>
              
              {/* Right side: tenant selector (only if >1) + create button */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
                {tenants.length > 0 && (
                  <div className="w-full sm:w-56">
                    <select
                      className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-xs sm:text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 dark:focus-visible:ring-blue-400"
                      value={selectedTenantId}
                      onChange={(e) => {
                        const value = e.target.value;
                        setSelectedTenantId(value);
                        try {
                          window.localStorage.setItem("ecert-selected-tenant-id", value);
                        } catch {
                          // ignore
                        }
                      }}
                      disabled={loadingTenants || tenants.length === 0}
                    >
                      {loadingTenants && <option value="">Memuat tenant...</option>}
                      {!loadingTenants && tenants.length > 0 && !selectedTenantId && (
                        <option value="">Pilih tenant...</option>
                      )}
                      {!loadingTenants && tenants.map((tenant) => (
                        <option key={tenant.id} value={tenant.id}>
                          {tenant.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {(role === "owner" || role === "manager") && (
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
          </div>

          {/* Main Content Card - Like Groups page - Centered */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-md dark:shadow-lg p-4 sm:p-6 max-w-full">
            {/* Search Bar - Inside Card */}
            <div className="mb-4">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
                  <Input 
                    placeholder={t('templates.search')} 
                    className="h-10 pl-10 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 text-sm sm:text-base flex items-center" 
                    value={query} 
                    onChange={(e) => setQuery(e.target.value)} 
                  />
                  {query && (
                    <button
                      onClick={() => setQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex items-center justify-center"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <Button
                  type="button"
                  variant={categoryFilter || orientationFilter || statusFilter ? "default" : "outline"}
                  onClick={openFilterModal}
                  className="h-10 w-10 p-0 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 flex-shrink-0 relative"
                  aria-label="Toggle filters"
                >
                  <Filter className="w-4 h-4" />
                  {(categoryFilter || orientationFilter || statusFilter) && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full" />
                  )}
                </Button>
              </div>

              {/* Filter Panel - REMOVED, now using modal */}
              {false && (
                <div className="mt-4 pb-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t('templates.category')}
                      </label>
                      <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              <div
                                className="min-h-[400px] flex items-center justify-center"
              >
                <div className="text-center">
                  <svg
                    className="animate-spin mx-auto mb-6"
                    width="32"
                    height="32"
                    viewBox="0 0 32 32"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <circle
                      className="stroke-blue-500 dark:stroke-blue-400"
                      cx="16"
                      cy="16"
                      r="12"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeDasharray="75.4"
                      strokeDashoffset="18.85"
                    />
                  </svg>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    {t("templates.loading")}
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    {t("templates.loadingMessage")}
                  </p>
                </div>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div
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
              </div>
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
            <div 
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 max-w-full duration-300"
            >
              {filtered.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onEdit={handleEditClick}
                  onPreview={handlePreviewClick}
                  onConfigure={handleConfigureClick}
                  onDelete={requestDelete}
                  getTemplateUrl={getTemplateUrl}
                  isConfiguring={configuringTemplateId === template.id}
                  canDelete={canDelete}
                  templateUsageMap={templateUsageMap}
                  deletingTemplateId={deletingTemplateId}
                  t={t}
                />
              ))}
            </div>
          )}

            {/* Empty State */}
            {!loading && !error && filtered.length === 0 && (
              <div
                                className="p-12 sm:p-16"
              >
                <div className="text-center max-w-md mx-auto">
                  <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center mx-auto mb-6">
                    <FileText className="w-10 h-10 text-gray-400 dark:text-gray-500" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    {t('templates.noTemplates')}
                  </h3>
                  {(role === "owner" || role === "manager") && (
                    <Button 
                      onClick={openCreate} 
                      className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
                    >
                      <Plus className="w-5 h-5 mr-2" />
                      + New Template
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Enhanced Create Template Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('templates.createTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div 
              className="space-y-2"
                          >
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('templates.templateName')}</label>
              <Input 
                value={draft?.name ?? ""} 
                onChange={(e) => setDraft((d) => (d ? { ...d, name: e.target.value } : d))} 
                placeholder={t('templates.templateNamePlaceholder')}
                className="rounded-lg border-gray-200 dark:border-gray-700 focus:border-blue-500 focus:ring-blue-500/20 dark:bg-gray-900 dark:text-gray-100"
              />
            </div>
            
            <div 
              className="space-y-2"
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
            </div>
            
            <div 
              className="space-y-3"
                          >
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('templates.orientation')}</label>
              <div className="grid grid-cols-2 gap-2 dark:bg-gray-800 p-1 rounded-lg">
                <Button 
                  variant="ghost"
                  onClick={() => setDraft((d) => (d ? { ...d, orientation: "Landscape" } : d))}
                  className={`rounded-md transition-all ${
                    draft?.orientation === "Landscape"
                      ? "bg-blue-600 text-white shadow-sm dark:bg-blue-500 dark:text-white hover:bg-blue-700 dark:hover:bg-blue-600 border border-transparent"
                      : "bg-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700/50 border border-gray-300 dark:border-gray-600"
                  }`}
                >
                  {t('templates.landscape')}
                </Button>
                <Button 
                  variant="ghost"
                  onClick={() => setDraft((d) => (d ? { ...d, orientation: "Portrait" } : d))}
                  className={`rounded-md transition-all ${
                    draft?.orientation === "Portrait"
                      ? "bg-blue-600 text-white shadow-sm dark:bg-blue-500 dark:text-white hover:bg-blue-700 dark:hover:bg-blue-600 border border-transparent"
                      : "bg-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700/50 border border-gray-300 dark:border-gray-600"
                  }`}
                >
                  {t('templates.portrait')}
                </Button>
              </div>
            </div>

            {/* Dual Template Mode Selector */}
            <div 
              className="space-y-3"
            >
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('templates.templateMode')}</label>
              <div className="grid grid-cols-2 gap-2 dark:bg-gray-800 p-1 rounded-lg">
                <Button 
                  variant="ghost"
                  onClick={() => setIsDualTemplate(false)}
                  className={`rounded-md transition-all ${
                    !isDualTemplate
                      ? "bg-blue-600 text-white shadow-sm dark:bg-blue-500 dark:text-white hover:bg-blue-700 dark:hover:bg-blue-600 border border-transparent"
                      : "bg-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700/50 border border-gray-300 dark:border-gray-600"
                  }`}
                >
                  {t('templates.singleSide')}
                </Button>
                <Button 
                  variant="ghost"
                  onClick={() => setIsDualTemplate(true)}
                  className={`rounded-md transition-all ${
                    isDualTemplate
                      ? "bg-blue-600 text-white shadow-sm dark:bg-blue-500 dark:text-white hover:bg-blue-700 dark:hover:bg-blue-600 border border-transparent"
                      : "bg-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700/50 border border-gray-300 dark:border-gray-600"
                  }`}
                >
                  {t('templates.doubleSide')}
                </Button>
              </div>
            </div>

            {/* Single Template Image */}
            {!isDualTemplate && (
            <div 
              className="space-y-2"
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
            </div>
            )}

            {/* Dual Template Images */}
            {isDualTemplate && (
              <>
                {/* Certificate Image */}
                <div 
                  className="space-y-2"
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
                </div>

                {/* Score Image */}
                <div 
                  className="space-y-2"
                >
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('templates.scoreImage')}</label>
                  <div className="space-y-3">
                    <input
                      type="file"
                      accept=".png,.jpg,.jpeg"
                      onChange={(e) => handleScoreImageUpload(e.target.files?.[0] || null)}
                      className="block w-full text-sm text-gray-700 dark:text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 dark:file:bg-blue-900/30 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/50"
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
                </div>
              </>
            )}

            {/* Preview Image Upload */}
            <div 
              className="space-y-2"
            >
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('templates.previewImage')}</label>
              <div className="space-y-3">
                <input
                  type="file"
                  accept=".png,.jpg,.jpeg"
                  onChange={(e) => handlePreviewImageUpload(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-gray-700 dark:text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 dark:file:bg-blue-900/30 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/50"
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
            </div>
            
            <div 
              className="flex justify-end gap-3 pt-6"
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
            </div>
          </div>
        </DialogContent>
      </Dialog>

      

          {/* Enhanced Edit Template Dialog */}
          <Dialog open={!!isEditOpen} onOpenChange={(o) => setIsEditOpen(o ? isEditOpen : null)}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('templates.editTitle')}</DialogTitle>
              </DialogHeader>
              <div className="space-y-6 py-4">
                {/* Template Name */}
                <div 
                  className="space-y-2"
                >
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('templates.templateName')}</label>
                  <Input 
                    value={draft?.name ?? ""} 
                    onChange={(e) => setDraft((d) => (d ? { ...d, name: e.target.value } : d))} 
                    placeholder={t('templates.templateNamePlaceholder')}
                    className="rounded-lg border-gray-200 dark:border-gray-700 focus:border-blue-500 focus:ring-blue-500/20 dark:bg-gray-900 dark:text-gray-100"
                  />
                </div>

                {/* Category */}
                <div 
                  className="space-y-2"
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
                </div>

                {/* Orientation */}
                <div 
                  className="space-y-3"
                >
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('templates.orientation')}</label>
                  <div className="grid grid-cols-2 gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                    <Button 
                      variant="ghost"
                      onClick={() => setDraft((d) => (d ? { ...d, orientation: "Landscape" } : d))}
                      className={`rounded-md transition-all ${
                        draft?.orientation === "Landscape"
                          ? "bg-blue-600 text-white shadow-sm dark:bg-blue-500 dark:text-white hover:bg-blue-700 dark:hover:bg-blue-600 border border-transparent"
                          : "bg-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700/50 border border-gray-300 dark:border-gray-600"
                      }`}
                    >
                      {t('templates.landscape')}
                    </Button>
                    <Button 
                      variant="ghost"
                      onClick={() => setDraft((d) => (d ? { ...d, orientation: "Portrait" } : d))}
                      className={`rounded-md transition-all ${
                        draft?.orientation === "Portrait"
                          ? "bg-blue-600 text-white shadow-sm dark:bg-blue-500 dark:text-white hover:bg-blue-700 dark:hover:bg-blue-600 border border-transparent"
                          : "bg-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700/50 border border-gray-300 dark:border-gray-600"
                      }`}
                    >
                      {t('templates.portrait')}
                    </Button>
                  </div>
                </div>

                {/* Status */}
                <div 
                  className="space-y-2"
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
                </div>

                {/* Dual Template Mode Selector */}
                <div 
                  className="space-y-3"
                >
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('templates.templateMode')}</label>
                  <div className="grid grid-cols-2 gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                    <Button 
                      variant="ghost"
                      onClick={() => setIsDualTemplate(false)}
                      className={`rounded-md transition-all ${
                        !isDualTemplate
                          ? "bg-blue-600 text-white shadow-sm dark:bg-blue-500 dark:text-white hover:bg-blue-700 dark:hover:bg-blue-600 border border-transparent"
                          : "bg-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700/50 border border-gray-300 dark:border-gray-600"
                      }`}
                    >
                      {t('templates.singleSide')}
                    </Button>
                    <Button 
                      variant="ghost"
                      onClick={() => setIsDualTemplate(true)}
                      className={`rounded-md transition-all ${
                        isDualTemplate
                          ? "bg-blue-600 text-white shadow-sm dark:bg-blue-500 dark:text-white hover:bg-blue-700 dark:hover:bg-blue-600 border border-transparent"
                          : "bg-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700/50 border border-gray-300 dark:border-gray-600"
                      }`}
                    >
                      {t('templates.doubleSide')}
                    </Button>
                  </div>
                </div>

                {/* Single Template Image */}
                {!isDualTemplate && (
                  <>
                    {/* Current Template Image */}
                    <div 
                      className="space-y-2"
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
                            {draft && getTemplateImageUrl(draft as Template) ? (
                              <div className="relative w-full h-40 bg-gray-50 dark:bg-gray-800">
                                <Image
                                  src={getTemplateImageUrl(draft as Template)!}
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
                    </div>

                    {/* Upload New Template Image */}
                    <div 
                      className="space-y-2"
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
                    </div>
                  </>
                )}

                {/* Dual Template Images */}
                {isDualTemplate && (
                  <>
                    {/* Current Certificate Image */}
                    <div 
                      className="space-y-2"
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
                    </div>

                    {/* Upload New Certificate Image */}
                    <div 
                      className="space-y-2"
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
                    </div>

                    {/* Current Score Image */}
                    <div 
                      className="space-y-2"
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
                    </div>

                    {/* Upload New Score Image */}
                    <div 
                      className="space-y-2"
                    >
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('templates.changeScoreImage')}</label>
                      <div className="space-y-3">
                        <input
                          type="file"
                          accept=".png,.jpg,.jpeg"
                          onChange={(e) => handleScoreImageUpload(e.target.files?.[0] || null)}
                          className="block w-full text-sm text-gray-700 dark:text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 dark:file:bg-blue-900/30 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/50 cursor-pointer"
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
                    </div>
                  </>
                )}

                {/* Current Preview Image */}
                <div 
                  className="space-y-2"
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
                </div>

                {/* Upload New Preview Image */}
                <div 
                  className="space-y-2"
                >
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('templates.changePreviewImage')}</label>
                  <div className="space-y-3">
                    <input
                      type="file"
                      accept=".png,.jpg,.jpeg"
                      onChange={(e) => handlePreviewImageUpload(e.target.files?.[0] || null)}
                      className="block w-full text-sm text-gray-700 dark:text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 dark:file:bg-blue-900/30 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/50 cursor-pointer"
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
                </div>

                {/* Action Buttons */}
                <div 
                  className="flex justify-end gap-3 pt-6"
                >
                  <Button 
                    variant="outline" 
                    className="border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600 dark:text-gray-100" 
                    onClick={() => setIsEditOpen(null)}
                  >
                    {t('common.cancel')}
                  </Button>
                  {(role === "owner" || role === "manager") && (
                    <LoadingButton 
                      className="gradient-primary text-white shadow-lg hover:shadow-xl" 
                      onClick={submitEdit}
                      isLoading={editingTemplate}
                      loadingText={t('common.saving')}
                      variant="primary"
                    >
                      {t('members.saveChanges')}
                    </LoadingButton>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>

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
                      {getTemplatePreviewUrl(previewTemplate) ? (
                        <div className="relative w-full aspect-[4/3] bg-gray-100 dark:bg-gray-900 rounded-lg overflow-hidden">
                          <Image
                            src={getTemplatePreviewUrl(previewTemplate)!}
                            alt={previewTemplate.name}
                            fill
                            className="object-contain border border-gray-200 dark:border-gray-700"
                            unoptimized
                            onLoad={() => {
                              console.log('🚀 Preview loaded for:', previewTemplate.name);
                            }}
                            onError={() => {
                              console.error('❌ Preview failed for:', previewTemplate.name);
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
                        {(role === "owner" || role === "manager") && previewTemplate && (
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

      {/* Filter Modal */}
      <Dialog open={filterModalOpen} onOpenChange={setFilterModalOpen}>
        <DialogContent 
          className="sm:max-w-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              applyFilters();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              cancelFilters();
            }
          }}
        >
          <DialogHeader className="border-b border-gray-200 dark:border-gray-700 pb-4">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-blue-500" />
              <DialogTitle className="text-gray-900 dark:text-white">Filter</DialogTitle>
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
                <option value="Magang">Magang</option>
                <option value="Pelatihan">Pelatihan</option>
                <option value="Kunjungan Industri">Kunjungan Industri</option>
                <option value="Sertifikat">Sertifikat</option>
                <option value="Surat">Surat</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>

            {/* Orientation Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Orientation</label>
              <select
                value={tempOrientationFilter}
                onChange={(e) => setTempOrientationFilter(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All</option>
                <option value="Landscape">Landscape</option>
                <option value="Portrait">Portrait</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
              <select
                value={tempStatusFilter}
                onChange={(e) => setTempStatusFilter(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All</option>
                <option value="ready">Ready</option>
                <option value="draft">Draft</option>
              </select>
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


