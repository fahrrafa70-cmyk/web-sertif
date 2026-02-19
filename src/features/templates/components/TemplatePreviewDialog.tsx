"use client";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Layout, Settings } from "lucide-react";
import { getTemplatePreviewUrl } from "@/lib/supabase/templates";
import type { Template } from "@/features/templates/types";
import { useRouter } from "next/navigation";

const getCategoryColor = (category: string) => {
  const colors: Record<string, string> = {
    Training: "from-blue-500 to-blue-600", Internship: "from-green-500 to-green-600",
    MoU: "from-purple-500 to-purple-600", Visit: "from-orange-500 to-orange-600",
  };
  return colors[category] || "from-gray-500 to-gray-600";
};

interface TemplatePreviewDialogProps {
  previewTemplate: Template | null;
  setPreviewTemplate: (t: Template | null) => void;
  role: string | null;
  templateUsageMap: Map<string, number>;
  t: (key: string) => string;
}

export function TemplatePreviewDialog({
  previewTemplate, setPreviewTemplate, role, templateUsageMap, t,
}: TemplatePreviewDialogProps) {
  const router = useRouter();
  return (
    <Dialog open={!!previewTemplate} onOpenChange={(o) => setPreviewTemplate(o ? previewTemplate : null)}>
      <DialogContent
        className="preview-modal-content relative max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-0 animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-4 duration-300"
        onKeyDown={(e) => { if (e.key === "Escape") { e.preventDefault(); setPreviewTemplate(null); } }}
      >
        <DialogHeader className="space-y-1 flex-shrink-0 pb-2 sm:pb-4 px-4 sm:px-6 pt-4 sm:pt-6 border-b border-gray-200 dark:border-gray-700">
          <DialogTitle className="text-xl sm:text-2xl font-bold">{t("templates.preview") || "Template Preview"}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto">
          {previewTemplate && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
              <div className="p-2 sm:p-4 bg-gray-50 dark:bg-gray-900">
                {getTemplatePreviewUrl(previewTemplate) ? (
                  <div className="relative w-full aspect-[4/3] bg-gray-100 dark:bg-gray-900 rounded-lg overflow-hidden">
                    <Image src={getTemplatePreviewUrl(previewTemplate)!} alt={previewTemplate.name} fill className="object-contain border border-gray-200 dark:border-gray-700" unoptimized />
                  </div>
                ) : (
                  <div className="aspect-[4/3] flex items-center justify-center text-gray-500 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
                    <div className="text-center"><Layout className="w-8 h-8 mx-auto mb-2 text-gray-400" /><p className="text-sm">No preview image</p></div>
                  </div>
                )}
              </div>
              <div className="p-4 sm:p-6">
                <div className="space-y-2">
                  <div className="text-xs sm:text-sm text-gray-500">{t("templates.templateNameLabel")}</div>
                  <div className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-900 dark:text-gray-100">{previewTemplate.name}</div>
                </div>
                <div className="mt-4 space-y-1 text-xs sm:text-sm">
                  <div><span className="text-gray-500">{t("templates.categoryLabel")}</span>{" "}<Badge className={`ml-2 bg-gradient-to-r ${getCategoryColor(previewTemplate.category)} text-white text-xs`}>{previewTemplate.category}</Badge></div>
                  <div><span className="text-gray-500">{t("templates.orientationLabel")}</span>{" "}<span className="font-medium">{previewTemplate.orientation}</span></div>
                  <div>
                    <span className="text-gray-500">{t("templates.statusLabel")}</span>{" "}
                    {(previewTemplate.status === "ready" || ((!previewTemplate.status || previewTemplate.status === "") && previewTemplate.is_layout_configured)) ? (
                      <Badge className="ml-2 bg-green-500 hover:bg-green-600 text-white text-xs">✓ {t("templates.status.ready")}</Badge>
                    ) : (
                      <Badge className="ml-2 bg-yellow-500 hover:bg-yellow-600 text-white text-xs">{t("templates.status.draft")}</Badge>
                    )}
                  </div>
                  {previewTemplate.created_at && <div><span className="text-gray-500">{t("templates.createdLabel")}</span>{" "}<span>{new Date(previewTemplate.created_at).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}</span></div>}
                  {previewTemplate.is_dual_template && <div><span className="text-gray-500">{t("templates.typeLabel")}</span>{" "}<span className="font-medium">{t("templates.doubleSidedType")}</span></div>}
                  {templateUsageMap.has(previewTemplate.id) && <div><span className="text-gray-500">{t("templates.usageLabel")}</span>{" "}<span className="font-medium">{t("templates.usedBy").replace("{count}", (templateUsageMap.get(previewTemplate.id) || 0).toString())}</span></div>}
                </div>
                {(role === "owner" || role === "manager") && (
                  <div className="mt-4 sm:mt-6 flex flex-wrap gap-2 sm:gap-3">
                    <Button className="gradient-primary text-white" onClick={() => { router.push(`/templates/configure?template=${previewTemplate.id}`); setPreviewTemplate(null); }}>
                      <Settings className="w-4 h-4 mr-2" />{t("templates.configureLayout")}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
