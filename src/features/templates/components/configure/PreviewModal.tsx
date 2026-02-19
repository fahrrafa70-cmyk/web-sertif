"use client";
import Image from "next/image";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { STANDARD_CANVAS_WIDTH, STANDARD_CANVAS_HEIGHT } from "@/lib/constants/canvas";
import { DUMMY_DATA } from "@/features/templates/hooks/useConfigurePage";
import type { Template } from "@/lib/supabase/templates";
import type { TextLayer } from "@/features/templates/hooks/useConfigurePage";

interface PreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: Template;
  templateImageUrl: string | null;
  templateImageDimensions: { width: number; height: number } | null;
  textLayers: TextLayer[];
  previewTexts: Record<string, string>;
  t: (key: string) => string;
}

export function PreviewModal({
  open, onOpenChange, template, templateImageUrl,
  templateImageDimensions, textLayers, previewTexts, t
}: PreviewModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto p-3 sm:p-6 animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-4 duration-300">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">
            {t('configure.templatePreview')}
          </DialogTitle>
        </DialogHeader>

        {/* Template Information */}
        <div className="mt-3 sm:mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('configure.templateName')}</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{template.name}</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('configure.category')}</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{template.category || '-'}</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('configure.format')}</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{template.orientation || '-'}</p>
          </div>
        </div>

        {/* Preview Canvas */}
        <div className="mt-3 sm:mt-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 sm:mb-3">{t('configure.previewTemplate')}</h3>
          <div
            className="relative border-2 border-gray-300 dark:border-gray-700 rounded-lg bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 overflow-hidden mx-auto"
            style={{
              width: '100%',
              aspectRatio: templateImageDimensions
                ? `${templateImageDimensions.width}/${templateImageDimensions.height}`
                : `${STANDARD_CANVAS_WIDTH}/${STANDARD_CANVAS_HEIGHT}`,
              maxWidth: '800px',
              cursor: 'default',
              userSelect: 'none',
              WebkitUserSelect: 'none',
              MozUserSelect: 'none',
              msUserSelect: 'none',
            }}
          >
            {/* Template Background */}
            {templateImageUrl && (
              <div className="absolute inset-0" style={{ userSelect: 'none', pointerEvents: 'none' }}>
                <Image
                  src={templateImageUrl}
                  alt={template.name}
                  fill
                  className="object-contain"
                  style={{ userSelect: 'none', pointerEvents: 'none' }}
                  unoptimized
                  draggable={false}
                />
              </div>
            )}

            {/* Text Layers */}
            {textLayers.filter(layer => layer.visible !== false).map(layer => {
              const text = previewTexts[layer.id] ||
                           layer.defaultText ||
                           DUMMY_DATA[layer.id as keyof typeof DUMMY_DATA] ||
                           layer.id;

              const getTransform = () => {
                if (layer.id === 'certificate_no' || layer.id === 'issue_date') return 'translate(0%, -50%)';
                const align = layer.textAlign || 'left';
                if (align === 'center') return 'translate(-50%, -50%)';
                if (align === 'right') return 'translate(-100%, -50%)';
                return 'translate(0%, -50%)';
              };

              const templateWidth = templateImageDimensions?.width || STANDARD_CANVAS_WIDTH;
              const templateHeight = templateImageDimensions?.height || STANDARD_CANVAS_HEIGHT;
              const templateScale = templateWidth / STANDARD_CANVAS_WIDTH;

              const leftPercent = layer.xPercent !== undefined && layer.xPercent !== null
                ? layer.xPercent * 100
                : (layer.x / templateWidth) * 100;
              const topPercent = layer.yPercent !== undefined && layer.yPercent !== null
                ? layer.yPercent * 100
                : (layer.y / templateHeight) * 100;

              return (
                <div
                  key={layer.id}
                  className="absolute"
                  style={{ left: `${leftPercent}%`, top: `${topPercent}%`, transform: getTransform(), zIndex: 1 }}
                >
                  <div
                    className="relative"
                    style={{
                      fontSize: `${layer.fontSize * templateScale}px`,
                      color: layer.color,
                      fontWeight: layer.fontWeight,
                      fontFamily: layer.fontFamily,
                      fontStyle: (() => {
                        const style = layer.fontStyle || 'normal';
                        const isDecoration = style === 'underline' || style === 'line-through' || style === 'overline';
                        return isDecoration ? 'normal' : style;
                      })(),
                      textDecoration: (() => {
                        const style = layer.fontStyle || 'normal';
                        const isDecoration = style === 'underline' || style === 'line-through' || style === 'overline';
                        return isDecoration ? style : (layer.textDecoration || 'none');
                      })(),
                      textAlign: (layer.id === 'certificate_no' || layer.id === 'issue_date') ? 'left' : (layer.textAlign || 'left'),
                      whiteSpace: layer.maxWidth ? 'normal' : 'nowrap',
                      width: layer.maxWidth ? `${layer.maxWidth * templateScale}px` : 'auto',
                      minHeight: `${(layer.fontSize * (layer.lineHeight || 1.2)) * templateScale}px`,
                      lineHeight: layer.lineHeight || 1.2,
                      wordWrap: 'break-word',
                      letterSpacing: layer.letterSpacing ? `${layer.letterSpacing * templateScale}px` : undefined,
                      overflowWrap: 'break-word',
                      userSelect: 'none',
                    }}
                  >
                    {text}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
