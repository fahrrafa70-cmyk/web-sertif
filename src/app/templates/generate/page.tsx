"use client";

import Header from "@/components/header";
import Footer from "@/components/footer";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Download, Eye, FileText } from "lucide-react";
import { useBodyScrollLock } from "@/hooks/use-body-scroll-lock";
import { useLanguage } from "@/contexts/language-context";
import { getTemplate } from "@/lib/supabase/templates";
import { Template } from "@/lib/supabase/templates";

type CertificateData = {
  recipientName: string;
  organization: string;
  program: string;
  issueDate: string;
  expiryDate: string;
  description: string;
  issuerName: string;
  issuerTitle: string;
};

export default function CertificateGeneratorPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateId = searchParams?.get("template");
  
  const [role, setRole] = useState<"Admin" | "Team" | "Public">("Public");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [templateImage, setTemplateImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [certificateData, setCertificateData] = useState<CertificateData>({
    recipientName: "John Doe",
    organization: "Example Organization",
    program: "Professional Training Program",
    issueDate: new Date().toISOString().split('T')[0],
    expiryDate: "",
    description: "This certificate is awarded for successful completion of the program.",
    issuerName: "Dr. Jane Smith",
    issuerTitle: "Program Director"
  });

  // Prevent body scroll when page loads (optional - for consistency)
  useBodyScrollLock(false);

  // Check role and redirect if not authorized
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("ecert-role");
      const normalized = (saved || "").toLowerCase();
      if (["admin","team","public"].includes(normalized)) {
        const mapped = normalized === "admin" ? "Admin" : normalized === "team" ? "Team" : "Public";
        setRole(mapped);
        if (mapped === "Public") {
          router.push("/templates");
          return;
        }
      } else {
        router.push("/templates");
        return;
      }
    } catch {
      router.push("/templates");
      return;
    }
  }, [router]);

  // Find selected template
  useEffect(() => {
    const loadTemplate = async () => {
      if (templateId) {
        try {
          setLoading(true);
          const template = await getTemplate(templateId);
          setSelectedTemplate(template);
          if (template?.image_url) {
            setTemplateImage(template.image_url);
          }
        } catch (error) {
          console.error('Failed to load template:', error);
          setSelectedTemplate(null);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };
    
    loadTemplate();
  }, [templateId]);

  const updateCertificateData = (field: keyof CertificateData, value: string) => {
    setCertificateData(prev => ({ ...prev, [field]: value }));
  };

  const generatePreview = () => {
    // Simulate preview generation
    console.log("Generating preview with data:", certificateData);
  };
  const onUploadTemplate = (file: File | null) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setTemplateImage((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
  };

  const removeTemplateImage = () => {
    setTemplateImage((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  };


  const saveCertificate = () => {
    // Simulate saving certificate
    console.log("Saving certificate:", { template: selectedTemplate, data: certificateData });
    alert("Certificate saved successfully!");
  };

  if (role === "Public") {
    return null; // Will redirect
  }

  if (loading) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="pt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
            <div className="text-center">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                <FileText className="w-12 h-12 text-gray-400" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Loading template...</h1>
              <p className="text-gray-500">Please wait while we load your template.</p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!selectedTemplate) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="pt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Template Not Found</h1>
              <Button onClick={() => router.push("/templates")} className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to {t('templates.title')}
              </Button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Button 
                variant="outline" 
                className="border-gray-300" 
                onClick={() => router.push("/templates")}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to {t('templates.title')}
              </Button>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('generator.title')}</h1>
                <p className="text-gray-500 mt-1">Using template: {selectedTemplate.name}</p>
              </div>
            </div>
          </div>

          {/* Dual Pane Layout - wider left preview (landscape) */}
          <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] lg:grid-cols-[1.7fr_1fr] gap-8 min-h-[720px]">
            {/* Left Section - Certificate Preview */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="bg-white rounded-xl border border-gray-200 shadow-lg p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">{t('generator.preview')}</h2>
                <Button 
                  variant="outline" 
                  className="border-gray-300" 
                  onClick={generatePreview}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Refresh Preview
                </Button>
              </div>
              
              {/* Certificate Display - landscape canvas */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 xl:p-6 border-2 border-dashed border-blue-200 min-h-[560px] xl:min-h-[680px] flex items-center justify-center">
                <div className="bg-white rounded-xl shadow-lg relative overflow-hidden max-w-full w-full aspect-[16/9]">
                  {templateImage ? (
                    <img src={templateImage} alt="Certificate Template" className="absolute inset-0 w-full h-full object-cover" />
                  ) : null}
                  {/* Decorative Corners */}
                  {!templateImage && (
                    <>
                      <div className="absolute top-0 left-0 w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-br-2xl"></div>
                      <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-yellow-400 to-orange-500 rounded-bl-2xl"></div>
                      <div className="absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-tr from-yellow-400 to-orange-500 rounded-tr-2xl"></div>
                      <div className="absolute bottom-0 right-0 w-16 h-16 bg-gradient-to-tl from-yellow-400 to-orange-500 rounded-tl-2xl"></div>
                    </>
                  )}

                  {/* Certificate Content */}
                  <div className="relative z-10 text-center p-6 xl:p-10">
                    <div className="mb-4 xl:mb-6">
                      <h3 className="text-2xl xl:text-3xl font-bold text-gray-800 mb-2">CERTIFICATE</h3>
                      <div className="w-16 xl:w-20 h-1 bg-gradient-to-r from-blue-500 to-blue-600 mx-auto rounded-full"></div>
                    </div>

                    <p className="text-gray-600 mb-3 xl:mb-4">This is to certify that</p>
                    <h4 className="text-xl xl:text-2xl font-bold text-gray-800 mb-3 xl:mb-4">{certificateData.recipientName}</h4>
                    <p className="text-gray-600 mb-6">
                      has successfully completed the<br />
                      <span className="font-semibold">{certificateData.program}</span>
                    </p>

                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-6">
                      <div>
                        <p className="font-semibold">Date:</p>
                        <p>{certificateData.issueDate}</p>
                      </div>
                      <div>
                        <p className="font-semibold">Organization:</p>
                        <p>{certificateData.organization}</p>
                      </div>
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
                </div>
              </div>
            </motion.div>

            {/* Right Section - Input Form */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="bg-white rounded-xl border border-gray-200 shadow-lg p-6"
            >
              <h2 className="text-lg font-semibold text-gray-900 mb-6">{t('generator.recipient')}</h2>
              
              <div className="space-y-4">
                {/* Template Image Uploader */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Template Image</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => onUploadTemplate(e.target.files?.[0] ?? null)}
                      className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                  </div>
                  {templateImage && (
                    <div className="flex items-center gap-3">
                      <img src={templateImage} alt="Template preview" className="w-24 h-16 object-cover rounded border" />
                      <Button variant="outline" className="border-gray-300" onClick={removeTemplateImage}>Remove</Button>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">{t('generator.recipientName')}</label>
                  <Input
                    value={certificateData.recipientName}
                    onChange={(e) => updateCertificateData("recipientName", e.target.value)}
                    placeholder="Enter recipient name"
                    className="border-gray-300"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">{t('generator.organization')}</label>
                  <Input
                    value={certificateData.organization}
                    onChange={(e) => updateCertificateData("organization", e.target.value)}
                    placeholder="Enter organization name"
                    className="border-gray-300"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">{t('generator.courseName')}</label>
                  <Input
                    value={certificateData.program}
                    onChange={(e) => updateCertificateData("program", e.target.value)}
                    placeholder="Enter program name"
                    className="border-gray-300"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">{t('generator.completionDate')}</label>
                    <Input
                      type="date"
                      value={certificateData.issueDate}
                      onChange={(e) => updateCertificateData("issueDate", e.target.value)}
                      className="border-gray-300"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Expiry Date (Optional)</label>
                    <Input
                      type="date"
                      value={certificateData.expiryDate}
                      onChange={(e) => updateCertificateData("expiryDate", e.target.value)}
                      className="border-gray-300"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">{t('generator.notes')}</label>
                  <textarea
                    value={certificateData.description}
                    onChange={(e) => updateCertificateData("description", e.target.value)}
                    placeholder="Enter certificate description"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">{t('generator.instructor')}</label>
                    <Input
                      value={certificateData.issuerName}
                      onChange={(e) => updateCertificateData("issuerName", e.target.value)}
                      placeholder="Enter issuer name"
                      className="border-gray-300"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Issuer Title</label>
                    <Input
                      value={certificateData.issuerTitle}
                      onChange={(e) => updateCertificateData("issuerTitle", e.target.value)}
                      placeholder="Enter issuer title"
                      className="border-gray-300"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-3 pt-4">
                  <Button 
                    className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
                    onClick={generatePreview}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    {t('generator.generate')}
                  </Button>
                  <Button 
                    className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
                    onClick={saveCertificate}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    {t('generator.download')}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
