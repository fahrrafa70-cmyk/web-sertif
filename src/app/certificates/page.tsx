"use client";

import Header from "@/components/header";
import Footer from "@/components/footer";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEffect, useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useLanguage } from "@/contexts/language-context";
import { useCertificates } from "@/hooks/use-certificates";
import { Certificate } from "@/lib/supabase/certificates";
import { Eye, Edit, Trash2, FileText } from "lucide-react";
import { toast, Toaster } from "sonner";
import { getTemplate, getTemplateImageUrl, Template } from "@/lib/supabase/templates";
import Image from "next/image";

export default function CertificatesPage() {
  const { t } = useLanguage();
  const params = useSearchParams();
  const certQuery = (params?.get("cert") || "").toLowerCase();
  const [role, setRole] = useState<"Admin" | "Team" | "Public">("Public");
  const [searchInput, setSearchInput] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  // Use certificates hook for Supabase integration
  const { certificates, loading, error, update, delete: deleteCertificate, refresh } = useCertificates();

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("ecert-role");
      if (saved === "Admin" || saved === "Team" || saved === "Public") setRole(saved);
    } catch {}
  }, []);

  const filtered = useMemo(() => {
    let filteredCerts = certificates;
    
    // Search filter
    const searchQuery = (searchInput || certQuery).toLowerCase();
    if (searchQuery) {
      filteredCerts = filteredCerts.filter((cert) =>
        cert.certificate_no.toLowerCase().includes(searchQuery) ||
        cert.name.toLowerCase().includes(searchQuery) ||
        (cert.description && cert.description.toLowerCase().includes(searchQuery))
      );
    }
    
    // Category filter
    if (categoryFilter) {
      filteredCerts = filteredCerts.filter((cert) => cert.category === categoryFilter);
    }
    
    // Date filter
    if (dateFilter) {
      filteredCerts = filteredCerts.filter((cert) => cert.issue_date === dateFilter);
    }
    
    return filteredCerts;
  }, [certificates, searchInput, certQuery, categoryFilter, dateFilter]);

  const [isEditOpen, setIsEditOpen] = useState<null | string>(null);
  const [draft, setDraft] = useState<Certificate | null>(null);
  const [previewCertificate, setPreviewCertificate] = useState<Certificate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [deletingCertificateId, setDeletingCertificateId] = useState<string | null>(null);
  const canDelete = role === "Admin"; // Team cannot delete

  function openEdit(certificate: Certificate) {
    setDraft({ ...certificate });
    setIsEditOpen(certificate.id);
  }

  async function submitEdit() {
    if (!draft || !isEditOpen) return;
    
    try {
      await update(isEditOpen, {
        certificate_no: draft.certificate_no,
        name: draft.name,
        description: draft.description || undefined,
        issue_date: draft.issue_date,
        expired_date: draft.expired_date || undefined,
        qr_code: draft.qr_code || undefined,
        category: draft.category || undefined
      });
      
      toast.success("Certificate updated successfully!");
      setIsEditOpen(null);
      setDraft(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update certificate");
    }
  }

  async function requestDelete(id: string) {
    if (!canDelete) {
      toast.error("You don't have permission to delete certificates");
      return;
    }
    
    const certificate = certificates.find(c => c.id === id);
    const certificateName = certificate?.name || 'this certificate';
    
    if (confirm(`Are you sure you want to delete certificate for "${certificateName}"? This action cannot be undone.`)) {
      try {
        setDeletingCertificateId(id);
        await deleteCertificate(id);
        toast.success(`Certificate for "${certificateName}" deleted successfully!`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to delete certificate");
      } finally {
        setDeletingCertificateId(null);
      }
    }
  }

  async function openPreview(certificate: Certificate) {
    setPreviewCertificate(certificate);
    
    // Load template if available
    if (certificate.template_id) {
      try {
        const template = await getTemplate(certificate.template_id);
        setPreviewTemplate(template);
      } catch (error) {
        console.error("Failed to load template:", error);
        setPreviewTemplate(null);
      }
    } else {
      setPreviewTemplate(null);
    }
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-16">
        <section className="bg-white py-14">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('certificates.title')}</h1>
                <p className="text-gray-500 mt-1">{t('certificates.subtitle')}</p>
              </div>
              <div className="flex items-center gap-3">
                <Input placeholder={t('certificates.search')} className="w-64" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
                <select 
                  value={categoryFilter} 
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-48 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                <Input placeholder="Filter by date" className="w-40" type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
              </div>
            </div>

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
                <h3 className="text-xl font-semibold text-gray-600 mb-2">Loading certificates...</h3>
                <p className="text-gray-500">Please wait while we fetch your certificates.</p>
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
                <h3 className="text-xl font-semibold text-red-600 mb-2">Error loading certificates</h3>
                <p className="text-red-500 mb-6">{error}</p>
                <Button 
                  onClick={() => refresh()} 
                  className="gradient-primary text-white shadow-lg hover:shadow-xl"
                >
                  Try Again
                </Button>
              </motion.div>
            )}

            {/* Certificates Table */}
            {!loading && !error && (
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }} className="mt-8 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <Table>
                  <TableCaption>Dynamic certificate data from database</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('certificates.certificateId')}</TableHead>
                      <TableHead>{t('certificates.recipient')}</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>{t('certificates.issuedDate')}</TableHead>
                      <TableHead>Expiry Date</TableHead>
                      <TableHead className="text-right">{t('certificates.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((certificate) => (
                      <TableRow key={certificate.id}>
                        <TableCell className="font-medium">{certificate.certificate_no}</TableCell>
                        <TableCell>{certificate.name}</TableCell>
                        <TableCell>{certificate.category || '—'}</TableCell>
                        <TableCell>{new Date(certificate.issue_date).toLocaleDateString()}</TableCell>
                        <TableCell>{certificate.expired_date ? new Date(certificate.expired_date).toLocaleDateString() : '—'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="outline" 
                              className="border-gray-300" 
                              onClick={() => openPreview(certificate)}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              {t('common.preview')}
                            </Button>
                            {(role === "Admin" || role === "Team") && (
                              <Button 
                                variant="outline" 
                                className="border-gray-300" 
                                onClick={() => openEdit(certificate)}
                              >
                                <Edit className="w-4 h-4 mr-1" />
                                {t('common.edit')}
                              </Button>
                            )}
                            {canDelete ? (
                              <Button 
                                className="bg-gradient-to-r from-orange-500 to-red-500 text-white" 
                                onClick={() => requestDelete(certificate.id)}
                                disabled={deletingCertificateId === certificate.id}
                              >
                                {deletingCertificateId === certificate.id ? (
                                  <>
                                    <div className="w-4 h-4 mr-1 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Deleting...
                                  </>
                                ) : (
                                  <>
                                    <Trash2 className="w-4 h-4 mr-1" />
                                    {t('common.delete')}
                                  </>
                                )}
                              </Button>
                            ) : (
                              <Button variant="outline" className="border-gray-300 opacity-50 cursor-not-allowed" aria-disabled>
                                <Trash2 className="w-4 h-4 mr-1" />
                                {t('common.delete')}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
                <h3 className="text-xl font-semibold text-gray-600 mb-2">No certificates found</h3>
                <p className="text-gray-500 mb-6">Try adjusting your search criteria or create a new certificate.</p>
                {(role === "Admin" || role === "Team") && (
                  <Button 
                    onClick={() => window.location.href = "/templates"} 
                    className="gradient-primary text-white shadow-lg hover:shadow-xl"
                  >
                    <FileText className="w-5 h-5 mr-2" />
                    Create Certificate
                  </Button>
                )}
              </motion.div>
            )}
          </div>
        </section>
      </main>
      <Footer />

      {/* Edit Certificate Sheet */}
      <Sheet open={!!isEditOpen} onOpenChange={(o) => setIsEditOpen(o ? isEditOpen : null)}>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>{t('common.edit')} {t('certificates.title')}</SheetTitle>
            <SheetDescription>Update certificate details.</SheetDescription>
          </SheetHeader>
          <div className="p-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-gray-600">Certificate Number</label>
              <Input value={draft?.certificate_no ?? ""} onChange={(e) => setDraft((d) => (d ? { ...d, certificate_no: e.target.value } : d))} />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-600">{t('certificates.recipient')}</label>
              <Input value={draft?.name ?? ""} onChange={(e) => setDraft((d) => (d ? { ...d, name: e.target.value } : d))} />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-600">Description</label>
              <textarea
                value={draft?.description ?? ""}
                onChange={(e) => setDraft((d) => (d ? { ...d, description: e.target.value } : d))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-600">Category</label>
              <select 
                value={draft?.category ?? ""} 
                onChange={(e) => setDraft((d) => (d ? { ...d, category: e.target.value } : d))} 
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-600">{t('certificates.issuedDate')}</label>
              <Input type="date" value={draft?.issue_date ?? ""} onChange={(e) => setDraft((d) => (d ? { ...d, issue_date: e.target.value } : d))} />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-600">Expiry Date</label>
              <Input type="date" value={draft?.expired_date ?? ""} onChange={(e) => setDraft((d) => (d ? { ...d, expired_date: e.target.value } : d))} />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-600">QR Code</label>
              <Input value={draft?.qr_code ?? ""} onChange={(e) => setDraft((d) => (d ? { ...d, qr_code: e.target.value } : d))} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" className="border-gray-300" onClick={() => setIsEditOpen(null)}>{t('common.cancel')}</Button>
              <Button className="bg-gradient-to-r from-orange-500 to-red-500 text-white" onClick={submitEdit}>{t('common.save')}</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Certificate Preview Modal */}
      <Dialog open={!!previewCertificate} onOpenChange={(o) => setPreviewCertificate(o ? previewCertificate : null)}>
        <DialogContent className="preview-modal-content max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gradient">Certificate Preview</DialogTitle>
            <DialogDescription className="text-lg">View certificate details and information</DialogDescription>
          </DialogHeader>
          <div className="space-y-8">
            {previewCertificate && (
              <>
                {/* Certificate Info */}
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
                      <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Certificate Number</label>
                      <div className="text-2xl font-bold text-gray-900">{previewCertificate.certificate_no}</div>
                    </motion.div>
                    
                    <motion.div 
                      className="space-y-3"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: 0.2 }}
                    >
                      <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Recipient Name</label>
                      <div className="text-2xl font-bold text-gray-900">{previewCertificate.name}</div>
                    </motion.div>
                    
                    {previewCertificate.category && (
                      <motion.div 
                        className="space-y-3"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4, delay: 0.3 }}
                      >
                        <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Category</label>
                        <div className="inline-block px-4 py-2 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium">
                          {previewCertificate.category}
                        </div>
                      </motion.div>
                    )}
                    
                    {previewCertificate.description && (
                      <motion.div 
                        className="space-y-3"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4, delay: 0.4 }}
                      >
                        <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Description</label>
                        <div className="text-gray-700 leading-relaxed">
                          {previewCertificate.description}
                        </div>
                      </motion.div>
                    )}
                    
                    <motion.div 
                      className="grid grid-cols-2 gap-4"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: 0.5 }}
                    >
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Issue Date</label>
                        <div className="text-lg text-gray-700">
                          {new Date(previewCertificate.issue_date).toLocaleDateString()}
                        </div>
                      </div>
                      {previewCertificate.expired_date && (
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Expiry Date</label>
                          <div className="text-lg text-gray-700">
                            {new Date(previewCertificate.expired_date).toLocaleDateString()}
                          </div>
                        </div>
                      )}
                    </motion.div>
                    
                    {previewCertificate.qr_code && (
                      <motion.div 
                        className="space-y-3"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4, delay: 0.6 }}
                      >
                        <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">QR Code</label>
                        <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg break-all">
                          {previewCertificate.qr_code}
                        </div>
                      </motion.div>
                    )}
                  </div>
                  
                  {/* Certificate Preview */}
                  <motion.div 
                    className="space-y-4"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                  >
                    <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Certificate Preview</label>
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border-2 border-dashed border-blue-200">
                      <div 
                        className="bg-white rounded-xl shadow-xl relative overflow-hidden"
                        style={{
                          width: '100%',
                          maxWidth: '800px',
                          aspectRatio: '800/600', // FIX: Maintain consistent aspect ratio
                          margin: '0 auto'
                        }}
                      >
                        {/* FIX: Show merged certificate image with consistent aspect ratio */}
                        {previewCertificate.certificate_image_url ? (
                          <Image 
                            src={previewCertificate.certificate_image_url} 
                            alt="Certificate" 
                            fill
                            className="object-cover absolute inset-0" 
                            style={{ objectFit: 'cover' }}
                          />
                        ) : (
                          <>
                            {/* FIX: Template Image with consistent aspect ratio */}
                            {previewTemplate && getTemplateImageUrl(previewTemplate) ? (
                              <Image 
                                src={getTemplateImageUrl(previewTemplate)!} 
                                alt="Certificate Template" 
                                fill
                                className="object-cover absolute inset-0" 
                                style={{ objectFit: 'cover' }}
                              />
                            ) : (
                              <>
                                {/* Decorative Corners */}
                                <div className="absolute top-0 left-0 w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-br-2xl"></div>
                                <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-yellow-400 to-orange-500 rounded-bl-2xl"></div>
                                <div className="absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-tr from-yellow-400 to-orange-500 rounded-tr-2xl"></div>
                                <div className="absolute bottom-0 right-0 w-16 h-16 bg-gradient-to-tl from-yellow-400 to-orange-500 rounded-tl-2xl"></div>
                              </>
                            )}

                            {/* FIX: Text Layers with consistent positioning using normalized coordinates */}
                            {previewCertificate.text_layers && previewCertificate.text_layers.map((layer: { id: string; text: string; x: number; y: number; xPercent: number; yPercent: number; fontSize: number; color: string; fontWeight: string; fontFamily: string }) => {
                              // Use normalized coordinates for consistent positioning
                              const actualX = layer.xPercent * 100 + '%';
                              const actualY = layer.yPercent * 100 + '%';
                              
                              return (
                                <div
                                  key={layer.id}
                                  className="absolute select-none"
                                  style={{
                                    left: actualX,
                                    top: actualY,
                                    fontSize: layer.fontSize,
                                    color: layer.color,
                                    fontWeight: layer.fontWeight,
                                    fontFamily: layer.fontFamily,
                                    userSelect: 'none',
                                    pointerEvents: 'none'
                                  }}
                                >
                                  {layer.text}
                                </div>
                              );
                            })}

                            {/* Fallback Certificate Content - Only show if no text layers */}
                            {(!previewCertificate.text_layers || previewCertificate.text_layers.length === 0) && (
                              <div className="relative z-10 text-center p-6 xl:p-10">
                                <div className="mb-4 xl:mb-6">
                                  <h3 className="text-2xl xl:text-3xl font-bold text-gray-800 mb-2">CERTIFICATE</h3>
                                  <div className="w-16 xl:w-20 h-1 bg-gradient-to-r from-blue-500 to-blue-600 mx-auto rounded-full"></div>
                                </div>

                                <p className="text-gray-600 mb-3 xl:mb-4">This is to certify that</p>
                                <h4 className="text-xl xl:text-2xl font-bold text-gray-800 mb-3 xl:mb-4">{previewCertificate.name}</h4>
                                {previewCertificate.description && (
                                  <p className="text-gray-600 mb-6">
                                    has successfully completed the<br />
                                    <span className="font-semibold">{previewCertificate.description}</span>
                                  </p>
                                )}

                                <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-6">
                                  <div>
                                    <p className="font-semibold">Certificate No:</p>
                                    <p>{previewCertificate.certificate_no}</p>
                                  </div>
                                  <div>
                                    <p className="font-semibold">Issue Date:</p>
                                    <p>{new Date(previewCertificate.issue_date).toLocaleDateString()}</p>
                                  </div>
                                  {previewCertificate.expired_date && (
                                    <div>
                                      <p className="font-semibold">Expiry Date:</p>
                                      <p>{new Date(previewCertificate.expired_date).toLocaleDateString()}</p>
                                    </div>
                                  )}
                                </div>

                                {/* QR Code Placeholder */}
                                <div className="w-16 h-16 bg-gray-200 rounded-lg mx-auto mb-4 flex items-center justify-center">
                                  <div className="w-12 h-12 bg-gray-300 rounded grid grid-cols-3 gap-1 p-1">
                                    {[...Array(9)].map((_, i) => (
                                      <div key={i} className="bg-gray-600 rounded-sm"></div>
                                    ))}
                                  </div>
                                </div>

                                <p className="text-xs text-gray-500">Verify at: e-certificate.my.id/verify</p>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </motion.div>
                </motion.div>

                {/* Action Buttons */}
                <motion.div 
                  className="flex justify-end gap-4 pt-6 border-t border-gray-200"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.6 }}
                >
                  <Button 
                    variant="outline" 
                    className="border-gray-300 hover:border-gray-400 px-6" 
                    onClick={() => setPreviewCertificate(null)}
                  >
                    Close
                  </Button>
                  {(role === "Admin" || role === "Team") && (
                    <Button 
                      variant="outline" 
                      className="border-blue-300 text-blue-600 hover:bg-blue-50 px-6" 
                      onClick={() => {
                        setPreviewCertificate(null);
                        openEdit(previewCertificate);
                      }}
                    >
                      Edit Certificate
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


