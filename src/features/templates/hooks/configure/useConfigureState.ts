import { useState, useRef, useEffect } from "react";
import { Template } from "@/lib/supabase/templates";

export function useConfigureState() {
  const [configMode, setConfigMode] = useState<"certificate" | "score">("certificate");
  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [templateImageUrl, setTemplateImageUrl] = useState<string | null>(null);
  
  const [certificateImageDimensions, setCertificateImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [scoreImageDimensions, setScoreImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const templateImageDimensions = configMode === "certificate" ? certificateImageDimensions : scoreImageDimensions;

  const [previewTexts, setPreviewTexts] = useState<Record<string, string>>({});
  const [richTextSelection, setRichTextSelection] = useState<{ start: number; end: number }>({ start: 0, end: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasScale, setCanvasScale] = useState(1);
  const [isDesktop, setIsDesktop] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [imagesLoaded, setImagesLoaded] = useState<{ certificate: boolean; score: boolean }>({ certificate: false, score: false });

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

  return {
    configMode, setConfigMode,
    template, setTemplate,
    loading, setLoading,
    saving, setSaving,
    templateImageUrl, setTemplateImageUrl,
    certificateImageDimensions, setCertificateImageDimensions,
    scoreImageDimensions, setScoreImageDimensions,
    templateImageDimensions,
    previewTexts, setPreviewTexts,
    richTextSelection, setRichTextSelection,
    canvasRef, canvasScale, setCanvasScale,
    isDesktop, isTablet,
    previewModalOpen, setPreviewModalOpen,
    imagesLoaded, setImagesLoaded,
  };
}
