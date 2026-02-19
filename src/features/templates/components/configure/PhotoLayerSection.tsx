"use client";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Upload } from "lucide-react";
import { STANDARD_CANVAS_WIDTH, STANDARD_CANVAS_HEIGHT } from "@/lib/constants/canvas";
import type { PhotoLayerConfig } from "@/types/template-layout";

interface PhotoLayerSectionProps {
  photoLayers: PhotoLayerConfig[];
  selectedPhotoLayerId: string | null;
  uploadingPhoto: boolean;
  templateImageDimensions: { width: number; height: number } | null;
  setSelectedPhotoLayerId: (id: string | null) => void;
  setSelectedLayerId: (id: string | null) => void;
  setSelectedQRLayerId: (id: string | null) => void;
  handlePhotoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  updatePhotoLayer: (id: string, updates: Partial<PhotoLayerConfig>) => void;
  deletePhotoLayer: (id: string) => void;
  t: (key: string) => string;
}

export function PhotoLayerSection({
  photoLayers, selectedPhotoLayerId, uploadingPhoto, templateImageDimensions,
  setSelectedPhotoLayerId, setSelectedLayerId, setSelectedQRLayerId,
  handlePhotoUpload, updatePhotoLayer, deletePhotoLayer, t
}: PhotoLayerSectionProps) {
  const selectedPhoto = photoLayers.find(l => l.id === selectedPhotoLayerId);

  return (
    <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-3 sm:mb-4 gap-2">
        <h2 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 dark:text-gray-100">
          {t('configure.photoLayers')} ({photoLayers.length})
        </h2>
        <label htmlFor="photo-upload">
          <Button
            variant="outline"
            size="sm"
            disabled={uploadingPhoto}
            className="h-7 sm:h-8 px-2 sm:px-3 text-xs sm:text-sm cursor-pointer"
            asChild
          >
            <span>
              <Upload className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
              <span className="hidden sm:inline">{uploadingPhoto ? t('configure.uploadingPhoto') : t('configure.upload')}</span>
            </span>
          </Button>
        </label>
        <input id="photo-upload" type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
      </div>

      {/* Photo Layers List */}
      <div className="space-y-2 max-h-48 sm:max-h-64 overflow-y-auto">
        {photoLayers.map(layer => {
          const isSelected = selectedPhotoLayerId === layer.id;
          return (
            <div
              key={layer.id}
              className={`flex items-center justify-between p-2 sm:p-3 rounded-lg border-2 cursor-pointer transition-all ${
                isSelected
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-500/10'
                  : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
              }`}
              onClick={() => {
                setSelectedPhotoLayerId(layer.id);
                setSelectedLayerId(null);
                setSelectedQRLayerId(null);
              }}
            >
              <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
                <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-gray-800">
                  <Image src={layer.src} alt={layer.id} width={32} height={32} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-xs sm:text-sm text-gray-900 dark:text-gray-100 truncate">{layer.id}</div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => { e.stopPropagation(); deletePhotoLayer(layer.id); }}
                className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 h-7 w-7 sm:h-8 sm:w-auto sm:px-2 p-0 flex-shrink-0"
              >
                <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
              </Button>
            </div>
          );
        })}
      </div>

      {/* Selected Photo Properties */}
      {selectedPhotoLayerId && selectedPhoto && (
        <div className="border-t border-gray-200 dark:border-gray-800 pt-3 sm:pt-4 mt-3">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <h3 className="text-[10px] sm:text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wide truncate">
              {selectedPhoto.id} Settings
            </h3>
          </div>
          <div className="space-y-3">
            {/* Layer Order */}
            <div>
              <Label className="text-xs">Layer Order</Label>
              <Select
                value={selectedPhoto.zIndex >= 100 ? 'front' : 'back'}
                onValueChange={(value) => updatePhotoLayer(selectedPhoto.id, { zIndex: value === 'front' ? 101 : 0 })}
              >
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="front">{t('configure.frontAboveText')}</SelectItem>
                  <SelectItem value="back">{t('configure.backBehindText')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Position */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">{t('configure.xPosition')} (px)</Label>
                <Input
                  type="number" min="0" max={templateImageDimensions?.width || STANDARD_CANVAS_WIDTH} step="1"
                  value={Math.round(selectedPhoto.xPercent * (templateImageDimensions?.width || STANDARD_CANVAS_WIDTH))}
                  onChange={(e) => {
                    const templateWidth = templateImageDimensions?.width || STANDARD_CANVAS_WIDTH;
                    const xPx = Number(e.target.value);
                    updatePhotoLayer(selectedPhoto.id, { x: xPx, xPercent: xPx / templateWidth });
                  }}
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">{t('configure.yPosition')} (px)</Label>
                <Input
                  type="number" min="0" max={templateImageDimensions?.height || STANDARD_CANVAS_HEIGHT} step="1"
                  value={Math.round(selectedPhoto.yPercent * (templateImageDimensions?.height || STANDARD_CANVAS_HEIGHT))}
                  onChange={(e) => {
                    const templateHeight = templateImageDimensions?.height || STANDARD_CANVAS_HEIGHT;
                    const yPx = Number(e.target.value);
                    updatePhotoLayer(selectedPhoto.id, { y: yPx, yPercent: yPx / templateHeight });
                  }}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            {/* Size */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Width (px)</Label>
                <Input
                  type="number" min="1" max={templateImageDimensions?.width || STANDARD_CANVAS_WIDTH} step="1"
                  value={Math.round(selectedPhoto.widthPercent * (templateImageDimensions?.width || STANDARD_CANVAS_WIDTH))}
                  onChange={(e) => {
                    const templateWidth = templateImageDimensions?.width || STANDARD_CANVAS_WIDTH;
                    const templateHeight = templateImageDimensions?.height || STANDARD_CANVAS_HEIGHT;
                    const widthPx = Number(e.target.value);
                    const newWidthPercent = widthPx / templateWidth;
                    if (selectedPhoto.maintainAspectRatio && selectedPhoto.originalWidth && selectedPhoto.originalHeight) {
                      const heightPx = widthPx * (selectedPhoto.originalHeight / selectedPhoto.originalWidth);
                      updatePhotoLayer(selectedPhoto.id, { width: widthPx, widthPercent: newWidthPercent, height: heightPx, heightPercent: heightPx / templateHeight });
                    } else {
                      updatePhotoLayer(selectedPhoto.id, { width: widthPx, widthPercent: newWidthPercent });
                    }
                  }}
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Height (px)</Label>
                <Input
                  type="number" min="1" max={templateImageDimensions?.height || STANDARD_CANVAS_HEIGHT} step="1"
                  value={Math.round(selectedPhoto.heightPercent * (templateImageDimensions?.height || STANDARD_CANVAS_HEIGHT))}
                  onChange={(e) => {
                    const templateWidth = templateImageDimensions?.width || STANDARD_CANVAS_WIDTH;
                    const templateHeight = templateImageDimensions?.height || STANDARD_CANVAS_HEIGHT;
                    const heightPx = Number(e.target.value);
                    const newHeightPercent = heightPx / templateHeight;
                    if (selectedPhoto.maintainAspectRatio && selectedPhoto.originalWidth && selectedPhoto.originalHeight) {
                      const widthPx = heightPx * (selectedPhoto.originalWidth / selectedPhoto.originalHeight);
                      updatePhotoLayer(selectedPhoto.id, { height: heightPx, heightPercent: newHeightPercent, width: widthPx, widthPercent: widthPx / templateWidth });
                    } else {
                      updatePhotoLayer(selectedPhoto.id, { height: heightPx, heightPercent: newHeightPercent });
                    }
                  }}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            {/* Opacity */}
            <div>
              <Label className="text-xs">Opacity ({Math.round(selectedPhoto.opacity * 100)}%)</Label>
              <input
                type="range" min="0" max="100" value={selectedPhoto.opacity * 100}
                onChange={(e) => updatePhotoLayer(selectedPhoto.id, { opacity: Number(e.target.value) / 100 })}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
            </div>

            {/* Rotation */}
            <div>
              <Label className="text-xs">Rotation ({selectedPhoto.rotation}°)</Label>
              <input
                type="range" min="-180" max="180" value={selectedPhoto.rotation}
                onChange={(e) => updatePhotoLayer(selectedPhoto.id, { rotation: Number(e.target.value) })}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
