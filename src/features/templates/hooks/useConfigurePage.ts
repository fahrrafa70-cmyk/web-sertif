"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getTemplate, getTemplateImageUrl, saveTemplateLayout, getTemplateLayout } from "@/lib/supabase/templates";
import { uploadTemplatePhoto, deleteTemplatePhoto, validateImageFile } from "@/lib/supabase/photo-storage";
import { Template } from "@/lib/supabase/templates";
import { toast } from "sonner";
import type { TemplateLayoutConfig, TextLayerConfig, PhotoLayerConfig, QRCodeLayerConfig } from "@/types/template-layout";
import { STANDARD_CANVAS_WIDTH, STANDARD_CANVAS_HEIGHT } from "@/lib/constants/canvas";
import { useLanguage } from "@/contexts/language-context";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface TextLayer extends TextLayerConfig {
  isEditing?: boolean;
  isDragging?: boolean;
}

// ─── Helpers (module-level, no closures) ─────────────────────────────────────
export const DUMMY_DATA = {
  name: "John Doe",
  certificate_no: "251102000",
  issue_date: "30 October 2025",
  expired_date: "30 October 2028",
  description: "For outstanding achievement",
};

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

function buildDefaultCertLayers(w: number, h: number): TextLayerConfig[] {
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

function buildDefaultScoreLayers(w: number, h: number): TextLayerConfig[] {
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

function normalizeLayers(
  layers: TextLayer[],
  dims: { width: number; height: number },
  isDescription = false
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

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useConfigurePage() {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateId = searchParams?.get("template");

  // ── Template ──────────────────────────────────────────────────────────────
  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [templateImageUrl, setTemplateImageUrl] = useState<string | null>(null);
  const [certificateImageDimensions, setCertificateImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [scoreImageDimensions, setScoreImageDimensions] = useState<{ width: number; height: number } | null>(null);

  // ── Mode ──────────────────────────────────────────────────────────────────
  const [configMode, setConfigMode] = useState<"certificate" | "score">("certificate");
  const templateImageDimensions = configMode === "certificate" ? certificateImageDimensions : scoreImageDimensions;

  // ── Text layers ──────────────────────────────────────────────────────────
  const [certificateTextLayers, setCertificateTextLayers] = useState<TextLayer[]>([]);
  const [scoreTextLayers, setScoreTextLayers] = useState<TextLayer[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [renamingLayerId, setRenamingLayerId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const textLayers = configMode === "certificate" ? certificateTextLayers : scoreTextLayers;

  // ── Photo layers ──────────────────────────────────────────────────────────
  const [certificatePhotoLayers, setCertificatePhotoLayers] = useState<PhotoLayerConfig[]>([]);
  const [scorePhotoLayers, setScorePhotoLayers] = useState<PhotoLayerConfig[]>([]);
  const [selectedPhotoLayerId, setSelectedPhotoLayerId] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoLayers = configMode === "certificate" ? certificatePhotoLayers : scorePhotoLayers;

  // ── QR layers ─────────────────────────────────────────────────────────────
  const [certificateQRLayers, setCertificateQRLayers] = useState<QRCodeLayerConfig[]>([]);
  const [scoreQRLayers, setScoreQRLayers] = useState<QRCodeLayerConfig[]>([]);
  const [selectedQRLayerId, setSelectedQRLayerId] = useState<string | null>(null);
  const qrLayers = configMode === "certificate" ? certificateQRLayers : scoreQRLayers;

  // ── Preview/UI ────────────────────────────────────────────────────────────
  const [previewTexts, setPreviewTexts] = useState<Record<string, string>>({});
  const [richTextSelection, setRichTextSelection] = useState<{ start: number; end: number }>({ start: 0, end: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasScale, setCanvasScale] = useState(1);
  const [isDesktop, setIsDesktop] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [imagesLoaded, setImagesLoaded] = useState<{ certificate: boolean; score: boolean }>({ certificate: false, score: false });

  // ── Refs for layout loading ────────────────────────────────────────────────
  const existingLayoutRef = useRef<Awaited<ReturnType<typeof getTemplateLayout>> | null>(null);
  const lastCertDimensionsRef = useRef<{ width: number; height: number } | null>(null);
  const lastScoreDimensionsRef = useRef<{ width: number; height: number } | null>(null);

  // ── Load template ─────────────────────────────────────────────────────────
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    async function loadTemplate() {
      timeoutId = setTimeout(() => setLoading(false), 10000);

      if (!templateId) {
        toast.error(t("configure.noTemplateId"));
        router.push("/templates");
        return;
      }

      try {
        const tpl = await getTemplate(templateId);
        if (!tpl) {
          toast.error(t("configure.templateNotFound"));
          router.push("/templates");
          return;
        }
        setTemplate(tpl);

        // Set document title
        const titleToSet = `Configure ${tpl.name} | Certify - Certificate Platform`;
        const setTitle = (title: string) => { if (typeof document !== "undefined") document.title = title; };
        setTitle(titleToSet);
        [50, 200, 500].forEach((d) => setTimeout(() => setTitle(titleToSet), d));

        const imgUrl = await getTemplateImageUrl(tpl);
        setTemplateImageUrl(imgUrl);

        // Load existing layout
        const existingLayout = await getTemplateLayout(templateId);

        // Auto-migrate description layer for certificate
        if (existingLayout?.certificate?.textLayers) {
          const hasDesc = existingLayout.certificate.textLayers.some((l: TextLayerConfig) => l.id === "description");
          existingLayout.certificate.textLayers = existingLayout.certificate.textLayers.map((l: TextLayerConfig) =>
            l.id === "description"
              ? { ...l, defaultText: l.defaultText || "Penghargaan diberikan kepada yang bersangkutan atas dedikasi dan kontribusinya", useDefaultText: true }
              : l
          );
          if (!hasDesc) {
            existingLayout.certificate.textLayers.push({
              id: "description", x: 400, y: 390,
              xPercent: 400 / STANDARD_CANVAS_WIDTH, yPercent: 390 / STANDARD_CANVAS_HEIGHT,
              fontSize: 18, color: "#000000", fontWeight: "normal", fontFamily: "Arial",
              textAlign: "center", maxWidth: 480, lineHeight: 1.4, visible: true,
              defaultText: "Penghargaan diberikan kepada yang bersangkutan atas dedikasi dan kontribusinya",
              useDefaultText: true,
            } as TextLayerConfig);
          }
        }

        // Auto-migrate description layer for score
        if (existingLayout?.score?.textLayers) {
          const hasDesc = existingLayout.score.textLayers.some((l: TextLayerConfig) => l.id === "description");
          existingLayout.score.textLayers = existingLayout.score.textLayers.map((l: TextLayerConfig) =>
            l.id === "description"
              ? { ...l, defaultText: l.defaultText || "Penghargaan diberikan kepada yang bersangkutan atas dedikasi dan kontribusinya", useDefaultText: true }
              : l
          );
          if (!hasDesc) {
            existingLayout.score.textLayers.push({
              id: "description", x: 400, y: 390,
              xPercent: 400 / STANDARD_CANVAS_WIDTH, yPercent: 390 / STANDARD_CANVAS_HEIGHT,
              fontSize: 18, color: "#000000", fontWeight: "normal", fontFamily: "Arial",
              textAlign: "center", maxWidth: 480, lineHeight: 1.4, visible: true,
              defaultText: "Penghargaan diberikan kepada yang bersangkutan atas dedikasi dan kontribusinya",
              useDefaultText: true,
            } as TextLayerConfig);
          }
        }

        existingLayoutRef.current = existingLayout;

        // Load certificate image dimensions
        const certImgUrl = (tpl.certificate_image_url || tpl.image_path) as string;
        if (certImgUrl) {
          const certImg = new window.Image();
          certImg.crossOrigin = "anonymous";
          certImg.onerror = () => { clearTimeout(timeoutId); setLoading(false); };
          certImg.onload = () => {
            const dims = { width: certImg.naturalWidth, height: certImg.naturalHeight };
            setCertificateImageDimensions(dims);
            const layout = existingLayoutRef.current;
            if (layout?.certificate?.textLayers?.length) {
              const normalized = normalizeLayers(layout.certificate.textLayers as TextLayer[], dims).map((l) => {
                if (l.id === "certificate_no" || l.id === "issue_date") {
                  // eslint-disable-next-line @typescript-eslint/no-unused-vars
                  const { textAlign, ...rest } = l; return rest;
                }
                return l;
              });
              setCertificateTextLayers(normalized);
              if (layout.certificate.photoLayers?.length) setCertificatePhotoLayers(layout.certificate.photoLayers);
              if (layout.certificate.qrLayers?.length) setCertificateQRLayers(layout.certificate.qrLayers);
            } else {
              const defaults = buildDefaultCertLayers(dims.width, dims.height);
              setCertificateTextLayers(defaults);
              if (defaults.length) setSelectedLayerId(defaults[0].id);
            }
            clearTimeout(timeoutId);
            setLoading(false);
          };
          certImg.src = certImgUrl;
          if (certImg.complete) certImg.onload!(new Event("load"));
        } else {
          setCertificateImageDimensions({ width: STANDARD_CANVAS_WIDTH, height: STANDARD_CANVAS_HEIGHT });
          const defaults = buildDefaultCertLayers(STANDARD_CANVAS_WIDTH, STANDARD_CANVAS_HEIGHT);
          setCertificateTextLayers(defaults);
          if (defaults.length) setSelectedLayerId(defaults[0].id);
          clearTimeout(timeoutId);
          setLoading(false);
        }

        // Load score image if dual template
        if (tpl.is_dual_template && tpl.score_image_url) {
          const scoreImg = new window.Image();
          scoreImg.onerror = () => {};
          scoreImg.onload = () => {
            const dims = { width: scoreImg.naturalWidth, height: scoreImg.naturalHeight };
            setScoreImageDimensions(dims);
            const layout = existingLayoutRef.current;
            if (layout?.score?.textLayers?.length) {
              let normalized = normalizeLayers(layout.score.textLayers as TextLayer[], dims);
              if (!normalized.some((l) => l.id === "issue_date")) {
                normalized = [...normalized, {
                  id: "issue_date", x: Math.round(dims.width * 0.7), y: Math.round(dims.height * 0.85),
                  xPercent: 0.7, yPercent: 0.85, fontSize: 20, fontSizePercent: (20 / dims.height) * 100,
                  color: "#000000", fontWeight: "normal", fontFamily: "Arial",
                  maxWidth: Math.round(dims.width * 0.2), lineHeight: 1.2, visible: true,
                } as TextLayerConfig];
              }
              setScoreTextLayers(normalized);
              if (layout.score.photoLayers?.length) setScorePhotoLayers(layout.score.photoLayers);
              if (layout.score.qrLayers?.length) setScoreQRLayers(layout.score.qrLayers);
            } else {
              setScoreTextLayers(buildDefaultScoreLayers(dims.width, dims.height));
            }
          };
          scoreImg.src = tpl.score_image_url;
          if (scoreImg.complete) scoreImg.onload!(new Event("load"));
        }
      } catch {
        toast.error(t("configure.failedToLoad"));
        clearTimeout(timeoutId);
      }
    }

    loadTemplate();
    return () => { if (timeoutId) clearTimeout(timeoutId); };
  }, [templateId, router]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Preload images ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!template) return;
    const preload = (src: string, type: "certificate" | "score") => {
      const img = new window.Image();
      img.onload = () => setImagesLoaded((p) => ({ ...p, [type]: true }));
      img.onerror = () => setImagesLoaded((p) => ({ ...p, [type]: true }));
      img.src = src;
    };
    if (template.certificate_image_url) preload(template.certificate_image_url, "certificate");
    else setImagesLoaded((p) => ({ ...p, certificate: true }));
    if (template.score_image_url) preload(template.score_image_url, "score");
    else setImagesLoaded((p) => ({ ...p, score: true }));
  }, [template]);

  // ── Screen size detection ─────────────────────────────────────────────────
  useEffect(() => {
    const check = () => {
      const w = window.innerWidth;
      setIsDesktop(w >= 1024);
      setIsTablet(w >= 768 && w < 1024);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // ── Arrow key navigation ──────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((!selectedLayerId && !selectedPhotoLayerId) || renamingLayerId) return;
      const active = document.activeElement;
      if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || (active as HTMLElement).contentEditable === "true")) return;
      const isArrow = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key);
      if (!isArrow) return;
      e.preventDefault();

      let step = 1;
      if (e.shiftKey) step = 10;
      if (e.altKey) step = 0.1;

      const tw = templateImageDimensions?.width || STANDARD_CANVAS_WIDTH;
      const th = templateImageDimensions?.height || STANDARD_CANVAS_HEIGHT;
      const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
      const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;

      if (selectedLayerId) {
        const layer = textLayers.find((l) => l.id === selectedLayerId);
        if (!layer) return;
        const nx = Math.max(0, Math.min(tw, layer.x + dx));
        const ny = Math.max(0, Math.min(th, layer.y + dy));
        const setter = configMode === "certificate" ? setCertificateTextLayers : setScoreTextLayers;
        setter((prev) => prev.map((l) => l.id === selectedLayerId ? { ...l, x: Math.round(nx * 10) / 10, y: Math.round(ny * 10) / 10, xPercent: nx / tw, yPercent: ny / th } : l));
      }
      if (selectedPhotoLayerId) {
        const photo = photoLayers.find((l) => l.id === selectedPhotoLayerId);
        if (!photo) return;
        const cx = photo.xPercent * tw, cy = photo.yPercent * th;
        const nx = Math.max(0, Math.min(tw, cx + dx));
        const ny = Math.max(0, Math.min(th, cy + dy));
        const setter = configMode === "certificate" ? setCertificatePhotoLayers : setScorePhotoLayers;
        setter((prev) => prev.map((l) => l.id === selectedPhotoLayerId ? { ...l, x: Math.round(nx * 10) / 10, y: Math.round(ny * 10) / 10, xPercent: nx / tw, yPercent: ny / th } : l));
      }
      if (selectedQRLayerId) {
        const qr = qrLayers.find((l) => l.id === selectedQRLayerId);
        if (!qr) return;
        const cx = qr.xPercent * tw, cy = qr.yPercent * th;
        const nx = Math.max(0, Math.min(tw, cx + dx));
        const ny = Math.max(0, Math.min(th, cy + dy));
        const setter = configMode === "certificate" ? setCertificateQRLayers : setScoreQRLayers;
        setter((prev) => prev.map((l) => l.id === selectedQRLayerId ? { ...l, x: Math.round(nx * 10) / 10, y: Math.round(ny * 10) / 10, xPercent: nx / tw, yPercent: ny / th } : l));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedLayerId, selectedPhotoLayerId, selectedQRLayerId, renamingLayerId, textLayers, photoLayers, qrLayers, configMode, templateImageDimensions]);

  // ── Normalize coordinates on dimension change ─────────────────────────────
  useEffect(() => {
    if (!certificateImageDimensions) return;
    const last = lastCertDimensionsRef.current;
    if (last && last.width === certificateImageDimensions.width && last.height === certificateImageDimensions.height) return;
    lastCertDimensionsRef.current = certificateImageDimensions;
    setCertificateTextLayers((prev) => {
      if (!prev.length) return prev;
      return prev.map((l) => {
        const xPct = l.xPercent ?? (l.x || 0) / (certificateImageDimensions.width || STANDARD_CANVAS_WIDTH);
        const yPct = l.yPercent ?? (l.y || 0) / (certificateImageDimensions.height || STANDARD_CANVAS_HEIGHT);
        return { ...l, x: Math.round(xPct * certificateImageDimensions.width), y: Math.round(yPct * certificateImageDimensions.height), xPercent: xPct, yPercent: yPct };
      });
    });
  }, [certificateImageDimensions?.width, certificateImageDimensions?.height]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!scoreImageDimensions) return;
    const last = lastScoreDimensionsRef.current;
    if (last && last.width === scoreImageDimensions.width && last.height === scoreImageDimensions.height) return;
    lastScoreDimensionsRef.current = scoreImageDimensions;
    setScoreTextLayers((prev) => {
      if (!prev.length) return prev;
      return prev.map((l) => {
        const xPct = l.xPercent ?? (l.x || 0) / (scoreImageDimensions.width || STANDARD_CANVAS_WIDTH);
        const yPct = l.yPercent ?? (l.y || 0) / (scoreImageDimensions.height || STANDARD_CANVAS_HEIGHT);
        return { ...l, x: Math.round(xPct * scoreImageDimensions.width), y: Math.round(yPct * scoreImageDimensions.height), xPercent: xPct, yPercent: yPct };
      });
    });
  }, [scoreImageDimensions?.width, scoreImageDimensions?.height]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Canvas scale ──────────────────────────────────────────────────────────
  useEffect(() => {
    const updateScale = () => {
      if (!canvasRef.current) return;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (!canvasRef.current) return;
          const cw = canvasRef.current.offsetWidth;
          const ch = canvasRef.current.offsetHeight;
          if (cw <= 0 || (isDesktop && ch <= 0)) return;
          const tw = templateImageDimensions?.width || STANDARD_CANVAS_WIDTH;
          const th = templateImageDimensions?.height || STANDARD_CANVAS_HEIGHT;
          const sx = cw / tw, sy = ch / th;
          const scale = isDesktop ? Math.min(sx, sy) : sx;
          if (isNaN(scale) || !isFinite(scale) || scale <= 0) return;
          setCanvasScale(scale);
        });
      });
    };

    const t1 = setTimeout(updateScale, 50);
    const t2 = setTimeout(updateScale, 100);
    const t3 = setTimeout(updateScale, 200);
    window.addEventListener("resize", updateScale);

    let ro: ResizeObserver | null = null;
    const el = canvasRef.current;
    if (el && typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => requestAnimationFrame(updateScale));
      ro.observe(el);
    }
    updateScale();

    return () => {
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3);
      window.removeEventListener("resize", updateScale);
      if (ro && el) ro.unobserve(el);
    };
  }, [template, templateImageUrl, textLayers.length, templateImageDimensions, isDesktop]);

  // ── Initialize default layers ─────────────────────────────────────────────
  const initializeDefaultCertificateLayers = useCallback(() => {
    const layers = buildDefaultCertLayers(STANDARD_CANVAS_WIDTH, STANDARD_CANVAS_HEIGHT);
    setCertificateTextLayers(layers);
    if (layers.length) setSelectedLayerId(layers[0].id);
  }, []);

  // ── Drag handlers ─────────────────────────────────────────────────────────
  const handleLayerPointerDown = useCallback((layerId: string, e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
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
  }, [textLayers, templateImageDimensions, canvasScale, configMode]);

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
      if (direction === "right" || direction === "left") updates.maxWidth = Math.round(Math.max(50, startWidth + (direction === "right" ? dx : -dx)));
      else if (direction === "bottom" || direction === "top") updates.lineHeight = Math.round(Math.max(0.5, Math.min(3, (startHeight + (direction === "bottom" ? dy : -dy)) / layer.fontSize)) * 10) / 10;
      else if (direction === "corner") {
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
  }, [textLayers, canvasScale, configMode]);

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qrLayers, canvasScale, configMode, templateImageDimensions]);

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
  }, [photoLayers, templateImageDimensions, canvasScale, configMode]);

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
  }, [qrLayers, templateImageDimensions, canvasScale, configMode]);

  // ── Text measurement ──────────────────────────────────────────────────────
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

  // ── Layer update ──────────────────────────────────────────────────────────
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

  // ── Add / delete layers ───────────────────────────────────────────────────
  const addTextLayer = useCallback(() => {
    const newId = `custom_${Date.now()}`;
    if (textLayers.some((l) => l.id === newId)) { toast.error("Failed to create unique layer ID."); return; }
    const newLayer: TextLayerConfig = {
      id: newId, x: 400, y: 200,
      xPercent: 400 / STANDARD_CANVAS_WIDTH, yPercent: 200 / STANDARD_CANVAS_HEIGHT,
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

  // ── Photo layer handlers ──────────────────────────────────────────────────
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template, setPhotoLayers, t]);

  const updatePhotoLayer = useCallback((layerId: string, updates: Partial<PhotoLayerConfig>) => {
    setPhotoLayers((prev) => prev.map((l) => l.id === layerId ? { ...l, ...updates } : l));
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoLayers, selectedPhotoLayerId, setPhotoLayers, t]);

  // ── QR code handlers ──────────────────────────────────────────────────────
  const addQRCodeLayer = useCallback(() => {
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
    if (configMode === "certificate") setCertificateQRLayers((prev) => [...prev, newLayer]);
    else setScoreQRLayers((prev) => [...prev, newLayer]);
    setSelectedQRLayerId(newLayer.id);
    setSelectedLayerId(null);
    setSelectedPhotoLayerId(null);
    toast.success("QR code layer added. Remember to save.");
  }, [templateImageDimensions, configMode]);

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
    if (configMode === "certificate") setCertificateQRLayers((prev) => prev.map((l) => l.id === layerId ? { ...l, ...updates } : l));
    else setScoreQRLayers((prev) => prev.map((l) => l.id === layerId ? { ...l, ...updates } : l));
  }, [templateImageDimensions, configMode]);

  const deleteQRLayer = useCallback((layerId: string) => {
    if (configMode === "certificate") setCertificateQRLayers((prev) => prev.filter((l) => l.id !== layerId));
    else setScoreQRLayers((prev) => prev.filter((l) => l.id !== layerId));
    if (selectedQRLayerId === layerId) setSelectedQRLayerId(null);
    toast.success("QR code layer deleted. Remember to save.");
  }, [configMode, selectedQRLayerId]);

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!template) return;
    if (configMode === "certificate") {
      const ids = certificateTextLayers.map((l) => l.id);
      const missing = ["name", "certificate_no", "issue_date"].filter((f) => !ids.includes(f));
      if (missing.length) { toast.error(t("configure.missingRequiredFields").replace("{fields}", missing.join(", "))); return; }
    } else {
      if (!scoreTextLayers.some((l) => l.id === "issue_date")) { toast.error(t("configure.missingRequiredFields").replace("{fields}", "issue_date")); return; }
    }
    setSaving(true);
    try {
      const layoutConfig: TemplateLayoutConfig = {
        certificate: {
          textLayers: certificateTextLayers.map((l) => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { isDragging, isEditing, ...rest } = l;
            if (l.id === "certificate_no" || l.id === "issue_date") {
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const { textAlign, ...clean } = rest; return clean;
            }
            return rest;
          }),
          photoLayers: certificatePhotoLayers,
          qrLayers: certificateQRLayers,
        },
        canvas: { width: STANDARD_CANVAS_WIDTH, height: STANDARD_CANVAS_HEIGHT },
        version: "1.0",
        lastSavedAt: new Date().toISOString(),
      };
      if (template.is_dual_template) {
        layoutConfig.score = {
          textLayers: scoreTextLayers.map((l) => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { isDragging, isEditing, ...rest } = l;
            if (l.id === "issue_date") {
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const { textAlign, ...clean } = rest; return clean;
            }
            return rest;
          }),
          photoLayers: scorePhotoLayers,
          qrLayers: scoreQRLayers,
        };
      }
      await saveTemplateLayout(template.id, layoutConfig);
      toast.success(t("configure.saveSuccess"));
      setTimeout(() => router.push("/templates"), 1000);
    } catch {
      toast.error(t("configure.saveFailed"));
    } finally {
      setSaving(false);
    }
  }, [template, configMode, certificateTextLayers, scoreTextLayers, certificatePhotoLayers, scorePhotoLayers, certificateQRLayers, scoreQRLayers, t, router]);

  // ── Rename layer ──────────────────────────────────────────────────────────
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

  // ── Computed ─────────────────────────────────────────────────────────────
  const selectedLayer = textLayers.find((l) => l.id === selectedLayerId);

  return {
    // Template state
    template, loading, saving, templateImageUrl, templateImageDimensions,
    certificateImageDimensions, scoreImageDimensions,
    // Mode
    configMode, setConfigMode,
    // Text layers
    textLayers, certificateTextLayers, scoreTextLayers,
    selectedLayerId, setSelectedLayerId,
    renamingLayerId, setRenamingLayerId,
    renameValue, setRenameValue,
    selectedLayer,
    // Photo layers
    photoLayers, certificatePhotoLayers, scorePhotoLayers,
    selectedPhotoLayerId, setSelectedPhotoLayerId,
    uploadingPhoto, setPhotoLayers,
    // QR layers
    qrLayers, certificateQRLayers, scoreQRLayers,
    selectedQRLayerId, setSelectedQRLayerId,
    // Preview
    previewTexts, setPreviewTexts,
    richTextSelection, setRichTextSelection,
    canvasRef, canvasScale,
    isDesktop, isTablet,
    previewModalOpen, setPreviewModalOpen,
    imagesLoaded,
    // Actions
    initializeDefaultCertificateLayers,
    handleLayerPointerDown, handleResizePointerDown, handleQRResizePointerDown,
    handlePhotoLayerMouseDown, handleQRLayerMouseDown,
    measureTextWidth, updateLayer,
    addTextLayer, deleteLayer, toggleLayerVisibility,
    handlePhotoUpload, updatePhotoLayer, deletePhotoLayer,
    addQRCodeLayer, updateQRLayer, deleteQRLayer,
    handleSave,
    handleLayerDoubleClick, handleRenameSubmit,
    // i18n
    t,
    // Router
    router,
  };
}
