"use client";
import { memo } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingButton } from "@/components/ui/loading-button";
import { Layout, Edit, Trash2, Settings } from "lucide-react";
import { toast } from "sonner";
import type { Template } from "@/features/templates/types";

const getCategoryColor = (category: string) => {
  const colors: Record<string, string> = {
    Training: "from-blue-500 to-blue-600",
    Internship: "from-green-500 to-green-600",
    MoU: "from-purple-500 to-purple-600",
    Visit: "from-orange-500 to-orange-600",
  };
  return colors[category] || "from-gray-500 to-gray-600";
};

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

export const TemplateCard = memo(({
  template, onEdit, onPreview, onConfigure, onDelete,
  getTemplateUrl, isConfiguring, canDelete, templateUsageMap, deletingTemplateId, t,
}: TemplateCardProps) => {
  const imageUrl = getTemplateUrl(template);
  return (
    <div
      className="group bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200 ease-out cursor-pointer flex flex-row h-[200px] w-full transform will-change-transform"
      onClick={() => onPreview(template)}
    >
      {/* Thumbnail */}
      <div className="relative w-[160px] h-full flex-shrink-0 bg-gray-100 dark:bg-gray-900 overflow-hidden border-r border-gray-200 dark:border-gray-700">
        {imageUrl ? (
          <Image src={imageUrl} alt={template.name} width={160} height={200} className="w-full h-full object-contain" sizes="160px" priority={false} loading="lazy" quality={75} />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center"><Layout className="w-8 h-8 text-gray-400 mx-auto mb-2" /><div className="text-xs text-gray-500">No Image</div></div>
          </div>
        )}
        <div className="absolute top-2 left-2 z-10">
          {template.is_layout_configured ? (
            <Badge variant="default" className="bg-green-500 hover:bg-green-600 text-white text-xs shadow-sm px-1.5 py-0.5">✓ Ready</Badge>
          ) : (
            <Badge variant="secondary" className="bg-yellow-500 hover:bg-yellow-600 text-white text-xs shadow-sm px-1.5 py-0.5">Draft</Badge>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 flex flex-col justify-between min-w-0 p-4 w-full overflow-hidden">
        <div className="min-w-0 flex-1 w-full flex flex-col">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mb-2 w-full text-left truncate">{template.name}</h3>
          <div className="mb-2 w-full text-left">
            <span className={`inline-block px-2 py-1 rounded text-xs font-medium bg-gradient-to-r ${getCategoryColor(template.category)} text-white shadow-sm`}>{template.category}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 w-full text-left">
            <div className="flex items-center gap-1"><Layout className="w-3 h-3 flex-shrink-0" /><span className="font-medium text-xs">{template.orientation}</span></div>
            {template.created_at && <><span className="text-gray-400">•</span><span className="text-xs">{new Date(template.created_at).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}</span></>}
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-auto pt-2 border-t border-gray-100 dark:border-gray-700 w-full">
          <LoadingButton size="sm"
            className="h-7 px-2 text-xs font-medium !bg-blue-600 hover:!bg-blue-700 text-white shadow-sm transition-all duration-300 flex-1 min-w-0 relative z-10 pointer-events-auto hover:scale-[1.02] hover:shadow-md"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onConfigure(template.id); }}
            isLoading={isConfiguring} loadingText="Opening...">
            {!isConfiguring && <Settings className="w-3 h-3 mr-1" />}
            <span className="truncate">{isConfiguring ? "Opening..." : "Layout"}</span>
          </LoadingButton>
          <Button variant="outline" size="sm" className="h-7 w-7 p-0 border-gray-200 dark:border-gray-700 flex-shrink-0 relative z-10 pointer-events-auto" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(template); }}>
            <Edit className="w-3 h-3" />
          </Button>
          <LoadingButton variant="outline" size="sm"
            className={`h-7 w-7 p-0 border-gray-200 dark:border-gray-700 flex-shrink-0 relative z-10 pointer-events-auto ${canDelete && !templateUsageMap.has(template.id) ? "" : "opacity-50 cursor-not-allowed"}`}
            onClick={(e) => {
              e.preventDefault(); e.stopPropagation();
              if (canDelete && !templateUsageMap.has(template.id)) { onDelete(template.id); }
              else if (templateUsageMap.has(template.id)) { const count = templateUsageMap.get(template.id) || 0; toast.error(t("templates.cannotDeleteInUse").replace("{name}", template.name).replace("{count}", count.toString())); }
            }}
            disabled={!canDelete || templateUsageMap.has(template.id)}
            isLoading={deletingTemplateId === template.id} loadingText=""
            title={templateUsageMap.has(template.id) ? t("templates.usedBy").replace("{count}", (templateUsageMap.get(template.id) || 0).toString()) : undefined}>
            {deletingTemplateId !== template.id && <Trash2 className="w-3 h-3" />}
          </LoadingButton>
        </div>
      </div>
    </div>
  );
});
TemplateCard.displayName = "TemplateCard";
