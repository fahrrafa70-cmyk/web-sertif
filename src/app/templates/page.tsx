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
      if (saved === "Admin" || saved === "Team" || saved === "Public") setRole(saved);
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
  
  // NO SCROLL LOCKING - Use pure overlay approach to prevent layout shifts

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

  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-16">
        <section className="bg-white py-14">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('templates.title')}</h1>
                <p className="text-gray-500 mt-1">{t('templates.subtitle')}</p>
              </div>
              <div className="flex items-center gap-3">
                <Input placeholder={t('templates.search')} className="w-64" value={query} onChange={(e) => setQuery(e.target.value)} />
                {(role === "Admin" || role === "Team") && (
                  <Button onClick={openCreate} className="bg-gradient-to-r from-orange-500 to-red-500 text-white">{t('templates.create')}</Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-8">
              {filtered.map((tpl, idx) => (
                <motion.div
                  key={tpl.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: idx * 0.05 }}
                  className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="aspect-video rounded-lg bg-gray-50 border border-dashed border-gray-200 mb-4" />
                  <div className="space-y-1">
                    <div className="text-lg font-semibold text-gray-900">{tpl.name}</div>
                    <div className="text-sm text-gray-500">{t('templates.orientation')}: {tpl.orientation}</div>
                    <div className="text-sm text-gray-500">{t('templates.category')}: {tpl.category}</div>
                  </div>
                  <div className="mt-4 flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <Button variant="outline" className="border-gray-300 flex-1" onClick={() => openPreview(tpl)}>{t('templates.preview')}</Button>
                      {(role === "Admin" || role === "Team") && (
                        <Button 
                          className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white flex-1" 
                          onClick={() => useTemplate(tpl)}
                        >
                          Use This Template
                        </Button>
                      )}
                    </div>
                    {(role === "Admin" || role === "Team") && (
                      <div className="flex items-center gap-2">
                        <Button variant="outline" className="border-gray-300 flex-1" onClick={() => openEdit(tpl)}>{t('common.edit')}</Button>
                        {canDelete ? (
                          <Button variant="outline" className="border-gray-300 flex-1" onClick={() => requestDelete(tpl.id)}>{t('common.delete')}</Button>
                        ) : (
                          <Button variant="outline" className="border-gray-300 opacity-50 cursor-not-allowed flex-1" aria-disabled>
                            {t('common.delete')}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />

      {/* Create Template Sheet - portal, does not affect layout */}
      <Sheet open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>Create Template</SheetTitle>
            <SheetDescription>Define the basic details of your template.</SheetDescription>
          </SheetHeader>
          <div className="p-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-gray-600">Name</label>
              <Input value={draft?.name ?? ""} onChange={(e) => setDraft((d) => (d ? { ...d, name: e.target.value } : d))} />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-600">Category</label>
              <Input value={draft?.category ?? ""} onChange={(e) => setDraft((d) => (d ? { ...d, category: e.target.value } : d))} />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-600">Orientation</label>
              <div className="flex gap-2">
                <Button variant={draft?.orientation === "Landscape" ? "default" : "outline"} onClick={() => setDraft((d) => (d ? { ...d, orientation: "Landscape" } : d))}>Landscape</Button>
                <Button variant={draft?.orientation === "Portrait" ? "default" : "outline"} onClick={() => setDraft((d) => (d ? { ...d, orientation: "Portrait" } : d))}>Portrait</Button>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" className="border-gray-300" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button className="bg-gradient-to-r from-orange-500 to-red-500 text-white" onClick={submitCreate}>Create</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Edit Template Sheet - portal */}
      <Sheet open={!!isEditOpen} onOpenChange={(o) => setIsEditOpen(o ? isEditOpen : null)}>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>Edit Template</SheetTitle>
            <SheetDescription>Update template details.</SheetDescription>
          </SheetHeader>
          <div className="p-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-gray-600">Name</label>
              <Input value={draft?.name ?? ""} onChange={(e) => setDraft((d) => (d ? { ...d, name: e.target.value } : d))} />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-600">Category</label>
              <Input value={draft?.category ?? ""} onChange={(e) => setDraft((d) => (d ? { ...d, category: e.target.value } : d))} />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-600">Orientation</label>
              <div className="flex gap-2">
                <Button variant={draft?.orientation === "Landscape" ? "default" : "outline"} onClick={() => setDraft((d) => (d ? { ...d, orientation: "Landscape" } : d))}>Landscape</Button>
                <Button variant={draft?.orientation === "Portrait" ? "default" : "outline"} onClick={() => setDraft((d) => (d ? { ...d, orientation: "Portrait" } : d))}>Portrait</Button>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" className="border-gray-300" onClick={() => setIsEditOpen(null)}>Cancel</Button>
              <Button className="bg-gradient-to-r from-orange-500 to-red-500 text-white" onClick={submitEdit}>Save Changes</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Preview Modal - Compact and Overlay */}
      <Dialog open={!!previewTemplate} onOpenChange={(o) => setPreviewTemplate(o ? previewTemplate : null)}>
        <DialogContent className="preview-modal-content max-w-2xl w-full max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('templates.templatePreview')}</DialogTitle>
            <DialogDescription>{t('templates.templateDetails')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {previewTemplate && (
              <>
                {/* Template Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-600">{t('templates.name')}</label>
                      <div className="text-lg font-semibold text-gray-900">{previewTemplate.name}</div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-600">{t('templates.category')}</label>
                      <div className="text-gray-700">{previewTemplate.category}</div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-600">{t('templates.orientation')}</label>
                      <div className="text-gray-700">{previewTemplate.orientation}</div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-600">{t('templates.description')}</label>
                      <div className="text-gray-700 text-sm leading-relaxed">
                        This is a professional {previewTemplate.category.toLowerCase()} certificate template designed for {previewTemplate.orientation.toLowerCase()} orientation. 
                        Perfect for recognizing achievements, completions, and accomplishments in {previewTemplate.category.toLowerCase()} programs.
                      </div>
                    </div>
                  </div>
                  
                  {/* Template Preview */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-600">{t('templates.templatePreview')}</label>
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 border-2 border-dashed border-blue-200">
                      <div className="bg-white rounded-xl p-6 shadow-lg relative overflow-hidden">
                        {/* Decorative Corners */}
                        <div className="absolute top-0 left-0 w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-br-xl"></div>
                        <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-bl from-yellow-400 to-orange-500 rounded-bl-xl"></div>
                        <div className="absolute bottom-0 left-0 w-12 h-12 bg-gradient-to-tr from-yellow-400 to-orange-500 rounded-tr-xl"></div>
                        <div className="absolute bottom-0 right-0 w-12 h-12 bg-gradient-to-tl from-yellow-400 to-orange-500 rounded-tl-xl"></div>

                        {/* Certificate Content */}
                        <div className="relative z-10 text-center">
                          <div className="mb-4">
                            <h3 className="text-lg font-bold text-gray-800 mb-1">CERTIFICATE</h3>
                            <div className="w-12 h-1 bg-gradient-to-r from-blue-500 to-blue-600 mx-auto rounded-full"></div>
                          </div>

                          <p className="text-gray-600 mb-3 text-sm">This is to certify that</p>
                          <h4 className="text-lg font-bold text-gray-800 mb-3">Sample Recipient</h4>
                          <p className="text-gray-600 mb-4 text-sm">
                            has successfully completed the<br />
                            <span className="font-semibold">{previewTemplate.name}</span>
                          </p>

                          <div className="grid grid-cols-2 gap-3 text-xs text-gray-600 mb-4">
                            <div>
                              <p className="font-semibold">Date:</p>
                              <p>December 15, 2024</p>
                            </div>
                            <div>
                              <p className="font-semibold">Category:</p>
                              <p>{previewTemplate.category}</p>
                            </div>
                          </div>

                          {/* QR Code Placeholder */}
                          <div className="w-12 h-12 bg-gray-200 rounded-lg mx-auto mb-3 flex items-center justify-center">
                            <div className="w-8 h-8 bg-gray-300 rounded grid grid-cols-2 gap-1 p-1">
                              {[...Array(4)].map((_, i) => (
                                <div key={i} className="bg-gray-600 rounded-sm"></div>
                              ))}
                            </div>
                          </div>

                          <p className="text-xs text-gray-500">Verify at: e-certificate.my.id/verify</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                  <Button variant="outline" className="border-gray-300" onClick={() => setPreviewTemplate(null)}>
                    Close
                  </Button>
                  {(role === "Admin" || role === "Team") && (
                    <Button 
                      className="bg-gradient-to-r from-orange-500 to-red-500 text-white" 
                      onClick={() => {
                        setPreviewTemplate(null);
                        useTemplate(previewTemplate);
                      }}
                    >
                      Use This Template
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


