"use client";

/**
 * Template Layout Configuration Page
 * Simplified interface for configuring template layout (drag-drop, fonts, positions)
 * Does NOT generate certificates - only saves layout configuration to database
 */

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, Check } from "lucide-react";
import { getTemplate, getTemplateImageUrl, saveTemplateLayout } from "@/lib/supabase/templates";
import { Template } from "@/lib/supabase/templates";
import { toast, Toaster } from "sonner";
import type { TemplateLayoutConfig } from "@/types/template-layout";
import { STANDARD_CANVAS_WIDTH, STANDARD_CANVAS_HEIGHT } from "@/lib/constants/canvas";
import Image from "next/image";

function ConfigureLayoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateId = searchParams?.get("template");
  
  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [templateImageUrl, setTemplateImageUrl] = useState<string | null>(null);

  // Load template
  useEffect(() => {
    async function loadTemplate() {
      if (!templateId) {
        toast.error("No template ID provided");
        router.push("/templates");
        return;
      }

      try {
        const tpl = await getTemplate(templateId);
        if (!tpl) {
          toast.error("Template not found");
          router.push("/templates");
          return;
        }

        setTemplate(tpl);
        
        // Load template image
        const imgUrl = await getTemplateImageUrl(tpl);
        setTemplateImageUrl(imgUrl);
        
        setLoading(false);
      } catch (error) {
        console.error("Failed to load template:", error);
        toast.error("Failed to load template");
        router.push("/templates");
      }
    }

    loadTemplate();
  }, [templateId, router]);

  const handleSave = async () => {
    if (!template) return;
    
    setSaving(true);
    
    try {
      // Create dummy layout config for now
      // TODO: Replace with actual drag-drop configuration
      const layoutConfig: TemplateLayoutConfig = {
        certificate: {
          textLayers: [
            {
              id: "name",
              x: 400,
              y: 300,
              xPercent: 400 / STANDARD_CANVAS_WIDTH,
              yPercent: 300 / STANDARD_CANVAS_HEIGHT,
              fontSize: 48,
              color: "#000000",
              fontWeight: "bold",
              fontFamily: "Arial"
            },
            {
              id: "certificate_no",
              x: 100,
              y: 100,
              xPercent: 100 / STANDARD_CANVAS_WIDTH,
              yPercent: 100 / STANDARD_CANVAS_HEIGHT,
              fontSize: 24,
              color: "#000000",
              fontWeight: "normal",
              fontFamily: "Arial"
            },
            {
              id: "issue_date",
              x: 100,
              y: 500,
              xPercent: 100 / STANDARD_CANVAS_WIDTH,
              yPercent: 500 / STANDARD_CANVAS_HEIGHT,
              fontSize: 20,
              color: "#000000",
              fontWeight: "normal",
              fontFamily: "Arial"
            }
          ]
        },
        canvas: {
          width: STANDARD_CANVAS_WIDTH,
          height: STANDARD_CANVAS_HEIGHT
        },
        version: "1.0",
        lastSavedAt: new Date().toISOString()
      };

      await saveTemplateLayout(template.id, layoutConfig);
      
      toast.success("Layout configuration saved successfully!");
      
      // Redirect back to templates page after 1 second
      setTimeout(() => {
        router.push("/templates");
      }, 1000);
      
    } catch (error) {
      console.error("Failed to save layout:", error);
      toast.error("Failed to save layout configuration");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading template...</p>
        </div>
      </div>
    );
  }

  if (!template) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/templates")}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Templates
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Configure Layout: {template.name}
                </h1>
                <p className="text-sm text-gray-500">
                  Set up text positions and styling for Quick Generate
                </p>
              </div>
            </div>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="gradient-primary text-white"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Layout
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Canvas Preview */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Template Preview
              </h2>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
                {templateImageUrl ? (
                  <div className="relative w-full" style={{ aspectRatio: `${STANDARD_CANVAS_WIDTH}/${STANDARD_CANVAS_HEIGHT}` }}>
                    <Image
                      src={templateImageUrl}
                      alt={template.name}
                      fill
                      className="object-contain"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-96">
                    <p className="text-gray-400">No template image</p>
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-4">
                💡 <strong>Coming Soon:</strong> Drag & drop interface to position text layers, adjust fonts, and customize styling.
              </p>
            </div>
          </div>

          {/* Configuration Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Quick Save (Demo)
                </h2>
                <p className="text-sm text-gray-600 mb-4">
                  Click &ldquo;Save Layout&rdquo; to save a demo configuration with default text positions.
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-500 mt-0.5" />
                    <span>Name field (center, large)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-500 mt-0.5" />
                    <span>Certificate number (top-left)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-500 mt-0.5" />
                    <span>Issue date (bottom-left)</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">
                  Template Info
                </h3>
                <dl className="space-y-2 text-sm">
                  <div>
                    <dt className="text-gray-500">Category</dt>
                    <dd className="font-medium text-gray-900">{template.category}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Orientation</dt>
                    <dd className="font-medium text-gray-900">{template.orientation}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Status</dt>
                    <dd>
                      {template.is_layout_configured ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          ✓ Configured
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          ⚠ Not Configured
                        </span>
                      )}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">
                  Next Steps
                </h3>
                <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
                  <li>Save this demo layout</li>
                  <li>Go to Certificates page</li>
                  <li>Click &ldquo;Quick Generate&rdquo;</li>
                  <li>Select this template</li>
                  <li>Generate certificates instantly!</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Toaster position="top-right" richColors />
    </div>
  );
}

export default function ConfigureLayoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading configuration...</p>
        </div>
      </div>
    }>
      <ConfigureLayoutContent />
    </Suspense>
  );
}
