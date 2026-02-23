import React, { useCallback } from "react";
import { TextLayer } from "./types";
import { PhotoLayerConfig, QRCodeLayerConfig } from "@/types/template-layout";
import { STANDARD_CANVAS_WIDTH, STANDARD_CANVAS_HEIGHT } from "@/lib/constants/canvas";

export interface DragContext {
  configMode: "certificate" | "score";
  canvasRef: React.RefObject<HTMLDivElement | null>;
  canvasScale: number;
  templateImageDimensions: { width: number; height: number } | null;
  textLayers: TextLayer[];
  photoLayers: PhotoLayerConfig[];
  qrLayers: QRCodeLayerConfig[];
  setCertificateTextLayers: React.Dispatch<React.SetStateAction<TextLayer[]>>;
  setScoreTextLayers: React.Dispatch<React.SetStateAction<TextLayer[]>>;
  setCertificatePhotoLayers: React.Dispatch<React.SetStateAction<PhotoLayerConfig[]>>;
  setScorePhotoLayers: React.Dispatch<React.SetStateAction<PhotoLayerConfig[]>>;
  setCertificateQRLayers: React.Dispatch<React.SetStateAction<QRCodeLayerConfig[]>>;
  setScoreQRLayers: React.Dispatch<React.SetStateAction<QRCodeLayerConfig[]>>;
  setSelectedLayerId: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedPhotoLayerId: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedQRLayerId: React.Dispatch<React.SetStateAction<string | null>>;
  updateQRLayer: (layerId: string, updates: Partial<QRCodeLayerConfig>) => void;
}

export function useConfigureDrag(ctx: DragContext) {
  const {
    configMode, canvasRef, canvasScale, templateImageDimensions,
    textLayers, photoLayers, qrLayers,
    setCertificateTextLayers, setScoreTextLayers,
    setCertificatePhotoLayers, setScorePhotoLayers,
    setCertificateQRLayers, setScoreQRLayers,
    setSelectedLayerId, setSelectedPhotoLayerId, setSelectedQRLayerId,
    updateQRLayer
  } = ctx;

  const handleLayerPointerDown = useCallback((layerId: string, e: React.PointerEvent) => {
    e.stopPropagation(); e.preventDefault();
    setSelectedLayerId(layerId);

    const layer = textLayers.find((l) => l.id === layerId);
    if (!layer || !canvasRef.current) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    const tw = templateImageDimensions?.width || STANDARD_CANVAS_WIDTH;
    const th = templateImageDimensions?.height || STANDARD_CANVAS_HEIGHT;
    const scale = canvasScale;
    const startX = e.clientX, startY = e.clientY;
    const startLX = layer.x, startLY = layer.y;

    const onMove = (me: PointerEvent) => {
      const nx = Math.max(0, Math.min(tw, startLX + (me.clientX - startX) / scale));
      const ny = Math.max(0, Math.min(th, startLY + (me.clientY - startY) / scale));
      const setter = configMode === "certificate" ? setCertificateTextLayers : setScoreTextLayers;
      setter((prev) => prev.map((l) => l.id === layerId ? { ...l, x: Math.round(nx), y: Math.round(ny), xPercent: nx / tw, yPercent: ny / th, isDragging: true } : l));
    };
    const onUp = () => {
      const setter = configMode === "certificate" ? setCertificateTextLayers : setScoreTextLayers;
      setter((prev) => prev.map((l) => ({ ...l, isDragging: false })));
      try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
    };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  }, [textLayers, templateImageDimensions, canvasScale, configMode, canvasRef, setSelectedLayerId, setCertificateTextLayers, setScoreTextLayers]);

  const handleResizePointerDown = useCallback((layerId: string, e: React.PointerEvent, direction: "right" | "left" | "top" | "bottom" | "corner" = "right") => {
    e.stopPropagation(); e.preventDefault();
    const layer = textLayers.find((l) => l.id === layerId);
    if (!layer || !canvasRef.current) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    const startX = e.clientX, startY = e.clientY;
    const startWidth = layer.maxWidth || 300;
    const startHeight = layer.fontSize * (layer.lineHeight || 1.2);

    const onMove = (me: PointerEvent) => {
      const scale = canvasScale;
      const dx = (me.clientX - startX) / scale;
      const dy = (me.clientY - startY) / scale;
      const updates: Partial<TextLayer> = {};
      
      if (direction === "right" || direction === "left") {
        updates.maxWidth = Math.round(Math.max(50, startWidth + (direction === "right" ? dx : -dx)));
      } else if (direction === "bottom" || direction === "top") {
        updates.lineHeight = Math.round(Math.max(0.5, Math.min(3, (startHeight + (direction === "bottom" ? dy : -dy)) / layer.fontSize)) * 10) / 10;
      } else if (direction === "corner") {
        updates.maxWidth = Math.round(Math.max(50, startWidth + dx));
        updates.lineHeight = Math.round(Math.max(0.5, Math.min(3, (startHeight + dy) / layer.fontSize)) * 10) / 10;
      }
      const setter = configMode === "certificate" ? setCertificateTextLayers : setScoreTextLayers;
      setter((prev) => prev.map((l) => l.id === layerId ? { ...l, ...updates } : l));
    };
    const onUp = () => {
      try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
    };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  }, [textLayers, canvasScale, configMode, canvasRef, setCertificateTextLayers, setScoreTextLayers]);

  const handleQRResizePointerDown = useCallback((layerId: string, e: React.PointerEvent, direction: "right" | "left" | "top" | "bottom" | "corner" = "corner") => {
    e.stopPropagation(); e.preventDefault();
    const layer = qrLayers.find((l) => l.id === layerId);
    if (!layer || !canvasRef.current) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    const startX = e.clientX, startY = e.clientY;
    const startSize = layer.width;

    const onMove = (me: PointerEvent) => {
      const tw = templateImageDimensions?.width || STANDARD_CANVAS_WIDTH;
      const th = templateImageDimensions?.height || STANDARD_CANVAS_HEIGHT;
      const scale = canvasScale;
      const dx = (me.clientX - startX) / scale;
      const dy = (me.clientY - startY) / scale;
      let delta = 0;
      if (direction === "right") delta = dx;
      else if (direction === "left") delta = -dx;
      else if (direction === "bottom") delta = dy;
      else if (direction === "top") delta = -dy;
      else delta = Math.abs(dx) > Math.abs(dy) ? dx : dy;
      
      const newSize = Math.max(50, Math.min(Math.min(tw, th) * 0.8, startSize + delta));
      updateQRLayer(layerId, { width: Math.round(newSize), height: Math.round(newSize), widthPercent: newSize / tw, heightPercent: newSize / th });
    };
    const onUp = () => {
      try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
    };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  }, [qrLayers, canvasScale, templateImageDimensions, canvasRef, updateQRLayer]);

  const handlePhotoLayerMouseDown = useCallback((layerId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedPhotoLayerId(layerId);
    const layer = photoLayers.find((l) => l.id === layerId);
    if (!layer || !canvasRef.current) return;

    const tw = templateImageDimensions?.width || STANDARD_CANVAS_WIDTH;
    const th = templateImageDimensions?.height || STANDARD_CANVAS_HEIGHT;
    const scale = canvasScale;
    const startX = e.clientX, startY = e.clientY;
    const startLX = layer.x, startLY = layer.y;

    const onMove = (me: MouseEvent) => {
      const nx = Math.max(0, Math.min(tw, startLX + (me.clientX - startX) / scale));
      const ny = Math.max(0, Math.min(th, startLY + (me.clientY - startY) / scale));
      const setter = configMode === "certificate" ? setCertificatePhotoLayers : setScorePhotoLayers;
      setter((prev) => prev.map((l) => l.id === layerId ? { ...l, x: Math.round(nx), y: Math.round(ny), xPercent: nx / tw, yPercent: ny / th } : l));
    };
    const onUp = () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [photoLayers, templateImageDimensions, canvasScale, configMode, canvasRef, setSelectedPhotoLayerId, setCertificatePhotoLayers, setScorePhotoLayers]);

  const handleQRLayerMouseDown = useCallback((layerId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedQRLayerId(layerId);
    const layer = qrLayers.find((l) => l.id === layerId);
    if (!layer || !canvasRef.current) return;

    const tw = templateImageDimensions?.width || STANDARD_CANVAS_WIDTH;
    const th = templateImageDimensions?.height || STANDARD_CANVAS_HEIGHT;
    const scale = canvasScale;
    const startX = e.clientX, startY = e.clientY;
    const startLX = layer.x, startLY = layer.y;

    const onMove = (me: MouseEvent) => {
      const nx = Math.max(0, Math.min(tw, startLX + (me.clientX - startX) / scale));
      const ny = Math.max(0, Math.min(th, startLY + (me.clientY - startY) / scale));
      const setter = configMode === "certificate" ? setCertificateQRLayers : setScoreQRLayers;
      setter((prev) => prev.map((l) => l.id === layerId ? { ...l, x: Math.round(nx), y: Math.round(ny), xPercent: nx / tw, yPercent: ny / th } : l));
    };
    const onUp = () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [qrLayers, templateImageDimensions, canvasScale, configMode, canvasRef, setSelectedQRLayerId, setCertificateQRLayers, setScoreQRLayers]);

  return {
    handleLayerPointerDown,
    handleResizePointerDown,
    handleQRResizePointerDown,
    handlePhotoLayerMouseDown,
    handleQRLayerMouseDown
  };
}
