import { TextLayerConfig } from "@/types/template-layout";
import { STANDARD_CANVAS_WIDTH, STANDARD_CANVAS_HEIGHT } from "@/lib/constants/canvas";
import { TextLayer } from "./types";

export function ensureFontSizePercent(
  layer: Partial<TextLayerConfig>,
  templateHeight: number
): TextLayerConfig {
  const fontSizePercent =
    layer.fontSizePercent !== undefined
      ? layer.fontSizePercent
      : ((layer.fontSize || 24) / templateHeight) * 100;
  return { ...layer, fontSizePercent } as TextLayerConfig;
}

export function buildDefaultCertLayers(w: number, h: number): TextLayerConfig[] {
  return [
    {
      id: "name",
      x: Math.round(w * 0.5), y: Math.round(h * 0.5),
      xPercent: 0.5, yPercent: 0.5,
      fontSize: 48, fontSizePercent: (48 / h) * 100,
      color: "#000000", fontWeight: "bold", fontFamily: "Arial",
      textAlign: "center", maxWidth: Math.round(w * 0.15), lineHeight: 1.2, visible: true,
    },
    {
      id: "certificate_no",
      x: Math.round(w * 0.1), y: Math.round(h * 0.1),
      xPercent: 0.1, yPercent: 0.1,
      fontSize: 26, fontSizePercent: (26 / h) * 100,
      color: "#000000", fontWeight: "normal", fontFamily: "Arial",
      maxWidth: Math.round(w * 0.1), lineHeight: 1.2, visible: true,
    },
    {
      id: "issue_date",
      x: Math.round(w * 0.7), y: Math.round(h * 0.85),
      xPercent: 0.7, yPercent: 0.85,
      fontSize: 26, fontSizePercent: (26 / h) * 100,
      color: "#000000", fontWeight: "normal", fontFamily: "Arial",
      maxWidth: Math.round(w * 0.1), lineHeight: 1.2, visible: true,
    },
    {
      id: "description",
      x: Math.round(w * 0.5), y: Math.round(h * 0.65),
      xPercent: 0.5, yPercent: 0.65,
      fontSize: 30, fontSizePercent: (30 / h) * 100,
      color: "#000000", fontWeight: "normal", fontFamily: "Arial",
      textAlign: "center", maxWidth: Math.round(w * 0.2), lineHeight: 1.4, visible: true,
      defaultText: "Penghargaan diberikan kepada yang bersangkutan atas dedikasi dan kontribusinya",
      useDefaultText: true,
    },
  ];
}

export function buildDefaultScoreLayers(w: number, h: number): TextLayerConfig[] {
  return [
    {
      id: "name",
      x: Math.round(w * 0.5), y: Math.round(h * 0.5),
      xPercent: 0.5, yPercent: 0.5,
      fontSize: 48, color: "#000000", fontWeight: "bold", fontFamily: "Arial",
      textAlign: "center", maxWidth: Math.round(w * 0.8), lineHeight: 1.2, visible: true,
    },
    {
      id: "issue_date",
      x: Math.round(w * 0.7), y: Math.round(h * 0.85),
      xPercent: 0.7, yPercent: 0.85,
      fontSize: 20, fontSizePercent: (20 / h) * 100,
      color: "#000000", fontWeight: "normal", fontFamily: "Arial",
      maxWidth: Math.round(w * 0.2), lineHeight: 1.2, visible: true,
    },
  ];
}

export function normalizeLayers(
  layers: TextLayer[],
  dims: { width: number; height: number },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _isDescription = false
): TextLayer[] {
  return layers.map((layer) => {
    const xPercent =
      layer.xPercent !== undefined && layer.xPercent !== null
        ? layer.xPercent
        : (layer.x || 0) / (dims.width || STANDARD_CANVAS_WIDTH);
    const yPercent =
      layer.yPercent !== undefined && layer.yPercent !== null
        ? layer.yPercent
        : (layer.y || 0) / (dims.height || STANDARD_CANVAS_HEIGHT);
    const x = Math.round(xPercent * dims.width);
    const y = Math.round(yPercent * dims.height);
    return {
      ...ensureFontSizePercent({ ...layer, x, y, xPercent, yPercent, maxWidth: layer.maxWidth || 300, lineHeight: layer.lineHeight || 1.2 }, dims.height),
      ...(layer.id === "description" ? { defaultText: layer.defaultText || "Penghargaan diberikan kepada yang bersangkutan atas dedikasi dan kontribusinya", useDefaultText: true } : {}),
    };
  });
}
