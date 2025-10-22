"use client";

import Header from "@/components/header";
import Footer from "@/components/footer";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import * as XLSX from "xlsx";
import { useEffect, useState, useRef, useCallback, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Eye, FileText, Image as ImageIcon } from "lucide-react";
import { useBodyScrollLock } from "@/hooks/use-body-scroll-lock";
import { useLanguage } from "@/contexts/language-context";
import { getTemplate, getTemplateImageUrl } from "@/lib/supabase/templates";
import { Template } from "@/lib/supabase/templates";
import {
  createCertificate,
  CreateCertificateData,
} from "@/lib/supabase/certificates";
import { toast, Toaster } from "sonner";
import { confirmToast } from "@/lib/ui/confirm";
import html2canvas from "html2canvas";
import GlobalFontSettings from "@/components/GlobalFontSettings";
import { getMembers, Member } from "@/lib/supabase/members";
import {
  saveTemplateDefaults,
  getTemplateDefaults,
  TextLayerDefault,
} from "@/lib/storage/template-defaults";

type CertificateData = {
  certificate_no: string;
  name: string;
  description: string;
  issue_date: string;
  expired_date: string;
};

// Helper to compute selected style object from current selection

type TextLayer = {
  id: string;
  text: string;
  x: number;
  y: number;
  xPercent: number; // FIX: Always store normalized X position (0-1)
  yPercent: number; // FIX: Always store normalized Y position (0-1)
  fontSize: number;
  color: string;
  fontWeight: string;
  fontFamily: string;
  isEditing?: boolean;
};

function CertificateGeneratorContent() {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateId = searchParams?.get("template");

  const [role, setRole] = useState<"Admin" | "Team" | "Public">("Public");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [textLayers, setTextLayers] = useState<TextLayer[]>([]);
  const [draggingLayer, setDraggingLayer] = useState<string | null>(null);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  // FIX: Standard canvas dimensions for consistent positioning
  const STANDARD_CANVAS_WIDTH = 800;
  const STANDARD_CANVAS_HEIGHT = 600;
  const [canvasDimensions, setCanvasDimensions] = useState({
    width: STANDARD_CANVAS_WIDTH,
    height: STANDARD_CANVAS_HEIGHT,
  });
  const [snapGridEnabled, setSnapGridEnabled] = useState(false);
  const gridSize = 20; // Grid spacing in pixels
  const [overlayImages, setOverlayImages] = useState<Array<{id: string; url: string; x: number; y: number; width: number; height: number; aspectRatio: number}>>([]);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [draggingImage, setDraggingImage] = useState<string | null>(null);
  const [resizingImage, setResizingImage] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const imageDragStartRef = useRef<{x: number; y: number; imgX: number; imgY: number} | null>(null);
  const resizeStartRef = useRef<{x: number; y: number; width: number; height: number} | null>(null);

  // Refs to right-panel inputs so we can focus them when clicking canvas text
  const certNoRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);
  const issueRef = useRef<HTMLInputElement>(null);
  const expiryRef = useRef<HTMLInputElement>(null);
  
  const suppressSyncRef = useRef(false);
  const defaultsLoadedForTemplateRef = useRef<string | null>(null);

  // Track click vs drag to avoid focusing inputs during drag
  const lastDownPosRef = useRef<{ x: number; y: number } | null>(null);
  const lastDownLayerRef = useRef<string | null>(null);
  const didMoveRef = useRef<boolean>(false);
  const candidateLayerRef = useRef<string | null>(null);
  const downOffsetRef = useRef<{ x: number; y: number } | null>(null);

  function focusFieldForLayer(id: string, scroll: boolean = true) {
    setFocusedField(id);
    let el: HTMLInputElement | HTMLTextAreaElement | null = null;
    switch (id) {
      case "certificate_no":
        el = certNoRef.current;
        break;
      case "name":
        el = nameRef.current;
        break;
      case "description":
        el = descRef.current;
        break;
      case "issue_date":
        el = issueRef.current;
        break;
      case "expired_date":
        el = expiryRef.current;
        break;
    }
    if (el) {
      el.focus();
      if (scroll) {
        try { el.scrollIntoView({ behavior: "smooth", block: "nearest" }); } catch {}
      }
    }
  }
  // Default dates: issue today, expiry +5 years
  const __nowForDefaults = new Date();
  const __expiryForDefaults = new Date(__nowForDefaults);
  __expiryForDefaults.setFullYear(__expiryForDefaults.getFullYear() + 5);
  const __fmt = (d: Date) => d.toISOString().split("T")[0];

  const [certificateData, setCertificateData] = useState<CertificateData>({
    certificate_no: "CERT-2024-001",
    name: "John Doe",
    description:
      "This certificate is awarded for successful completion of the program.",
    issue_date: __fmt(__nowForDefaults),
    expired_date: __fmt(__expiryForDefaults),
  });
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [imageDimensions, setImageDimensions] = useState<{
    width: number;
    height: number;
    aspectRatio: number;
  } | null>(null);

  // Global font settings
  const [globalFontSettings] = useState({
    fontSize: 50,
    fontFamily: "Arial",
    color: "#000000",
    fontWeight: "normal",
  });

  // Single date format applied to both issue and expiry dates (form keeps ISO)
  const [dateFormat, setDateFormat] = useState<string>("yyyy-mm-dd");

  // Format an ISO date (yyyy-mm-dd) into chosen format for canvas text
  const formatDateString = useCallback((iso: string, fmt: string): string => {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const mmm = d.toLocaleString('en-US', { month: 'short' });
    const mmmm = d.toLocaleString('en-US', { month: 'long' });
    switch (fmt) {
      case 'dd-mm-yyyy': return `${dd}-${mm}-${yyyy}`;
      case 'mm-dd-yyyy': return `${mm}-${dd}-${yyyy}`;
      case 'yyyy-mm-dd': return `${yyyy}-${mm}-${dd}`;
      case 'dd-mmm-yyyy': return `${dd} ${mmm} ${yyyy}`;
      case 'dd-mmmm-yyyy': return `${dd} ${mmmm} ${yyyy}`;
      case 'mmm-dd-yyyy': return `${mmm} ${dd}, ${yyyy}`;
      case 'mmmm-dd-yyyy': return `${mmmm} ${dd}, ${yyyy}`;
      case 'dd/mm/yyyy': return `${dd}/${mm}/${yyyy}`;
      case 'mm/dd/yyyy': return `${mm}/${dd}/${yyyy}`;
      case 'yyyy/mm/dd': return `${yyyy}/${mm}/${dd}`;
      default: return iso;
    }
  }, []);

  // Import Excel instruction modal state
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [excelRows, setExcelRows] = useState<Array<Record<string, unknown>>>([]);
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<{[k:string]: string}>({
    certificate_no: "",
    name: "",
    description: "",
    issue_date: "",
    expired_date: "",
  });
  const [selectedRowIndex, setSelectedRowIndex] = useState<number>(0);
  const [selectedFileName, setSelectedFileName] = useState<string>("");

  // Excel helpers
  const excelDateToISO = useCallback((val: unknown): string => {
    try {
      if (val == null || (typeof val === "string" && val === "")) return "";
      if (typeof val === "number") {
        const epoch = new Date(Date.UTC(1899, 11, 30));
        const ms = val * 86400000;
        const d = new Date(epoch.getTime() + ms);
        return d.toISOString().slice(0, 10);
      }
      if (val instanceof Date) {
        if (!isNaN(val.getTime())) return val.toISOString().slice(0, 10);
      }
      if (typeof val === "string") {
        const d = new Date(val);
        if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
        return val;
      }
      return String(val);
    } catch { return String(val ?? ""); }
  }, []);

  const handleExcelFile = useCallback(async (file: File) => {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: "" }) as Array<Record<string, unknown>>;
    const headers = rows.length > 0 ? Object.keys(rows[0] as Record<string, unknown>) : [];
    setExcelRows(rows);
    setExcelHeaders(headers);
    setSelectedRowIndex(0);
    setMapping((m) => ({ ...m }));
  }, []);

  const applyRowToPreview = useCallback((idx: number) => {
    if (!excelRows.length) return;
    const row = excelRows[idx] || {};
    const get = (key: string) => (mapping[key] ? row[mapping[key]] : "");
    suppressSyncRef.current = true;
    // Use functional set to avoid depending on outer certificateData
    setCertificateData((prev) => {
      const nextData: CertificateData = {
        certificate_no: String(get("certificate_no") || prev.certificate_no || ""),
        name: String(get("name") || prev.name || ""),
        description: String(get("description") || prev.description || ""),
        issue_date: excelDateToISO(get("issue_date") || prev.issue_date || ""),
        expired_date: excelDateToISO(get("expired_date") || prev.expired_date || ""),
      };

      // Immediately sync text layers so canvas uses Excel data
      setTextLayers((layers) =>
        layers.map((layer) => {
          switch (layer.id) {
            case "certificate_no":
              return { ...layer, text: nextData.certificate_no };
            case "name":
              return { ...layer, text: nextData.name };
            case "description":
              return { ...layer, text: nextData.description };
            case "issue_date":
              return { ...layer, text: formatDateString(nextData.issue_date, dateFormat) };
            case "expired_date":
              return { ...layer, text: formatDateString(nextData.expired_date, dateFormat) };
          }
          return layer;
        })
      );
      return nextData;
    });
    setTimeout(() => { suppressSyncRef.current = false; }, 0);
  }, [excelRows, mapping, excelDateToISO, formatDateString, dateFormat]);

  // Auto-apply current preview row when Excel data/mapping/index change
  useEffect(() => {
    if (excelRows.length > 0) {
      const idx = Math.max(0, Math.min(selectedRowIndex, Math.max(0, excelRows.length - 1)));
      applyRowToPreview(idx);
    }
    // Intentionally exclude applyRowToPreview to avoid effect re-run on each render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [excelRows, mapping, selectedRowIndex]);

  // Prevent body scroll when page loads (optional - for consistency)
  useBodyScrollLock(false);

  // Handler untuk mendapatkan dimensi gambar asli
  const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const naturalWidth = img.naturalWidth;
    const naturalHeight = img.naturalHeight;
    
    setImageDimensions({
      width: naturalWidth,
      height: naturalHeight,
      aspectRatio: naturalWidth / naturalHeight
    });
    
    console.log('Image loaded:', { naturalWidth, naturalHeight, aspectRatio: naturalWidth / naturalHeight });
  }, []);

  // Function untuk menghitung dimensi container berdasarkan gambar
  const calculateContainerDimensions = useCallback(() => {
    if (!imageDimensions) return { width: 800, height: 600 };
    
    const maxWidth = 800; // Maksimal lebar container
    const maxHeight = 600; // Maksimal tinggi container
    
    // Hitung skala berdasarkan aspect ratio gambar
    const scaleX = maxWidth / imageDimensions.width;
    const scaleY = maxHeight / imageDimensions.height;
    const scale = Math.min(scaleX, scaleY); // Gunakan skala yang lebih kecil
    
    return {
      width: imageDimensions.width * scale,
      height: imageDimensions.height * scale,
      scale: scale,
      // Tidak perlu offset karena container akan menggunakan dimensi yang sama persis
      offsetX: 0,
      offsetY: 0
    };
  }, [imageDimensions]);

  // Function untuk mendapatkan dimensi yang konsisten antara preview dan PNG export
  const getConsistentDimensions = useMemo(() => {
    if (!imageDimensions) return { width: 800, height: 600, scale: 1, offsetX: 0, offsetY: 0 };
    
    const containerDims = calculateContainerDimensions();
    
    // Untuk PNG export, gunakan dimensi yang sama dengan preview
    return {
      width: containerDims.width,
      height: containerDims.height,
      scale: containerDims.scale,
      offsetX: containerDims.offsetX || 0,
      offsetY: containerDims.offsetY || 0
    };
  }, [imageDimensions, calculateContainerDimensions]);

  // Check role and redirect if not authorized
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("ecert-role");
      const normalized = (saved || "").toLowerCase();
      if (["admin", "team", "public"].includes(normalized)) {
        const mapped =
          normalized === "admin"
            ? "Admin"
            : normalized === "team"
              ? "Team"
              : "Public";
        setRole(mapped);
        if (mapped === "Public") {
          router.push("/templates");
          return;
        }
      } else {
        router.push("/templates");
        return;
      }
    } catch {
      router.push("/templates");
      return;
    }
  }, [router]);

  // Load members for selection (Admin/Team only)
  useEffect(() => {
    const load = async () => {
      if (role === "Admin" || role === "Team") {
        try {
          setMembersLoading(true);
          const data = await getMembers();
          setMembers(data);
        } catch (e) {
          console.error(e);
          toast.error(e instanceof Error ? e.message : "Failed to load members");
        } finally {
          setMembersLoading(false);
        }
      }
    };
    load();
  }, [role]);

  // Find selected template
  useEffect(() => {
    const loadTemplate = async () => {
      if (templateId) {
        try {
          setLoading(true);
          const template = await getTemplate(templateId);
          setSelectedTemplate(template);
          // Reset defaults loaded ref when template changes
          defaultsLoadedForTemplateRef.current = null;
          // Template loaded successfully
        } catch (error) {
          console.error("Failed to load template:", error);
          setSelectedTemplate(null);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    loadTemplate();
  }, [templateId]);

  const updateCertificateData = (
    field: keyof CertificateData,
    value: string,
  ) => {
    // Update certificate data
    setCertificateData((prev) => ({ ...prev, [field]: value }));
    
    // REAL-TIME SYNC: Immediately update corresponding text layer
    setTextLayers((prevLayers) =>
      prevLayers.map((layer) => {
        switch (field) {
          case "certificate_no":
            if (layer.id === "certificate_no") {
              return { ...layer, text: value };
            }
            break;
          case "name":
            if (layer.id === "name") {
              return { ...layer, text: value || "Full Name" };
            }
            break;
          case "description":
            if (layer.id === "description") {
              return { ...layer, text: value };
            }
            break;
          case "issue_date":
            if (layer.id === "issue_date") {
              return { ...layer, text: formatDateString(value, dateFormat) };
            }
            break;
          case "expired_date":
            if (layer.id === "expired_date") {
              return { ...layer, text: formatDateString(value, dateFormat) };
            }
            break;
        }
        return layer;
      }),
    );
  };

  // SYNC ON LOAD: Ensure form data is synced with text layers when template loads
  const syncFormWithTextLayers = useCallback(() => {
    if (suppressSyncRef.current) return;
    if (textLayers.length > 0) {
      const updatedData: Partial<CertificateData> = {};
      textLayers.forEach((layer) => {
        switch (layer.id) {
          case "certificate_no":
            updatedData.certificate_no = layer.text;
            break;
          case "name":
            updatedData.name = layer.text;
            break;
          case "description":
            updatedData.description = layer.text;
            break;
          // Do not sync formatted dates back into date inputs
        }
      });
      setCertificateData((prev) => {
        const next = { ...prev, ...updatedData } as CertificateData;
        if (
          next.certificate_no === prev.certificate_no &&
          next.name === prev.name &&
          next.description === prev.description &&
          next.issue_date === prev.issue_date &&
          next.expired_date === prev.expired_date
        ) {
          return prev;
        }
        return next;
      });
    }
  }, [textLayers]);

  // SYNC EFFECT: Sync form with text layers when text layers change
  useEffect(() => {
    syncFormWithTextLayers();
  }, [syncFormWithTextLayers]);

  // TWO-WAY BINDING: Update text layer content and sync back to form
  const updateTextContent = (layerId: string, newText: string) => {
    setTextLayers((prevLayers) =>
      prevLayers.map((layer) =>
        layer.id === layerId ? { ...layer, text: newText } : layer
      )
    );

    // SYNC BACK TO FORM: Update certificate data based on layer ID
    switch (layerId) {
      case "certificate_no":
        setCertificateData((prev) => ({ ...prev, certificate_no: newText }));
        break;
      case "name":
        setCertificateData((prev) => ({ ...prev, name: newText }));
        break;
      case "description":
        setCertificateData((prev) => ({ ...prev, description: newText }));
        break;
      case "issue_date":
        setCertificateData((prev) => ({ ...prev, issue_date: newText }));
        break;
      case "expired_date":
        setCertificateData((prev) => ({ ...prev, expired_date: newText }));
        break;
    }
  };

  // STYLE CONTROL: Update text layer style properties
  const updateTextStyle = (
    layerId: string,
    styleProperty: 'fontSize' | 'color' | 'fontFamily' | 'fontWeight' | 'x' | 'y',
    value: string | number
  ) => {
    setTextLayers((prevLayers) =>
      prevLayers.map((layer) => {
        if (layer.id === layerId) {
          // If updating x or y, also update the percent values
          if (styleProperty === 'x') {
            const xPercent = Number(value) / STANDARD_CANVAS_WIDTH;
            return { ...layer, x: Number(value), xPercent };
          } else if (styleProperty === 'y') {
            const yPercent = Number(value) / STANDARD_CANVAS_HEIGHT;
            return { ...layer, y: Number(value), yPercent };
          }
          return { ...layer, [styleProperty]: value };
        }
        return layer;
      })
    );
  };

  // AUTO-SAVE: Save coordinates to localStorage whenever textLayers change
  useEffect(() => {
    if (!selectedTemplate || textLayers.length === 0) return;
    
    // Skip if we're still loading defaults
    if (defaultsLoadedForTemplateRef.current !== selectedTemplate.id) return;

    // Debounce the save operation
    const timeoutId = setTimeout(() => {
      try {
        const defaults: TextLayerDefault[] = textLayers.map((layer) => ({
          id: layer.id,
          x: layer.x,
          y: layer.y,
          xPercent: layer.xPercent,
          yPercent: layer.yPercent,
          fontSize: layer.fontSize,
          color: layer.color,
          fontWeight: layer.fontWeight,
          fontFamily: layer.fontFamily,
        }));

        saveTemplateDefaults({
          templateId: selectedTemplate.id,
          templateName: selectedTemplate.name,
          textLayers: defaults,
          overlayImages: overlayImages,
          savedAt: new Date().toISOString(),
        });

        console.log(`💾 Auto-saved coordinates for template: ${selectedTemplate.name}`);
      } catch (error) {
        console.warn("⚠️ Failed to auto-save coordinates:", error);
      }
    }, 1000); // Save after 1 second of no changes

    return () => clearTimeout(timeoutId);
  }, [textLayers, overlayImages, selectedTemplate]);

  // TEMPLATE DEFAULTS: Load saved defaults for current template
  const loadSavedDefaults = useCallback(() => {
    if (!selectedTemplate) return;

    const savedDefaults = getTemplateDefaults(selectedTemplate.id);
    if (!savedDefaults) return;

    // Mark that we've loaded defaults for this template
    defaultsLoadedForTemplateRef.current = selectedTemplate.id;

    // Apply saved defaults to text layers
    setTextLayers((prevLayers) =>
      prevLayers.map((layer) => {
        const savedLayer = savedDefaults.textLayers.find((d) => d.id === layer.id);
        if (savedLayer) {
          return {
            ...layer,
            x: savedLayer.x,
            y: savedLayer.y,
            xPercent: savedLayer.xPercent,
            yPercent: savedLayer.yPercent,
            fontSize: savedLayer.fontSize,
            color: savedLayer.color,
            fontWeight: savedLayer.fontWeight,
            fontFamily: savedLayer.fontFamily,
          };
        }
        return layer;
      })
    );

    // Apply saved overlay images if available
    if (savedDefaults.overlayImages && savedDefaults.overlayImages.length > 0) {
      setOverlayImages(savedDefaults.overlayImages);
      console.log(`✅ Loaded ${savedDefaults.overlayImages.length} overlay images`);
    }

    console.log(`✅ Loaded saved defaults for template: ${selectedTemplate.name}`);
    toast.success(`Loaded saved defaults for "${selectedTemplate.name}"`);
  }, [selectedTemplate]);

  // Apply global font settings to all text layers - removed unused function

  // FIX: Utility functions for normalized coordinates using standard canvas size
  const getNormalizedPosition = useCallback((x: number, y: number) => {
    return {
      xPercent: x / STANDARD_CANVAS_WIDTH,
      yPercent: y / STANDARD_CANVAS_HEIGHT,
    };
  }, []);

  const getAbsolutePosition = useCallback(
    (xPercent: number, yPercent: number) => {
      return {
        x: xPercent * STANDARD_CANVAS_WIDTH,
        y: yPercent * STANDARD_CANVAS_HEIGHT,
      };
    },
    [],
  );

  // Snap grid utility functions
  const snapToGrid = useCallback(
    (x: number, y: number) => {
      if (!snapGridEnabled) return { x, y };

      const snappedX = Math.round(x / gridSize) * gridSize;
      const snappedY = Math.round(y / gridSize) * gridSize;

      return { x: snappedX, y: snappedY };
    },
    [snapGridEnabled, gridSize],
  );

  // FIX: Update canvas dimensions with proper scaling calculation
  const updateCanvasDimensions = useCallback(() => {
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      // Calculate scale factor to maintain aspect ratio
      const scaleX = rect.width / STANDARD_CANVAS_WIDTH;
      const scaleY = rect.height / STANDARD_CANVAS_HEIGHT;
      const scale = Math.min(scaleX, scaleY);

      // Use scaled dimensions that maintain aspect ratio
      const scaledWidth = STANDARD_CANVAS_WIDTH * scale;
      const scaledHeight = STANDARD_CANVAS_HEIGHT * scale;

      setCanvasDimensions({ width: scaledWidth, height: scaledHeight });
    }
  }, []);

  // FIX: Initialize text layers using standard canvas dimensions for consistency
  const initializeTextLayers = useCallback(() => {
    // Use standard canvas dimensions for consistent positioning
    const layers: TextLayer[] = [
      {
        id: "certificate_no",
        text: certificateData.certificate_no,
        x: STANDARD_CANVAS_WIDTH * 0.1, // 10% from left
        y: STANDARD_CANVAS_HEIGHT * 0.1, // 10% from top
        xPercent: 0.1,
        yPercent: 0.1,
        fontSize: globalFontSettings.fontSize,
        color: globalFontSettings.color,
        fontWeight: globalFontSettings.fontWeight,
        fontFamily: globalFontSettings.fontFamily,
      },
      {
        id: "name",
        text: certificateData.name || "Full Name", // Default centered name
        x: STANDARD_CANVAS_WIDTH * 0.5, // 50% from left (center)
        y: STANDARD_CANVAS_HEIGHT * 0.5, // 50% from top (center)
        xPercent: 0.5,
        yPercent: 0.5,
        fontSize: globalFontSettings.fontSize + 8, // Slightly larger for name
        color: globalFontSettings.color,
        fontWeight: "bold", // Keep name bold
        fontFamily: globalFontSettings.fontFamily,
      },
      {
        id: "description",
        text: certificateData.description,
        x: STANDARD_CANVAS_WIDTH * 0.5, // 50% from left (center)
        y: STANDARD_CANVAS_HEIGHT * 0.55, // 55% from top
        xPercent: 0.5,
        yPercent: 0.55,
        fontSize: globalFontSettings.fontSize,
        color: globalFontSettings.color,
        fontWeight: globalFontSettings.fontWeight,
        fontFamily: globalFontSettings.fontFamily,
      },
      {
        id: "issue_date",
        text: formatDateString(certificateData.issue_date, dateFormat),
        x: STANDARD_CANVAS_WIDTH * 0.1, // 10% from left
        y: STANDARD_CANVAS_HEIGHT * 0.85, // 85% from top
        xPercent: 0.1,
        yPercent: 0.85,
        fontSize: globalFontSettings.fontSize,
        color: globalFontSettings.color,
        fontWeight: globalFontSettings.fontWeight,
        fontFamily: globalFontSettings.fontFamily,
      },
      {
        id: "expired_date",
        text: formatDateString(certificateData.expired_date, dateFormat),
        x: STANDARD_CANVAS_WIDTH * 0.3, // 30% from left
        y: STANDARD_CANVAS_HEIGHT * 0.85, // 85% from top
        xPercent: 0.3,
        yPercent: 0.85,
        fontSize: globalFontSettings.fontSize,
        color: globalFontSettings.color,
        fontWeight: globalFontSettings.fontWeight,
        fontFamily: globalFontSettings.fontFamily,
      },
    ];
    setTextLayers(layers);
  }, [certificateData, globalFontSettings, formatDateString, dateFormat]);

  // FIX: Update description text layer when certificate data changes
  useEffect(() => {
    setTextLayers((prev) =>
      prev.map((layer) => {
        if (layer.id === "description") {
          return { ...layer, text: certificateData.description };
        }
        return layer;
      }),
    );
  }, [certificateData.description]);

  // Initialize text layers only once when template is loaded
  useEffect(() => {
    if (selectedTemplate && textLayers.length === 0) {
      initializeTextLayers();
    }
  }, [selectedTemplate, initializeTextLayers, textLayers.length]);

  // Auto-load saved defaults after text layers are initialized
  useEffect(() => {
    if (selectedTemplate && textLayers.length > 0) {
      // Check if we've already loaded defaults for this template IN THIS SESSION
      if (defaultsLoadedForTemplateRef.current === selectedTemplate.id) {
        return; // Already loaded in this session, skip
      }

      const savedDefaults = getTemplateDefaults(selectedTemplate.id);
      if (savedDefaults) {
        console.log(`🔄 Auto-loading saved defaults for template: ${selectedTemplate.name}`);
        console.log(`📍 Saved coordinates:`, savedDefaults.textLayers.map(l => ({ id: l.id, x: l.x, y: l.y })));
        loadSavedDefaults();
      } else {
        console.log(`ℹ️ No saved defaults found for template: ${selectedTemplate.name}, using initial positions`);
        // Mark as loaded even if no defaults, to prevent re-checking
        defaultsLoadedForTemplateRef.current = selectedTemplate.id;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTemplate?.id, textLayers.length]); // Trigger when template ID or textLayers.length changes

  // Update canvas dimensions on mount and resize
  useEffect(() => {
    updateCanvasDimensions();

    const handleResize = () => {
      updateCanvasDimensions();
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [updateCanvasDimensions]);

  // FIX: Update text layer positions when canvas dimensions change
  useEffect(() => {
    if (textLayers.length > 0) {
      setTextLayers((prev) =>
        prev.map((layer) => {
          // Keep normalized coordinates, only update absolute coordinates for display
          const newPos = getAbsolutePosition(layer.xPercent, layer.yPercent);
          return { ...layer, x: newPos.x, y: newPos.y };
        }),
      );
    }
  }, [canvasDimensions, getAbsolutePosition, textLayers.length]);

  // Define editing helpers BEFORE effects that reference them
  const startEditingText = useCallback((id: string) => {
    setTextLayers((prev) =>
      prev.map((layer) =>
        layer.id === id
          ? { ...layer, isEditing: true }
          : { ...layer, isEditing: false },
      ),
    );
  // FIX: Dragging functionality with proper coordinate handling
  }, []);

  const stopEditingText = useCallback((id: string) => {
    setTextLayers((prev) =>
      prev.map((layer) => (layer.id === id ? { ...layer, isEditing: false } : layer)),
    );
  }, []);

  // Update selection handler for member -> sync recipient name field and canvas text layer
  const handleSelectMember = useCallback((memberId: string) => {
    setSelectedMemberId(memberId);
    const selected = members.find((m) => m.id === memberId);
    if (selected) {
      setCertificateData((prev) => ({ ...prev, name: selected.name }));
      setTextLayers((prev) => prev.map((l) => (l.id === "name" ? { ...l, text: selected.name } : l)));
    }
  }, [members]);

  // FIX: Dragging functionality with proper coordinate handling
  const handleMouseDown = useCallback(
    (e: React.MouseEvent, layerId: string) => {
      e.preventDefault();
      const layer = textLayers.find((l) => l.id === layerId);
      if (!layer || layer.isEditing) return;

      // Do NOT start dragging immediately; wait until the cursor moves past a small threshold
      candidateLayerRef.current = layerId;
      lastDownLayerRef.current = layerId;
      lastDownPosRef.current = { x: e.clientX, y: e.clientY };
      didMoveRef.current = false;
      // Compute offset relative to canvas and current layer absolute position to avoid drift
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const dims = getConsistentDimensions;
        // Derive the absolute position used in render for this layer
        const isActiveDragging = draggingLayer === layer.id || candidateLayerRef.current === layer.id;
        const actualX = isActiveDragging && typeof layer.x === "number" ? layer.x : (layer.xPercent * dims.width);
        const actualY = isActiveDragging && typeof layer.y === "number" ? layer.y : (layer.yPercent * dims.height);
        downOffsetRef.current = {
          x: e.clientX - rect.left - actualX,
          y: e.clientY - rect.top - actualY,
        };
      } else {
        downOffsetRef.current = { x: 0, y: 0 };
      }
    },
    [textLayers, draggingLayer, getConsistentDimensions],
  );

  // Mouse move and mouse up handlers are defined in the useEffect below

  // Add event listeners for mouse events
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      // Handle image dragging
      if (draggingImage && imageDragStartRef.current && canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const dx = e.clientX - imageDragStartRef.current.x;
        const dy = e.clientY - imageDragStartRef.current.y;
        
        // Convert to canvas coordinates
        const scaleX = rect.width / STANDARD_CANVAS_WIDTH;
        const scaleY = rect.height / STANDARD_CANVAS_HEIGHT;
        const newX = imageDragStartRef.current.imgX + dx / scaleX;
        const newY = imageDragStartRef.current.imgY + dy / scaleY;

        setOverlayImages(prev => prev.map(img => 
          img.id === draggingImage 
            ? { ...img, x: newX, y: newY }
            : img
        ));
        return;
      }

      // Handle image resizing
      if (resizingImage && resizeStartRef.current && canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const dx = e.clientX - resizeStartRef.current.x;
        const dy = e.clientY - resizeStartRef.current.y;
        
        // Convert to canvas coordinates
        const scaleX = rect.width / STANDARD_CANVAS_WIDTH;
        const scaleY = rect.height / STANDARD_CANVAS_HEIGHT;
        
        // FIX: Preserve aspect ratio during resize
        const img = overlayImages.find(i => i.id === resizingImage);
        if (img && img.aspectRatio) {
          // Use diagonal distance to calculate new size while preserving aspect ratio
          const diagonal = Math.sqrt(dx * dx + dy * dy);
          const newWidth = Math.max(50, resizeStartRef.current.width + diagonal / scaleX * Math.sign(dx));
          const newHeight = newWidth / img.aspectRatio;
          
          setOverlayImages(prev => prev.map(img => 
            img.id === resizingImage 
              ? { ...img, width: newWidth, height: newHeight }
              : img
          ));
        } else {
          // Fallback to old behavior if no aspect ratio
          const newWidth = Math.max(50, resizeStartRef.current.width + dx / scaleX);
          const newHeight = Math.max(50, resizeStartRef.current.height + dy / scaleY);
          
          setOverlayImages(prev => prev.map(img => 
            img.id === resizingImage 
              ? { ...img, width: newWidth, height: newHeight }
              : img
          ));
        }
        return;
      }

      // If we haven't started dragging yet, but a candidate exists, start when threshold passed
      if (!draggingLayer && candidateLayerRef.current && lastDownPosRef.current) {
        const dx = Math.abs(e.clientX - lastDownPosRef.current.x);
        const dy = Math.abs(e.clientY - lastDownPosRef.current.y);
        if (dx > 1 || dy > 1) {
          setDraggingLayer(candidateLayerRef.current);
          didMoveRef.current = true;
        }
      }

      if (draggingLayer && canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const offset = downOffsetRef.current || { x: 0, y: 0 };
        const newX = e.clientX - rect.left - offset.x;
        const newY = e.clientY - rect.top - offset.y;

        // SAMAKAN SATUAN: Gunakan consistentDims untuk koordinat yang sama
        const consistentDims = getConsistentDimensions;
        
        // Convert to consistent canvas coordinates
        const scaleX = rect.width / consistentDims.width;
        const scaleY = rect.height / consistentDims.height;
        const standardX = newX / scaleX;
        const standardY = newY / scaleY;

        // Tanpa snap saat drag; clamp ke batas kanvas penuh
        const clampedX = Math.max(0, Math.min(standardX, consistentDims.width));
        const clampedY = Math.max(0, Math.min(standardY, consistentDims.height));
        setTextLayers((prev) =>
          prev.map((layer) =>
            layer.id === draggingLayer
              ? { ...layer, x: clampedX, y: clampedY }
              : layer,
          ),
        );
      }
    };

    const handleGlobalMouseUp = () => {
      // Handle image drag/resize end
      if (draggingImage) {
        setDraggingImage(null);
        imageDragStartRef.current = null;
        return;
      }
      if (resizingImage) {
        setResizingImage(null);
        resizeStartRef.current = null;
        return;
      }

      const layerId = lastDownLayerRef.current;
      lastDownLayerRef.current = null;
      lastDownPosRef.current = null;
      didMoveRef.current = false;
      candidateLayerRef.current = null;
      downOffsetRef.current = null;
      setDraggingLayer(null);
      // Commit normalized coordinates from final absolute x/y (no extra snap here)
      if (layerId) {
        setTextLayers((prev) =>
          prev.map((layer) => {
            if (layer.id !== layerId || layer.x === undefined || layer.y === undefined) return layer;
            const normalizedPos = getNormalizedPosition(layer.x, layer.y);
            return {
              ...layer,
              xPercent: normalizedPos.xPercent,
              yPercent: normalizedPos.yPercent,
            };
          }),
        );
      }
      // If it was just a click (no drag), enter editing and focus the right panel
      if (layerId && !didMoveRef.current) {
        startEditingText(layerId);
        focusFieldForLayer(layerId, true);
      }
    };

    if (draggingLayer || candidateLayerRef.current || draggingImage || resizingImage) {
      document.addEventListener("mousemove", handleGlobalMouseMove);
      document.addEventListener("mouseup", handleGlobalMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleGlobalMouseMove);
      document.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, [draggingLayer, draggingImage, resizingImage, snapToGrid, getNormalizedPosition, getConsistentDimensions, startEditingText, STANDARD_CANVAS_WIDTH, STANDARD_CANVAS_HEIGHT]);

  // FIX: Add new text using standard canvas dimensions
  const addNewText = useCallback(() => {
    const centerX = STANDARD_CANVAS_WIDTH / 2 - 50; // Approximate text width
    const centerY = STANDARD_CANVAS_HEIGHT / 2 - 10; // Approximate text height
    const normalizedPos = getNormalizedPosition(centerX, centerY);

    const newTextLayer: TextLayer = {
      id: `custom_text_${Date.now()}`,
      text: "New Text",
      x: centerX,
      y: centerY,
      xPercent: normalizedPos.xPercent,
      yPercent: normalizedPos.yPercent,
      fontSize: 20,
      color: "#000000",
      fontWeight: "normal",
      fontFamily: "Arial",
      isEditing: true,
    };

    setTextLayers((prev) => [...prev, newTextLayer]);
    setSelectedLayerId(newTextLayer.id);
  }, [getNormalizedPosition]);

  // FIX: Update text layer with proper coordinate normalization
  const updateTextLayer = useCallback(
    (id: string, updates: Partial<TextLayer>) => {
      setTextLayers((prev) =>
        prev.map((layer) => {
          if (layer.id !== id) return layer;

          const updatedLayer = { ...layer, ...updates };

          // Always ensure normalized coordinates are calculated
          if (updates.x !== undefined || updates.y !== undefined) {
            // Use standard canvas bounds for consistency
            const maxX = STANDARD_CANVAS_WIDTH - 100; // Approximate text width
            const maxY = STANDARD_CANVAS_HEIGHT - 50; // Approximate text height

            updatedLayer.x = Math.max(0, Math.min(updatedLayer.x, maxX));
            updatedLayer.y = Math.max(0, Math.min(updatedLayer.y, maxY));

            // Update normalized coordinates using standard canvas size
            const normalizedPos = getNormalizedPosition(
              updatedLayer.x,
              updatedLayer.y,
            );
            updatedLayer.xPercent = normalizedPos.xPercent;
            updatedLayer.yPercent = normalizedPos.yPercent;
          } else {
            // Ensure normalized coordinates exist even if position wasn't updated
            if (
              updatedLayer.xPercent === undefined ||
              updatedLayer.yPercent === undefined
            ) {
              const normalizedPos = getNormalizedPosition(
                updatedLayer.x,
                updatedLayer.y,
              );
              updatedLayer.xPercent = normalizedPos.xPercent;
              updatedLayer.yPercent = normalizedPos.yPercent;
            }
          }

          return updatedLayer;
        }),
      );
    },
    [getNormalizedPosition],
  );

  // IMAGE OVERLAY: Handle image drag start
  const handleImageDragStart = useCallback((e: React.MouseEvent, imgId: string) => {
    e.stopPropagation();
    const img = overlayImages.find(i => i.id === imgId);
    if (!img) return;

    setDraggingImage(imgId);
    setSelectedImage(imgId);
    imageDragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      imgX: img.x,
      imgY: img.y,
    };
  }, [overlayImages]);

  // IMAGE OVERLAY: Handle image resize start
  const handleImageResizeStart = useCallback((e: React.MouseEvent, imgId: string) => {
    e.stopPropagation();
    const img = overlayImages.find(i => i.id === imgId);
    if (!img) return;

    setResizingImage(imgId);
    setSelectedImage(imgId);
    resizeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      width: img.width,
      height: img.height,
    };
  }, [overlayImages]);

  // IMAGE OVERLAY: Handle image delete
  const handleImageDelete = useCallback((imgId: string) => {
    setOverlayImages(prev => prev.filter(img => img.id !== imgId));
    setSelectedImage(null);
    toast.success('Image removed');
  }, []);

  // IMAGE OVERLAY: Handle image upload
  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type (support PNG, JPG, JPEG, GIF, WebP)
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a valid image file (PNG, JPG, GIF, WebP)');
      return;
    }

    // Read file as data URL
    const reader = new FileReader();
    reader.onload = (event) => {
      const imageUrl = event.target?.result as string;
      
      // Create new image to get dimensions
      const img = new window.Image();
      img.onload = () => {
        // Calculate aspect ratio to preserve it during resize
        const aspectRatio = img.width / img.height;
        
        // Add image to overlay images array
        const newImage = {
          id: `img-${Date.now()}`,
          url: imageUrl,
          x: STANDARD_CANVAS_WIDTH / 2 - img.width / 4, // Center horizontally
          y: STANDARD_CANVAS_HEIGHT / 2 - img.height / 4, // Center vertically
          width: img.width / 2, // 50% of original size
          height: img.height / 2,
          aspectRatio: aspectRatio, // Store aspect ratio
        };
        
        setOverlayImages((prev) => [...prev, newImage]);
        toast.success('Image added successfully! Drag to reposition.');
      };
      img.src = imageUrl;
    };
    reader.readAsDataURL(file);

    // Reset input value to allow uploading same file again
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  }, [STANDARD_CANVAS_WIDTH, STANDARD_CANVAS_HEIGHT]);

  // FIX: Center text layer using standard canvas dimensions
  const centerTextLayer = useCallback(
    (id: string) => {
      const centerX = STANDARD_CANVAS_WIDTH / 2;
      const centerY = STANDARD_CANVAS_HEIGHT / 2;
      const normalizedPos = getNormalizedPosition(centerX, centerY);

      setTextLayers((prev) =>
        prev.map((layer) => {
          if (layer.id !== id) return layer;

          return {
            ...layer,
            x: centerX - 50, // Approximate text width offset
            y: centerY - 10, // Approximate text height offset
            xPercent: normalizedPos.xPercent,
            yPercent: normalizedPos.yPercent,
          };
        }),
      );
    },
    [getNormalizedPosition],
  );

  const deleteTextLayer = useCallback(
    (id: string) => {
      // Additional safety: Don't delete if user is currently editing
      const layer = textLayers.find((l) => l.id === id);
      if (layer?.isEditing) {
        return; // Don't delete while editing
      }

      setTextLayers((prev) => prev.filter((layer) => layer.id !== id));
      if (selectedLayerId === id) {
        setSelectedLayerId(null);
      }
    },
    [selectedLayerId, textLayers],
  );

  const selectTextLayer = useCallback((id: string) => {
    setSelectedLayerId(id);
  }, []);


  // Safe text update function is now handled by the new updateTextContent above

  // Handle keyboard events for text editing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // CRITICAL FIX: Don't handle keyboard events when user is editing text
      if (
        (document.activeElement as HTMLElement)?.isContentEditable ||
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return; // Let the input handle its own events
      }

      if (selectedLayerId) {
        if (e.key === "Delete" || e.key === "Backspace") {
          e.preventDefault();
          deleteTextLayer(selectedLayerId);
        } else if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          stopEditingText(selectedLayerId);
        } else if (e.key === "Escape") {
          e.preventDefault();
          stopEditingText(selectedLayerId);
          setSelectedLayerId(null);
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedLayerId, deleteTextLayer, stopEditingText]);

  // Function to save generated PNG to local storage
  const saveGeneratedPNG = async (imageDataUrl: string): Promise<string> => {
    try {
      const fileName = `generated_${Date.now()}.png`;
      
      const response = await fetch('/api/save-generated-certificate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageData: imageDataUrl,
          fileName: fileName,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save generated certificate');
      }

      const result = await response.json();
      return result.url;
    } catch (error) {
      console.error('Error saving generated PNG:', error);
      throw error;
    }
  };

  // PERBAIKAN SISTEM RENDER: Capture dengan dimensi visual yang sama persis
  const createMergedCertificateImage = async (customTextLayers?: TextLayer[]): Promise<string> => {
    // Use custom textLayers if provided (for batch generation)
    const layersToUse = customTextLayers || textLayers;
    try {
      console.log('🎨 Starting improved html2canvas capture...');
      
      // 1. Pastikan semua font sudah termuat sepenuhnya
      console.log('⏳ Waiting for fonts to load...');
      await document.fonts.ready;
      console.log('✅ All fonts loaded');
      
      // 2. Capture the preview element yang sudah memiliki positioning yang benar
      const previewElement = document.getElementById('certificate-preview');
      if (!previewElement) {
        throw new Error('Certificate preview element not found');
      }
      
      // 3. Dapatkan dimensi visual yang sama persis dengan area editor
      const rect = previewElement.getBoundingClientRect();
      const computedStyle = window.getComputedStyle(previewElement);
      
      console.log('📐 Preview element visual dimensions:', {
        offsetWidth: previewElement.offsetWidth,
        offsetHeight: previewElement.offsetHeight,
        clientWidth: previewElement.clientWidth,
        clientHeight: previewElement.clientHeight,
        scrollWidth: previewElement.scrollWidth,
        scrollHeight: previewElement.scrollHeight,
        boundingRect: {
          width: rect.width,
          height: rect.height,
          top: rect.top,
          left: rect.left
        },
        computedStyle: {
          width: computedStyle.width,
          height: computedStyle.height,
          padding: computedStyle.padding,
          border: computedStyle.border,
          margin: computedStyle.margin
        }
      });
      
      // 4. Gunakan ukuran background template yang sudah difiksasi
      const consistentDims = getConsistentDimensions;
      
      // 5. Gunakan scale 2 yang konsisten untuk hasil tajam tanpa bergeser
      const scale = 2;
      
      // 6. Capture dengan html2canvas dengan options yang optimal
      const canvas = await html2canvas(previewElement, {
        width: consistentDims.width,
        height: consistentDims.height,
        scale: scale,
        useCORS: true,
        allowTaint: true,
        logging: false,
        // Prevent text shifting
        letterRendering: true,
        // Use exact positioning
        x: 0,
        y: 0,
        scrollX: 0,
        scrollY: 0,
        // Window size for consistent rendering
        windowWidth: consistentDims.width,
        windowHeight: consistentDims.height,
        // SANITIZE: Hilangkan background CSS kompleks (gradients/lab/oklch) pada subtree agar parser tidak error
        onclone: (doc: Document) => {
          const root = doc.getElementById('certificate-preview');
          if (!root) return;
          
          // Pertahankan background putih pada root
          (root as HTMLElement).style.backgroundColor = '#ffffff';
          
          // Set exact dimensions to prevent shifting
          (root as HTMLElement).style.width = `${consistentDims.width}px`;
          (root as HTMLElement).style.height = `${consistentDims.height}px`;
          (root as HTMLElement).style.position = 'relative';
          (root as HTMLElement).style.overflow = 'hidden';
          (root as HTMLElement).style.transform = 'none';
          (root as HTMLElement).style.margin = '0';
          (root as HTMLElement).style.padding = '0';
          
          console.log('🔍 onclone: Setting root dimensions:', {
            width: consistentDims.width,
            height: consistentDims.height
          });
          
          // Bersihkan background pada semua child agar tidak ada fungsi warna yang tidak didukung
          // KECUALI overlay images yang perlu tetap di-render
          root.querySelectorAll('*').forEach((node: Element) => {
            const el = node as HTMLElement;
            if (!el || el.id === 'certificate-preview') return;
            
            // Skip cleaning overlay images and their children
            if (el.tagName === 'IMG' || el.closest('[data-overlay-image]')) {
              return;
            }
            
            el.style.background = 'transparent';
            el.style.backgroundImage = 'none';
            // Hindari filter/boxShadow kompleks yang dapat memicu parsing warna
            el.style.boxShadow = 'none';
            el.style.filter = 'none';
            // Remove transform that might cause shifting
            el.style.transform = 'none';
            el.style.margin = '0';
          });
        }
      } as unknown as Parameters<typeof html2canvas>[1]);
      
      console.log('✅ html2canvas capture completed:', {
        canvasWidth: canvas.width,
        canvasHeight: canvas.height,
        expectedWidth: Math.round(consistentDims.width * scale),
        expectedHeight: Math.round(consistentDims.height * scale),
        scale: scale,
        devicePixelRatio: devicePixelRatio
      });
      
      return canvas.toDataURL('image/png');
      
    } catch (error) {
      console.error('❌ html2canvas capture failed:', error);
      
      // Fallback to original canvas method if html2canvas fails
      console.log('🔄 Falling back to canvas method...');
      return createMergedCertificateImageFallback(layersToUse);
    }
  };

  // Fallback method using canvas (original implementation)
  const createMergedCertificateImageFallback = async (customTextLayers?: TextLayer[]): Promise<string> => {
    // Use custom textLayers if provided (for batch generation)
    const layersToUse = customTextLayers || textLayers;
    return new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }

      // FIX: Use getConsistentDimensions for canvas to match preview exactly
      // But don't use devicePixelRatio scaling
      const consistentDims = getConsistentDimensions;
      canvas.width = consistentDims.width;
      canvas.height = consistentDims.height;
      
      console.log('🎨 Canvas Dimensions (matching preview):', {
        canvasWidth: consistentDims.width,
        canvasHeight: consistentDims.height,
        note: 'No devicePixelRatio scaling, using preview dimensions'
      });

      // Create a white background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, consistentDims.width, consistentDims.height);

      // Load template image if available
      if (selectedTemplate && getTemplateImageUrl(selectedTemplate)) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = async () => {
          // Draw template image at full canvas size
          ctx.drawImage(img, 0, 0, consistentDims.width, consistentDims.height);

          // Draw overlay images with correct coordinates
          for (const overlayImg of overlayImages) {
            try {
              const imgElement = new Image();
              imgElement.crossOrigin = "anonymous";
              await new Promise<void>((resolveImg, rejectImg) => {
                imgElement.onload = () => {
                  // FIX: Use exact coordinates from overlay - NO SCALING
                  // Canvas is now 1:1 with preview coordinates (STANDARD_CANVAS)
                  // Draw image at exact position and size as stored
                  ctx.drawImage(
                    imgElement,
                    0, 0, imgElement.naturalWidth, imgElement.naturalHeight, // source (full image)
                    overlayImg.x, overlayImg.y, overlayImg.width, overlayImg.height // destination (exact position)
                  );
                  console.log('✅ Drew overlay image at exact coordinates:', {
                    position: { x: overlayImg.x, y: overlayImg.y },
                    size: { w: overlayImg.width, h: overlayImg.height },
                    naturalSize: { w: imgElement.naturalWidth, h: imgElement.naturalHeight },
                    note: '1:1 coordinate mapping with preview'
                  });
                  resolveImg();
                };
                imgElement.onerror = () => rejectImg();
                imgElement.src = overlayImg.url;
              });
            } catch (error) {
              console.warn('Failed to load overlay image:', error);
            }
          }

          // Draw text layers at exact coordinates
          layersToUse.forEach((layer) => {
            if (layer.text && layer.text.trim()) {
              ctx.font = `${layer.fontWeight} ${layer.fontSize * (consistentDims.scale || 1)}px ${layer.fontFamily}`;
              ctx.fillStyle = layer.color;
              ctx.textAlign = "left";
              ctx.textBaseline = "top";

              // Use exact coordinates from xPercent/yPercent with consistentDims
              const x = layer.xPercent * consistentDims.width;
              const y = layer.yPercent * consistentDims.height;

              ctx.fillText(layer.text, x, y);
            }
          });

          const dataURL = canvas.toDataURL("image/png");
          resolve(dataURL);
        };
        img.onerror = async () => {
          // Draw overlay images even if template fails
          for (const overlayImg of overlayImages) {
            try {
              const imgElement = new Image();
              imgElement.crossOrigin = "anonymous";
              await new Promise<void>((resolveImg, rejectImg) => {
                imgElement.onload = () => {
                  // Use exact coordinates - no scaling
                  ctx.drawImage(
                    imgElement,
                    0, 0, imgElement.naturalWidth, imgElement.naturalHeight,
                    overlayImg.x, overlayImg.y, overlayImg.width, overlayImg.height
                  );
                  resolveImg();
                };
                imgElement.onerror = () => rejectImg();
                imgElement.src = overlayImg.url;
              });
            } catch (error) {
              console.warn('Failed to load overlay image:', error);
            }
          }

          // Draw text layers at exact coordinates
          layersToUse.forEach((layer) => {
            if (layer.text && layer.text.trim()) {
              ctx.font = `${layer.fontWeight} ${layer.fontSize * (consistentDims.scale || 1)}px ${layer.fontFamily}`;
              ctx.fillStyle = layer.color;
              ctx.textAlign = "left";
              ctx.textBaseline = "top";

              const x = layer.xPercent * consistentDims.width;
              const y = layer.yPercent * consistentDims.height;

              ctx.fillText(layer.text, x, y);
            }
          });

          const dataURL = canvas.toDataURL("image/png");
          resolve(dataURL);
        };
        img.src = getTemplateImageUrl(selectedTemplate)!;
      } else {
        // Draw overlay images even without template
        (async () => {
          for (const overlayImg of overlayImages) {
            try {
              const imgElement = new Image();
              imgElement.crossOrigin = "anonymous";
              await new Promise<void>((resolveImg, rejectImg) => {
                imgElement.onload = () => {
                  // Use exact coordinates - no scaling
                  ctx.drawImage(
                    imgElement,
                    0, 0, imgElement.naturalWidth, imgElement.naturalHeight,
                    overlayImg.x, overlayImg.y, overlayImg.width, overlayImg.height
                  );
                  resolveImg();
                };
                imgElement.onerror = () => rejectImg();
                imgElement.src = overlayImg.url;
              });
            } catch (error) {
              console.warn('Failed to load overlay image:', error);
            }
          }

          // Draw text layers at exact coordinates
          layersToUse.forEach((layer) => {
            if (layer.text && layer.text.trim()) {
              ctx.font = `${layer.fontWeight} ${layer.fontSize * (consistentDims.scale || 1)}px ${layer.fontFamily}`;
              ctx.fillStyle = layer.color;
              ctx.textAlign = "left";
              ctx.textBaseline = "top";

              const x = layer.xPercent * consistentDims.width;
              const y = layer.yPercent * consistentDims.height;

              ctx.fillText(layer.text, x, y);
            }
          });

          const dataURL = canvas.toDataURL("image/png");
          resolve(dataURL);
        })();
      }
    });
  };

  const generatePreview = async () => {
    console.log("🔄 Generate Certificate button clicked!");
    console.log("Current certificate data:", certificateData);
    console.log("Current text layers:", textLayers);

    try {
      setIsGenerating(true);

      // REAL-TIME SYNC: Text layers are already updated via updateCertificateData
      // No need to manually update them here anymore
      console.log("✅ Text layers already synced via real-time updates");

      // Validate required fields
      if (
        !certificateData.certificate_no.trim() ||
        !certificateData.name.trim() ||
        !certificateData.issue_date
      ) {
        toast.error(
          "Please fill in all required fields (Certificate Number, Name, and Issue Date)",
        );
        return;
      }

      // Require member selection for Admin/Team
      if ((role === "Admin" || role === "Team") && !selectedMemberId) {
        toast.error("Please select a member before creating the certificate");
        return;
      }

      // FIX: Create merged certificate image
      console.log("🎨 Creating merged certificate image...");
      const mergedImageDataUrl = await createMergedCertificateImage();
      console.log(
        "✅ Merged image created:",
        mergedImageDataUrl.substring(0, 50) + "...",
      );

      // Tampilkan preview dengan dataURL (belum save ke storage)
      setGeneratedImageUrl(mergedImageDataUrl);

      // AUTO-SAVE: Save current coordinates as default for this template
      if (selectedTemplate) {
        try {
          const defaults: TextLayerDefault[] = textLayers.map((layer) => ({
            id: layer.id,
            x: layer.x,
            y: layer.y,
            xPercent: layer.xPercent,
            yPercent: layer.yPercent,
            fontSize: layer.fontSize,
            color: layer.color,
            fontWeight: layer.fontWeight,
            fontFamily: layer.fontFamily,
          }));

          saveTemplateDefaults({
            templateId: selectedTemplate.id,
            templateName: selectedTemplate.name,
            textLayers: defaults,
            overlayImages: overlayImages, // Save overlay images
            savedAt: new Date().toISOString(),
          });

          console.log(`💾 Auto-saved coordinates and ${overlayImages.length} overlay images for template: ${selectedTemplate.name}`);
        } catch (error) {
          console.warn("⚠️ Failed to auto-save coordinates:", error);
          // Don't block certificate generation if save fails
        }
      }

      // Prepare certificate data for database (with dataURL only)
      const certificateDataToSave: CreateCertificateData = {
        certificate_no: certificateData.certificate_no.trim(),
        name: certificateData.name.trim(),
        description: certificateData.description.trim() || undefined,
        issue_date: certificateData.issue_date,
        expired_date: certificateData.expired_date || undefined,
        category: selectedTemplate?.category || undefined,
        template_id: selectedTemplate?.id || undefined,
        member_id: selectedMemberId || undefined,
        text_layers: textLayers,
        merged_image: mergedImageDataUrl, // Data URL for database
        certificate_image_url: mergedImageDataUrl, // Use dataURL initially
      };

      // Save certificate to database FIRST (will throw error if duplicate)
      const savedCertificate = await createCertificate(certificateDataToSave);

      console.log("✅ Certificate saved to database successfully:", savedCertificate);

      // Only save PNG to local storage AFTER database save succeeds
      let finalPreviewUrl: string = mergedImageDataUrl;
      try {
        console.log("💾 Saving PNG to local storage...");
        const localImageUrl = await saveGeneratedPNG(mergedImageDataUrl);
        console.log("✅ PNG saved locally:", localImageUrl);
        finalPreviewUrl = localImageUrl;
        
        // Update preview with saved URL
        setGeneratedImageUrl(finalPreviewUrl);
      } catch (e) {
        console.warn("⚠️ Save PNG to local failed, keeping dataURL.", e);
      }

      toast.success("Certificate generated and saved successfully!");

      // Ask user if they want to view the certificates page
      const go = await confirmToast(
        "Certificate saved successfully! Would you like to view all certificates?",
        { confirmText: "View Certificates", tone: "success" }
      );
      if (go) {
        window.location.href = "/certificates";
      }
    } catch (error) {
      console.error("❌ Failed to generate certificate:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to generate certificate",
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // Generate all certificates from loaded Excel rows (hoisted declaration)
  async function generateAllFromExcel() {
    if (!excelRows.length) { toast.error("No Excel data loaded"); return; }
    if (!mapping.name || !mapping.certificate_no) {
      toast.error("Please map at least 'name' and 'certificate_no'");
      return;
    }
    try {
      setIsGenerating(true);
      console.log(`🚀 Starting batch generation for ${excelRows.length} rows`);
      for (let i = 0; i < excelRows.length; i++) {
        const row = excelRows[i] || {};
        const get = (key: string) => (mapping[key] ? row[mapping[key]] : "");
        const data: CertificateData = {
          certificate_no: String(get("certificate_no") || ""),
          name: String(get("name") || ""),
          description: String(get("description") || ""),
          issue_date: excelDateToISO(get("issue_date") || ""),
          expired_date: excelDateToISO(get("expired_date") || ""),
        };
        
        console.log(`📝 Processing row ${i + 1}/${excelRows.length}:`, {
          certificate_no: data.certificate_no,
          name: data.name,
          description: data.description?.substring(0, 50) + '...'
        });

        // Prevent sync effects from overwriting our row updates
        suppressSyncRef.current = true;
        
        // Reflect current row index (optional UI feedback)
        setSelectedRowIndex(i);
        
        // Update form data
        setCertificateData(data);
        
        // Create isolated textLayers for this specific row
        const updatedTextLayers = textLayers.map((layer) => {
          switch (layer.id) {
            case "certificate_no":
              return { ...layer, text: data.certificate_no };
            case "name":
              return { ...layer, text: data.name };
            case "description":
              return { ...layer, text: data.description };
            case "issue_date":
              return { ...layer, text: data.issue_date };
            case "expired_date":
              return { ...layer, text: data.expired_date };
            default:
              return layer;
          }
        });
        
        // Update canvas layers to reflect Excel data
        setTextLayers(updatedTextLayers);
        
        // Allow React/DOM to update completely before capture
        await new Promise((r) => setTimeout(r, 100)); // Increased delay
        await new Promise((r) => requestAnimationFrame(() => r(undefined)));
        await new Promise((r) => requestAnimationFrame(() => r(undefined))); // Double RAF
        
        console.log(`🎨 Capturing image for row ${i + 1} with data:`, {
          layers: updatedTextLayers.map(l => ({ id: l.id, text: l.text }))
        });
        
        // Validate that we have the correct data before capture
        const currentName = updatedTextLayers.find(l => l.id === 'name')?.text;
        if (currentName !== data.name) {
          console.warn(`⚠️ Text layer mismatch for row ${i + 1}! Expected: ${data.name}, Got: ${currentName}`);
        }
        
        // Create merged image with the specific textLayers for this row
        const mergedImageDataUrl = await createMergedCertificateImage(updatedTextLayers);
        
        // Release suppression after this row is captured
        suppressSyncRef.current = false;
        
        const certificateDataToSave: CreateCertificateData = {
          certificate_no: data.certificate_no.trim(),
          name: data.name.trim(),
          description: data.description.trim() || undefined,
          issue_date: data.issue_date,
          expired_date: data.expired_date || undefined,
          category: selectedTemplate?.category || undefined,
          template_id: selectedTemplate?.id || undefined,
          member_id: selectedMemberId || undefined,
          text_layers: updatedTextLayers, // Use the isolated textLayers for this row
          merged_image: mergedImageDataUrl,
          certificate_image_url: undefined,
        };
        
        await createCertificate(certificateDataToSave);
        
        console.log(`✅ Row ${i + 1} completed and saved`);
      }
      console.log(`🎉 All ${excelRows.length} certificates generated successfully`);
      toast.success("All rows generated and saved");
      setImportModalOpen(false);
    } catch (e: unknown) {
      console.error(e);
      const msg = e instanceof Error ? e.message : 'Failed to generate from Excel';
      toast.error(msg);
    } finally {
      setIsGenerating(false);
      suppressSyncRef.current = false; // Ensure suppression is released
    }
  }

  if (role === "Public") {
    return null; // Will redirect
  }

  if (loading) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="pt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
            <div className="text-center">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                <FileText className="w-12 h-12 text-gray-400" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-4">
                Loading template...
              </h1>
              <p className="text-gray-500">
                Please wait while we load your template.
              </p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!selectedTemplate) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="pt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">
                Template Not Found
              </h1>
              <Button
                onClick={() => router.push("/templates")}
                className="bg-gradient-to-r from-orange-500 to-red-500 text-white"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to {t("templates.title")}
              </Button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }


  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-7">
        <div className="max-w-7xl mx-auto py-1">
          {/* Header */}
          <div className="flex items-center justify-between mb-6 -ml-28">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                className="border-gray-300"
                onClick={() => router.push("/templates")}
                size="sm"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to {t("templates.title")}
              </Button>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                  {t("generator.title")}
                </h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  Using template: {selectedTemplate.name}
                </p>
              </div>
            </div>
          </div>

          {/* Dual Pane Layout - centered */}
          <div className="flex flex-col xl:flex-row gap-6 min-h-[600px] w-full mx-auto justify-center items-start">
            {/* Left Section - Certificate Preview */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="bg-white rounded-lg border border-gray-200 shadow-md p-4 mx-auto xl:mx-0 shrink-0 max-w-full"
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">
                    {t("generator.preview")}
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Click &quot;Add Text&quot; to add custom text • Double-click
                    text to edit • Drag to move • Press Delete to remove
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={addNewText}
                    className="bg-green-500 hover:bg-green-600 text-white"
                    size="sm"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Add Text
                  </Button>
                  <Button
                    variant="outline"
                    className={`border-gray-300 ${snapGridEnabled ? "bg-blue-50 border-blue-300" : ""}`}
                    onClick={() => setSnapGridEnabled(!snapGridEnabled)}
                    size="sm"
                  >
                    <div className="w-4 h-4 mr-2 grid grid-cols-2 gap-0.5">
                      <div className="w-1 h-1 bg-current rounded-sm"></div>
                      <div className="w-1 h-1 bg-current rounded-sm"></div>
                      <div className="w-1 h-1 bg-current rounded-sm"></div>
                      <div className="w-1 h-1 bg-current rounded-sm"></div>
                    </div>
                    Snap Grid {snapGridEnabled ? "ON" : "OFF"}
                  </Button>
                  <Button
                    variant="outline"
                    className="border-green-500 text-green-600 hover:bg-green-50"
                    onClick={() => imageInputRef.current?.click()}
                    size="sm"
                  >
                    <ImageIcon className="w-4 h-4 mr-2" />
                    Add Image
                  </Button>
                  {/* Hidden file input for image upload */}
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>
              </div>

              {/* FIX: Certificate Display with consistent aspect ratio */}
              <div className="bg-transparent p-0 min-h-[450px] xl:min-h-[520px] flex items-center justify-center overflow-x-auto">
                {generatedImageUrl ? (
                  /* Show generated PNG preview - SAME SIZE as live editor */
                  <div 
                    className="bg-white relative"
                    style={{
                      // PERBAIKAN: Gunakan dimensi yang SAMA PERSIS dengan live editor
                      width: `${getConsistentDimensions.width}px`,
                      height: `${getConsistentDimensions.height}px`,
                      overflow: "hidden",
                      position: "relative",
                      margin: "0 auto",
                      padding: "0",
                      border: "none",
                      aspectRatio: imageDimensions ? `${imageDimensions.width}/${imageDimensions.height}` : "800/600",
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={generatedImageUrl}
                      alt="Generated Certificate"
                      style={{
                        // PERBAIKAN: Gunakan dimensi exact, bukan w-full h-auto
                        width: `${getConsistentDimensions.width}px`,
                        height: `${getConsistentDimensions.height}px`,
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                    <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded text-xs font-medium">
                      Generated PNG
                    </div>
                  </div>
                ) : (
                  /* Show live editor */
                  <div
                    ref={canvasRef}
                    id="certificate-preview"
                    className="bg-white relative"
                    style={{
                      // PERBAIKAN: Gunakan dimensi yang sama persis dengan PNG generation
                      width: `${getConsistentDimensions.width}px`,
                      height: `${getConsistentDimensions.height}px`,
                      // Pastikan tidak ada scaling CSS yang dapat menyebabkan perubahan layout
                      transform: "none",
                      zoom: "1",
                      // Nonaktifkan style yang dapat menyebabkan perubahan layout
                      boxShadow: "none",
                      borderRadius: "0",
                      // Pastikan scroll dan overflow tidak memotong template
                      overflow: "hidden",
                      // Pastikan posisi deterministik
                      position: "relative",
                      margin: "0 auto",
                      // Pastikan tidak ada padding atau border yang mempengaruhi koordinat
                      padding: "0",
                      border: "none",
                      // Pastikan aspect ratio tetap konsisten
                      aspectRatio: imageDimensions ? `${imageDimensions.width}/${imageDimensions.height}` : "800/600",
                    }}
                    onClick={(e) => {
                      // Deselect text if clicking on empty area
                      if (e.target === e.currentTarget) {
                        setSelectedLayerId(null);
                      }
                    }}
                  >
                  {selectedTemplate && getTemplateImageUrl(selectedTemplate) ? (
                    <div 
                      className="absolute inset-0 w-full h-full bg-white"
                      style={{
                        // PERBAIKAN: Pastikan background template menggunakan koordinat absolut
                        position: "absolute",
                        top: "0",
                        left: "0",
                        width: "100%",
                        height: "100%",
                        // Pastikan tidak ada transform atau scaling
                        transform: "none",
                        // Pastikan background putih konsisten
                        backgroundColor: "#ffffff"
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={getTemplateImageUrl(selectedTemplate)!}
                        alt="Certificate Template"
                        crossOrigin="anonymous"
                        style={{ 
                          // PERBAIKAN: Gunakan dimensi yang sama persis dengan container
                          width: `${getConsistentDimensions.width}px`,
                          height: `${getConsistentDimensions.height}px`,
                          objectFit: "cover",
                          backgroundColor: "#ffffff",
                          // Pastikan tidak ada transform atau scaling
                          transform: "none",
                          // Pastikan posisi deterministik
                          position: "absolute",
                          top: "0",
                          left: "0"
                        }}
                        onLoad={handleImageLoad}
                      />
                      
                    </div>
                  ) : (
                    <>
                      {/* Decorative Corners */}
                      <div className="absolute top-0 left-0 w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-br-2xl"></div>
                      <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-yellow-400 to-orange-500 rounded-bl-2xl"></div>
                      <div className="absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-tr from-yellow-400 to-orange-500 rounded-tr-2xl"></div>
                      <div className="absolute bottom-0 right-0 w-16 h-16 bg-gradient-to-tl from-yellow-400 to-orange-500 rounded-tl-2xl"></div>
                    </>
                  )}

                  {/* Snap Grid Overlay */}
                  {snapGridEnabled && (
                    <div className="absolute inset-0 pointer-events-none">
                      <svg className="w-full h-full">
                        <defs>
                          <pattern
                            id="grid"
                            width={gridSize}
                            height={gridSize}
                            patternUnits="userSpaceOnUse"
                          >
                            <path
                              d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`}
                              fill="none"
                              stroke="rgba(59, 130, 246, 0.2)"
                              strokeWidth="0.5"
                            />
                          </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#grid)" />
                      </svg>
                    </div>
                  )}

                  {/* Overlay Images (support transparent background) */}
                  {overlayImages.map((img) => (
                    <div
                      key={img.id}
                      data-overlay-image="true"
                      className={`absolute group ${selectedImage === img.id ? 'ring-2 ring-blue-500' : ''}`}
                      style={{
                        left: `${img.x}px`,
                        top: `${img.y}px`,
                        width: `${img.width}px`,
                        height: `${img.height}px`,
                      }}
                      onMouseDown={(e) => handleImageDragStart(e, img.id)}
                      onClick={() => setSelectedImage(img.id)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.url}
                        alt="Overlay"
                        className="w-full h-full object-fill cursor-move"
                        draggable={false}
                      />
                      
                      {/* Resize handle (bottom-right corner) */}
                      {selectedImage === img.id && (
                        <>
                          <div
                            className="absolute bottom-0 right-0 w-4 h-4 bg-blue-500 cursor-nwse-resize rounded-tl"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              handleImageResizeStart(e, img.id);
                            }}
                          />
                          {/* Delete button */}
                          <button
                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 text-xs font-bold"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleImageDelete(img.id);
                            }}
                          >
                            ×
                          </button>
                        </>
                      )}
                    </div>
                  ))}

                  {/* FIX: Draggable text layers with consistent positioning */}
                  {textLayers.map((layer) => {
                    // Calculate actual position using absolute x/y while dragging for smooth visual,
                    // otherwise use normalized coordinates for stable layout
                    const consistentDims = getConsistentDimensions;
                    const isActiveDragging = draggingLayer === layer.id || candidateLayerRef.current === layer.id;
                    const actualX = isActiveDragging && typeof layer.x === "number"
                      ? layer.x
                      : layer.xPercent * consistentDims.width;
                    const actualY = isActiveDragging && typeof layer.y === "number"
                      ? layer.y
                      : layer.yPercent * consistentDims.height;
                    
                    // Debug log untuk melihat perbedaan dimensi
                    if (layer.id === "name") { // Log hanya untuk layer name untuk menghindari spam
                      console.log('👁️ Preview Dimensions:', {
                        consistentDims,
                        actualX,
                        actualY,
                        layerXPercent: layer.xPercent,
                        layerYPercent: layer.yPercent,
                        fontSize: layer.fontSize,
                        offsetX: consistentDims.offsetX,
                        offsetY: consistentDims.offsetY
                      });
                    }

                    // Prevent deletion for system-generated layers
                    const __isSystemLayer = [
                      "certificate_no",
                      "name",
                      "description",
                      "issue_date",
                      "expired_date",
                    ].includes(layer.id);

                    return (
                      <div
                        key={layer.id}
                        className="absolute select-none group"
                        style={{
                          // PERBAIKAN: Pastikan koordinat absolut yang deterministik
                          position: "absolute",
                          left: `${actualX}px`,
                          top: `${actualY}px`,
                          // PERBAIKAN: Pastikan font styling konsisten dengan skala container
                          fontSize: `${layer.fontSize * (consistentDims.scale || 1)}px`,
                          color: layer.color,
                          fontWeight: layer.fontWeight,
                          fontFamily: layer.fontFamily,
                          // Pastikan tidak ada transform atau scaling
                          transform: "none",
                          // Hindari animasi/transition saat drag
                          transition: "none",
                          willChange: "left, top",
                          // Pastikan tidak ada margin atau padding yang mempengaruhi posisi
                          margin: "0",
                          padding: "0",
                          // Pastikan border dan outline tidak mempengaruhi layout
                          border: "none",
                          outline: "none",
                          // Pastikan user interaction tetap berfungsi
                          userSelect: "none",
                          pointerEvents: "auto",
                          cursor: draggingLayer === layer.id ? "grabbing" : "move",
                          // PERBAIKAN: Tambahkan ring hanya saat tidak dalam mode render
                          ...(selectedLayerId === layer.id && !isGenerating ? {
                            boxShadow: "0 0 0 2px rgba(59, 130, 246, 0.5)"
                          } : {})
                        }}
                        onMouseDown={(e) => {
                          // Only handle left-click for drag/select
                          if (e.button !== 0) return;
                          e.preventDefault();
                          selectTextLayer(layer.id);
                          handleMouseDown(e, layer.id);
                          focusFieldForLayer(layer.id, false);
                        }}
                        onContextMenu={(e) => {
                          // Disable context menu to avoid accidental mode changes on right-click
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onDoubleClick={(e) => {
                          // Only left double-click should enter edit mode
                          if (typeof e.button === 'number' && e.button !== 0) return;
                          e.preventDefault();
                          startEditingText(layer.id);
                        }}
                      >
                        {layer.isEditing ? (
                          <input
                            type="text"
                            value={layer.text || ""}
                            onChange={(e) =>
                              updateTextContent(layer.id, e.target.value)
                            }
                            onBlur={() => stopEditingText(layer.id)}
                            onKeyDown={(e) => {
                              // Stop event propagation to prevent global handlers
                              e.stopPropagation();

                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                stopEditingText(layer.id);
                              } else if (e.key === "Escape") {
                                e.preventDefault();
                                stopEditingText(layer.id);
                              }
                              // Let Backspace and Delete work normally for text editing
                            }}
                            className="bg-transparent border-none outline-none"
                            style={{
                              // PERBAIKAN: Pastikan input styling konsisten dengan text dan skala
                              fontSize: `${layer.fontSize * (consistentDims.scale || 1)}px`,
                              color: layer.color,
                              fontWeight: layer.fontWeight,
                              fontFamily: layer.fontFamily,
                              // Pastikan tidak ada padding yang mempengaruhi posisi
                              padding: "0",
                              margin: "0",
                              // Pastikan tidak ada border atau outline yang mempengaruhi layout
                              border: "none",
                              outline: "none",
                              // Pastikan background transparan
                              backgroundColor: "transparent",
                              // Pastikan ukuran yang sesuai
                              minWidth: "100px",
                              // Pastikan tidak ada transform atau scaling
                              transform: "none"
                            }}
                            autoFocus
                          />
                        ) : (
                          <div className="relative">
                            <span
                              style={{
                                // PERBAIKAN: Pastikan text display styling konsisten
                                backgroundColor: "transparent",
                                // Pastikan tidak ada padding yang mempengaruhi posisi
                                padding: "0",
                                margin: "0",
                                // Pastikan tidak ada border atau outline yang mempengaruhi layout
                                border: "none",
                                outline: "none",
                                // Pastikan tidak ada transform atau scaling
                                transform: "none"
                              }}
                            >
                              {layer.text || "Click to edit"}
                            </span>
                            {/* Delete button - hidden for system layers */}
                            {!__isSystemLayer && (
                              <button
                                className={`absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs transition-opacity duration-200 flex items-center justify-center ${
                                  selectedLayerId === layer.id
                                    ? "opacity-100"
                                    : "opacity-0 group-hover:opacity-100"
                                }`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteTextLayer(layer.id);
                                }}
                                title="Delete text"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Certificate Content - Only show if no template image and no text layers */}
                  {(!selectedTemplate ||
                    !getTemplateImageUrl(selectedTemplate)) &&
                    textLayers.length === 0 && (
                      <div className="relative z-10 text-center p-6 xl:p-10">
                        <div className="mb-4 xl:mb-6">
                          <h3 className="text-2xl xl:text-3xl font-bold text-gray-800 mb-2">
                            CERTIFICATE
                          </h3>
                          <div className="w-16 xl:w-20 h-1 bg-gradient-to-r from-blue-500 to-blue-600 mx-auto rounded-full"></div>
                        </div>

                        <p className="text-gray-600 mb-3 xl:mb-4">
                          This is to certify that
                        </p>
                        <h4 className="text-xl xl:text-2xl font-bold text-gray-800 mb-3 xl:mb-4">
                          {certificateData.name}
                        </h4>
                        <p className="text-gray-600 mb-6">
                          has successfully completed the
                          <br />
                          <span className="font-semibold">
                            {certificateData.description}
                          </span>
                        </p>

                        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-6">
                          <div>
                            <p className="font-semibold">Certificate No:</p>
                            <p>{certificateData.certificate_no}</p>
                          </div>
                          <div>
                            <p className="font-semibold">Issue Date:</p>
                            <p>{certificateData.issue_date}</p>
                          </div>
                          {certificateData.expired_date && (
                            <div>
                              <p className="font-semibold">Expiry Date:</p>
                              <p>{certificateData.expired_date}</p>
                            </div>
                          )}
                        </div>

                        {/* QR Code Placeholder */}
                        <div className="w-16 h-16 bg-gray-200 rounded-lg mx-auto mb-4 flex items-center justify-center">
                          <div className="w-12 h-12 bg-gray-300 rounded grid grid-cols-3 gap-1 p-1">
                            {[...Array(9)].map((_, i) => (
                              <div
                                key={i}
                                className="bg-gray-600 rounded-sm"
                              ></div>
                            ))}
                          </div>
                        </div>

                        <p className="text-xs text-gray-500">
                          Verify at: e-certificate.my.id/verify
                        </p>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Return to edit button when PNG is shown */}
                {generatedImageUrl && (
                  <div className="absolute bottom-4 right-4">
                    <Button
                      onClick={() => setGeneratedImageUrl(null)}
                      variant="outline"
                      size="sm"
                      className="bg-white hover:bg-gray-50"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Back to Editor
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Right Section - Input Form */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="bg-white rounded-lg border border-gray-200 shadow-md p-4 mx-auto xl:mx-0 w-full sm:w-[420px] md:w-[460px] max-w-full shrink-0 overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-gray-900">
                  {t("generator.recipient")}
                </h2>
                <Button
                  variant="outline"
                  className="border-gray-300"
                  onClick={() => setImportModalOpen(true)}
                  size="sm"
                >
                  Import Excel
                </Button>
              </div>

              <div className="space-y-3">
                {(role === "Admin" || role === "Team") && (
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">
                      Select Member
                    </label>
                    <select
                      className="w-full h-9 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={selectedMemberId}
                      onChange={(e) => handleSelectMember(e.target.value)}
                      disabled={membersLoading}
                    >
                      <option value="">{membersLoading ? 'Loading members...' : '— Select a member —'}</option>
                      {members.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}{m.organization ? ` — ${m.organization}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">
                    Certificate Number
                  </label>
                  <Input
                    value={certificateData.certificate_no}
                    onChange={(e) =>
                      updateCertificateData("certificate_no", e.target.value)
                    }
                    onFocus={() => setFocusedField("certificate_no")}
                    ref={certNoRef}
                    placeholder="Enter certificate number"
                    className="border-gray-300 h-9 text-sm"
                  />
                  {focusedField === "certificate_no" && (
                    <div className="pt-2">
                      <GlobalFontSettings
                        selectedLayerId="certificate_no"
                        selectedStyle={(() => {
                          const l = textLayers.find((x) => x.id === "certificate_no");
                          return l
                            ? {
                                fontSize: l.fontSize,
                                fontFamily: l.fontFamily,
                                color: l.color,
                                fontWeight: l.fontWeight,
                                x: l.x,
                                y: l.y,
                              }
                            : null;
                        })()}
                        onChange={(prop, value) => updateTextStyle("certificate_no", prop, value)}
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">
                    Recipient Name
                  </label>
                  <Input
                    value={certificateData.name}
                    onChange={(e) =>
                      updateCertificateData("name", e.target.value)
                    }
                    onFocus={() => setFocusedField("name")}
                    ref={nameRef}
                    placeholder="Enter recipient name"
                    className="border-gray-300 h-9 text-sm"
                  />
                  {focusedField === "name" && (
                    <div className="pt-2">
                      <GlobalFontSettings
                        selectedLayerId="name"
                        selectedStyle={(() => {
                          const l = textLayers.find((x) => x.id === "name");
                          return l
                            ? {
                                fontSize: l.fontSize,
                                fontFamily: l.fontFamily,
                                color: l.color,
                                fontWeight: l.fontWeight,
                                x: l.x,
                                y: l.y,
                              }
                            : null;
                        })()}
                        onChange={(prop, value) => updateTextStyle("name", prop, value)}
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    value={certificateData.description}
                    onChange={(e) =>
                      updateCertificateData("description", e.target.value)
                    }
                    onFocus={() => setFocusedField("description")}
                    ref={descRef}
                    placeholder="Enter certificate description"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={2}
                  />
                  {focusedField === "description" && (
                    <div className="pt-2">
                      <GlobalFontSettings
                        selectedLayerId="description"
                        selectedStyle={(() => {
                          const l = textLayers.find((x) => x.id === "description");
                          return l
                            ? {
                                fontSize: l.fontSize,
                                fontFamily: l.fontFamily,
                                color: l.color,
                                fontWeight: l.fontWeight,
                                x: l.x,
                                y: l.y,
                              }
                            : null;
                        })()}
                        onChange={(prop, value) => updateTextStyle("description", prop, value)}
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">
                      Issue Date
                    </label>
                    <Input
                      type="date"
                      value={certificateData.issue_date}
                      onChange={(e) =>
                        updateCertificateData("issue_date", e.target.value)
                      }
                      onFocus={() => setFocusedField("issue_date")}
                      ref={issueRef}
                      className="border-gray-300 h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">
                      Expiry Date (Optional)
                    </label>
                    <Input
                      type="date"
                      value={certificateData.expired_date}
                      onChange={(e) =>
                        updateCertificateData("expired_date", e.target.value)
                      }
                      onFocus={() => setFocusedField("expired_date")}
                      ref={expiryRef}
                      className="border-gray-300 h-9 text-sm"
                    />
                  </div>
                </div>
                {(focusedField === "issue_date" || focusedField === "expired_date") && (
                  <div className="pt-2 w-full">
                    <GlobalFontSettings
                      selectedLayerId={focusedField!}
                      selectedStyle={(() => {
                        const l = textLayers.find((x) => x.id === focusedField);
                        return l
                          ? {
                              fontSize: l.fontSize,
                              fontFamily: l.fontFamily,
                              color: l.color,
                              fontWeight: l.fontWeight,
                            }
                          : null;
                      })()}
                      onChange={(prop, value) => updateTextStyle(focusedField!, prop, value)}
                      dateFormat={dateFormat}
                      onDateFormatChange={(fmt) => {
                        setDateFormat(fmt);
                        setTextLayers((prev) =>
                          prev.map((l) =>
                            (l.id === 'issue_date' || l.id === 'expired_date')
                              ? {
                                  ...l,
                                  text: formatDateString(
                                    certificateData[l.id as 'issue_date' | 'expired_date'],
                                    fmt,
                                  ),
                                }
                              : l,
                          ),
                        );
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {/* Text Layer Editor */}
                {selectedLayerId && (() => {
                const selectedLayer = textLayers.find((l) => l.id === selectedLayerId);
                if (!selectedLayer) return null;

                // FIX: Only show editing controls for custom text layers, not system-generated ones
                const isSystemLayer = [
                  "certificate_no",
                  "name",
                  "description",
                  "issue_date",
                  "expired_date",
                ].includes(selectedLayerId);

                // Don't show editor for system layers
                if (isSystemLayer) return null;

                    return (
                      <div className="space-y-4 pt-4 border-t border-gray-200">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-gray-700">
                            Edit Selected Text
                          </h3>
                          {textLayers.find(l => l.id === selectedLayerId)?.isEditing ? (
                            <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                              Editing...
                            </span>
                          ) : null}
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">
                            Text Content
                          </label>
                          <Input
                            value={textLayers.find(l => l.id === selectedLayerId)?.text || ""}
                            onChange={(e) =>
                              updateTextContent(selectedLayerId!, e.target.value)
                            }
                            onKeyDown={(e) => {
                              // Stop event propagation to prevent global handlers
                              e.stopPropagation();
                              // Let Backspace and Delete work normally for text editing
                            }}
                            placeholder="Enter text content"
                            className="border-gray-300"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">
                              Font Family
                            </label>
                            <select
                              value={textLayers.find(l => l.id === selectedLayerId)?.fontFamily}
                              onChange={(e) =>
                                updateTextLayer(selectedLayerId!, {
                                  fontFamily: e.target.value,
                                })
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="Arial">Arial</option>
                              <option value="Times New Roman">
                                Times New Roman
                              </option>
                              <option value="Roboto">Roboto</option>
                              <option value="Montserrat">Montserrat</option>
                              <option value="Open Sans">Open Sans</option>
                              <option value="Lato">Lato</option>
                              <option value="Poppins">Poppins</option>
                            </select>
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">
                              Font Weight
                            </label>
                            <select
                              value={textLayers.find(l => l.id === selectedLayerId)?.fontWeight}
                              onChange={(e) =>
                                updateTextLayer(selectedLayerId!, {
                                  fontWeight: e.target.value,
                                })
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="normal">Normal</option>
                              <option value="medium">Medium</option>
                              <option value="bold">Bold</option>
                              <option value="bolder">Bolder</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">
                              Font Size (px)
                            </label>
                            <Input
                              type="number"
                              value={textLayers.find(l => l.id === selectedLayerId)?.fontSize}
                              onChange={(e) =>
                                updateTextLayer(selectedLayerId!, {
                                  fontSize: parseInt(e.target.value) || 16,
                                })
                              }
                              min="8"
                              max="72"
                              className="border-gray-300"
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">
                              Text Color
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={textLayers.find(l => l.id === selectedLayerId)?.color}
                                onChange={(e) =>
                                  updateTextLayer(selectedLayerId!, {
                                    color: e.target.value,
                                  })
                                }
                                className="w-10 h-8 border border-gray-300 rounded cursor-pointer"
                              />
                              <Input
                                value={textLayers.find(l => l.id === selectedLayerId)?.color}
                                onChange={(e) =>
                                  updateTextLayer(selectedLayerId!, {
                                    color: e.target.value,
                                  })
                                }
                                placeholder="#000000"
                                className="border-gray-300 text-sm"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                          <Button
                            onClick={() => startEditingText(selectedLayerId)}
                            variant="outline"
                            size="sm"
                            className="flex-1"
                          >
                            Edit Text
                          </Button>
                          <Button
                            onClick={() => centerTextLayer(selectedLayerId!)}
                            variant="outline"
                            size="sm"
                            className="flex-1 text-blue-600 border-blue-300 hover:bg-blue-50"
                          >
                            Center
                          </Button>
                          <Button
                            onClick={() => deleteTextLayer(selectedLayerId!)}
                            variant="outline"
                            size="sm"
                            className="flex-1 text-red-600 border-red-300 hover:bg-red-50"
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-3 pt-4">
                  <Button
                    className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log("🖱️ Generate Certificate button clicked!");
                      generatePreview();
                    }}
                    type="button"
                    disabled={isGenerating}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    {isGenerating ? "Generating..." : "Generate & Save Certificate"}
                  </Button>
                  <Button
                    className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
                    onClick={() => router.push("/certificates")}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    View Saved Certificates
                  </Button>
                  </div>
              </div>
            </motion.div>
          </div>
        </div>
      </main>
      <Footer />

      {/* Import Excel Modal with upload, mapping, and preview */}
      <Dialog open={importModalOpen} onOpenChange={setImportModalOpen}>
        <DialogContent className="max-w-3xl w-full">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Import Data dari Excel</DialogTitle>
            <DialogDescription>
              Sesuaikan header agar data dapat dipetakan ke field template. Anda dapat melakukan preview baris dan generate semua data.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            <div className="space-y-2">
              <p className="text-sm text-gray-700 font-semibold">Header yang disarankan:</p>
              <ul className="list-disc pl-5 text-sm text-gray-700">
                <li><code>certificate_no</code></li>
                <li><code>name</code></li>
                <li><code>description</code></li>
                <li><code>issue_date</code> (YYYY-MM-DD)</li>
                <li><code>expired_date</code> (opsional, YYYY-MM-DD)</li>
              </ul>
            </div>
            <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <label className="text-sm text-gray-700 font-semibold">Upload Excel/CSV</label>
              <input
                id="excel-upload-input"
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    setSelectedFileName(f.name);
                    handleExcelFile(f);
                  }
                }}
                className="hidden"
              />
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="border-gray-300"
                  onClick={() => document.getElementById('excel-upload-input')?.click()}
                >
                  Pilih File
                </Button>
                <span className="text-sm text-gray-600 truncate">
                  {selectedFileName || 'Belum ada file dipilih'}
                </span>
              </div>
              {!excelRows.length && (
                <p className="text-xs text-gray-500">Belum ada file terunggah. Contoh CSV:</p>
              )}
              {!excelRows.length && (
                <pre className="bg-white border border-gray-200 rounded p-3 text-xs overflow-auto">
{`certificate_no,name,description,issue_date,expired_date
CERT-001,John Doe,Completed Training,2024-01-10,2029-01-10`}
                </pre>
              )}
            </div>
            {excelRows.length > 0 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {(["certificate_no","name","description","issue_date","expired_date"]).map((field) => (
                    <div key={field} className="space-y-1">
                      <label className="text-xs text-gray-600">Map {field}</label>
                      <select
                        className="w-full h-9 px-2 border border-gray-300 rounded-md text-sm"
                        value={mapping[field] || ""}
                        onChange={(e) => setMapping((m) => ({ ...m, [field]: e.target.value }))}
                      >
                        <option value="">— pilih kolom —</option>
                        {excelHeaders.map((h) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                  <div className="space-y-1">
                    <label className="text-xs text-gray-600">Preview Row Index</label>
                    <Input
                      type="number"
                      value={selectedRowIndex}
                      onChange={(e) => setSelectedRowIndex(Math.max(0, Math.min(Number(e.target.value) || 0, Math.max(0, excelRows.length - 1))))}
                      className="w-32"
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" className="border-gray-300" onClick={() => applyRowToPreview(selectedRowIndex)}>
                      Apply to Preview
                    </Button>
                    <Button className="bg-gradient-to-r from-blue-500 to-blue-600 text-white" onClick={() => generateAllFromExcel()} disabled={isGenerating}>
                      {isGenerating ? "Generating..." : "Generate All"}
                    </Button>
                  </div>
                </div>
                <div className="overflow-auto border rounded">
                  <table className="min-w-full text-xs">
                    <thead>
                      <tr>
                        {excelHeaders.map((h) => (
                          <th key={h} className="px-2 py-1 text-left border-b bg-gray-50">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {excelRows.slice(0, 5).map((r, i) => (
                        <tr key={i} className="odd:bg-white even:bg-gray-50">
                          {excelHeaders.map((h) => {
                            const value = (r as Record<string, unknown>)[h];
                            return (
                              <td key={h} className="px-2 py-1 border-b">{String(value ?? "")}</td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" className="border-gray-300" onClick={() => setImportModalOpen(false)}>Tutup</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Toast Notifications */}
      <Toaster position="top-right" richColors />
    </div>
  );
}

export default function CertificateGeneratorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading certificate generator...</p>
        </div>
      </div>
    }>
      <CertificateGeneratorContent />
    </Suspense>
  );
}
