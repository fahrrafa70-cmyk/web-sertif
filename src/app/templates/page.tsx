"use client";

import ModernLayout from "@/components/modern-layout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/use-debounce";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/language-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Plus, Search, Eye, Edit, Trash2, Palette, Layout, X, Settings } from "lucide-react";
import { staggerContainer } from "@/components/page-transition";
import { useTemplates } from "@/hooks/use-templates";
import { Template, CreateTemplateData, UpdateTemplateData, getTemplatePreviewUrl } from "@/lib/supabase/templates";
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

  // Sheet state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState<null | string>(null);
  const [draft, setDraft] = useState<Partial<Template> | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [previewImageFile, setPreviewImageFile] = useState<File | null>(null);
  const [previewImagePreview, setPreviewImagePreview] = useState<string | null>(null);
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);
  
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
    setDraft({ ...item });
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
      const templateData: UpdateTemplateData = {
        name: draft.name,
        category: draft.category,
        orientation: draft.orientation,
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

      await update(isEditOpen, templateData);
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
      // Refresh templates to show the updated template immediately
      refresh();
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
      {/* Hero Section */}
      <motion.section 
        className="relative py-6 sm:py-8 md:py-12 overflow-hidden min-h-screen"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 relative">
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="text-center mb-16"
            >
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="mb-8"
              >
                <div className="inline-flex items-center justify-center w-20 h-20 gradient-primary rounded-2xl mb-6 shadow-lg">
                  <FileText className="w-10 h-10 text-white" />
                </div>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gradient mb-3 sm:mb-4">
                  {t('templates.title')}
                </h1>
                <p className="text-base sm:text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto px-4">
                  {t('templates.subtitle')}
                </p>
              </motion.div>

              {/* Enhanced Search and Create */}
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 max-w-3xl mx-auto mb-6 sm:mb-8"
              >
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                  <Input 
                    placeholder={t('templates.search')} 
                    className="pl-10 sm:pl-12 h-10 sm:h-12 rounded-lg sm:rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 text-sm sm:text-base" 
                    value={query} 
                    onChange={(e) => setQuery(e.target.value)} 
                  />
                </div>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full sm:w-56 h-10 sm:h-12 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-gray-100 text-sm sm:text-base"
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
                {(role === "Admin" || role === "Team") && (
                  <Button 
                    onClick={openCreate} 
                    className="h-10 sm:h-12 px-4 sm:px-6 md:px-8 gradient-primary text-white rounded-lg sm:rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 w-full sm:w-auto text-sm sm:text-base"
                  >
                    <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                    {t('templates.create')}
                  </Button>
                )}
              </motion.div>
            </motion.div>

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
                    className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white"
                  >
                    {t("templates.tryAgain")}
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Templates Grid */}
            {!loading && !error && (
            <motion.div 
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ staggerChildren: 0.1, delayChildren: 0.2 }}
            >
                {filtered.map((tpl) => (
                <motion.div
                  key={tpl.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
                  whileHover={{ scale: 1.02, y: -5 }}
                >
                  <Card className="h-full border-0 shadow-lg hover:shadow-2xl transition-all duration-300 group overflow-hidden">
                    {/* Template Preview (uniform 16:9 frame so cards have equal height) */}
                    <div className="relative aspect-video bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border-b border-gray-200 dark:border-gray-700 overflow-hidden">
                      {getTemplatePreviewUrl(tpl) && !failedImages.has(tpl.id) ? (
                        <div className="absolute inset-0 dark:bg-gray-800">
                          <Image 
                            src={getTemplatePreviewUrl(tpl)!}
                            alt={tpl.name}
                            fill
                            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                            className="object-contain dark:opacity-90 dark:brightness-95"
                            loading={filtered.indexOf(tpl) < 6 ? "eager" : "lazy"}
                            fetchPriority={filtered.indexOf(tpl) < 6 ? "high" : "auto"}
                            decoding="async"
                            unoptimized
                            onError={() => {
                              // Mark image as failed and show fallback
                              setFailedImages(prev => new Set(prev).add(tpl.id));
                            }}
                          />
                        </div>
                      ) : (
                        <>
                          <div className={`absolute inset-0 bg-gradient-to-br ${getCategoryColor(tpl.category)} opacity-10`}></div>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center">
                              <Layout className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                              <div className="text-sm font-medium text-gray-600 dark:text-gray-300">{tpl.orientation}</div>
                            </div>
                          </div>
                        </>
                      )}
                      {/* Category Badge */}
                      <div className={`absolute top-3 right-3 px-3 py-1 rounded-full bg-gradient-to-r ${getCategoryColor(tpl.category)} text-white text-xs font-medium shadow-lg`}>
                        {tpl.category}
                      </div>
                      {/* Layout Status Badge */}
                      <div className="absolute top-3 left-3">
                        {tpl.is_layout_configured ? (
                          <Badge variant="default" className="bg-green-500 hover:bg-green-600 text-white shadow-md">
                            ✓ Ready
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-yellow-500 hover:bg-yellow-600 text-white shadow-md">
                            ⚠ Not Configured
                          </Badge>
                        )}
                      </div>
                    </div>

                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {tpl.name}
                      </CardTitle>
                      <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <Layout className="w-4 h-4" />
                          {tpl.orientation}
                        </div>
                        <div className="flex items-center gap-1">
                          <Palette className="w-4 h-4" />
                          {tpl.category}
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="pt-0">
                      <div className="space-y-2">
                        <Button 
                          variant="outline" 
                          className="w-full border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200" 
                          onClick={() => openPreview(tpl)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          {t('templates.preview')}
                        </Button>
                        
                        {(role === "Admin" || role === "Team") && (
                          <Button 
                            className="w-full gradient-primary text-white shadow-lg hover:shadow-xl transition-all duration-300" 
                            onClick={() => {
                              if (role === "Admin" || role === "Team") {
                                router.push(`/templates/configure?template=${tpl.id}`);
                              }
                            }}
                          >
                            <Settings className="w-4 h-4 mr-2" />
                            Configure Layout
                          </Button>
                        )}

                        {(role === "Admin" || role === "Team") && (
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="flex-1 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20" 
                              onClick={() => openEdit(tpl)}
                            >
                              <Edit className="w-4 h-4 mr-1" />
                              {t('common.edit')}
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className={`flex-1 border-gray-200 dark:border-gray-700 ${canDelete ? 'hover:border-red-300 dark:hover:border-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400' : 'opacity-50 cursor-not-allowed'}`}
                              onClick={() => canDelete && requestDelete(tpl.id)}
                              disabled={!canDelete || deletingTemplateId === tpl.id}
                            >
                              {deletingTemplateId === tpl.id ? (
                                <>
                                  <div className="w-4 h-4 mr-1 border-2 border-red-300 border-t-red-600 rounded-full animate-spin"></div>
                                  {t('templates.deleting')}
                                </>
                              ) : (
                                <>
                                  <Trash2 className="w-4 h-4 mr-1" />
                                  {t('common.delete')}
                                </>
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
                ))}
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
                <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-300 mb-2">{t('templates.noTemplates')}</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6">{t('templates.subtitle')}</p>
                {(role === "Admin" || role === "Team") && (
                  <Button 
                    onClick={openCreate} 
                    className="gradient-primary text-white shadow-lg hover:shadow-xl"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    {t('templates.createNew')}
                  </Button>
                )}
              </motion.div>
            )}
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
                  Single Template
                </Button>
                <Button 
                  variant={isDualTemplate ? "default" : "outline"} 
                  onClick={() => setIsDualTemplate(true)}
                  className="rounded-lg"
                >
                  <Layout className="w-4 h-4 mr-2" />
                  Dual Template
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
                      Single Template
                    </Button>
                    <Button 
                      variant={isDualTemplate ? "default" : "outline"} 
                      onClick={() => setIsDualTemplate(true)}
                      className="rounded-lg"
                    >
                      <Layout className="w-4 h-4 mr-2" />
                      Dual Template
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
                          <div className="relative w-full h-40">
                            <Image
                              src={imagePreview}
                              alt="New template image"
                              fill
                              className="object-contain bg-gray-50"
                              unoptimized
                            />
                          </div>
                        ) : (
                          <>
                            {draft && getTemplatePreviewUrl(draft as Template) ? (
                              <div className="relative w-full h-40">
                                <Image
                                  src={getTemplatePreviewUrl(draft as Template)!}
                                  alt="Current template"
                                  fill
                                  className="object-contain bg-gray-50"
                                  unoptimized
                                />
                              </div>
                            ) : (
                              <div className="w-full h-40 flex items-center justify-center text-gray-400 bg-gray-50">
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
                          className="block w-full text-sm text-gray-700 dark:text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 dark:file:bg-blue-900/30 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/50"
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
                          <div className="relative w-full h-40">
                            <Image
                              src={certificateImagePreview}
                              alt="New certificate image"
                              fill
                              className="object-contain bg-gray-50"
                              unoptimized
                            />
                          </div>
                        ) : (
                          <>
                            {draft && (draft as Template).certificate_image_url ? (
                              <div className="relative w-full h-40">
                                <Image
                                  src={`${(draft as Template).certificate_image_url}?v=${Date.now()}`}
                                  alt="Current certificate"
                                  fill
                                  className="object-contain bg-gray-50"
                                  unoptimized
                                />
                              </div>
                            ) : (
                              <div className="w-full h-40 flex items-center justify-center text-gray-400 bg-gray-50">
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
                          className="block w-full text-sm text-gray-700 dark:text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 dark:file:bg-blue-900/30 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/50"
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
                          <div className="relative w-full h-40">
                            <Image
                              src={scoreImagePreview}
                              alt="New score image"
                              fill
                              className="object-contain bg-gray-50"
                              unoptimized
                            />
                          </div>
                        ) : (
                          <>
                            {draft && (draft as Template).score_image_url ? (
                              <div className="relative w-full h-40">
                                <Image
                                  src={`${(draft as Template).score_image_url}?v=${Date.now()}`}
                                  alt="Current score"
                                  fill
                                  className="object-contain bg-gray-50"
                                  unoptimized
                                />
                              </div>
                            ) : (
                              <div className="w-full h-40 flex items-center justify-center text-gray-400 bg-gray-50">
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
                          className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
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
                      <div className="relative w-full h-32">
                        <Image
                          src={previewImagePreview}
                          alt="New preview image"
                          fill
                          className="object-contain bg-gray-50"
                          unoptimized
                        />
                      </div>
                    ) : (
                      <>
                        {draft && (draft as Template).preview_image_path ? (
                          <div className="relative w-full h-32">
                            <Image
                              src={`${(draft as Template).preview_image_path}?v=${Date.now()}`}
                              alt="Current preview"
                              fill
                              className="object-contain bg-gray-50"
                              unoptimized
                            />
                          </div>
                        ) : (
                          <div className="w-full h-32 flex items-center justify-center text-gray-400 bg-gray-50">
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
                      className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
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

          {/* Template Preview Sheet */}
          <Sheet open={!!previewTemplate} onOpenChange={(o) => setPreviewTemplate(o ? previewTemplate : null)}>
            <SheetContent side="right" className="w-full sm:max-w-2xl">
              <SheetHeader>
                <SheetTitle className="text-xl font-bold text-gradient">{t('templates.preview')}</SheetTitle>
                <SheetDescription>Preview the selected template.</SheetDescription>
              </SheetHeader>
              <div className="p-4 space-y-6">
                <div className="relative border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-900">
                  {previewTemplate && getTemplatePreviewUrl(previewTemplate) ? (
                    <div className="relative w-full aspect-video bg-gray-50 dark:bg-gray-800">
                      <Image
                        src={getTemplatePreviewUrl(previewTemplate)!}
                        alt={previewTemplate.name}
                        fill
                        className="object-contain dark:opacity-90 dark:brightness-95"
                        unoptimized
                      />
                    </div>
                  ) : (
                    <div className="w-full aspect-video flex items-center justify-center text-gray-400 bg-gray-50">
                      <Layout className="w-6 h-6 mr-2" />
                      No preview image
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3">
                  <Button 
                    variant="outline" 
                    className="border-gray-300 hover:border-gray-400" 
                    onClick={() => setPreviewTemplate(null)}
                    size="icon"
                    aria-label="Close"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                  {(role === "Admin" || role === "Team") && previewTemplate && (
                    <Button 
                      className="gradient-primary text-white shadow-lg hover:shadow-xl" 
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
            </SheetContent>
          </Sheet>

    {/* Toast Notifications */}
    <Toaster position="top-right" richColors />
  </ModernLayout>
  );
}


