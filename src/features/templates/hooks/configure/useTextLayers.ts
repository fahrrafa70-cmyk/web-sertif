import { useState, useCallback } from "react";
import { toast } from "sonner";
import { TextLayerConfig } from "@/types/template-layout";
import { STANDARD_CANVAS_WIDTH, STANDARD_CANVAS_HEIGHT } from "@/lib/constants/canvas";
import { TextLayer, DUMMY_DATA } from "./types";

export function useTextLayers(
  configMode: "certificate" | "score",
  templateImageDimensions: { width: number; height: number } | null,
  previewTexts: Record<string, string>,
  t: (key: string) => string
) {
  const [certificateTextLayers, setCertificateTextLayers] = useState<TextLayer[]>([]);
  const [scoreTextLayers, setScoreTextLayers] = useState<TextLayer[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [renamingLayerId, setRenamingLayerId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const textLayers = configMode === "certificate" ? certificateTextLayers : scoreTextLayers;
  const selectedLayer = textLayers.find((l) => l.id === selectedLayerId);

  const measureTextWidth = useCallback((text: string, fontSize: number, fontFamily: string, fontWeight: string, maxWidth?: number): number => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return 0;
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    if (maxWidth && maxWidth > 0) {
      const words = text.split(" ");
      const lines: string[] = [];
      let cur = "";
      for (const word of words) {
        const test = cur ? `${cur} ${word}` : word;
        if (ctx.measureText(test).width > maxWidth && cur) { lines.push(cur); cur = word; }
        else cur = test;
      }
      if (cur) lines.push(cur);
      let max = 0;
      for (const line of lines) max = Math.max(max, ctx.measureText(line).width);
      return Math.min(max, maxWidth);
    }
    return ctx.measureText(text).width;
  }, []);

  const updateLayer = useCallback((layerId: string, updates: Partial<TextLayer>) => {
    const setter = configMode === "certificate" ? setCertificateTextLayers : setScoreTextLayers;
    setter((prev) => {
      const layer = prev.find((l) => l.id === layerId);
      if (!layer) return prev;
      if (updates.textAlign && updates.textAlign !== layer.textAlign && layer.id !== "certificate_no" && layer.id !== "issue_date") {
        const oldAlign = layer.textAlign || "left";
        const newAlign = updates.textAlign;
        const text = previewTexts[layerId] || layer.defaultText || DUMMY_DATA[layer.id as keyof typeof DUMMY_DATA] || layer.id;
        const textWidth = measureTextWidth(text, layer.fontSize, layer.fontFamily, layer.fontWeight, layer.maxWidth);
        let cx = layer.x;
        if (oldAlign === "right") cx = layer.x - textWidth / 2;
        else if (oldAlign === "left") cx = layer.x + textWidth / 2;
        let newX = cx;
        if (newAlign === "right") newX = cx + textWidth / 2;
        else if (newAlign === "left") newX = cx - textWidth / 2;
        const tw = templateImageDimensions?.width || STANDARD_CANVAS_WIDTH;
        updates.x = Math.max(0, Math.min(tw, Math.round(newX)));
        updates.xPercent = updates.x / tw;
      }
      return prev.map((l) => l.id === layerId ? { ...l, ...updates } : l);
    });
  }, [configMode, previewTexts, templateImageDimensions, measureTextWidth]);

  const addTextLayer = useCallback(() => {
    const newId = `custom_${Date.now()}`;
    if (textLayers.some((l) => l.id === newId)) { toast.error("Failed to create unique layer ID."); return; }
    const tw = templateImageDimensions?.width || STANDARD_CANVAS_WIDTH;
    const th = templateImageDimensions?.height || STANDARD_CANVAS_HEIGHT;
    
    const newLayer: TextLayerConfig = {
      id: newId, 
      x: Math.round(tw * 0.25), 
      y: Math.round(th * 0.2), // Placing slightly down from the top 
      xPercent: 0.25, 
      yPercent: 0.2, // 20% down
      fontSize: 32, color: "#000000", fontWeight: "normal", fontFamily: "Arial",
      textAlign: configMode === "score" ? "center" : "left",
      maxWidth: 400, lineHeight: 1.2,
    };
    const setter = configMode === "certificate" ? setCertificateTextLayers : setScoreTextLayers;
    setter((prev) => [...prev, newLayer]);
    setSelectedLayerId(newLayer.id);
    toast.success(t("configure.newLayerAdded"));
  }, [textLayers, configMode, t]);

  const deleteLayer = useCallback((layerId: string) => {
    if (configMode === "certificate" && ["name", "certificate_no", "issue_date", "description"].includes(layerId)) {
      toast.error(t("configure.cannotDeleteRequired")); return;
    }
    if (configMode === "score" && ["issue_date", "description"].includes(layerId)) {
      toast.error(t("configure.cannotDeleteRequired")); return;
    }
    const setter = configMode === "certificate" ? setCertificateTextLayers : setScoreTextLayers;
    setter((prev) => prev.filter((l) => l.id !== layerId));
    if (selectedLayerId === layerId) setSelectedLayerId(null);
    toast.success(t("configure.layerDeleted").replace("{id}", layerId));
  }, [configMode, selectedLayerId, t]);

  const toggleLayerVisibility = useCallback((layerId: string) => {
    const setter = configMode === "certificate" ? setCertificateTextLayers : setScoreTextLayers;
    setter((prev) => prev.map((l) => l.id === layerId ? { ...l, visible: l.visible === false ? true : false } : l));
  }, [configMode]);

  const handleLayerDoubleClick = useCallback((layerId: string) => {
    setRenamingLayerId(layerId);
    setRenameValue(layerId);
  }, []);

  const handleRenameSubmit = useCallback((oldId: string) => {
    if (!renameValue.trim() || renameValue === oldId) { setRenamingLayerId(null); return; }
    if (textLayers.some((l) => l.id === renameValue && l.id !== oldId)) { toast.error("Layer ID already exists"); return; }
    const setter = configMode === "certificate" ? setCertificateTextLayers : setScoreTextLayers;
    setter((prev) => prev.map((l) => l.id === oldId ? { ...l, id: renameValue.trim() } : l));
    if (selectedLayerId === oldId) setSelectedLayerId(renameValue.trim());
    setRenamingLayerId(null);
    toast.success("Layer renamed successfully");
  }, [renameValue, textLayers, configMode, selectedLayerId]);

  return {
    certificateTextLayers, setCertificateTextLayers,
    scoreTextLayers, setScoreTextLayers,
    textLayers, selectedLayer,
    selectedLayerId, setSelectedLayerId,
    renamingLayerId, setRenamingLayerId,
    renameValue, setRenameValue,
    measureTextWidth, updateLayer, addTextLayer, deleteLayer, toggleLayerVisibility,
    handleLayerDoubleClick, handleRenameSubmit
  };
}
