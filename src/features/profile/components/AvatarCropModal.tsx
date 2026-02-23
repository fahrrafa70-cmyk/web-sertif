"use client";

import Image from "next/image";
import { Loader2, ZoomIn, ZoomOut, RotateCw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface AvatarCropModalProps {
  t: (key: string) => string;
  showAvatarModal: boolean;
  setShowAvatarModal: (open: boolean) => void;
  tempImageUrl: string | null;
  uploadingAvatar: boolean;
  imageScale: number;
  setImageScale: React.Dispatch<React.SetStateAction<number>>;
  imageRotation: number;
  setImageRotation: React.Dispatch<React.SetStateAction<number>>;
  imagePosition: { x: number; y: number };
  setImagePosition: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  isDragging: boolean;
  handleAvatarConfirm: () => void;
  handleAvatarCancel: () => void;
  handleMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
  handleMouseMove: (e: React.MouseEvent<HTMLDivElement>) => void;
  handleMouseUp: () => void;
}

export function AvatarCropModal({
  t,
  showAvatarModal,
  setShowAvatarModal,
  tempImageUrl,
  uploadingAvatar,
  imageScale,
  setImageScale,
  imageRotation,
  setImageRotation,
  imagePosition,
  setImagePosition,
  isDragging,
  handleAvatarConfirm,
  handleAvatarCancel,
  handleMouseDown,
  handleMouseMove,
  handleMouseUp,
}: AvatarCropModalProps) {
  return (
    <Dialog open={showAvatarModal} onOpenChange={setShowAvatarModal}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{t("profile.setupPhoto")}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          {/* Preview circle */}
          <div className="flex justify-center">
            <div className="relative w-64 h-64 overflow-hidden bg-gray-100 dark:bg-gray-700 border-2 border-dashed border-gray-300 rounded-full">
              {tempImageUrl && (
                <div className="absolute inset-0 cursor-move select-none flex items-center justify-center"
                  onMouseDown={handleMouseDown} onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
                  <div className="relative"
                    style={{ transform: `translate(${imagePosition.x}px, ${imagePosition.y}px) scale(${imageScale}) rotate(${imageRotation}deg)`, transition: isDragging ? "none" : "transform 0.1s ease-out" }}>
                    <Image src={tempImageUrl} alt="Preview" width={400} height={400} className="pointer-events-none object-cover" />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Zoom</Label>
              <div className="flex items-center gap-3">
                <Button type="button" variant="outline" size="sm" onClick={() => setImageScale((p) => Math.max(0.5, p - 0.1))}><ZoomOut className="h-4 w-4" /></Button>
                <Slider value={[imageScale]} onValueChange={([v]) => setImageScale(v)} min={0.5} max={3} step={0.1} className="flex-1" />
                <Button type="button" variant="outline" size="sm" onClick={() => setImageScale((p) => Math.min(3, p + 0.1))}><ZoomIn className="h-4 w-4" /></Button>
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setImageRotation((p) => (p + 90) % 360)} className="flex items-center gap-2">
                <RotateCw className="h-4 w-4" />Putar 90°
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => { setImageScale(1); setImageRotation(0); setImagePosition({ x: 0, y: 0 }); }}>
                Reset
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleAvatarCancel}>Batal</Button>
          <Button type="button" onClick={handleAvatarConfirm} disabled={uploadingAvatar}>
            {uploadingAvatar ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Mengunggah...</> : "Terapkan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
