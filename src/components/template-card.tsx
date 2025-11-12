import React, { memo } from 'react';
import { OptimizedTemplateImage } from '@/components/ui/optimized-template-image';
import { Template } from '@/lib/supabase/templates';
import { getOptimizedTemplateUrl, prefetchOnHover } from '@/lib/supabase/template-optimization';
import { debugTemplateImages } from '@/lib/debug/template-debug';
import { RefreshCw, Layout, Settings, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingButton } from '@/components/ui/loading-button';
import { toast } from 'sonner';

interface TemplateCardProps {
  template: Template;
  index: number;
  failedImages: Set<string>;
  loadedImages: Set<string>;
  generatingThumbnails: Set<string>;
  getOptimizedTemplateUrl: (template: Template) => string | null;
  generateThumbnailInBackground: (template: Template) => Promise<void>;
  onPreview: (template: Template) => void;
  onImageError: (templateId: string) => void;
  onImageLoad: (templateId: string) => void;
  onHoverPreload?: (template: Template) => void; // ✅ PHASE 2: Smart preloader
  role: "Admin" | "Team" | "Public";
  templateUsageMap: Map<string, number>;
  canDelete: boolean;
  deletingTemplateId: string | null;
  onEdit: (template: Template) => void;
  onDelete: (templateId: string) => void;
  router: any;
  t: (key: string) => string;
}

const TemplateCard = memo<TemplateCardProps>(({
  template,
  index,
  failedImages,
  loadedImages,
  generatingThumbnails,
  getOptimizedTemplateUrl,
  generateThumbnailInBackground,
  onPreview,
  onImageError,
  onImageLoad,
  onHoverPreload,
  role,
  templateUsageMap,
  canDelete,
  deletingTemplateId,
  onEdit,
  onDelete,
  router,
  t
}) => {
  // ✅ PHASE 2: Enhanced hover preloading with smart preloader
  const handleMouseEnter = () => {
    // Use smart preloader if available, fallback to basic prefetch
    if (onHoverPreload) {
      onHoverPreload(template);
    } else {
      // Fallback: Basic prefetch for backward compatibility
      const previewUrl = getOptimizedTemplateUrl(template);
      if (previewUrl) {
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = previewUrl;
        document.head.appendChild(link);
        
        setTimeout(() => {
          try {
            document.head.removeChild(link);
          } catch (e) {
            // Link may have been removed already
          }
        }, 5000);
      }
    }
  };

  return (
    <div
      onClick={() => onPreview(template)}
      onMouseEnter={handleMouseEnter}
      className="group bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer flex flex-row h-[200px] w-full"
    >
      {/* Template Thumbnail - Left Side */}
      <div className="relative w-[160px] h-full flex-shrink-0 bg-gray-100 dark:bg-gray-900 overflow-hidden border-r border-gray-200 dark:border-gray-700">
        {getOptimizedTemplateUrl(template) && !failedImages.has(template.id) ? (
          <>
            {/* Debug template image status and trigger thumbnail generation */}
            {(() => {
              const debugInfo = debugTemplateImages(template);
              
              // Auto-generate thumbnail if needed (only for first 3 templates to avoid overwhelming)
              if (debugInfo.needsRegeneration && index < 3 && !generatingThumbnails.has(template.id)) {
                console.log(`🚀 Auto-generating thumbnail for priority template: ${template.name}`);
                generateThumbnailInBackground(template);
              }
              
              return null; // Don't render anything, just run debug
            })()}
            <OptimizedTemplateImage
              src={getOptimizedTemplateUrl(template) || ''}
              alt={template.name}
              templateId={template.id}
              size="sm"
              priority={index < 3} // Priority loading for first 3 templates
              className="w-full h-full object-contain"
              onLoad={() => onImageLoad(template.id)}
              onError={() => onImageError(template.id)}
              onHover={() => prefetchOnHover(template)}
              enableProgressiveLoading={true}
              enableIntersectionObserver={index >= 3} // Only lazy load after first 3
            />
            
            {/* Thumbnail generation loading overlay */}
            {generatingThumbnails.has(template.id) && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="text-center text-white">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-1" />
                  <div className="text-xs">Optimizing...</div>
                </div>
              </div>
            )}
          </>
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
          {(template.status === "ready" || ((template.status === undefined || template.status === null || template.status === '') && template.is_layout_configured)) ? (
            <Badge variant="default" className="bg-green-500 hover:bg-green-600 text-white text-xs shadow-sm px-1.5 py-0.5">
              ✓ {t('templates.status.ready')}
            </Badge>
          ) : (
            <Badge variant="secondary" className="bg-yellow-500 hover:bg-yellow-600 text-white text-xs shadow-sm px-1.5 py-0.5">
              {t('templates.status.draft')}
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
        {(role === "Admin" || role === "Team") && (
          <div className="flex items-center gap-1.5 mt-auto pt-2 border-t border-gray-100 dark:border-gray-700 w-full">
            <Button 
              size="sm"
              className="h-7 px-2 text-xs font-medium gradient-primary text-white shadow-sm hover:shadow-md transition-all duration-300 flex-1 min-w-0" 
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/templates/configure?template=${template.id}`);
              }}
            >
              <Settings className="w-3 h-3 mr-1" />
              <span className="truncate">{t('templates.configure')}</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              className="h-7 w-7 p-0 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 flex-shrink-0" 
              onClick={(e) => {
                e.stopPropagation();
                onEdit(template);
              }}
            >
              <Edit className="w-3 h-3" />
            </Button>
            <LoadingButton 
              variant="outline" 
              size="sm"
              className={`h-7 w-7 p-0 border-gray-200 dark:border-gray-700 flex-shrink-0 ${canDelete && !templateUsageMap.has(template.id) ? 'hover:border-red-300 dark:hover:border-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400' : 'opacity-50 cursor-not-allowed'}`}
              onClick={(e) => {
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
              <Trash2 className="w-3 h-3" />
            </LoadingButton>
          </div>
        )}
      </div>
    </div>
  );
});

TemplateCard.displayName = 'TemplateCard';

// Helper function moved here to avoid recreation
const getCategoryColor = (category: string) => {
  const colors = {
    Training: "from-blue-500 to-blue-600",
    Internship: "from-green-500 to-green-600", 
    MoU: "from-purple-500 to-purple-600",
    Visit: "from-orange-500 to-orange-600"
  };
  return colors[category as keyof typeof colors] || "from-gray-500 to-gray-600";
};

export default TemplateCard;
