"use client";

import Header from "@/components/header";
import Footer from "@/components/footer";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/language-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Plus, Search, Eye, Edit, Trash2, Palette, Layout, X } from "lucide-react";
import { staggerContainer } from "@/components/page-transition";
import { useTemplates } from "@/hooks/use-templates";
import { Template, CreateTemplateData, UpdateTemplateData, getTemplatePreviewUrl } from "@/lib/supabase/templates";
import { toast, Toaster } from "sonner";
import { confirmToast } from "@/lib/ui/confirm";

export default function TemplatesPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [role, setRole] = useState<"Admin" | "Team" | "Public">("Public");
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

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
    if (query) {
      const q = query.toLowerCase();
      list = list.filter((i) => i.name.toLowerCase().includes(q));
    }
    if (categoryFilter) {
      list = list.filter((i) => i.category === categoryFilter);
    }
    return list;
  }, [templates, query, categoryFilter]);

  // Sheet state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState<null | string>(null);
  const [draft, setDraft] = useState<Partial<Template> | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [previewImageFile, setPreviewImageFile] = useState<File | null>(null);
  const [previewImagePreview, setPreviewImagePreview] = useState<string | null>(null);
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);
  const [cleaningUp, setCleaningUp] = useState(false);
  
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
    setIsCreateOpen(true);
  }

  async function submitCreate() {
    console.log('🚀 Starting template creation...', { draft, imageFile });
    
    if (!draft || !draft.name?.trim() || !draft.category?.trim()) {
      console.log('❌ Validation failed:', { draft });
      toast.error("Please fill in all required fields");
      return;
    }
    // Require Template Image on create
    if (!imageFile) {
      toast.error("Template Image is required");
      return;
    }

    try {
      const templateData: CreateTemplateData = {
        name: draft.name.trim(),
        category: draft.category.trim(),
        orientation: draft.orientation || "Landscape",
        image_file: imageFile || undefined,
        preview_image_file: previewImageFile || undefined
      };

      console.log('📋 Template data prepared:', templateData);
      console.log('🔄 Calling create function...');
      
      const result = await create(templateData);
      console.log('✅ Template creation result:', result);
      
      setIsCreateOpen(false);
      setDraft(null);
      setImageFile(null);
      setImagePreview(null);
      setPreviewImageFile(null);
      setPreviewImagePreview(null);
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
    setIsEditOpen(item.id);
  }

  async function submitEdit() {
    if (!draft || !isEditOpen || !draft.name || !draft.category) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const templateData: UpdateTemplateData = {
        name: draft.name,
        category: draft.category,
        orientation: draft.orientation,
        image_file: imageFile || undefined,
        preview_image_file: previewImageFile || undefined
      };

      await update(isEditOpen, templateData);
      setIsEditOpen(null);
      setDraft(null);
      setImageFile(null);
      setImagePreview(null);
      setPreviewImageFile(null);
      setPreviewImagePreview(null);
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
        console.log('🗑️ User confirmed deletion of template:', templateName);
        setDeletingTemplateId(id);
        await deleteTemplate(id);
        toast.success(`Template "${templateName}" deleted successfully!`);
        // Refresh templates to remove the deleted template immediately
        refresh();
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

  // DIAG: Cleanup orphaned image files
  async function cleanupOrphanedImages() {
    if (!canDelete) {
      toast.error("You don't have permission to clean up images");
      return;
    }
    
    const ok = await confirmToast("This will delete any image files that don't have corresponding template records. Continue?", { confirmText: "Clean up", tone: "destructive" });
    if (ok) {
      try {
        setCleaningUp(true);
        console.log('🧹 Starting cleanup of orphaned images...');
        
        const response = await fetch('/api/cleanup-orphaned-images', {
          method: 'POST',
        });
        
        const result = await response.json();
        
        if (result.success) {
          toast.success(`Cleanup completed! Deleted ${result.stats.successfullyDeleted} orphaned files.`);
          console.log('✅ Cleanup completed:', result);
        } else {
          toast.error(`Cleanup failed: ${result.error}`);
          console.error('❌ Cleanup failed:', result);
        }
      } catch (error) {
        console.error('💥 Cleanup request failed:', error);
        toast.error("Failed to clean up orphaned images");
      } finally {
        setCleaningUp(false);
      }
    }
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      <Header />
      <main className="pt-16">
        {/* Hero Section */}
        <motion.section 
          className="relative py-20 overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 via-purple-600/5 to-indigo-600/5"></div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
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
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-6 shadow-lg">
                  <FileText className="w-10 h-10 text-white" />
                </div>
                <h1 className="text-4xl sm:text-5xl font-bold text-gradient mb-4">
                  {t('templates.title')}
                </h1>
                <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                  {t('templates.subtitle')}
                </p>
              </motion.div>

              {/* Enhanced Search and Create */}
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-3xl mx-auto"
              >
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input 
                    placeholder={t('templates.search')} 
                    className="pl-12 h-12 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500/20" 
                    value={query} 
                    onChange={(e) => setQuery(e.target.value)} 
                  />
                </div>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full sm:w-56 h-12 px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                {(role === "Admin" || role === "Team") && (
                  <div className="flex gap-3">
                    <Button 
                      onClick={openCreate} 
                      className="h-12 px-8 gradient-primary text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                    >
                      <Plus className="w-5 h-5 mr-2" />
                      {t('templates.create')}
                    </Button>
                    {role === "Admin" && (
                      <Button 
                        onClick={cleanupOrphanedImages}
                        disabled={cleaningUp}
                        variant="outline"
                        className="h-12 px-6 border-orange-300 text-orange-600 hover:bg-orange-50 hover:border-orange-400"
                      >
                        {cleaningUp ? (
                          <>
                            <div className="w-4 h-4 mr-2 border-2 border-orange-300 border-t-orange-600 rounded-full animate-spin"></div>
                            Cleaning...
                          </>
                        ) : (
                          <>
                            <Trash2 className="w-4 h-4 mr-2" />
                            Cleanup Images
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                )}
              </motion.div>
            </motion.div>

            {/* Loading State */}
            {loading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-16"
              >
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                  <FileText className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-600 mb-2">Loading templates...</h3>
                <p className="text-gray-500">Please wait while we fetch your templates.</p>
              </motion.div>
            )}

            {/* Error State */}
            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-16"
              >
                <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <FileText className="w-12 h-12 text-red-400" />
                </div>
                <h3 className="text-xl font-semibold text-red-600 mb-2">Error loading templates</h3>
                <p className="text-red-500 mb-6">{error}</p>
                <Button 
                  onClick={() => window.location.reload()} 
                  className="gradient-primary text-white shadow-lg hover:shadow-xl"
                >
                  Try Again
                </Button>
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
                    <div className="relative aspect-video bg-gradient-to-br from-gray-50 to-gray-100 border-b border-gray-200 overflow-hidden">
                      {getTemplatePreviewUrl(tpl) ? (
                        <img 
                          src={getTemplatePreviewUrl(tpl)!} 
                          alt={tpl.name}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <>
                          <div className={`absolute inset-0 bg-gradient-to-br ${getCategoryColor(tpl.category)} opacity-10`}></div>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center">
                              <Layout className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                              <div className="text-sm font-medium text-gray-600">{tpl.orientation}</div>
                            </div>
                          </div>
                        </>
                      )}
                      {/* Category Badge */}
                      <div className={`absolute top-3 right-3 px-3 py-1 rounded-full bg-gradient-to-r ${getCategoryColor(tpl.category)} text-white text-xs font-medium shadow-lg`}>
                        {tpl.category}
                      </div>
                    </div>

                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {tpl.name}
                      </CardTitle>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
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
                          className="w-full border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200" 
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
                                router.push(`/templates/generate?template=${tpl.id}`);
                              }
                            }}
                          >
                            Use This Template
                          </Button>
                        )}

                        {(role === "Admin" || role === "Team") && (
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="flex-1 border-gray-200 hover:border-blue-300 hover:bg-blue-50" 
                              onClick={() => openEdit(tpl)}
                            >
                              <Edit className="w-4 h-4 mr-1" />
                              {t('common.edit')}
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className={`flex-1 border-gray-200 ${canDelete ? 'hover:border-red-300 hover:bg-red-50 hover:text-red-600' : 'opacity-50 cursor-not-allowed'}`}
                              onClick={() => canDelete && requestDelete(tpl.id)}
                              disabled={!canDelete || deletingTemplateId === tpl.id}
                            >
                              {deletingTemplateId === tpl.id ? (
                                <>
                                  <div className="w-4 h-4 mr-1 border-2 border-red-300 border-t-red-600 rounded-full animate-spin"></div>
                                  Deleting...
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
                <h3 className="text-xl font-semibold text-gray-600 mb-2">No templates found</h3>
                <p className="text-gray-500 mb-6">Try adjusting your search criteria or create a new template.</p>
                {(role === "Admin" || role === "Team") && (
                  <Button 
                    onClick={openCreate} 
                    className="gradient-primary text-white shadow-lg hover:shadow-xl"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Create First Template
                  </Button>
                )}
              </motion.div>
            )}
          </div>
        </motion.section>
      </main>
      <Footer />

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

            {/* Template Image (Required) */}
            <motion.div 
              className="space-y-2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.3 }}
            >
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-gray-700">Template Image (Required)</label>
                <span className="text-xs text-red-500 font-medium">Required</span>
              </div>
              <div className="space-y-3">
                <input
                  type="file"
                  accept=".png,.jpg,.jpeg"
                  onChange={(e) => handleImageUpload(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {imagePreview && (
                  <div className="relative">
                    <img 
                      src={imagePreview} 
                      alt="Template preview" 
                      className="w-full h-32 object-cover rounded-lg border border-gray-200" 
                    />
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
                    <img 
                      src={previewImagePreview} 
                      alt="Preview image" 
                      className="w-full h-24 object-cover rounded-lg border border-gray-200" 
                    />
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
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="text-xl font-bold text-gradient">Edit Template</SheetTitle>
            <SheetDescription>Update template details.</SheetDescription>
          </SheetHeader>
          <div className="p-4 space-y-6">
            {/* Current Preview Image */}
            <motion.div 
              className="space-y-2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              <label className="text-sm font-semibold text-gray-700">Current Preview Image</label>
              <div className="relative border border-gray-200 rounded-lg overflow-hidden bg-white">
                {previewImagePreview ? (
                  <img
                    src={previewImagePreview}
                    alt="Preview image"
                    className="w-full h-40 object-contain bg-gray-50"
                  />
                ) : (
                  <>
                    {draft && getTemplatePreviewUrl(draft as Template) ? (
                      <img
                        src={getTemplatePreviewUrl(draft as Template)!}
                        alt="Current preview"
                        className="w-full h-40 object-contain bg-gray-50"
                      />
                    ) : (
                      <div className="w-full h-40 flex items-center justify-center text-gray-400 bg-gray-50">
                        <Layout className="w-6 h-6 mr-2" />
                        No preview image
                      </div>
                    )}
                  </>
                )}
              </div>
            </motion.div>

            {/* Change Preview Image */}
            <motion.div 
              className="space-y-2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.05 }}
            >
              <label className="text-sm font-semibold text-gray-700">Change Preview Image</label>
              <div className="space-y-3">
                <input
                  type="file"
                  accept=".png,.jpg,.jpeg"
                  onChange={(e) => handlePreviewImageUpload(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                />
                {previewImagePreview && (
                  <div className="relative">
                    <img 
                      src={previewImagePreview} 
                      alt="Preview image" 
                      className="w-full h-24 object-cover rounded-lg border border-gray-200" 
                    />
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
              className="space-y-2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              <label className="text-sm font-semibold text-gray-700">Template Name</label>
              <Input 
                value={draft?.name ?? ""} 
                onChange={(e) => setDraft((d) => (d ? { ...d, name: e.target.value } : d))} 
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
            
            
            <motion.div 
              className="flex justify-end gap-3 pt-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.4 }}
            >
              <Button 
                variant="outline" 
                className="border-gray-300 hover:border-gray-400" 
                onClick={() => setIsEditOpen(null)}
              >
                Cancel
              </Button>
              <Button 
                className="gradient-primary text-white shadow-lg hover:shadow-xl" 
                onClick={submitEdit}
              >
                Save Changes
              </Button>
            </motion.div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Enhanced Preview Modal */}
      <Dialog open={!!previewTemplate} onOpenChange={(o) => setPreviewTemplate(o ? previewTemplate : null)}>
        <DialogContent className="preview-modal-content max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gradient">{t('templates.templatePreview')}</DialogTitle>
            <DialogDescription className="text-lg">{t('templates.templateDetails')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-8">
            {previewTemplate && (
              <>
                {/* Template Info */}
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
                      <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">{t('templates.name')}</label>
                      <div className="text-2xl font-bold text-gray-900">{previewTemplate.name}</div>
                    </motion.div>
                    
                    <motion.div 
                      className="space-y-3"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: 0.2 }}
                    >
                      <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">{t('templates.category')}</label>
                      <div className={`inline-block px-4 py-2 rounded-full bg-gradient-to-r ${getCategoryColor(previewTemplate.category)} text-white font-medium`}>
                        {previewTemplate.category}
                      </div>
                    </motion.div>
                    
                    <motion.div 
                      className="space-y-3"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: 0.3 }}
                    >
                      <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">{t('templates.orientation')}</label>
                      <div className="text-lg text-gray-700 flex items-center gap-2">
                        <Layout className="w-5 h-5" />
                        {previewTemplate.orientation}
                      </div>
                    </motion.div>
                    
                    <motion.div 
                      className="space-y-3"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: 0.4 }}
                    >
                      <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">{t('templates.description')}</label>
                      <div className="text-gray-700 leading-relaxed">
                        This is a professional {previewTemplate.category.toLowerCase()} certificate template designed for {previewTemplate.orientation.toLowerCase()} orientation. 
                        Perfect for recognizing achievements, completions, and accomplishments in {previewTemplate.category.toLowerCase()} programs.
                      </div>
                    </motion.div>
                  </div>
                  
                  {/* Template Preview Image Only (no dummy text overlay) */}
                  <motion.div 
                    className="space-y-4"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                  >
                    <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">{t('templates.templatePreview')}</label>
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border-2 border-dashed border-blue-200">
                      <div
                        className="bg-white rounded-xl p-2 shadow-xl relative overflow-hidden"
                        style={{ aspectRatio: previewTemplate.orientation === 'Portrait' ? '3 / 4' : '16 / 9' }}
                      >
                        {getTemplatePreviewUrl(previewTemplate) ? (
                          <img
                            src={getTemplatePreviewUrl(previewTemplate)!}
                            alt={previewTemplate.name}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-50">
                            <div className="text-center text-gray-400">
                              <Layout className="w-12 h-12 mx-auto mb-2" />
                              <div>No preview image</div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                </motion.div>

                {/* Enhanced Action Buttons */}
                <motion.div 
                  className="flex justify-end gap-4 pt-6 border-t border-gray-200"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.6 }}
                >
                  <Button 
                    variant="outline" 
                    className="border-gray-300 hover:border-gray-400 px-6" 
                    onClick={() => setPreviewTemplate(null)}
                  >
                    Close
                  </Button>
                  {(role === "Admin" || role === "Team") && (
                    <Button 
                      className="gradient-primary text-white shadow-lg hover:shadow-xl px-6" 
                      onClick={() => {
                        setPreviewTemplate(null);
                        if (role === "Admin" || role === "Team") {
                          router.push(`/templates/generate?template=${previewTemplate.id}`);
                        }
                      }}
                    >
                      Use This Template
                    </Button>
                  )}
                </motion.div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Toast Notifications */}
      <Toaster position="top-right" richColors />
    </div>
  );
}


