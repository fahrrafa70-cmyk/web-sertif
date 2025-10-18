"use client";

import Header from "@/components/header";
import Footer from "@/components/footer";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/language-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Plus, Search, Eye, Edit, Trash2, Palette, Layout } from "lucide-react";
import { staggerContainer, staggerItem, fadeInUp, scaleIn } from "@/components/page-transition";

type TemplateItem = {
  id: string;
  name: string;
  orientation: "Landscape" | "Portrait";
  category: string;
};

const INITIAL_TEMPLATES: TemplateItem[] = [
  { id: "t1", name: "General Training", orientation: "Landscape", category: "Training" },
  { id: "t2", name: "Internship", orientation: "Portrait", category: "Internship" },
  { id: "t3", name: "MoU Certificate", orientation: "Landscape", category: "MoU" },
  { id: "t4", name: "Industrial Visit", orientation: "Landscape", category: "Visit" },
];

export default function TemplatesPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [role, setRole] = useState<"Admin" | "Team" | "Public">("Public");
  const [items, setItems] = useState<TemplateItem[]>(INITIAL_TEMPLATES);
  const [query, setQuery] = useState("");

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

  const filtered = useMemo(
    () => (query ? items.filter((i) => i.name.toLowerCase().includes(query.toLowerCase())) : items),
    [items, query]
  );

  // Sheet state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState<null | string>(null);
  const [draft, setDraft] = useState<TemplateItem | null>(null);
  
  // Preview modal state
  const [previewTemplate, setPreviewTemplate] = useState<TemplateItem | null>(null);
  
  const canDelete = role === "Admin"; // Team cannot delete

  function openCreate() {
    setDraft({ id: "", name: "", orientation: "Landscape", category: "" });
    setIsCreateOpen(true);
  }

  function submitCreate() {
    if (!draft) return;
    const id = `t${Date.now()}`;
    setItems((prev) => [{ ...draft, id }, ...prev]);
    setIsCreateOpen(false);
    setDraft(null);
  }

  function openEdit(item: TemplateItem) {
    setDraft({ ...item });
    setIsEditOpen(item.id);
  }

  function submitEdit() {
    if (!draft || !isEditOpen) return;
    setItems((prev) => prev.map((it) => (it.id === isEditOpen ? { ...draft } : it)));
    setIsEditOpen(null);
    setDraft(null);
  }

  function requestDelete(id: string) {
    if (!canDelete) return;
    setItems((prev) => prev.filter((it) => it.id !== id));
  }

  function openPreview(template: TemplateItem) {
    setPreviewTemplate(template);
  }

  function useTemplate(template: TemplateItem) {
    if (role === "Admin" || role === "Team") {
      router.push(`/templates/generate?template=${template.id}`);
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
              <motion.div variants={fadeInUp} className="mb-8">
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
                variants={fadeInUp}
                className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-2xl mx-auto"
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
                {(role === "Admin" || role === "Team") && (
                  <Button 
                    onClick={openCreate} 
                    className="h-12 px-8 gradient-primary text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    {t('templates.create')}
                  </Button>
                )}
              </motion.div>
            </motion.div>

            {/* Templates Grid */}
            <motion.div 
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              {filtered.map((tpl, idx) => (
                <motion.div
                  key={tpl.id}
                  variants={staggerItem}
                  whileHover={{ scale: 1.02, y: -5 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <Card className="h-full border-0 shadow-lg hover:shadow-2xl transition-all duration-300 group overflow-hidden">
                    {/* Template Preview */}
                    <div className="relative aspect-video bg-gradient-to-br from-gray-50 to-gray-100 border-b border-gray-200 overflow-hidden">
                      <div className={`absolute inset-0 bg-gradient-to-br ${getCategoryColor(tpl.category)} opacity-10`}></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <Layout className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                          <div className="text-sm font-medium text-gray-600">{tpl.orientation}</div>
                        </div>
                      </div>
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
                            onClick={() => useTemplate(tpl)}
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
                              disabled={!canDelete}
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              {t('common.delete')}
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>

            {/* Empty State */}
            {filtered.length === 0 && (
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
              <Input 
                value={draft?.category ?? ""} 
                onChange={(e) => setDraft((d) => (d ? { ...d, category: e.target.value } : d))} 
                placeholder="Enter category"
                className="rounded-lg border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
              />
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
              transition={{ duration: 0.3, delay: 0.3 }}
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
              <Input 
                value={draft?.category ?? ""} 
                onChange={(e) => setDraft((d) => (d ? { ...d, category: e.target.value } : d))} 
                className="rounded-lg border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
              />
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
              transition={{ duration: 0.3, delay: 0.3 }}
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
                  
                  {/* Enhanced Template Preview */}
                  <motion.div 
                    className="space-y-4"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                  >
                    <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">{t('templates.templatePreview')}</label>
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border-2 border-dashed border-blue-200">
                      <div className="bg-white rounded-xl p-8 shadow-xl relative overflow-hidden">
                        {/* Enhanced Decorative Corners */}
                        <div className="absolute top-0 left-0 w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-br-2xl"></div>
                        <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-yellow-400 to-orange-500 rounded-bl-2xl"></div>
                        <div className="absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-tr from-yellow-400 to-orange-500 rounded-tr-2xl"></div>
                        <div className="absolute bottom-0 right-0 w-16 h-16 bg-gradient-to-tl from-yellow-400 to-orange-500 rounded-tl-2xl"></div>

                        {/* Enhanced Certificate Content */}
                        <div className="relative z-10 text-center">
                          <motion.div 
                            className="mb-6"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.5 }}
                          >
                            <h3 className="text-2xl font-bold text-gray-800 mb-2">CERTIFICATE</h3>
                            <div className="w-16 h-1 bg-gradient-to-r from-blue-500 to-blue-600 mx-auto rounded-full"></div>
                          </motion.div>

                          <motion.p 
                            className="text-gray-600 mb-4 text-lg"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.6, delay: 0.7 }}
                          >
                            This is to certify that
                          </motion.p>
                          
                          <motion.h4 
                            className="text-2xl font-bold text-gray-800 mb-4"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.6, delay: 0.8 }}
                          >
                            Sample Recipient
                          </motion.h4>
                          
                          <motion.p 
                            className="text-gray-600 mb-6 text-lg"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.6, delay: 0.9 }}
                          >
                            has successfully completed the<br />
                            <span className="font-bold text-xl">{previewTemplate.name}</span>
                          </motion.p>

                          <motion.div 
                            className="grid grid-cols-2 gap-6 text-sm text-gray-600 mb-6"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 1.0 }}
                          >
                            <div className="bg-gray-50 rounded-lg p-3">
                              <p className="font-semibold text-gray-800">Date:</p>
                              <p>December 15, 2024</p>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-3">
                              <p className="font-semibold text-gray-800">Category:</p>
                              <p>{previewTemplate.category}</p>
                            </div>
                          </motion.div>

                          {/* Enhanced QR Code Placeholder */}
                          <motion.div 
                            className="w-16 h-16 bg-gray-200 rounded-xl mx-auto mb-4 flex items-center justify-center"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.6, delay: 1.1 }}
                          >
                            <div className="w-12 h-12 bg-gray-300 rounded grid grid-cols-2 gap-1 p-1">
                              {[...Array(4)].map((_, i) => (
                                <div key={i} className="bg-gray-600 rounded-sm"></div>
                              ))}
                            </div>
                          </motion.div>

                          <motion.p 
                            className="text-sm text-gray-500"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.6, delay: 1.2 }}
                          >
                            Verify at: e-certificate.my.id/verify
                          </motion.p>
                        </div>
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
                        useTemplate(previewTemplate);
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
    </div>
  );
}


