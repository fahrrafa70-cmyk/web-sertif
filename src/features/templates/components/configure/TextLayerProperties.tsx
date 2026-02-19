"use client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { STANDARD_CANVAS_WIDTH, STANDARD_CANVAS_HEIGHT } from "@/lib/constants/canvas";
import { plainTextToRichText, applyStyleToRange, richTextToPlainText, getCommonStyleValue, hasMixedStyle, type TextSpan } from "@/types/rich-text";
import { RichTextEditor } from "@/components/editor/RichTextEditor";
import {
  FontWeightSelect,
  FontFamilySelect,
  FontStyleSelect,
} from "@/components/editor/MixedStyleSelect";
import type { TextLayer } from "@/features/templates/hooks/useConfigurePage";

interface TextLayerPropertiesProps {
  selectedLayer: TextLayer;
  templateImageDimensions: { width: number; height: number } | null;
  richTextSelection: { start: number; end: number };
  setRichTextSelection: (sel: { start: number; end: number }) => void;
  updateLayer: (id: string, updates: Partial<TextLayer>) => void;
  setPreviewTexts: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  t: (key: string) => string;
}

export function TextLayerProperties({
  selectedLayer, templateImageDimensions, richTextSelection,
  setRichTextSelection, updateLayer, setPreviewTexts, t
}: TextLayerPropertiesProps) {
  return (
    <div className="border-t border-gray-200 dark:border-gray-800 pt-3 sm:pt-4">
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <h3 className="text-[10px] sm:text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide truncate">
          {selectedLayer.id}
        </h3>
      </div>
      <div className="space-y-2 sm:space-y-3">
        {/* Default Text with Rich Text Formatting - For custom layers only */}
        {!['name', 'certificate_no', 'issue_date'].includes(selectedLayer.id) && (
          <div className="bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-900/40 rounded-lg p-2 sm:p-3 space-y-2">
            <div className="flex items-center justify-between mb-1.5 sm:mb-2">
              <Label className="text-[10px] sm:text-xs font-semibold text-green-900 dark:text-green-300">{t('configure.defaultText')}</Label>
              <label className="flex items-center gap-1 sm:gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedLayer.useDefaultText || false}
                  onChange={(e) => updateLayer(selectedLayer.id, { useDefaultText: e.target.checked })}
                  className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-green-600 rounded border-green-300 dark:border-green-500"
                />
                <span className="text-[10px] sm:text-xs text-green-900 dark:text-green-300">{t('configure.use')}</span>
              </label>
            </div>
            <RichTextEditor
              value={selectedLayer.richText || plainTextToRichText(selectedLayer.defaultText || '', {
                fontWeight: selectedLayer.fontWeight,
                fontFamily: selectedLayer.fontFamily,
                color: selectedLayer.color
              })}
              defaultStyle={{
                fontWeight: selectedLayer.fontWeight,
                fontFamily: selectedLayer.fontFamily,
                fontSize: selectedLayer.fontSize,
                color: selectedLayer.color
              }}
              onChange={(richText) => {
                const plainText = richTextToPlainText(richText);
                updateLayer(selectedLayer.id, { richText, defaultText: plainText, hasInlineFormatting: true });
                setPreviewTexts(prev => ({ ...prev, [selectedLayer.id]: plainText }));
              }}
              onSelectionChange={(start, end) => setRichTextSelection({ start, end })}
              className="h-auto min-h-[28px] sm:min-h-[32px] px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
            />
          </div>
        )}

        {/* Position */}
        <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
          <div>
            <Label className="text-[10px] sm:text-xs text-gray-700 dark:text-gray-300">{t('configure.xPosition')}</Label>
            <Input
              type="number"
              value={selectedLayer.x}
              onChange={(e) => {
                const newX = parseInt(e.target.value) || 0;
                const templateWidth = templateImageDimensions?.width || STANDARD_CANVAS_WIDTH;
                updateLayer(selectedLayer.id, { x: newX, xPercent: newX / templateWidth });
              }}
              className="h-7 sm:h-8 text-xs dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
            />
          </div>
          <div>
            <Label className="text-[10px] sm:text-xs text-gray-700 dark:text-gray-300">{t('configure.yPosition')}</Label>
            <Input
              type="number"
              value={selectedLayer.y}
              onChange={(e) => {
                const newY = parseInt(e.target.value) || 0;
                const templateHeight = templateImageDimensions?.height || STANDARD_CANVAS_HEIGHT;
                updateLayer(selectedLayer.id, { y: newY, yPercent: newY / templateHeight });
              }}
              className="h-7 sm:h-8 text-xs dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
            />
          </div>
        </div>

        {/* Font Size */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <Label className="text-[10px] sm:text-xs text-gray-700 dark:text-gray-300">{t('configure.fontSize')} (px)</Label>
          </div>
          <Input
            type="number"
            value={selectedLayer.fontSize}
            onChange={(e) => {
              const newSize = parseInt(e.target.value) || 12;
              const currentRichText = selectedLayer.richText || plainTextToRichText(selectedLayer.defaultText || '', {
                fontWeight: selectedLayer.fontWeight,
                fontFamily: selectedLayer.fontFamily,
              });
              // Remove fontSize from all spans so they inherit from layer
              const newRichText = currentRichText.map(span => {
                const { fontSize, ...spanWithoutFontSize } = span;
                return spanWithoutFontSize;
              });
              updateLayer(selectedLayer.id, { fontSize: newSize, richText: newRichText });
            }}
            className="h-7 sm:h-8 text-xs dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
          />
        </div>

        {/* Font Family & Weight */}
        <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
          <div>
            <Label className="text-[10px] sm:text-xs text-gray-700 dark:text-gray-300">{t('configure.fontFamily')}</Label>
            <FontFamilySelect
              value={(() => {
                const currentRichText = selectedLayer.richText || plainTextToRichText(selectedLayer.defaultText || '');
                const { start, end } = richTextSelection;
                if (start !== end) {
                  const commonValue = getCommonStyleValue(currentRichText, start, end, 'fontFamily');
                  return commonValue === 'mixed' ? 'mixed' : (commonValue || selectedLayer.fontFamily);
                }
                if (selectedLayer.richText && selectedLayer.richText.length > 1) {
                  if (hasMixedStyle(currentRichText, 'fontFamily')) return 'mixed';
                }
                return selectedLayer.fontFamily;
              })()}
              onValueChange={(value) => {
                const currentRichText = selectedLayer.richText || plainTextToRichText(selectedLayer.defaultText || '', {
                  fontWeight: selectedLayer.fontWeight, fontFamily: selectedLayer.fontFamily
                });
                const { start, end } = richTextSelection;
                if (start === end) {
                  const newRichText = currentRichText.map(span => ({ ...span, fontFamily: value }));
                  updateLayer(selectedLayer.id, { fontFamily: value, richText: newRichText });
                } else {
                  const newRichText = applyStyleToRange(currentRichText, start, end, { fontFamily: value });
                  const plainText = richTextToPlainText(newRichText);
                  updateLayer(selectedLayer.id, { richText: newRichText, defaultText: plainText, hasInlineFormatting: true });
                  setPreviewTexts(prev => ({ ...prev, [selectedLayer.id]: plainText }));
                }
              }}
              className="h-7 sm:h-8 text-xs"
            />
          </div>
          <div>
            <Label className="text-[10px] sm:text-xs text-gray-700 dark:text-gray-300">{t('configure.weight')}</Label>
            <FontWeightSelect
              value={(() => {
                const currentRichText = selectedLayer.richText || plainTextToRichText(selectedLayer.defaultText || '');
                const { start, end } = richTextSelection;
                if (start !== end) {
                  const commonValue = getCommonStyleValue(currentRichText, start, end, 'fontWeight');
                  return commonValue === 'mixed' ? 'mixed' : (commonValue || selectedLayer.fontWeight || 'normal');
                }
                if (selectedLayer.richText && selectedLayer.richText.length > 1) {
                  if (hasMixedStyle(currentRichText, 'fontWeight')) return 'mixed';
                }
                return selectedLayer.fontWeight || 'normal';
              })()}
              onValueChange={(value) => {
                const currentRichText = selectedLayer.richText || plainTextToRichText(selectedLayer.defaultText || '', {
                  fontWeight: selectedLayer.fontWeight, fontFamily: selectedLayer.fontFamily
                });
                const { start, end } = richTextSelection;
                if (start === end) {
                  const newRichText = currentRichText.map(span => ({ ...span, fontWeight: value }));
                  updateLayer(selectedLayer.id, { fontWeight: value, richText: newRichText });
                } else {
                  const newRichText = applyStyleToRange(currentRichText, start, end, { fontWeight: value });
                  const plainText = richTextToPlainText(newRichText);
                  updateLayer(selectedLayer.id, { richText: newRichText, defaultText: plainText, hasInlineFormatting: true });
                  setPreviewTexts(prev => ({ ...prev, [selectedLayer.id]: plainText }));
                }
              }}
              className="h-7 sm:h-8 text-xs"
            />
          </div>
        </div>

        {/* Font Style & Text Align */}
        <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
          <div>
            <Label className="text-[10px] sm:text-xs text-gray-700 dark:text-gray-300">{t('configure.fontStyle')}</Label>
            <FontStyleSelect
              value={(() => {
                const currentRichText = selectedLayer.richText || plainTextToRichText(selectedLayer.defaultText || '');
                const { start, end } = richTextSelection;
                if (start !== end) {
                  const commonValue = getCommonStyleValue(currentRichText, start, end, 'fontStyle');
                  return commonValue === 'mixed' ? 'mixed' : (commonValue || selectedLayer.fontStyle || 'normal');
                }
                if (selectedLayer.richText && selectedLayer.richText.length > 1) {
                  if (hasMixedStyle(currentRichText, 'fontStyle')) return 'mixed';
                }
                return selectedLayer.fontStyle || 'normal';
              })()}
              onValueChange={(value) => {
                const currentRichText = selectedLayer.richText || plainTextToRichText(selectedLayer.defaultText || '', {
                  fontStyle: selectedLayer.fontStyle as TextSpan['fontStyle'],
                  fontFamily: selectedLayer.fontFamily
                });
                const { start, end } = richTextSelection;
                if (start === end) {
                  const newRichText = currentRichText.map(span => ({ ...span, fontStyle: value as TextSpan['fontStyle'] }));
                  updateLayer(selectedLayer.id, { fontStyle: value as TextLayer['fontStyle'], richText: newRichText });
                } else {
                  const newRichText = applyStyleToRange(currentRichText, start, end, { fontStyle: value as TextSpan['fontStyle'] });
                  const plainText = richTextToPlainText(newRichText);
                  updateLayer(selectedLayer.id, { richText: newRichText, defaultText: plainText, hasInlineFormatting: true });
                  setPreviewTexts(prev => ({ ...prev, [selectedLayer.id]: plainText }));
                }
              }}
              className="h-7 sm:h-8 text-xs"
            />
          </div>
          {!['certificate_no', 'issue_date'].includes(selectedLayer.id) && (
            <div>
              <Label className="text-[10px] sm:text-xs text-gray-700 dark:text-gray-300">{t('configure.textAlign')}</Label>
              <Select
                value={selectedLayer.textAlign || 'left'}
                onValueChange={(value) => updateLayer(selectedLayer.id, { textAlign: value as TextLayer['textAlign'] })}
              >
                <SelectTrigger className="h-7 sm:h-8 text-xs dark:bg-gray-900 dark:text-gray-100 dark:border-gray-700">
                  <SelectValue placeholder={t('configure.textAlign')} />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100">
                  <SelectItem value="left">{t('configure.left')}</SelectItem>
                  <SelectItem value="center">{t('configure.center')}</SelectItem>
                  <SelectItem value="right">{t('configure.right')}</SelectItem>
                  <SelectItem value="justify">{t('configure.justify')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Line Height */}
        <div>
          <Label className="text-[10px] sm:text-xs text-gray-700 dark:text-gray-300">{t('configure.lineHeight')}</Label>
          <Input
            type="number" step="0.1"
            value={selectedLayer.lineHeight || 1.2}
            onChange={(e) => updateLayer(selectedLayer.id, { lineHeight: parseFloat(e.target.value) || 1.2 })}
            className="h-7 sm:h-8 text-xs dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
          />
        </div>

        {/* Letter Spacing */}
        <div>
          <Label className="text-[10px] sm:text-xs text-gray-700 dark:text-gray-300">{t('configure.letterSpacing')} (px)</Label>
          <Input
            type="number" step="0.1"
            value={selectedLayer.letterSpacing ?? 0}
            onChange={(e) => {
              const raw = e.target.value;
              const parsed = raw === '' ? undefined : parseFloat(raw);
              updateLayer(selectedLayer.id, { letterSpacing: Number.isFinite(parsed as number) ? (parsed as number) : 0 });
            }}
            className="h-7 sm:h-8 text-xs dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
          />
        </div>

        {/* Max Width */}
        <div>
          <Label className="text-[10px] sm:text-xs text-gray-700 dark:text-gray-300">{t('configure.maxWidth')} (px)</Label>
          <Input
            type="number"
            value={selectedLayer.maxWidth || 0}
            onChange={(e) => updateLayer(selectedLayer.id, { maxWidth: parseInt(e.target.value) || 0 })}
            className="h-7 sm:h-8 text-xs dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
          />
        </div>

        {/* Color Picker */}
        <div className="space-y-1.5 sm:space-y-2">
          <Label className="text-[10px] sm:text-xs text-gray-700 dark:text-gray-300">{t('configure.textColor')}</Label>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <input
              type="color"
              value={selectedLayer.color || '#000000'}
              onChange={(e) => {
                const newColor = e.target.value;
                const currentRichText = selectedLayer.richText || plainTextToRichText(selectedLayer.defaultText || '', {
                  fontWeight: selectedLayer.fontWeight, fontFamily: selectedLayer.fontFamily, color: selectedLayer.color
                });
                const newRichText = currentRichText.map(span => ({ ...span, color: newColor }));
                updateLayer(selectedLayer.id, { color: newColor, richText: newRichText });
              }}
              className="h-7 sm:h-8 w-10 sm:w-12 border border-gray-200 dark:border-gray-700 rounded bg-transparent flex-shrink-0"
            />
            <Input
              type="text"
              value={selectedLayer.color || '#000000'}
              onChange={(e) => {
                const newColor = e.target.value;
                const currentRichText = selectedLayer.richText || plainTextToRichText(selectedLayer.defaultText || '', {
                  fontWeight: selectedLayer.fontWeight, fontFamily: selectedLayer.fontFamily, color: selectedLayer.color
                });
                const newRichText = currentRichText.map(span => ({ ...span, color: newColor }));
                updateLayer(selectedLayer.id, { color: newColor, richText: newRichText });
              }}
              className="h-7 sm:h-8 text-xs dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100 flex-1"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
