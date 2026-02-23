"use client";
import { useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getTemplate, getTemplateImageUrl, saveTemplateLayout, getTemplateLayout } from "@/lib/supabase/templates";
import { toast } from "sonner";
import type { TemplateLayoutConfig, TextLayerConfig, PhotoLayerConfig } from "@/types/template-layout";
import { STANDARD_CANVAS_WIDTH, STANDARD_CANVAS_HEIGHT } from "@/lib/constants/canvas";
import { useLanguage } from "@/contexts/language-context";

import { TextLayer, DUMMY_DATA } from "./configure/types";
export type { TextLayer };
export { DUMMY_DATA };

import { buildDefaultCertLayers, buildDefaultScoreLayers, normalizeLayers } from "./configure/utils";
import { useConfigureState } from "./configure/useConfigureState";
import { useTextLayers } from "./configure/useTextLayers";
import { usePhotoLayers } from "./configure/usePhotoLayers";
import { useQRLayers } from "./configure/useQRLayers";
import { useConfigureDrag } from "./configure/useConfigureDrag";

export function useConfigurePage() {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateId = searchParams?.get("template");

  const baseState = useConfigureState();
  const {
    configMode, template, loading, setLoading, saving, setSaving, 
    setTemplate, setTemplateImageUrl, templateImageDimensions,
    certificateImageDimensions, setCertificateImageDimensions,
    scoreImageDimensions, setScoreImageDimensions,
    canvasRef, canvasScale, setCanvasScale, isDesktop, setImagesLoaded
  } = baseState;

  const textState = useTextLayers(configMode, templateImageDimensions, baseState.previewTexts, t);
  const { certificateTextLayers, setCertificateTextLayers, scoreTextLayers, setScoreTextLayers, textLayers, selectedLayerId, setSelectedLayerId, renamingLayerId } = textState;

  const photoState = usePhotoLayers(configMode, template, t);
  const { photoLayers, setCertificatePhotoLayers, setScorePhotoLayers, selectedPhotoLayerId } = photoState;

  const qrState = useQRLayers(configMode, templateImageDimensions);
  const { qrLayers, setCertificateQRLayers, setScoreQRLayers, selectedQRLayerId } = qrState;

  const dragCtx = {
    configMode, canvasRef, canvasScale, templateImageDimensions,
    textLayers, photoLayers, qrLayers,
    setCertificateTextLayers, setScoreTextLayers,
    setCertificatePhotoLayers, setScorePhotoLayers,
    setCertificateQRLayers, setScoreQRLayers,
    setSelectedLayerId, setSelectedPhotoLayerId: photoState.setSelectedPhotoLayerId,
    setSelectedQRLayerId: qrState.setSelectedQRLayerId, updateQRLayer: qrState.updateQRLayer
  };
  const dragState = useConfigureDrag(dragCtx);

  const existingLayoutRef = useRef<Awaited<ReturnType<typeof getTemplateLayout>> | null>(null);
  const lastCertDimensionsRef = useRef<{ width: number; height: number } | null>(null);
  const lastScoreDimensionsRef = useRef<{ width: number; height: number } | null>(null);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    async function loadTemplate() {
      timeoutId = setTimeout(() => setLoading(false), 10000);
      if (!templateId) { toast.error(t("configure.noTemplateId")); router.push("/templates"); return; }
      try {
        const tpl = await getTemplate(templateId);
        if (!tpl) { toast.error(t("configure.templateNotFound")); router.push("/templates"); return; }
        setTemplate(tpl);
        const titleToSet = `Configure ${tpl.name} | Certify - Certificate Platform`;
        const setTitle = (title: string) => { if (typeof document !== "undefined") document.title = title; };
        setTitle(titleToSet);
        [50, 200, 500].forEach((d) => setTimeout(() => setTitle(titleToSet), d));

        const imgUrl = await getTemplateImageUrl(tpl);
        setTemplateImageUrl(imgUrl);

        const existingLayout = await getTemplateLayout(templateId);
        if (existingLayout?.certificate?.textLayers) {
          const hasDesc = existingLayout.certificate.textLayers.some((l: TextLayerConfig) => l.id === "description");
          existingLayout.certificate.textLayers = existingLayout.certificate.textLayers.map((l: TextLayerConfig) =>
            l.id === "description" ? { ...l, defaultText: l.defaultText || "Penghargaan diberikan kepada yang bersangkutan atas dedikasi dan kontribusinya", useDefaultText: true } : l
          );
          if (!hasDesc) existingLayout.certificate.textLayers.push({ id: "description", x: 400, y: 390, xPercent: 400 / STANDARD_CANVAS_WIDTH, yPercent: 390 / STANDARD_CANVAS_HEIGHT, fontSize: 18, color: "#000000", fontWeight: "normal", fontFamily: "Arial", textAlign: "center", maxWidth: 480, lineHeight: 1.4, visible: true, defaultText: "Penghargaan diberikan kepada yang bersangkutan atas dedikasi dan kontribusinya", useDefaultText: true } as TextLayerConfig);
        }
        if (existingLayout?.score?.textLayers) {
          const hasDesc = existingLayout.score.textLayers.some((l: TextLayerConfig) => l.id === "description");
          existingLayout.score.textLayers = existingLayout.score.textLayers.map((l: TextLayerConfig) =>
            l.id === "description" ? { ...l, defaultText: l.defaultText || "Penghargaan diberikan kepada yang bersangkutan atas dedikasi dan kontribusinya", useDefaultText: true } : l
          );
          if (!hasDesc) existingLayout.score.textLayers.push({ id: "description", x: 400, y: 390, xPercent: 400 / STANDARD_CANVAS_WIDTH, yPercent: 390 / STANDARD_CANVAS_HEIGHT, fontSize: 18, color: "#000000", fontWeight: "normal", fontFamily: "Arial", textAlign: "center", maxWidth: 480, lineHeight: 1.4, visible: true, defaultText: "Penghargaan diberikan kepada yang bersangkutan atas dedikasi dan kontribusinya", useDefaultText: true } as TextLayerConfig);
        }
        existingLayoutRef.current = existingLayout;

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
                if (l.id === "certificate_no" || l.id === "issue_date") { const { textAlign, ...rest } = l; return rest as any; }
                return l;
              });
              setCertificateTextLayers(normalized);
              if (layout.certificate.photoLayers?.length) setCertificatePhotoLayers(layout.certificate.photoLayers);
              if (layout.certificate.qrLayers?.length) setCertificateQRLayers(layout.certificate.qrLayers);
            } else {
              const defaults = buildDefaultCertLayers(dims.width, dims.height);
              setCertificateTextLayers(defaults as TextLayer[]);
              if (defaults.length) setSelectedLayerId(defaults[0].id);
            }
            clearTimeout(timeoutId); setLoading(false);
          };
          certImg.src = certImgUrl;
          if (certImg.complete) certImg.onload!(new Event("load"));
        } else {
          setCertificateImageDimensions({ width: STANDARD_CANVAS_WIDTH, height: STANDARD_CANVAS_HEIGHT });
          const defaults = buildDefaultCertLayers(STANDARD_CANVAS_WIDTH, STANDARD_CANVAS_HEIGHT);
          setCertificateTextLayers(defaults as TextLayer[]);
          if (defaults.length) setSelectedLayerId(defaults[0].id);
          clearTimeout(timeoutId); setLoading(false);
        }

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
                normalized = [...normalized, { id: "issue_date", x: Math.round(dims.width * 0.7), y: Math.round(dims.height * 0.85), xPercent: 0.7, yPercent: 0.85, fontSize: 20, fontSizePercent: (20 / dims.height) * 100, color: "#000000", fontWeight: "normal", fontFamily: "Arial", maxWidth: Math.round(dims.width * 0.2), lineHeight: 1.2, visible: true } as TextLayer];
              }
              setScoreTextLayers(normalized);
              if (layout.score.photoLayers?.length) setScorePhotoLayers(layout.score.photoLayers);
              if (layout.score.qrLayers?.length) setScoreQRLayers(layout.score.qrLayers);
            } else {
              setScoreTextLayers(buildDefaultScoreLayers(dims.width, dims.height) as TextLayer[]);
            }
          };
          scoreImg.src = tpl.score_image_url;
          if (scoreImg.complete) scoreImg.onload!(new Event("load"));
        }
      } catch {
        toast.error(t("configure.failedToLoad")); clearTimeout(timeoutId);
      }
    }
    loadTemplate();
    return () => { if (timeoutId) clearTimeout(timeoutId); };
  }, [templateId, router]); // eslint-disable-line react-hooks/exhaustive-deps

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
  }, [template, setImagesLoaded]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((!selectedLayerId && !selectedPhotoLayerId) || renamingLayerId) return;
      const active = document.activeElement;
      if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || (active as HTMLElement).contentEditable === "true")) return;
      const isArrow = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key);
      if (!isArrow) return;
      e.preventDefault();

      let step = 1; if (e.shiftKey) step = 10; if (e.altKey) step = 0.1;
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
  }, [selectedLayerId, selectedPhotoLayerId, selectedQRLayerId, renamingLayerId, textLayers, photoLayers, qrLayers, configMode, templateImageDimensions, setCertificateTextLayers, setScoreTextLayers, setCertificatePhotoLayers, setScorePhotoLayers, setCertificateQRLayers, setScoreQRLayers]);

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
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); window.removeEventListener("resize", updateScale); if (ro && el) ro.unobserve(el); };
  }, [template, baseState.templateImageUrl, textLayers.length, templateImageDimensions, isDesktop, canvasRef, setCanvasScale]);

  const initializeDefaultCertificateLayers = useCallback(() => {
    const layers = buildDefaultCertLayers(STANDARD_CANVAS_WIDTH, STANDARD_CANVAS_HEIGHT);
    setCertificateTextLayers(layers as TextLayer[]);
    if (layers.length) setSelectedLayerId(layers[0].id);
  }, [setCertificateTextLayers, setSelectedLayerId]);

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
            const { isDragging, isEditing, ...rest } = l; // eslint-disable-line @typescript-eslint/no-unused-vars
            if (l.id === "certificate_no" || l.id === "issue_date") { const { textAlign, ...clean } = rest as any; return clean; }
            return rest as any;
          }),
          photoLayers: photoState.certificatePhotoLayers,
          qrLayers: qrState.certificateQRLayers,
        },
        canvas: { width: STANDARD_CANVAS_WIDTH, height: STANDARD_CANVAS_HEIGHT },
        version: "1.0",
        lastSavedAt: new Date().toISOString(),
      };
      if (template.is_dual_template) {
        layoutConfig.score = {
          textLayers: scoreTextLayers.map((l) => {
            const { isDragging, isEditing, ...rest } = l; // eslint-disable-line @typescript-eslint/no-unused-vars
            if (l.id === "issue_date") { const { textAlign, ...clean } = rest as any; return clean; }
            return rest as any;
          }),
          photoLayers: photoState.scorePhotoLayers,
          qrLayers: qrState.scoreQRLayers,
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
  }, [template, configMode, certificateTextLayers, scoreTextLayers, photoState.certificatePhotoLayers, photoState.scorePhotoLayers, qrState.certificateQRLayers, qrState.scoreQRLayers, t, router, setSaving]);

  return {
    ...baseState,
    ...textState,
    ...photoState,
    ...qrState,
    ...dragState,
    initializeDefaultCertificateLayers,
    handleSave,
    t,
    router,
  };
}
