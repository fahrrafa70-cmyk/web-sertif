import { useState, useCallback } from "react";
import { toast } from "sonner";
import { PhotoLayerConfig } from "@/types/template-layout";
import { Template } from "@/lib/supabase/templates";
import { uploadTemplatePhoto, deleteTemplatePhoto, validateImageFile } from "@/lib/supabase/photo-storage";

export function usePhotoLayers(
  configMode: "certificate" | "score",
  template: Template | null,
  t: (key: string) => string
) {
  const [certificatePhotoLayers, setCertificatePhotoLayers] = useState<PhotoLayerConfig[]>([]);
  const [scorePhotoLayers, setScorePhotoLayers] = useState<PhotoLayerConfig[]>([]);
  const [selectedPhotoLayerId, setSelectedPhotoLayerId] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const photoLayers = configMode === "certificate" ? certificatePhotoLayers : scorePhotoLayers;
  const setPhotoLayers = configMode === "certificate" ? setCertificatePhotoLayers : setScorePhotoLayers;

  const handlePhotoUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !template) return;
    try {
      setUploadingPhoto(true);
      const dims = await validateImageFile(file);
      const { url, path } = await uploadTemplatePhoto(file, template.id);
      const ts = Date.now();
      const newLayer: PhotoLayerConfig = {
        id: `photo_${ts}`, type: "photo", src: url, storagePath: path,
        x: 0, y: 0, xPercent: 0.5, yPercent: 0.3,
        width: 0, height: 0, widthPercent: 0.2, heightPercent: 0.2 * (dims.height / dims.width),
        zIndex: 0, fitMode: "fill", opacity: 1, rotation: 0, maintainAspectRatio: false,
        originalWidth: dims.width, originalHeight: dims.height,
      };
      setPhotoLayers((prev) => [...prev, newLayer]);
      setSelectedPhotoLayerId(newLayer.id);
      toast.success(`Photo uploaded! ${t("configure.rememberToSave") || "Remember to save."}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("configure.failedToUpload"));
    } finally {
      setUploadingPhoto(false);
      event.target.value = "";
    }
  }, [template, setPhotoLayers, t]);

  const updatePhotoLayer = useCallback((layerId: string, updates: Partial<PhotoLayerConfig>) => {
    setPhotoLayers((prev) => prev.map((l) => l.id === layerId ? { ...l, ...updates } : l));
  }, [setPhotoLayers]);

  const deletePhotoLayer = useCallback(async (layerId: string) => {
    const layer = photoLayers.find((l) => l.id === layerId);
    if (!layer) return;
    try {
      if (layer.storagePath) await deleteTemplatePhoto(layer.storagePath);
      setPhotoLayers((prev) => prev.filter((l) => l.id !== layerId));
      if (selectedPhotoLayerId === layerId) setSelectedPhotoLayerId(null);
      toast.success(`Photo layer deleted. ${t("configure.rememberToSave") || "Remember to save."}`);
    } catch {
      toast.error(t("configure.failedToDeletePhoto"));
    }
  }, [photoLayers, selectedPhotoLayerId, setPhotoLayers, t]);

  return {
    certificatePhotoLayers, setCertificatePhotoLayers,
    scorePhotoLayers, setScorePhotoLayers,
    photoLayers, setPhotoLayers,
    selectedPhotoLayerId, setSelectedPhotoLayerId,
    uploadingPhoto, setUploadingPhoto,
    handlePhotoUpload, updatePhotoLayer, deletePhotoLayer
  };
}
