import { useState, useCallback } from "react";
import { toast } from "sonner";
import { QRCodeLayerConfig } from "@/types/template-layout";
import { STANDARD_CANVAS_WIDTH, STANDARD_CANVAS_HEIGHT } from "@/lib/constants/canvas";

export function useQRLayers(
  configMode: "certificate" | "score",
  templateImageDimensions: { width: number; height: number } | null
) {
  const [certificateQRLayers, setCertificateQRLayers] = useState<QRCodeLayerConfig[]>([]);
  const [scoreQRLayers, setScoreQRLayers] = useState<QRCodeLayerConfig[]>([]);
  const [selectedQRLayerId, setSelectedQRLayerId] = useState<string | null>(null);

  const qrLayers = configMode === "certificate" ? certificateQRLayers : scoreQRLayers;
  const setQRLayers = configMode === "certificate" ? setCertificateQRLayers : setScoreQRLayers;

  const addQRCodeLayer = useCallback((clearSelections?: () => void) => {
    const tw = templateImageDimensions?.width || STANDARD_CANVAS_WIDTH;
    const th = templateImageDimensions?.height || STANDARD_CANVAS_HEIGHT;
    const qrSize = Math.round(tw * 0.1);
    const newLayer: QRCodeLayerConfig = {
      id: `qr_${Date.now()}`, type: "qr_code", qrData: "{{CERTIFICATE_URL}}", errorCorrectionLevel: "M",
      x: Math.round(tw * 0.85), y: Math.round(th * 0.85), xPercent: 0.85, yPercent: 0.85,
      width: qrSize, height: qrSize, widthPercent: qrSize / tw, heightPercent: qrSize / th,
      foregroundColor: "#000000", backgroundColor: "#FFFFFF", zIndex: 50,
      opacity: 1, rotation: 0, maintainAspectRatio: true, margin: 4, visible: true,
    };
    
    setQRLayers((prev) => [...prev, newLayer]);
    setSelectedQRLayerId(newLayer.id);
    if (clearSelections) clearSelections();
    toast.success("QR code layer added. Remember to save.");
  }, [templateImageDimensions, setQRLayers]);

  const updateQRLayer = useCallback((layerId: string, updates: Partial<QRCodeLayerConfig>) => {
    const tw = templateImageDimensions?.width || STANDARD_CANVAS_WIDTH;
    const th = templateImageDimensions?.height || STANDARD_CANVAS_HEIGHT;
    if (updates.width !== undefined) {
      updates.height = updates.width;
      updates.widthPercent = updates.width / tw;
      updates.heightPercent = updates.width / th;
    }
    if (updates.widthPercent !== undefined && updates.width === undefined) {
      const px = Math.max(16, Math.round(updates.widthPercent * tw));
      updates.width = px; updates.height = px; updates.heightPercent = px / th;
    }
    setQRLayers((prev) => prev.map((l) => l.id === layerId ? { ...l, ...updates } : l));
  }, [templateImageDimensions, setQRLayers]);

  const deleteQRLayer = useCallback((layerId: string) => {
    setQRLayers((prev) => prev.filter((l) => l.id !== layerId));
    if (selectedQRLayerId === layerId) setSelectedQRLayerId(null);
    toast.success("QR code layer deleted. Remember to save.");
  }, [setQRLayers, selectedQRLayerId]);

  return {
    certificateQRLayers, setCertificateQRLayers,
    scoreQRLayers, setScoreQRLayers,
    qrLayers,
    selectedQRLayerId, setSelectedQRLayerId,
    addQRCodeLayer, updateQRLayer, deleteQRLayer
  };
}
