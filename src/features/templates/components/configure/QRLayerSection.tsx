"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, QrCode } from "lucide-react";
import { STANDARD_CANVAS_WIDTH, STANDARD_CANVAS_HEIGHT } from "@/lib/constants/canvas";
import type { QRCodeLayerConfig } from "@/types/template-layout";

interface QRLayerSectionProps {
  qrLayers: QRCodeLayerConfig[];
  selectedQRLayerId: string | null;
  templateImageDimensions: { width: number; height: number } | null;
  setSelectedQRLayerId: (id: string | null) => void;
  setSelectedLayerId: (id: string | null) => void;
  setSelectedPhotoLayerId: (id: string | null) => void;
  addQRCodeLayer: () => void;
  updateQRLayer: (id: string, updates: Partial<QRCodeLayerConfig>) => void;
  deleteQRLayer: (id: string) => void;
  t: (key: string) => string;
}

export function QRLayerSection({
  qrLayers, selectedQRLayerId, templateImageDimensions,
  setSelectedQRLayerId, setSelectedLayerId, setSelectedPhotoLayerId,
  addQRCodeLayer, updateQRLayer, deleteQRLayer, t
}: QRLayerSectionProps) {
  const selectedQR = qrLayers.find(l => l.id === selectedQRLayerId);

  return (
    <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-3 sm:mb-4 gap-2">
        <h2 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 dark:text-gray-100">
          QR Code Layers ({qrLayers.length})
        </h2>
        <Button variant="outline" size="sm" onClick={addQRCodeLayer} className="h-7 sm:h-8 px-2 sm:px-3 text-xs sm:text-sm">
          <QrCode className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
          <span className="hidden sm:inline">Add QR Code</span>
        </Button>
      </div>

      {/* QR Layers List */}
      <div className="space-y-2 max-h-48 sm:max-h-64 overflow-y-auto">
        {qrLayers.map(layer => {
          const isSelected = selectedQRLayerId === layer.id;
          return (
            <div
              key={layer.id}
              className={`flex items-center justify-between p-2 sm:p-3 rounded-lg border-2 cursor-pointer transition-all ${
                isSelected
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10'
                  : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
              }`}
              onClick={() => {
                setSelectedQRLayerId(layer.id);
                setSelectedLayerId(null);
                setSelectedPhotoLayerId(null);
              }}
            >
              <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
                <QrCode className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-xs sm:text-sm text-gray-900 dark:text-gray-100 truncate">{layer.id}</div>
                  <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 truncate">
                    {Math.round(layer.width)}x{Math.round(layer.height)}px
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => { e.stopPropagation(); deleteQRLayer(layer.id); }}
                className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 h-7 w-7 sm:h-8 sm:w-auto sm:px-2 p-0 flex-shrink-0"
              >
                <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
              </Button>
            </div>
          );
        })}
      </div>

      {/* Selected QR Properties */}
      {selectedQRLayerId && selectedQR && (
        <div className="border-t border-gray-200 dark:border-gray-800 pt-3 sm:pt-4 mt-3">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <h3 className="text-[10px] sm:text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide truncate">
              QR Code Settings
            </h3>
          </div>
          <div className="space-y-3">
            {/* Position */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">{t('configure.xPosition')} (px)</Label>
                <Input
                  type="number" min="0" max={templateImageDimensions?.width || STANDARD_CANVAS_WIDTH} step="1"
                  value={Math.round(selectedQR.x)}
                  onChange={(e) => {
                    const templateWidth = templateImageDimensions?.width || STANDARD_CANVAS_WIDTH;
                    const xPx = Number(e.target.value);
                    updateQRLayer(selectedQR.id, { x: xPx, xPercent: xPx / templateWidth });
                  }}
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">{t('configure.yPosition')} (px)</Label>
                <Input
                  type="number" min="0" max={templateImageDimensions?.height || STANDARD_CANVAS_HEIGHT} step="1"
                  value={Math.round(selectedQR.y)}
                  onChange={(e) => {
                    const templateHeight = templateImageDimensions?.height || STANDARD_CANVAS_HEIGHT;
                    const yPx = Number(e.target.value);
                    updateQRLayer(selectedQR.id, { y: yPx, yPercent: yPx / templateHeight });
                  }}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            {/* Size */}
            <div>
              <Label className="text-xs">Size (px)</Label>
              <Input
                type="number" min="50"
                max={Math.min(templateImageDimensions?.width || STANDARD_CANVAS_WIDTH, templateImageDimensions?.height || STANDARD_CANVAS_HEIGHT)}
                step="1"
                value={Math.round(selectedQR.width)}
                onChange={(e) => {
                  const templateWidth = templateImageDimensions?.width || STANDARD_CANVAS_WIDTH;
                  const templateHeight = templateImageDimensions?.height || STANDARD_CANVAS_HEIGHT;
                  const size = Number(e.target.value);
                  updateQRLayer(selectedQR.id, {
                    width: size, height: size,
                    widthPercent: size / templateWidth, heightPercent: size / templateHeight
                  });
                }}
                className="h-8 text-xs"
              />
            </div>

            {/* Transparent Background */}
            <div className="flex items-center justify-between">
              <Label className="text-xs">Transparent Background</Label>
              <label className="flex items-center gap-2 text-[11px]">
                <input
                  type="checkbox"
                  checked={selectedQR.backgroundColor === 'transparent'}
                  onChange={(e) => updateQRLayer(selectedQR.id, { backgroundColor: e.target.checked ? 'transparent' : '#FFFFFF' })}
                  className="h-3 w-3 rounded border-gray-300 dark:border-gray-600"
                />
                <span className="text-gray-600 dark:text-gray-300">No white box</span>
              </label>
            </div>

            {/* Layer Order */}
            <div>
              <Label className="text-xs">Layer Order</Label>
              <Select
                value={selectedQR.zIndex >= 100 ? 'front' : 'back'}
                onValueChange={(value) => updateQRLayer(selectedQR.id, { zIndex: value === 'front' ? 101 : 50 })}
              >
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="front">Front (Above Text)</SelectItem>
                  <SelectItem value="back">Back (Below Text)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
