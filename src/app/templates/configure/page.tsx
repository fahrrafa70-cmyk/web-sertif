"use client";
import { Suspense, useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Plus, Trash2, Type, Upload, Image as ImageIcon, Eye, EyeOff } from "lucide-react";
import { getTemplate, getTemplateImageUrl, saveTemplateLayout, getTemplateLayout } from "@/lib/supabase/templates";
import { uploadTemplatePhoto, deleteTemplatePhoto, validateImageFile } from "@/lib/supabase/photo-storage";
import { Template } from "@/lib/supabase/templates";
import { toast, Toaster } from "sonner";
import type { TemplateLayoutConfig, TextLayerConfig, PhotoLayerConfig } from "@/types/template-layout";
import { STANDARD_CANVAS_WIDTH, STANDARD_CANVAS_HEIGHT } from "@/lib/constants/canvas";
import Image from "next/image";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { plainTextToRichText, applyStyleToRange, richTextToPlainText, getCommonStyleValue, hasMixedStyle } from "@/types/rich-text";
import { RichTextEditor } from "@/components/editor/RichTextEditor";
import { FontWeightSelect, FontFamilySelect } from "@/components/editor/MixedStyleSelect";
import { useLanguage } from "@/contexts/language-context";

// Dummy data for preview
const DUMMY_DATA = {
  name: "John Doe",
  certificate_no: "251102000",
  issue_date: "30 October 2025",
  expired_date: "30 October 2028",
  description: "For outstanding achievement"
};

interface TextLayer extends TextLayerConfig {
  isEditing?: boolean;
  isDragging?: boolean;
}

function ConfigureLayoutContent() {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateId = searchParams?.get("template");
  
  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [templateImageUrl, setTemplateImageUrl] = useState<string | null>(null);
  const [certificateImageDimensions, setCertificateImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [scoreImageDimensions, setScoreImageDimensions] = useState<{ width: number; height: number } | null>(null);
  
  // Mode switching: certificate or score
  const [configMode, setConfigMode] = useState<'certificate' | 'score'>('certificate');
  
  // Get current dimensions based on mode (computed value)
  const templateImageDimensions = configMode === 'certificate' ? certificateImageDimensions : scoreImageDimensions;
  
  // Text layers state - separate for certificate and score
  const [certificateTextLayers, setCertificateTextLayers] = useState<TextLayer[]>([]);
  const [scoreTextLayers, setScoreTextLayers] = useState<TextLayer[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [renamingLayerId, setRenamingLayerId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  
  // Current text layers based on mode (read-only computed value)
  const textLayers = configMode === 'certificate' ? certificateTextLayers : scoreTextLayers;
  
  // Photo layers state - separate for certificate and score
  const [certificatePhotoLayers, setCertificatePhotoLayers] = useState<PhotoLayerConfig[]>([]);
  const [scorePhotoLayers, setScorePhotoLayers] = useState<PhotoLayerConfig[]>([]);
  const [selectedPhotoLayerId, setSelectedPhotoLayerId] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  
  // Current photo layers based on mode (read-only computed value)
  const photoLayers = configMode === 'certificate' ? certificatePhotoLayers : scorePhotoLayers;
  
  // Preview text state (for testing display only, not saved)
  const [previewTexts, setPreviewTexts] = useState<Record<string, string>>({});
  
  // Rich text selection state
  const [richTextSelection, setRichTextSelection] = useState<{ start: number; end: number }>({ start: 0, end: 0 });
  
  // Canvas ref
  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasScale, setCanvasScale] = useState(1);

  // Preview modal state
  const [previewModalOpen, setPreviewModalOpen] = useState(false);

  // Store raw layout data in ref for use in image onload callbacks
  const existingLayoutRef = useRef<Awaited<ReturnType<typeof getTemplateLayout>> | null>(null);
  
  // Load template and existing layout
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    async function loadTemplate() {
      // Set a timeout to prevent infinite loading
      timeoutId = setTimeout(() => {
        console.warn('⚠️ Template loading timeout - setting loading to false');
        setLoading(false);
      }, 10000); // 10 second timeout
      if (!templateId) {
        toast.error(t('configure.noTemplateId'));
        router.push("/templates");
        return;
      }

      try {
        const tpl = await getTemplate(templateId);
        if (!tpl) {
          toast.error(t('configure.templateNotFound'));
          router.push("/templates");
          return;
        }

        setTemplate(tpl);
        
        // Load template image
        const imgUrl = await getTemplateImageUrl(tpl);
        setTemplateImageUrl(imgUrl);
        
        // Load existing layout and store in ref for use in image onload callbacks
        const existingLayout = await getTemplateLayout(templateId);
        existingLayoutRef.current = existingLayout;
        console.log('📋 Existing layout loaded:', existingLayout);
        
        // Load CERTIFICATE image dimensions for dynamic aspect ratio
        const certificateImageUrl = (tpl.certificate_image_url || tpl.image_path) as string;
        if (certificateImageUrl) {
          console.log('🖼️ Loading certificate image:', certificateImageUrl);
          const certImg = new window.Image();
          certImg.crossOrigin = 'anonymous'; // Enable CORS
          
          certImg.onerror = (error) => {
            console.error('❌ Failed to load certificate image:', error);
            console.error('Image URL:', certificateImageUrl);
            // Set loading to false even if image fails to load
            clearTimeout(timeoutId);
            setLoading(false);
          };
          
          certImg.onload = () => {
            const dimensions = { width: certImg.naturalWidth, height: certImg.naturalHeight };
            setCertificateImageDimensions(dimensions);
            console.log('📐 Certificate dimensions:', certImg.naturalWidth, 'x', certImg.naturalHeight);
            console.log('📊 Existing layout:', existingLayoutRef.current);
            
            // CRITICAL: Normalize coordinates when dimensions are loaded
            // This ensures coordinates are correct even if template image was replaced with different size
            const layout = existingLayoutRef.current;
            if (layout && layout.certificate && layout.certificate.textLayers && layout.certificate.textLayers.length > 0) {
              const normalizedLayers = (layout.certificate.textLayers as TextLayer[]).map(layer => {
                // Use xPercent/yPercent if available (resolution-independent), otherwise calculate from x/y
                const xPercent = layer.xPercent !== undefined && layer.xPercent !== null
                  ? layer.xPercent
                  : (layer.x || 0) / (dimensions.width || STANDARD_CANVAS_WIDTH);
                const yPercent = layer.yPercent !== undefined && layer.yPercent !== null
                  ? layer.yPercent
                  : (layer.y || 0) / (dimensions.height || STANDARD_CANVAS_HEIGHT);
                
                // Recalculate x/y based on actual template dimensions
                const x = Math.round(xPercent * dimensions.width);
                const y = Math.round(yPercent * dimensions.height);
                
                return {
                  ...layer,
                  x,
                  y,
                  xPercent,
                  yPercent,
                  maxWidth: layer.maxWidth || 300,
                  lineHeight: layer.lineHeight || 1.2,
                };
              });
              
              // Remove textAlign for certificate_no and issue_date
              const migratedLayers = normalizedLayers.map(layer => {
                if (layer.id === 'certificate_no' || layer.id === 'issue_date') {
                  const { textAlign, ...rest } = layer;
                  void textAlign;
                  return rest;
                }
                return layer;
              });
              
              setCertificateTextLayers(migratedLayers);
              console.log('✅ Normalized certificate layers to template dimensions:', dimensions);
              
              // Load photo layers for certificate mode
              if (layout.certificate.photoLayers && layout.certificate.photoLayers.length > 0) {
                setCertificatePhotoLayers(layout.certificate.photoLayers);
                console.log('📸 Loaded', layout.certificate.photoLayers.length, 'certificate photo layers');
              }
            } else {
              // No existing layout - initialize default layers with actual dimensions
              console.log('🆕 Initializing default certificate text layers with actual dimensions');
              console.log('   Layout check:', {
                hasLayout: !!layout,
                hasCertificate: layout?.certificate,
                hasTextLayers: layout?.certificate?.textLayers,
                textLayersLength: layout?.certificate?.textLayers?.length
              });
              const defaultLayers: TextLayerConfig[] = [
                {
                  id: 'name',
                  x: Math.round(dimensions.width * 0.5),
                  y: Math.round(dimensions.height * 0.5),
                  xPercent: 0.5,
                  yPercent: 0.5,
                  fontSize: 48,
                  color: '#000000',
                  fontWeight: 'bold',
                  fontFamily: 'Arial',
                  textAlign: 'center',
                  maxWidth: Math.round(dimensions.width * 0.4),
                  lineHeight: 1.2,
                  visible: true,
                },
                {
                  id: 'certificate_no',
                  x: Math.round(dimensions.width * 0.1),
                  y: Math.round(dimensions.height * 0.1),
                  xPercent: 0.1,
                  yPercent: 0.1,
                  fontSize: 16,
                  color: '#000000',
                  fontWeight: 'normal',
                  fontFamily: 'Arial',
                  maxWidth: Math.round(dimensions.width * 0.3),
                  lineHeight: 1.2,
                  visible: true,
                },
                {
                  id: 'issue_date',
                  x: Math.round(dimensions.width * 0.7),
                  y: Math.round(dimensions.height * 0.85),
                  xPercent: 0.7,
                  yPercent: 0.85,
                  fontSize: 14,
                  color: '#000000',
                  fontWeight: 'normal',
                  fontFamily: 'Arial',
                  maxWidth: Math.round(dimensions.width * 0.3),
                  lineHeight: 1.2,
                  visible: true,
                },
              ];
              console.log('✅ Created default layers:', defaultLayers.map(l => ({ id: l.id, x: l.x, y: l.y })));
              setCertificateTextLayers(defaultLayers);
              if (defaultLayers.length > 0) {
                setSelectedLayerId(defaultLayers[0].id);
              }
              console.log('✅ Default certificate layers set successfully');
            }
            // Set loading to false after processing certificate image
            clearTimeout(timeoutId);
            setLoading(false);
          };
          
          // Set src and check if already cached
          certImg.src = certificateImageUrl;
          
          // Handle case where image is already cached (onload may not fire)
          // Check after setting src, as cached images will have complete=true immediately
          if (certImg.complete) {
            // Image already loaded from cache, trigger callback manually
            const dimensions = { width: certImg.naturalWidth, height: certImg.naturalHeight };
            setCertificateImageDimensions(dimensions);
            console.log('📐 Certificate dimensions (cached):', certImg.naturalWidth, 'x', certImg.naturalHeight);
            
            const layout = existingLayoutRef.current;
            if (layout && layout.certificate && layout.certificate.textLayers && layout.certificate.textLayers.length > 0) {
              const normalizedLayers = (layout.certificate.textLayers as TextLayer[]).map(layer => {
                const xPercent = layer.xPercent !== undefined && layer.xPercent !== null
                  ? layer.xPercent
                  : (layer.x || 0) / (dimensions.width || STANDARD_CANVAS_WIDTH);
                const yPercent = layer.yPercent !== undefined && layer.yPercent !== null
                  ? layer.yPercent
                  : (layer.y || 0) / (dimensions.height || STANDARD_CANVAS_HEIGHT);
                
                const x = Math.round(xPercent * dimensions.width);
                const y = Math.round(yPercent * dimensions.height);
                
                return {
                  ...layer,
                  x,
                  y,
                  xPercent,
                  yPercent,
                  maxWidth: layer.maxWidth || 300,
                  lineHeight: layer.lineHeight || 1.2,
                };
              });
              
              const migratedLayers = normalizedLayers.map(layer => {
                if (layer.id === 'certificate_no' || layer.id === 'issue_date') {
                  const { textAlign, ...rest } = layer;
                  void textAlign;
                  return rest;
                }
                return layer;
              });
              
              setCertificateTextLayers(migratedLayers);
              console.log('✅ Normalized certificate layers (cached image)');
              
              // Load photo layers for certificate mode (cached)
              if (layout.certificate.photoLayers && layout.certificate.photoLayers.length > 0) {
                setCertificatePhotoLayers(layout.certificate.photoLayers);
                console.log('📸 Loaded', layout.certificate.photoLayers.length, 'certificate photo layers (cached)');
              }
            } else {
              // No existing layout - initialize default layers with actual dimensions (cached)
              console.log('🆕 Initializing default certificate text layers with actual dimensions (cached)');
              const defaultLayers: TextLayerConfig[] = [
                {
                  id: 'name',
                  x: Math.round(dimensions.width * 0.5),
                  y: Math.round(dimensions.height * 0.5),
                  xPercent: 0.5,
                  yPercent: 0.5,
                  fontSize: 48,
                  color: '#000000',
                  fontWeight: 'bold',
                  fontFamily: 'Arial',
                  textAlign: 'center',
                  maxWidth: Math.round(dimensions.width * 0.4),
                  lineHeight: 1.2,
                  visible: true,
                },
                {
                  id: 'certificate_no',
                  x: Math.round(dimensions.width * 0.1),
                  y: Math.round(dimensions.height * 0.1),
                  xPercent: 0.1,
                  yPercent: 0.1,
                  fontSize: 16,
                  color: '#000000',
                  fontWeight: 'normal',
                  fontFamily: 'Arial',
                  maxWidth: Math.round(dimensions.width * 0.3),
                  lineHeight: 1.2,
                  visible: true,
                },
                {
                  id: 'issue_date',
                  x: Math.round(dimensions.width * 0.7),
                  y: Math.round(dimensions.height * 0.85),
                  xPercent: 0.7,
                  yPercent: 0.85,
                  fontSize: 14,
                  color: '#000000',
                  fontWeight: 'normal',
                  fontFamily: 'Arial',
                  maxWidth: Math.round(dimensions.width * 0.3),
                  lineHeight: 1.2,
                  visible: true,
                },
              ];
              setCertificateTextLayers(defaultLayers);
              if (defaultLayers.length > 0) {
                setSelectedLayerId(defaultLayers[0].id);
              }
            }
            // Set loading to false after processing cached certificate image
            clearTimeout(timeoutId);
            setLoading(false);
          }
        } else {
          // No certificate image URL - set loading to false and use default dimensions
          console.log('⚠️ No certificate image URL found, using default dimensions');
          setCertificateImageDimensions({ width: STANDARD_CANVAS_WIDTH, height: STANDARD_CANVAS_HEIGHT });
          
          // Initialize default certificate text layers since we have no image to load
          const defaultLayers: TextLayerConfig[] = [
            {
              id: 'name',
              x: Math.round(STANDARD_CANVAS_WIDTH * 0.5),
              y: Math.round(STANDARD_CANVAS_HEIGHT * 0.5),
              xPercent: 0.5,
              yPercent: 0.5,
              fontSize: 48,
              color: '#000000',
              fontWeight: 'bold',
              fontFamily: 'Arial',
              textAlign: 'center',
              maxWidth: Math.round(STANDARD_CANVAS_WIDTH * 0.4),
              lineHeight: 1.2,
              visible: true,
            },
            {
              id: 'certificate_no',
              x: Math.round(STANDARD_CANVAS_WIDTH * 0.1),
              y: Math.round(STANDARD_CANVAS_HEIGHT * 0.1),
              xPercent: 0.1,
              yPercent: 0.1,
              fontSize: 16,
              color: '#000000',
              fontWeight: 'normal',
              fontFamily: 'Arial',
              maxWidth: Math.round(STANDARD_CANVAS_WIDTH * 0.3),
              lineHeight: 1.2,
              visible: true,
            },
            {
              id: 'issue_date',
              x: Math.round(STANDARD_CANVAS_WIDTH * 0.7),
              y: Math.round(STANDARD_CANVAS_HEIGHT * 0.85),
              xPercent: 0.7,
              yPercent: 0.85,
              fontSize: 14,
              color: '#000000',
              fontWeight: 'normal',
              fontFamily: 'Arial',
              maxWidth: Math.round(STANDARD_CANVAS_WIDTH * 0.3),
              lineHeight: 1.2,
              visible: true,
            },
          ];
          setCertificateTextLayers(defaultLayers);
          if (defaultLayers.length > 0) {
            setSelectedLayerId(defaultLayers[0].id);
          }
          
          clearTimeout(timeoutId);
          setLoading(false);
        }
        
        // Load SCORE image dimensions if dual template
        if (tpl.is_dual_template && tpl.score_image_url) {
          const scoreImg = new window.Image();
          scoreImg.onerror = (error) => {
            console.error('❌ Failed to load score image:', error);
            console.error('Score Image URL:', tpl.score_image_url);
          };
          scoreImg.onload = () => {
            const dimensions = { width: scoreImg.naturalWidth, height: scoreImg.naturalHeight };
            setScoreImageDimensions(dimensions);
            console.log('📊 Score dimensions:', scoreImg.naturalWidth, 'x', scoreImg.naturalHeight);
            
            // CRITICAL: Normalize coordinates when dimensions are loaded
            const layout = existingLayoutRef.current;
            if (layout && layout.score && layout.score.textLayers && layout.score.textLayers.length > 0) {
              const normalizedLayers = (layout.score.textLayers as TextLayer[]).map(layer => {
                // Use xPercent/yPercent if available (resolution-independent), otherwise calculate from x/y
                const xPercent = layer.xPercent !== undefined && layer.xPercent !== null
                  ? layer.xPercent
                  : (layer.x || 0) / (dimensions.width || STANDARD_CANVAS_WIDTH);
                const yPercent = layer.yPercent !== undefined && layer.yPercent !== null
                  ? layer.yPercent
                  : (layer.y || 0) / (dimensions.height || STANDARD_CANVAS_HEIGHT);
                
                // Recalculate x/y based on actual template dimensions
                const x = Math.round(xPercent * dimensions.width);
                const y = Math.round(yPercent * dimensions.height);
                
                return {
                  ...layer,
                  x,
                  y,
                  xPercent,
                  yPercent,
                  maxWidth: layer.maxWidth || 300,
                  lineHeight: layer.lineHeight || 1.2,
                };
              });
              
              setScoreTextLayers(normalizedLayers);
              console.log('✅ Normalized score layers to template dimensions:', dimensions);
              
              // Load photo layers for score mode
              if (layout.score.photoLayers && layout.score.photoLayers.length > 0) {
                setScorePhotoLayers(layout.score.photoLayers);
                console.log('📸 Loaded', layout.score.photoLayers.length, 'score photo layers');
              }
            } else {
              // No existing layout - initialize default score layers with actual dimensions
              console.log('🆕 Initializing default score text layers with actual dimensions');
              const defaultScoreLayers: TextLayerConfig[] = [
                {
                  id: 'name',
                  x: Math.round(dimensions.width * 0.5),
                  y: Math.round(dimensions.height * 0.5),
                  xPercent: 0.5,
                  yPercent: 0.5,
                  fontSize: 48,
                  color: '#000000',
                  fontWeight: 'bold',
                  fontFamily: 'Arial',
                  textAlign: 'center',
                  maxWidth: Math.round(dimensions.width * 0.4),
                  lineHeight: 1.2,
                  visible: true,
                },
                {
                  id: 'certificate_no',
                  x: Math.round(dimensions.width * 0.1),
                  y: Math.round(dimensions.height * 0.1),
                  xPercent: 0.1,
                  yPercent: 0.1,
                  fontSize: 16,
                  color: '#000000',
                  fontWeight: 'normal',
                  fontFamily: 'Arial',
                  maxWidth: Math.round(dimensions.width * 0.3),
                  lineHeight: 1.2,
                  visible: true,
                },
                {
                  id: 'issue_date',
                  x: Math.round(dimensions.width * 0.7),
                  y: Math.round(dimensions.height * 0.85),
                  xPercent: 0.7,
                  yPercent: 0.85,
                  fontSize: 14,
                  color: '#000000',
                  fontWeight: 'normal',
                  fontFamily: 'Arial',
                  maxWidth: Math.round(dimensions.width * 0.3),
                  lineHeight: 1.2,
                  visible: true,
                },
              ];
              setScoreTextLayers(defaultScoreLayers);
            }
          };
          
          // Set src and check if already cached
          scoreImg.src = tpl.score_image_url;
          
          // Handle case where image is already cached (onload may not fire)
          // Check after setting src, as cached images will have complete=true immediately
          if (scoreImg.complete) {
            // Image already loaded from cache, trigger callback manually
            const dimensions = { width: scoreImg.naturalWidth, height: scoreImg.naturalHeight };
            setScoreImageDimensions(dimensions);
            console.log('📊 Score dimensions (cached):', scoreImg.naturalWidth, 'x', scoreImg.naturalHeight);
            
            const layout = existingLayoutRef.current;
            if (layout && layout.score && layout.score.textLayers && layout.score.textLayers.length > 0) {
              const normalizedLayers = (layout.score.textLayers as TextLayer[]).map(layer => {
                const xPercent = layer.xPercent !== undefined && layer.xPercent !== null
                  ? layer.xPercent
                  : (layer.x || 0) / (dimensions.width || STANDARD_CANVAS_WIDTH);
                const yPercent = layer.yPercent !== undefined && layer.yPercent !== null
                  ? layer.yPercent
                  : (layer.y || 0) / (dimensions.height || STANDARD_CANVAS_HEIGHT);
                
                const x = Math.round(xPercent * dimensions.width);
                const y = Math.round(yPercent * dimensions.height);
                
                return {
                  ...layer,
                  x,
                  y,
                  xPercent,
                  yPercent,
                  maxWidth: layer.maxWidth || 300,
                  lineHeight: layer.lineHeight || 1.2,
                };
              });
              
              setScoreTextLayers(normalizedLayers);
              console.log('✅ Normalized score layers (cached image)');
              
              // Load photo layers for score mode (cached)
              if (layout.score.photoLayers && layout.score.photoLayers.length > 0) {
                setScorePhotoLayers(layout.score.photoLayers);
                console.log('📸 Loaded', layout.score.photoLayers.length, 'score photo layers (cached)');
              }
            } else {
              // No existing layout - initialize default score layers with actual dimensions (cached)
              console.log('🆕 Initializing default score text layers with actual dimensions (cached)');
              const defaultScoreLayers: TextLayerConfig[] = [
                {
                  id: 'name',
                  x: Math.round(dimensions.width * 0.5),
                  y: Math.round(dimensions.height * 0.5),
                  xPercent: 0.5,
                  yPercent: 0.5,
                  fontSize: 48,
                  color: '#000000',
                  fontWeight: 'bold',
                  fontFamily: 'Arial',
                  textAlign: 'center',
                  maxWidth: Math.round(dimensions.width * 0.4),
                  lineHeight: 1.2,
                  visible: true,
                },
                {
                  id: 'certificate_no',
                  x: Math.round(dimensions.width * 0.1),
                  y: Math.round(dimensions.height * 0.1),
                  xPercent: 0.1,
                  yPercent: 0.1,
                  fontSize: 16,
                  color: '#000000',
                  fontWeight: 'normal',
                  fontFamily: 'Arial',
                  maxWidth: Math.round(dimensions.width * 0.3),
                  lineHeight: 1.2,
                  visible: true,
                },
                {
                  id: 'issue_date',
                  x: Math.round(dimensions.width * 0.7),
                  y: Math.round(dimensions.height * 0.85),
                  xPercent: 0.7,
                  yPercent: 0.85,
                  fontSize: 14,
                  color: '#000000',
                  fontWeight: 'normal',
                  fontFamily: 'Arial',
                  maxWidth: Math.round(dimensions.width * 0.3),
                  lineHeight: 1.2,
                  visible: true,
                },
              ];
              setScoreTextLayers(defaultScoreLayers);
            }
          }
        }
        
        // setLoading(false) is now handled in image loading callbacks above
      } catch (error) {
        console.error("Failed to load template:", error);
        toast.error(t('configure.failedToLoad'));
        router.push("/templates");
      }
    }

    loadTemplate();
    
    // Cleanup timeout on unmount
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [templateId, router]);

  // CRITICAL: Normalize coordinates when template dimensions change
  // This handles the case when template image is replaced with different size
  // Use refs to track last normalized dimensions to avoid infinite loops
  const lastCertDimensionsRef = useRef<{ width: number; height: number } | null>(null);
  const lastScoreDimensionsRef = useRef<{ width: number; height: number } | null>(null);
  
  useEffect(() => {
    if (!certificateImageDimensions) return;
    
    // Check if dimensions actually changed
    const lastDims = lastCertDimensionsRef.current;
    if (lastDims && 
        lastDims.width === certificateImageDimensions.width && 
        lastDims.height === certificateImageDimensions.height) {
      return; // No change, skip normalization
    }
    
    lastCertDimensionsRef.current = certificateImageDimensions;
    
    // Normalize certificate layers based on new dimensions
    setCertificateTextLayers(prevLayers => {
      if (prevLayers.length === 0) return prevLayers;
      
      const normalizedLayers = prevLayers.map(layer => {
        // Always use xPercent/yPercent as source of truth (resolution-independent)
        const xPercent = layer.xPercent !== undefined && layer.xPercent !== null
          ? layer.xPercent
          : (layer.x || 0) / (certificateImageDimensions.width || STANDARD_CANVAS_WIDTH);
        const yPercent = layer.yPercent !== undefined && layer.yPercent !== null
          ? layer.yPercent
          : (layer.y || 0) / (certificateImageDimensions.height || STANDARD_CANVAS_HEIGHT);
        
        // Recalculate x/y based on actual template dimensions
        const x = Math.round(xPercent * certificateImageDimensions.width);
        const y = Math.round(yPercent * certificateImageDimensions.height);
        
        return {
          ...layer,
          x,
          y,
          xPercent,
          yPercent,
        };
      });
      
      console.log('🔄 Normalized certificate coordinates to template dimensions:', certificateImageDimensions);
      return normalizedLayers;
    });
  }, [certificateImageDimensions?.width, certificateImageDimensions?.height]); // Only depend on width/height

  // CRITICAL: Normalize score coordinates when score dimensions change
  useEffect(() => {
    if (!scoreImageDimensions) return;
    
    // Check if dimensions actually changed
    const lastDims = lastScoreDimensionsRef.current;
    if (lastDims && 
        lastDims.width === scoreImageDimensions.width && 
        lastDims.height === scoreImageDimensions.height) {
      return; // No change, skip normalization
    }
    
    lastScoreDimensionsRef.current = scoreImageDimensions;
    
    // Normalize score layers based on new dimensions
    setScoreTextLayers(prevLayers => {
      if (prevLayers.length === 0) return prevLayers;
      
      const normalizedLayers = prevLayers.map(layer => {
        // Always use xPercent/yPercent as source of truth (resolution-independent)
        const xPercent = layer.xPercent !== undefined && layer.xPercent !== null
          ? layer.xPercent
          : (layer.x || 0) / (scoreImageDimensions.width || STANDARD_CANVAS_WIDTH);
        const yPercent = layer.yPercent !== undefined && layer.yPercent !== null
          ? layer.yPercent
          : (layer.y || 0) / (scoreImageDimensions.height || STANDARD_CANVAS_HEIGHT);
        
        // Recalculate x/y based on actual template dimensions
        const x = Math.round(xPercent * scoreImageDimensions.width);
        const y = Math.round(yPercent * scoreImageDimensions.height);
        
        return {
          ...layer,
          x,
          y,
          xPercent,
          yPercent,
        };
      });
      
      console.log('🔄 Normalized score coordinates to template dimensions:', scoreImageDimensions);
      return normalizedLayers;
    });
  }, [scoreImageDimensions?.width, scoreImageDimensions?.height]); // Only depend on width/height

  // Initialize default certificate text layers
  const initializeDefaultCertificateLayers = () => {
    const defaultLayers: TextLayerConfig[] = [
      {
        id: 'name',
        x: 400,
        y: 300,
        xPercent: 400 / STANDARD_CANVAS_WIDTH,
        yPercent: 300 / STANDARD_CANVAS_HEIGHT,
        fontSize: 48,
        color: '#000000',
        fontWeight: 'bold',
        fontFamily: 'Arial',
        textAlign: 'center',
        maxWidth: 400,
        lineHeight: 1.2,
      },
      {
        id: 'certificate_no',
        x: 200,
        y: 100,
        xPercent: 200 / STANDARD_CANVAS_WIDTH,
        yPercent: 100 / STANDARD_CANVAS_HEIGHT,
        fontSize: 16,
        color: '#000000',
        fontWeight: 'normal',
        fontFamily: 'Arial',
        // No textAlign for certificate_no - always uses left alignment
        maxWidth: 300,
        lineHeight: 1.2,
      },
      {
        id: 'issue_date',
        x: 600,
        y: 500,
        xPercent: 600 / STANDARD_CANVAS_WIDTH,
        yPercent: 500 / STANDARD_CANVAS_HEIGHT,
        fontSize: 14,
        color: '#000000',
        fontWeight: 'normal',
        fontFamily: 'Arial',
        // No textAlign for issue_date - always uses left alignment
        maxWidth: 300,
        lineHeight: 1.2,
      },
    ];
    setCertificateTextLayers(defaultLayers);
    if (defaultLayers.length > 0) {
      setSelectedLayerId(defaultLayers[0].id);
    }
  };

  // Calculate canvas scale based on container width - dengan ResizeObserver untuk update yang lebih akurat
  useEffect(() => {
    const updateScale = () => {
      if (!canvasRef.current) return;
      
      // Gunakan requestAnimationFrame untuk memastikan layout sudah di-render
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (!canvasRef.current) return;
          
          // Get actual container dimensions (excluding padding)
          const containerWidth = canvasRef.current.offsetWidth;
          const containerHeight = canvasRef.current.offsetHeight;
          
          // Pastikan container memiliki dimensi yang valid
          if (containerWidth <= 0 || containerHeight <= 0) {
            console.warn('Canvas container has invalid dimensions:', { containerWidth, containerHeight });
            return;
          }
          
          // ✅ DYNAMIC SCALING: Use template's natural dimensions
          // 
          // NEW SYSTEM (Nov 5, 2025):
          //   Preview uses: containerWidth / templateNaturalWidth
          //   Generation uses: templateNaturalWidth / templateNaturalWidth = 1.0
          //   Result: EXACT 1:1 visual match! ✅
          // 
          // Example with 1080px template:
          //   Template natural size: 1080px
          //   Preview container: 800px
          //   Preview scale: 800/1080 = 0.74
          //   Generation scale: 1080/1080 = 1.0
          //   
          //   Font size 32px:
          //   - Preview: 32 * 0.74 = 24px (displayed)
          //   - Generation: 32 * 1.0 = 32px (output)
          //   - Visual proportion: 24/800 = 32/1080 ✅ EXACT!
          // 
          // OLD SYSTEM (REMOVED):
          //   Preview: containerWidth / STANDARD_CANVAS_WIDTH (e.g., 800/1500 = 0.53)
          //   Generation: templateWidth / STANDARD_CANVAS_WIDTH (e.g., 1080/1500 = 0.72)
          //   Result: Different scales → Preview ≠ Generation ❌
          
          const templateWidth = templateImageDimensions?.width || STANDARD_CANVAS_WIDTH;
          const templateHeight = templateImageDimensions?.height || STANDARD_CANVAS_HEIGHT;
          
          const scaleX = containerWidth / templateWidth;
          const scaleY = containerHeight / templateHeight;
          const scale = Math.min(scaleX, scaleY);
          
          // Ensure scale is valid (not NaN, Infinity, or negative)
          if (isNaN(scale) || !isFinite(scale) || scale <= 0) {
            console.warn('Invalid scale calculated:', scale, { containerWidth, containerHeight });
            return;
          }
          
          setCanvasScale(scale);
          
          // DEBUG: Log scaling information for font size debugging
          console.log('📏 Canvas Scale Calculation:', {
            containerWidth,
            containerHeight,
            templateWidth,
            templateHeight,
            scaleX,
            scaleY,
            scale,
            fontSizeExample: `Font 100px → Preview: ${(100 * scale).toFixed(2)}px`,
            note: 'Preview font size = storedFontSize * scale'
          });
        });
      });
    };

    // Initial update dengan multiple attempts untuk memastikan DOM sudah siap
    const initialTimeout1 = setTimeout(updateScale, 50);
    const initialTimeout2 = setTimeout(updateScale, 100);
    const initialTimeout3 = setTimeout(updateScale, 200);
    
    // Update saat resize
    window.addEventListener('resize', updateScale);
    
    // Gunakan ResizeObserver untuk tracking perubahan ukuran container secara real-time
    let resizeObserver: ResizeObserver | null = null;
    const canvasElement = canvasRef.current;
    if (canvasElement && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        // Gunakan debounce untuk ResizeObserver karena bisa trigger banyak kali
        requestAnimationFrame(updateScale);
      });
      resizeObserver.observe(canvasElement);
    }
    
    // Trigger update saat template atau layers berubah
    updateScale();
    
    return () => {
      clearTimeout(initialTimeout1);
      clearTimeout(initialTimeout2);
      clearTimeout(initialTimeout3);
      window.removeEventListener('resize', updateScale);
      if (resizeObserver && canvasElement) {
        resizeObserver.unobserve(canvasElement);
      }
    };
  }, [template, templateImageUrl, textLayers.length, templateImageDimensions]); // Update saat data berubah

  // Handle text layer drag
  const handleLayerMouseDown = (layerId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedLayerId(layerId);
    
    const layer = textLayers.find(l => l.id === layerId);
    if (!layer || !canvasRef.current) return;

    // Get actual container dimensions and calculate scale
    const templateWidth = templateImageDimensions?.width || STANDARD_CANVAS_WIDTH;
    const templateHeight = templateImageDimensions?.height || STANDARD_CANVAS_HEIGHT;
    
    // ✅ CRITICAL: Use canvasScale (already calculated) for mouse coordinate conversion
    // canvasScale = containerWidth / templateNaturalWidth
    const actualScale = canvasScale;
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startLayerX = layer.x;
    const startLayerY = layer.y;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      // Convert mouse delta to template coordinates using actual scale
      const deltaX = (moveEvent.clientX - startX) / actualScale;
      const deltaY = (moveEvent.clientY - startY) / actualScale;
      
      const newX = Math.max(0, Math.min(templateWidth, startLayerX + deltaX));
      const newY = Math.max(0, Math.min(templateHeight, startLayerY + deltaY));

      const setter = configMode === 'certificate' ? setCertificateTextLayers : setScoreTextLayers;
      setter(prev => prev.map(l => 
        l.id === layerId 
          ? { 
              ...l, 
              x: Math.round(newX), 
              y: Math.round(newY),
              xPercent: newX / templateWidth,
              yPercent: newY / templateHeight,
              isDragging: true
            }
          : l
      ));
    };

    const handleMouseUp = () => {
      const setter = configMode === 'certificate' ? setCertificateTextLayers : setScoreTextLayers;
      setter(prev => prev.map(l => ({ ...l, isDragging: false })));
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Handle resize handle drag
  const handleResizeMouseDown = (layerId: string, e: React.MouseEvent, direction: 'right' | 'left' | 'top' | 'bottom' | 'corner' = 'right') => {
    e.stopPropagation();
    
    const layer = textLayers.find(l => l.id === layerId);
    if (!layer || !canvasRef.current) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = layer.maxWidth || 300;
    const startHeight = layer.fontSize * (layer.lineHeight || 1.2);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      // Get actual container dimensions and calculate scale
      const templateWidth = templateImageDimensions?.width || STANDARD_CANVAS_WIDTH;
      const actualScale = canvasScale;
      
      // Convert mouse delta to template coordinates using actual scale
      const deltaX = (moveEvent.clientX - startX) / actualScale;
      const deltaY = (moveEvent.clientY - startY) / actualScale;
      
      const updates: Partial<TextLayer> = {};
      
      if (direction === 'right' || direction === 'left') {
        // Resize width only
        const delta = direction === 'right' ? deltaX : -deltaX;
        const newWidth = Math.max(50, startWidth + delta);
        updates.maxWidth = Math.round(newWidth);
      } else if (direction === 'bottom' || direction === 'top') {
        // Resize height by adjusting lineHeight
        const delta = direction === 'bottom' ? deltaY : -deltaY;
        const newHeight = Math.max(startHeight * 0.5, startHeight + delta);
        const newLineHeight = Math.max(0.5, Math.min(3.0, newHeight / layer.fontSize));
        updates.lineHeight = Math.round(newLineHeight * 10) / 10;
      } else if (direction === 'corner') {
        // Resize both width and height
        const newWidth = Math.max(50, startWidth + deltaX);
        const newHeight = Math.max(startHeight * 0.5, startHeight + deltaY);
        const newLineHeight = Math.max(0.5, Math.min(3.0, newHeight / layer.fontSize));
        updates.maxWidth = Math.round(newWidth);
        updates.lineHeight = Math.round(newLineHeight * 10) / 10;
      }

      const setter = configMode === 'certificate' ? setCertificateTextLayers : setScoreTextLayers;
      setter(prev => prev.map(l => 
        l.id === layerId ? { ...l, ...updates } : l
      ));
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Handle photo layer drag
  const handlePhotoLayerMouseDown = (layerId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedPhotoLayerId(layerId);
    
    const layer = photoLayers.find(l => l.id === layerId);
    if (!layer || !canvasRef.current) return;

    // Get actual container dimensions and calculate scale
    const containerRect = canvasRef.current.getBoundingClientRect();
    const templateWidth = templateImageDimensions?.width || STANDARD_CANVAS_WIDTH;
    const templateHeight = templateImageDimensions?.height || STANDARD_CANVAS_HEIGHT;
    
    // Use canvasScale for mouse coordinate conversion
    const actualScale = canvasScale;
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startLayerX = layer.x;
    const startLayerY = layer.y;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      // Convert mouse delta to template coordinates using actual scale
      const deltaX = (moveEvent.clientX - startX) / actualScale;
      const deltaY = (moveEvent.clientY - startY) / actualScale;
      
      const newX = Math.max(0, Math.min(templateWidth, startLayerX + deltaX));
      const newY = Math.max(0, Math.min(templateHeight, startLayerY + deltaY));

      const setter = configMode === 'certificate' ? setCertificatePhotoLayers : setScorePhotoLayers;
      setter(prev => prev.map(l => 
        l.id === layerId 
          ? { 
              ...l, 
              x: Math.round(newX), 
              y: Math.round(newY),
              xPercent: newX / templateWidth,
              yPercent: newY / templateHeight
            }
          : l
      ));
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Helper: Measure text width using temporary canvas
  // Uses absolute pixel measurements (not scaled) to match coordinate system
  const measureTextWidth = (text: string, fontSize: number, fontFamily: string, fontWeight: string, maxWidth?: number): number => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return 0;
    
    // Use absolute font size (not scaled) for measurement to match coordinate system
    // The coordinate system is based on STANDARD_CANVAS_WIDTH (800px)
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    
    // If maxWidth is set, measure wrapped text width (longest line)
    if (maxWidth && maxWidth > 0) {
      const words = text.split(' ');
      const lines: string[] = [];
      let currentLine = '';
      
      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const metrics = ctx.measureText(testLine);
        
        if (metrics.width > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) {
        lines.push(currentLine);
      }
      
      // Return width of longest line (or maxWidth, whichever is smaller)
      let maxLineWidth = 0;
      for (const line of lines) {
        const metrics = ctx.measureText(line);
        maxLineWidth = Math.max(maxLineWidth, metrics.width);
      }
      return Math.min(maxLineWidth, maxWidth);
    }
    
    // Single line text - return actual text width
    return ctx.measureText(text).width;
  };

  // Update text layer property
  const updateLayer = (layerId: string, updates: Partial<TextLayer>) => {
    // CRITICAL: Use direct setState based on configMode to avoid closure issues
    const setter = configMode === 'certificate' ? setCertificateTextLayers : setScoreTextLayers;
    
    setter(prev => {
      const layer = prev.find(l => l.id === layerId);
      if (!layer) return prev;
      
      // CRITICAL FIX: If textAlign is changing, adjust x coordinate to maintain visual position
      // The stored x coordinate represents the anchor point (left/center/right edge)
      // CSS transform translates this anchor to the visual position
      // When alignment changes, we need to recalculate x so the visual position stays the same
      // NOTE: certificate_no and issue_date don't support textAlign changes - they always use left
      if (updates.textAlign && updates.textAlign !== layer.textAlign && 
          layer.id !== 'certificate_no' && layer.id !== 'issue_date') {
        const oldAlign = layer.textAlign || 'left';
        const newAlign = updates.textAlign;
        
        // Get text content for measurement
        const text = previewTexts[layerId] || 
                     layer.defaultText || 
                     DUMMY_DATA[layer.id as keyof typeof DUMMY_DATA] || 
                     layer.id;
        
        // Measure text width (with maxWidth constraint if applicable)
        const textWidth = measureTextWidth(
          text,
          layer.fontSize,
          layer.fontFamily,
          layer.fontWeight,
          layer.maxWidth
        );
        
        // Calculate the current visual center position based on old alignment and stored x
        // CSS transforms: left(0%,-50%), center(-50%,-50%), right(-100%,-50%)
        // The stored x is the anchor point, transform shifts it to visual position
        let currentVisualCenterX = layer.x;
        if (oldAlign === 'center') {
          // x is already the center (transform(-50%,-50%) makes it the visual center)
          currentVisualCenterX = layer.x;
        } else if (oldAlign === 'right') {
          // x is right edge, transform(-100%,-50%) shifts it left by 100% of element width
          // So visual center is at: x - (textWidth / 2)
          currentVisualCenterX = layer.x - (textWidth / 2);
        } else {
          // left: x is left edge, transform(0%,-50%) doesn't shift horizontally
          // So visual center is at: x + (textWidth / 2)
          currentVisualCenterX = layer.x + (textWidth / 2);
        }
        
        // Calculate new x coordinate (anchor point) to maintain the same visual center
        let newX = currentVisualCenterX;
        if (newAlign === 'center') {
          // For center, x IS the center, so newX = visualCenter
          newX = currentVisualCenterX;
        } else if (newAlign === 'right') {
          // For right, x is right edge, visual center is at x - textWidth/2
          // So: x = visualCenter + textWidth/2
          newX = currentVisualCenterX + (textWidth / 2);
        } else {
          // left: x is left edge, visual center is at x + textWidth/2
          // So: x = visualCenter - textWidth/2
          newX = currentVisualCenterX - (textWidth / 2);
        }
        
        // Clamp and update x and xPercent using template's actual dimensions
        const templateWidth = templateImageDimensions?.width || STANDARD_CANVAS_WIDTH;
        newX = Math.max(0, Math.min(templateWidth, Math.round(newX)));
        updates.x = newX;
        updates.xPercent = newX / templateWidth;
      }
      
      return prev.map(l => 
        l.id === layerId ? { ...l, ...updates } : l
      );
    });
  };

  // Add new text layer
  const addTextLayer = () => {
    // Generate unique ID
    const timestamp = Date.now();
    const newId = `custom_${timestamp}`;
    
    // CRITICAL: Check for duplicate IDs (shouldn't happen with timestamp, but safety check)
    const existingIds = textLayers.map(l => l.id);
    if (existingIds.includes(newId)) {
      console.error(`⚠️ Duplicate ID detected: ${newId}! This should not happen.`);
      toast.error("Failed to create unique layer ID. Please try again.");
      return;
    }
    
    console.log(`➕ Adding new ${configMode} layer with ID: ${newId}`);
    console.log(`📊 Current ${configMode} layers:`, existingIds);
    
    const newLayer: TextLayerConfig = {
      id: newId,
      x: 400,
      y: 200,
      xPercent: 400 / STANDARD_CANVAS_WIDTH,
      yPercent: 200 / STANDARD_CANVAS_HEIGHT,
      fontSize: 24,
      color: '#000000',
      fontWeight: 'normal',
      fontFamily: 'Arial',
      // Score mode: default to center (for table cells)
      // Certificate mode: default to left
      textAlign: configMode === 'score' ? 'center' : 'left',
      maxWidth: 300,
      lineHeight: 1.2,
      // Custom layers don't need visible property (always visible, can be deleted instead)
    };
    
    const setter = configMode === 'certificate' ? setCertificateTextLayers : setScoreTextLayers;
    setter(prev => {
      const updated = [...prev, newLayer];
      console.log(`✅ Layer added. Count: ${prev.length} → ${updated.length}`);
      return updated;
    });
    
    setSelectedLayerId(newLayer.id);
    toast.success(t('configure.newLayerAdded'));
  };

  // Delete text layer
  const deleteLayer = (layerId: string) => {
    console.log(`🗑️ Attempting to delete layer: ${layerId} in ${configMode} mode`);
    
    // Prevent deleting required fields
    if (configMode === 'certificate') {
      const requiredFields = ['name', 'certificate_no', 'issue_date'];
      if (requiredFields.includes(layerId)) {
        toast.error(t('configure.cannotDeleteRequired'));
        console.log(`❌ Cannot delete required field: ${layerId}`);
        return;
      }
    } else if (configMode === 'score') {
      // Score mode: only issue_date is required
      if (layerId === 'issue_date') {
        toast.error(t('configure.cannotDeleteIssueDate'));
        console.log(`❌ Cannot delete required field: ${layerId}`);
        return;
      }
    }
    
    console.log(`📊 Current ${configMode} layers before deletion:`, textLayers.map(l => l.id));
    
    const setter = configMode === 'certificate' ? setCertificateTextLayers : setScoreTextLayers;
    setter(prev => {
      const filtered = prev.filter(l => l.id !== layerId);
      console.log(`✅ Layers after deletion:`, filtered.map(l => l.id));
      console.log(`📏 Layer count: ${prev.length} → ${filtered.length}`);
      return filtered;
    });
    
    if (selectedLayerId === layerId) {
      setSelectedLayerId(null);
      console.log(`🔄 Deselected layer: ${layerId}`);
    }
    
    toast.success(t('configure.layerDeleted').replace('{id}', layerId));
    console.log(`✨ Deletion complete. REMINDER: Changes not saved yet!`);
  };

  // Toggle text layer visibility
  const toggleLayerVisibility = (layerId: string) => {
    const setter = configMode === 'certificate' ? setCertificateTextLayers : setScoreTextLayers;
    setter(prev => prev.map(layer => 
      layer.id === layerId 
        ? { ...layer, visible: layer.visible === false ? true : false }
        : layer
    ));
    
    const layer = textLayers.find(l => l.id === layerId);
    const newVisibility = layer?.visible === false ? true : false;
    toast.success(newVisibility ? `Layer "${layerId}" is now visible` : `Layer "${layerId}" is now hidden`);
  };

  // ===== PHOTO LAYER MANAGEMENT FUNCTIONS =====
  
  // Photo layer setter based on mode
  const setPhotoLayers = configMode === 'certificate' ? setCertificatePhotoLayers : setScorePhotoLayers;
  
  // Handle photo upload
  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !template) return;
    
    try {
      setUploadingPhoto(true);
      
      // Validate file
      console.log(`📸 Uploading photo: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);
      
      const dimensions = await validateImageFile(file);
      console.log(`📐 Image dimensions: ${dimensions.width}×${dimensions.height}`);
      
      // Upload to Supabase Storage
      const { url, path } = await uploadTemplatePhoto(file, template.id);
      console.log(`✅ Photo uploaded: ${url}`);
      
      // Create photo layer config
      const timestamp = Date.now();
      const newPhotoLayer: PhotoLayerConfig = {
        id: `photo_${timestamp}`,
        type: 'photo',
        src: url,
        storagePath: path,
        
        // Position: Center of template
        x: 0,
        y: 0,
        xPercent: 0.5, // 50% from left (centered)
        yPercent: 0.3, // 30% from top
        
        // Size: 20% of template width, maintain aspect ratio
        width: 0,
        height: 0,
        widthPercent: 0.2,
        heightPercent: 0.2 * (dimensions.height / dimensions.width),
        
        // Layer order: Default to 'back' (behind text layers)
        // Text layers have zIndex = 100, so: 0 = back, 101 = front
        zIndex: 0,
        
        // Default settings
        fitMode: 'fill', // Hardcoded to fill - photo will stretch to fill border
        opacity: 1,
        rotation: 0,
        maintainAspectRatio: false, // Disabled to allow fill to work properly
        
        // Store original dimensions
        originalWidth: dimensions.width,
        originalHeight: dimensions.height
      };
      
      // Add to state
      setPhotoLayers(prev => [...prev, newPhotoLayer]);
      
      // Auto-select the new layer
      setSelectedPhotoLayerId(newPhotoLayer.id);
      
      toast.success(`Photo uploaded! ${t('configure.rememberToSave') || 'Remember to save.'}`);
      console.log(`✨ Photo layer added: ${newPhotoLayer.id}`);
      
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
      // Reset file input
      event.target.value = '';
    }
  };
  
  // Update photo layer properties
  const updatePhotoLayer = (layerId: string, updates: Partial<PhotoLayerConfig>) => {
    console.log(`🔄 Updating photo layer ${layerId}:`, updates);
    
    setPhotoLayers(prev => 
      prev.map(layer => 
        layer.id === layerId 
          ? { ...layer, ...updates }
          : layer
      )
    );
  };
  
  // Delete photo layer
  const deletePhotoLayer = async (layerId: string) => {
    const layer = photoLayers.find(l => l.id === layerId);
    if (!layer) return;
    
    console.log(`🗑️ Deleting photo layer: ${layerId}`);
    
    try {
      // Delete from storage if has storagePath
      if (layer.storagePath) {
        await deleteTemplatePhoto(layer.storagePath);
        console.log(`✅ Deleted from storage: ${layer.storagePath}`);
      }
      
      // Remove from state
      setPhotoLayers(prev => prev.filter(l => l.id !== layerId));
      
      // Deselect if was selected
      if (selectedPhotoLayerId === layerId) {
        setSelectedPhotoLayerId(null);
      }
      
      toast.success(`Photo layer deleted. ${t('configure.rememberToSave') || 'Remember to save.'}`);
      
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete photo from storage');
    }
  };

  // Save layout configuration
  const handleSave = async () => {
    if (!template) return;
    
    console.log('💾 SAVE INITIATED');
    console.log(`📊 Certificate layers to save (${certificateTextLayers.length}):`, certificateTextLayers.map(l => l.id));
    console.log(`📊 Score layers to save (${scoreTextLayers.length}):`, scoreTextLayers.map(l => l.id));
    
    // Validate required fields
    if (configMode === 'certificate') {
      const requiredFields = ['name', 'certificate_no', 'issue_date'];
      const certificateIds = certificateTextLayers.map(l => l.id);
      const missingFields = requiredFields.filter(f => !certificateIds.includes(f));
      
      if (missingFields.length > 0) {
        toast.error(t('configure.missingRequiredFields').replace('{fields}', missingFields.join(', ')));
        return;
      }
    } else if (configMode === 'score') {
      // Score mode: only issue_date is required
      const scoreIds = scoreTextLayers.map(l => l.id);
      if (!scoreIds.includes('issue_date')) {
        toast.error(t('configure.missingRequiredFields').replace('{fields}', 'issue_date'));
        return;
      }
    }
    
    setSaving(true);
    
    try {
      const layoutConfig: TemplateLayoutConfig = {
        certificate: {
          textLayers: certificateTextLayers.map(layer => {
            const { isDragging, isEditing, ...rest } = layer;
            void isDragging;
            void isEditing;
            // Remove textAlign property for certificate_no and issue_date
            if (layer.id === 'certificate_no' || layer.id === 'issue_date') {
              const { textAlign, ...restWithoutTextAlign } = rest;
              void textAlign;
              return restWithoutTextAlign;
            }
            return rest;
          }),
          // Add photo layers (always save, even if empty)
          photoLayers: certificatePhotoLayers
        },
        canvas: {
          width: STANDARD_CANVAS_WIDTH,
          height: STANDARD_CANVAS_HEIGHT
        },
        version: "1.0",
        lastSavedAt: new Date().toISOString()
      };
      
      // Add score layout if template is dual
      if (template.is_dual_template) {
        layoutConfig.score = {
          textLayers: scoreTextLayers.map(layer => {
            const { isDragging, isEditing, ...rest } = layer;
            void isDragging;
            void isEditing;
            // Remove textAlign property for issue_date (forced left alignment)
            if (layer.id === 'issue_date') {
              const { textAlign, ...restWithoutTextAlign } = rest;
              void textAlign;
              return restWithoutTextAlign;
            }
            // Other score layers keep all properties including textAlign
            return rest;
          }),
          // Add photo layers for score mode (always save, even if empty)
          photoLayers: scorePhotoLayers
        };
      }

      console.log('📤 Saving to database:', {
        certificateLayerCount: layoutConfig.certificate?.textLayers.length || 0,
        certificateLayerIds: layoutConfig.certificate?.textLayers.map(l => l.id) || [],
        scoreLayerCount: layoutConfig.score?.textLayers.length || 0,
        scoreLayerIds: layoutConfig.score?.textLayers.map(l => l.id) || []
      });
      
      await saveTemplateLayout(template.id, layoutConfig);
      
      console.log('✅ Save completed successfully!');
      toast.success(t('configure.saveSuccess'));
      
      // Redirect back to templates page after 1 second
      setTimeout(() => {
        router.push("/templates");
      }, 1000);
      
    } catch (error) {
      console.error("Failed to save layout:", error);
      toast.error(t('configure.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  // Handle layer rename (double-click)
  const handleLayerDoubleClick = (layerId: string) => {
    setRenamingLayerId(layerId);
    setRenameValue(layerId);
  };

  const handleRenameSubmit = (oldId: string) => {
    if (!renameValue.trim() || renameValue === oldId) {
      setRenamingLayerId(null);
      return;
    }
    
    // Check if new ID already exists
    if (textLayers.some(l => l.id === renameValue && l.id !== oldId)) {
      toast.error('Layer ID already exists');
      return;
    }
    
    // Update layer ID
    const setter = configMode === 'certificate' ? setCertificateTextLayers : setScoreTextLayers;
    setter(prev => prev.map(l => 
      l.id === oldId ? { ...l, id: renameValue.trim() } : l
    ));
    
    // Update selected layer if it was the renamed one
    if (selectedLayerId === oldId) {
      setSelectedLayerId(renameValue.trim());
    }
    
    setRenamingLayerId(null);
    toast.success('Layer renamed successfully');
  };

  // Get selected layer
  const selectedLayer = textLayers.find(l => l.id === selectedLayerId);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading template...</p>
        </div>
      </div>
    );
  }

  if (!template) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 text-gray-900 dark:text-gray-100">
      {/* Header */}
      <div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 border-b border-gray-200 dark:border-gray-800 fixed top-0 left-0 right-0 z-50 shadow-sm h-14 sm:h-16">
        <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 h-full">
          <div className="flex items-center justify-between h-full gap-2 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3 md:gap-4 min-w-0 flex-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/templates")}
                className="flex-shrink-0 h-8 w-8 sm:h-9 sm:w-auto sm:px-3 p-0 sm:p-2"
              >
                <ArrowLeft className="w-4 h-4 sm:mr-2 border-2 border-gray-300 dark:border-gray-600 rounded-full" />
                <span className="hidden sm:inline">Back</span>
              </Button>
              <div className="min-w-0 flex-1">
                <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white truncate">
                  {template.name}
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <LoadingButton
                onClick={handleSave}
                isLoading={saving}
                loadingText="Saving..."
                variant="primary"
                className="gradient-primary text-white h-8 sm:h-9 px-3 sm:px-4 text-xs sm:text-sm"
              >
                <Save className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Save</span>
                <span className="sm:hidden">Save</span>
              </LoadingButton>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Padding top sama dengan tinggi header untuk mengisi gap */}
      <div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 pt-14 sm:pt-16">
        <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-3 sm:gap-4">
          {/* Compact Canvas for Editing */}
          <div className="lg:col-span-4 order-1 lg:order-1">
            <div 
              className="bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-800 p-2 sm:p-3 md:p-4 lg:p-6"
              style={{
                // Always limit wrapper width for portrait templates (even during loading)
                maxWidth: !templateImageDimensions || (templateImageDimensions && templateImageDimensions.height > templateImageDimensions.width)
                  ? '650px' 
                  : 'none',
                margin: !templateImageDimensions || (templateImageDimensions && templateImageDimensions.height > templateImageDimensions.width)
                  ? '0 auto' 
                  : '0',
              }}
            >
              {/* Loading skeleton - shown only when dimensions are not yet loaded */}
              {!templateImageDimensions && (
                <div className="animate-pulse">
                  <div 
                    className="bg-gray-200 dark:bg-gray-800 rounded-lg mx-auto" 
                    style={{ 
                      aspectRatio: '3/4', 
                      maxHeight: '800px',
                      width: 'auto'
                    }}
                  >
                    <div className="flex items-center justify-center h-full">
                      <div className="text-gray-400 dark:text-gray-600">Loading preview...</div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Wrapper for scaling - maintains aspect ratio - only show when dimensions are loaded */}
              {templateImageDimensions && (
                <div 
                  ref={canvasRef}
                  className="relative overflow-visible mx-auto transition-opacity duration-300 ease-in-out"
                  style={{ 
                  aspectRatio: templateImageDimensions 
                    ? `${templateImageDimensions.width}/${templateImageDimensions.height}`
                    : `${STANDARD_CANVAS_WIDTH}/${STANDARD_CANVAS_HEIGHT}`,
                  // For portrait: limit height and let width adjust, for landscape: limit width
                  maxHeight: templateImageDimensions && templateImageDimensions.height > templateImageDimensions.width 
                    ? '800px'  // Portrait: larger max height
                    : 'none',
                  width: templateImageDimensions && templateImageDimensions.height > templateImageDimensions.width 
                    ? 'auto'   // Portrait: width auto-adjusts based on height and aspect ratio
                    : '100%',  // Landscape: full width
                }}
              >
                {/* Inner canvas at natural size, scaled down by transform */}
                <div
                  className="absolute top-0 left-0 border-2 border-gray-300 dark:border-gray-700 rounded-lg bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 overflow-hidden"
                  style={{
                    width: `${templateImageDimensions?.width || STANDARD_CANVAS_WIDTH}px`,
                    height: `${templateImageDimensions?.height || STANDARD_CANVAS_HEIGHT}px`,
                    transform: `scale(${canvasScale})`,
                    transformOrigin: 'top left',
                    cursor: 'default',
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                    MozUserSelect: 'none',
                    msUserSelect: 'none'
                  }}
                  onClick={() => {
                    setSelectedLayerId(null);
                    setSelectedPhotoLayerId(null);
                  }}
                >
                {/* Template Background - Use different image based on mode */}
                {templateImageUrl && (
                  <div className="absolute inset-0" style={{ userSelect: 'none', pointerEvents: 'none' }}>
                    <Image
                      src={configMode === 'certificate' && template.certificate_image_url 
                        ? template.certificate_image_url 
                        : configMode === 'score' && template.score_image_url
                        ? template.score_image_url
                        : templateImageUrl}
                      alt={`${template.name} - ${configMode}`}
                      fill
                      className="object-contain"
                      style={{ userSelect: 'none', pointerEvents: 'none' }}
                      unoptimized
                      draggable={false}
                    />
                  </div>
                )}
                
                {/* Text Layers */}
                {textLayers.filter(layer => layer.visible !== false).map(layer => {
                  const plainText = previewTexts[layer.id] || 
                                    layer.defaultText || 
                                    DUMMY_DATA[layer.id as keyof typeof DUMMY_DATA] || 
                                    layer.id;
                  
                  // Render richText if available, otherwise plain text
                  const renderText = () => {
                    if (layer.richText && layer.hasInlineFormatting) {
                      // Render with inline formatting
                      return layer.richText.map((span, idx) => {
                        const templateScale = (templateImageDimensions?.width || STANDARD_CANVAS_WIDTH) / STANDARD_CANVAS_WIDTH;
                        return (
                          <span
                            key={idx}
                            style={{
                              fontWeight: span.fontWeight || layer.fontWeight,
                              fontFamily: span.fontFamily || layer.fontFamily,
                              fontSize: span.fontSize ? `${span.fontSize * templateScale}px` : undefined,
                              color: span.color || layer.color
                            }}
                          >
                            {span.text}
                          </span>
                        );
                      });
                    }
                    return plainText;
                  };
                  
                  const isSelected = selectedLayerId === layer.id;
                  
                  // Calculate transform based on alignment
                  const getTransform = () => {
                    // certificate_no and issue_date always left
                    if (layer.id === 'certificate_no' || layer.id === 'issue_date') {
                      return 'translate(0%, -50%)';
                    }
                    
                    // All other layers (including score layers) use their alignment setting
                    const align = layer.textAlign || 'left';
                    if (align === 'center') return 'translate(-50%, -50%)';
                    if (align === 'right') return 'translate(-100%, -50%)';
                    return 'translate(0%, -50%)';
                  };
                  
                  // ✅ DYNAMIC POSITIONING: Use template's actual dimensions
                  // This ensures preview matches generation exactly, even when template image is replaced
                  const templateWidth = templateImageDimensions?.width || STANDARD_CANVAS_WIDTH;
                  const templateHeight = templateImageDimensions?.height || STANDARD_CANVAS_HEIGHT;
                  
                  // Use percentage-based positioning (resolution-independent)
                  // xPercent and yPercent are already stored in layer, use them directly
                  const leftPercent = layer.xPercent !== undefined && layer.xPercent !== null
                    ? layer.xPercent * 100
                    : (layer.x / templateWidth) * 100;
                  const topPercent = layer.yPercent !== undefined && layer.yPercent !== null
                    ? layer.yPercent * 100
                    : (layer.y / templateHeight) * 100;
                  
                  return (
                    <div
                      key={layer.id}
                      className="absolute"
                      style={{
                        left: `${leftPercent}%`,
                        top: `${topPercent}%`,
                        transform: getTransform(),
                        zIndex: isSelected ? 10 : 1
                      }}
                    >
                      {/* Text content */}
                      <div
                        className={`relative cursor-move transition-all ${
                          isSelected ? 'bg-blue-50/30' : ''
                        } ${layer.isDragging ? 'opacity-70' : ''}`}
                        style={{
                          // ✅ CRITICAL: Scale font size to match generation output
                          // Generation uses: fontSize * (templateWidth / STANDARD_CANVAS_WIDTH)
                          // Preview must use the same scaling to match 1:1
                          // Template 6250px: font 30 * (6250/1500) = 125px
                          fontSize: `${layer.fontSize * (templateImageDimensions?.width || STANDARD_CANVAS_WIDTH) / STANDARD_CANVAS_WIDTH}px`,
                          color: layer.color,
                          fontWeight: layer.fontWeight,
                          fontFamily: layer.fontFamily,
                          // certificate_no and issue_date always use left alignment
                          textAlign: (layer.id === 'certificate_no' || layer.id === 'issue_date') ? 'left' : (layer.textAlign || 'left'),
                          // certificate_no and issue_date should never wrap - always stay on one line
                          whiteSpace: (layer.id === 'certificate_no' || layer.id === 'issue_date') ? 'nowrap' : (layer.maxWidth ? 'normal' : 'nowrap'),
                          // ✅ Scale maxWidth to match generation output
                          width: layer.maxWidth ? `${layer.maxWidth * (templateImageDimensions?.width || STANDARD_CANVAS_WIDTH) / STANDARD_CANVAS_WIDTH}px` : 'auto',
                          maxWidth: layer.maxWidth ? `${layer.maxWidth * (templateImageDimensions?.width || STANDARD_CANVAS_WIDTH) / STANDARD_CANVAS_WIDTH}px` : 'none',
                          minHeight: `${(layer.fontSize * (layer.lineHeight || 1.2)) * (templateImageDimensions?.width || STANDARD_CANVAS_WIDTH) / STANDARD_CANVAS_WIDTH}px`,
                          lineHeight: layer.lineHeight || 1.2,
                          // certificate_no and issue_date: truncate with ellipsis if text overflows
                          textOverflow: (layer.id === 'certificate_no' || layer.id === 'issue_date') ? 'ellipsis' : 'clip',
                          overflow: (layer.id === 'certificate_no' || layer.id === 'issue_date') ? 'hidden' : 'visible',
                          wordWrap: (layer.id === 'certificate_no' || layer.id === 'issue_date') ? 'normal' : 'break-word',
                          overflowWrap: (layer.id === 'certificate_no' || layer.id === 'issue_date') ? 'normal' : 'break-word',
                          userSelect: 'none',
                          // Remove all padding to match PNG generation (text starts from border edge)
                          padding: '0px',
                          // Show border only when selected for visual feedback
                          border: isSelected ? '5px dashed #3b82f6' : '5px dashed transparent',
                          borderRadius: '4px',
                          boxSizing: 'border-box',
                          boxShadow: isSelected ? '0 0 0 1px rgba(59, 130, 246, 0.2)' : 'none'
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLayerId(layer.id);
                          setSelectedPhotoLayerId(null);
                        }}
                        onMouseDown={(e) => {
                          if (!isSelected) {
                            e.stopPropagation();
                            setSelectedLayerId(layer.id);
                            setSelectedPhotoLayerId(null);
                          } else {
                            handleLayerMouseDown(layer.id, e);
                          }
                        }}
                      >
                        {renderText()}
                      </div>
                      
                      {/* Label and resize handles (Word-style) */}
                      {isSelected && (
                        <>
                          {/* Resize handle (right edge) - Invisible, only cursor change */}
                          <div
                            className="absolute top-0 -right-2 w-4 h-full cursor-ew-resize"
                            style={{ userSelect: 'none' }}
                            onMouseDown={(e) => handleResizeMouseDown(layer.id, e, 'right')}
                            title="Drag to resize width"
                          />
                          
                          {/* Resize handle (bottom edge) - Invisible, only cursor change */}
                          <div
                            className="absolute -bottom-2 left-0 h-4 w-full cursor-ns-resize"
                            style={{ userSelect: 'none' }}
                            onMouseDown={(e) => handleResizeMouseDown(layer.id, e, 'bottom')}
                            title="Drag to resize height"
                          />
                          
                          {/* Resize handle (bottom-right corner) - Small visible circle on hover */}
                          <div
                            className="absolute -bottom-2 -right-2 w-4 h-4 cursor-nwse-resize group"
                            style={{ userSelect: 'none' }}
                            onMouseDown={(e) => handleResizeMouseDown(layer.id, e, 'corner')}
                            title="Drag to resize width and height"
                          >
                            <div className="w-2 h-2 bg-blue-500 rounded-full absolute bottom-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ userSelect: 'none' }}></div>
                          </div>
                          
                          {/* Resize handle (bottom-left corner) */}
                          <div
                            className="absolute -bottom-2 -left-2 w-4 h-4 cursor-nesw-resize group"
                            style={{ userSelect: 'none' }}
                            onMouseDown={(e) => handleResizeMouseDown(layer.id, e, 'corner')}
                          >
                            <div className="w-2 h-2 bg-blue-500 rounded-full absolute bottom-0 left-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ userSelect: 'none' }}></div>
                          </div>
                          
                          {/* Resize handle (top-right corner) */}
                          <div
                            className="absolute -top-2 -right-2 w-4 h-4 cursor-nesw-resize group"
                            style={{ userSelect: 'none' }}
                            onMouseDown={(e) => handleResizeMouseDown(layer.id, e, 'corner')}
                          >
                            <div className="w-2 h-2 bg-blue-500 rounded-full absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ userSelect: 'none' }}></div>
                          </div>
                          
                          {/* Resize handle (top-left corner) */}
                          <div
                            className="absolute -top-2 -left-2 w-4 h-4 cursor-nwse-resize group"
                            style={{ userSelect: 'none' }}
                            onMouseDown={(e) => handleResizeMouseDown(layer.id, e, 'corner')}
                          >
                            <div className="w-2 h-2 bg-blue-500 rounded-full absolute top-0 left-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ userSelect: 'none' }}></div>
                          </div>
                          
                          {/* Resize handle (left edge) */}
                          <div
                            className="absolute top-0 -left-2 w-4 h-full cursor-ew-resize"
                            style={{ userSelect: 'none' }}
                            onMouseDown={(e) => handleResizeMouseDown(layer.id, e, 'left')}
                          />
                          
                          {/* Resize handle (top edge) */}
                          <div
                            className="absolute -top-2 left-0 h-4 w-full cursor-ns-resize"
                            style={{ userSelect: 'none' }}
                            onMouseDown={(e) => handleResizeMouseDown(layer.id, e, 'top')}
                          />
                        </>
                      )}
                    </div>
                  );
                })}

                {/* Photo Layers - Rendered with z-index sorting */}
                {photoLayers
                  .sort((a, b) => a.zIndex - b.zIndex)
                  .map(layer => {
                    const templateWidth = templateImageDimensions?.width || STANDARD_CANVAS_WIDTH;
                    const templateHeight = templateImageDimensions?.height || STANDARD_CANVAS_HEIGHT;
                    
                    // Calculate position (percentage-based)
                    const leftPercent = layer.xPercent * 100;
                    const topPercent = layer.yPercent * 100;
                    
                    // Calculate size (percentage-based)
                    const widthPercent = layer.widthPercent * 100;
                    const heightPercent = layer.heightPercent * 100;
                    
                    const isSelected = selectedPhotoLayerId === layer.id;
                    
                    // Mask styles
                    const getMaskStyle = () => {
                      if (!layer.mask || layer.mask.type === 'none') return {};
                      if (layer.mask.type === 'circle') return { borderRadius: '50%' };
                      if (layer.mask.type === 'ellipse') return { borderRadius: '50%' };
                      if (layer.mask.type === 'roundedRect') {
                        return { borderRadius: layer.mask.borderRadius ? `${layer.mask.borderRadius}px` : '8px' };
                      }
                      return {};
                    };
                    
                    return (
                      <div
                        key={layer.id}
                        className="absolute"
                        style={{
                          left: `${leftPercent}%`,
                          top: `${topPercent}%`,
                          width: `${widthPercent}%`,
                          height: `${heightPercent}%`,
                          transform: `rotate(${layer.rotation}deg)`,
                          opacity: layer.opacity,
                          zIndex: layer.zIndex,
                          cursor: isSelected ? 'move' : 'pointer'
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPhotoLayerId(layer.id);
                          setSelectedLayerId(null);
                        }}
                        onMouseDown={(e) => {
                          if (!isSelected) {
                            e.stopPropagation();
                            setSelectedPhotoLayerId(layer.id);
                            setSelectedLayerId(null);
                          } else {
                            handlePhotoLayerMouseDown(layer.id, e);
                          }
                        }}
                      >
                        <img
                          src={layer.src}
                          alt={layer.id}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: layer.fitMode,
                            ...getMaskStyle(),
                            userSelect: 'none',
                            pointerEvents: 'none'
                          }}
                          draggable={false}
                        />
                        
                        {/* Selection ring (purple for photos) */}
                        {isSelected && (
                          <div 
                            style={{
                              position: 'absolute',
                              inset: -2,
                              border: '2px solid #a855f7',
                              borderRadius: layer.mask?.type === 'circle' || layer.mask?.type === 'ellipse' ? '50%' : 
                                          layer.mask?.type === 'roundedRect' ? '8px' : '0',
                              pointerEvents: 'none'
                            }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              )}
            </div>
          </div>

          {/* Configuration Panel */}
          <div className="lg:col-span-2 order-2 lg:order-2">
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-800 p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 lg:sticky lg:top-24 max-h-[calc(100vh-10rem)] sm:max-h-[calc(100vh-8rem)] overflow-y-auto">
              {/* Mode Switcher - Only for dual templates */}
              {template.is_dual_template && (
                <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 mb-4">
                  <Button
                    variant={configMode === 'certificate' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setConfigMode('certificate')}
                    className={`flex-1 h-8 px-3 text-sm ${
                      configMode === 'certificate' 
                        ? 'bg-blue-600 text-white hover:bg-blue-700' 
                        : 'hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    Certificate
                  </Button>
                  <Button
                    variant={configMode === 'score' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setConfigMode('score')}
                    className={`flex-1 h-8 px-3 text-sm ${
                      configMode === 'score' 
                        ? 'bg-blue-600 text-white hover:bg-blue-700' 
                        : 'hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    Score
                  </Button>
                </div>
              )}
              
              {/* Text Layers List */}
              <div>
                <div className="flex items-center justify-between mb-3 sm:mb-4 gap-2">
                  <h2 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Text Layers ({textLayers.length})
                  </h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addTextLayer}
                    className="h-7 sm:h-8 px-2 sm:px-3 text-xs sm:text-sm"
                  >
                    <Plus className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Add Layer</span>
                  </Button>
                </div>
                <div className="space-y-2 max-h-48 sm:max-h-64 overflow-y-auto">
                  {textLayers.map(layer => {
                    // Required fields: Certificate (name, certificate_no, issue_date) | Score (issue_date only)
                    const isRequired = configMode === 'certificate' 
                      ? ['name', 'certificate_no', 'issue_date'].includes(layer.id)
                      : layer.id === 'issue_date';
                    const isSelected = selectedLayerId === layer.id;
                    
                    return (
                      <div
                        key={layer.id}
                        className={`flex items-center justify-between p-2 sm:p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          isSelected 
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10' 
                            : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
                        }`}
                        onClick={() => {
                          setSelectedLayerId(layer.id);
                          setSelectedPhotoLayerId(null);
                        }}
                      >
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
                          <Type className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 dark:text-gray-300 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            {renamingLayerId === layer.id ? (
                              <Input
                                value={renameValue}
                                onChange={(e) => setRenameValue(e.target.value)}
                                onBlur={() => handleRenameSubmit(layer.id)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleRenameSubmit(layer.id);
                                  if (e.key === 'Escape') setRenamingLayerId(null);
                                }}
                                onClick={(e) => e.stopPropagation()}
                                autoFocus
                                className="h-6 text-sm dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
                              />
                            ) : (
                              <div 
                                className="font-medium text-xs sm:text-sm text-gray-900 dark:text-gray-100 truncate"
                                onDoubleClick={() => handleLayerDoubleClick(layer.id)}
                              >
                                {layer.id}
                              </div>
                            )}
                            <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 truncate">
                              {layer.fontSize}px • {layer.fontFamily}
                            </div>
                          </div>
                          {/* Show "Required" badge for required fields (same for all modes) */}
                          {isRequired && (
                            <span className="text-[10px] sm:text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 px-1.5 sm:px-2 py-0.5 rounded flex-shrink-0">
                              Required
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {/* Visibility Toggle Button - only for default/required fields */}
                          {isRequired && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleLayerVisibility(layer.id);
                              }}
                              className={`h-7 w-7 sm:h-8 sm:w-8 p-0 flex-shrink-0 ${
                                layer.visible === false 
                                  ? 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-400' 
                                  : 'text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300'
                              }`}
                              title={layer.visible === false ? 'Show layer' : 'Hide layer'}
                            >
                              {layer.visible === false ? (
                                <EyeOff className="w-3 h-3 sm:w-4 sm:h-4" />
                              ) : (
                                <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                              )}
                            </Button>
                          )}
                          {/* Delete Button - only for non-required fields */}
                          {!isRequired && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteLayer(layer.id);
                              }}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 h-7 w-7 sm:h-8 sm:w-8 p-0 flex-shrink-0"
                            >
                              <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Photo Layers Section */}
              <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
                <div className="flex items-center justify-between mb-3 sm:mb-4 gap-2">
                  <h2 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Photo Layers ({photoLayers.length})
                  </h2>
                  <label htmlFor="photo-upload">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={uploadingPhoto}
                      className="h-7 sm:h-8 px-2 sm:px-3 text-xs sm:text-sm cursor-pointer"
                      asChild
                    >
                      <span>
                        <Upload className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                        <span className="hidden sm:inline">{uploadingPhoto ? 'Uploading...' : 'Upload'}</span>
                      </span>
                    </Button>
                  </label>
                  <input
                    id="photo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </div>

                {/* Photo Layers List */}
                <div className="space-y-2 max-h-48 sm:max-h-64 overflow-y-auto">
                  {photoLayers.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 dark:text-gray-600 text-xs sm:text-sm">
                      <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No photos yet</p>
                      <p className="text-[10px] sm:text-xs mt-1">Upload images to add to template</p>
                    </div>
                  ) : (
                    photoLayers.map(layer => {
                      const isSelected = selectedPhotoLayerId === layer.id;
                      
                      return (
                        <div
                          key={layer.id}
                          className={`flex items-center justify-between p-2 sm:p-3 rounded-lg border-2 cursor-pointer transition-all ${
                            isSelected 
                              ? 'border-purple-500 bg-purple-50 dark:bg-purple-500/10' 
                              : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
                          }`}
                          onClick={() => {
                            setSelectedPhotoLayerId(layer.id);
                            setSelectedLayerId(null);
                          }}
                        >
                          <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
                            <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-gray-800">
                              <img 
                                src={layer.src} 
                                alt={layer.id}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-xs sm:text-sm text-gray-900 dark:text-gray-100 truncate">
                                {layer.id}
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              deletePhotoLayer(layer.id);
                            }}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 h-7 w-7 sm:h-8 sm:w-auto sm:px-2 p-0 flex-shrink-0"
                          >
                            <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                          </Button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Photo Layer Properties */}
              {selectedPhotoLayerId && photoLayers.find(l => l.id === selectedPhotoLayerId) && (() => {
                const selectedPhoto = photoLayers.find(l => l.id === selectedPhotoLayerId)!;
                
                return (
                  <div className="border-t border-gray-200 dark:border-gray-800 pt-3 sm:pt-4">
                    <h3 className="text-[10px] sm:text-xs font-semibold text-purple-700 dark:text-purple-300 mb-2 sm:mb-3 uppercase tracking-wide truncate">
                      {selectedPhoto.id} Settings
                    </h3>
                    <div className="space-y-3">
                      {/* Layer Order */}
                      <div>
                        <Label className="text-xs">Layer Order</Label>
                        <Select
                          value={selectedPhoto.zIndex >= 100 ? 'front' : 'back'}
                          onValueChange={(value) => updatePhotoLayer(selectedPhoto.id, { 
                            zIndex: value === 'front' ? 101 : 0
                          })}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="front">Front (above text)</SelectItem>
                            <SelectItem value="back">Back (behind text)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Position */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">X Position (px)</Label>
                          <Input
                            type="number"
                            min="0"
                            max={templateImageDimensions?.width || STANDARD_CANVAS_WIDTH}
                            step="1"
                            value={Math.round(selectedPhoto.xPercent * (templateImageDimensions?.width || STANDARD_CANVAS_WIDTH))}
                            onChange={(e) => {
                              const templateWidth = templateImageDimensions?.width || STANDARD_CANVAS_WIDTH;
                              const xPx = Number(e.target.value);
                              updatePhotoLayer(selectedPhoto.id, { 
                                x: xPx,
                                xPercent: xPx / templateWidth
                              });
                            }}
                            className="h-8 text-xs"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Y Position (px)</Label>
                          <Input
                            type="number"
                            min="0"
                            max={templateImageDimensions?.height || STANDARD_CANVAS_HEIGHT}
                            step="1"
                            value={Math.round(selectedPhoto.yPercent * (templateImageDimensions?.height || STANDARD_CANVAS_HEIGHT))}
                            onChange={(e) => {
                              const templateHeight = templateImageDimensions?.height || STANDARD_CANVAS_HEIGHT;
                              const yPx = Number(e.target.value);
                              updatePhotoLayer(selectedPhoto.id, { 
                                y: yPx,
                                yPercent: yPx / templateHeight
                              });
                            }}
                            className="h-8 text-xs"
                          />
                        </div>
                      </div>

                      {/* Size */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Width (px)</Label>
                          <Input
                            type="number"
                            min="1"
                            max={templateImageDimensions?.width || STANDARD_CANVAS_WIDTH}
                            step="1"
                            value={Math.round(selectedPhoto.widthPercent * (templateImageDimensions?.width || STANDARD_CANVAS_WIDTH))}
                            onChange={(e) => {
                              const templateWidth = templateImageDimensions?.width || STANDARD_CANVAS_WIDTH;
                              const templateHeight = templateImageDimensions?.height || STANDARD_CANVAS_HEIGHT;
                              const widthPx = Number(e.target.value);
                              const newWidthPercent = widthPx / templateWidth;
                              
                              if (selectedPhoto.maintainAspectRatio && selectedPhoto.originalWidth && selectedPhoto.originalHeight) {
                                const aspectRatio = selectedPhoto.originalHeight / selectedPhoto.originalWidth;
                                const heightPx = widthPx * aspectRatio;
                                const newHeightPercent = heightPx / templateHeight;
                                updatePhotoLayer(selectedPhoto.id, { 
                                  width: widthPx,
                                  widthPercent: newWidthPercent,
                                  height: heightPx,
                                  heightPercent: newHeightPercent
                                });
                              } else {
                                updatePhotoLayer(selectedPhoto.id, { 
                                  width: widthPx,
                                  widthPercent: newWidthPercent 
                                });
                              }
                            }}
                            className="h-8 text-xs"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Height (px)</Label>
                          <Input
                            type="number"
                            min="1"
                            max={templateImageDimensions?.height || STANDARD_CANVAS_HEIGHT}
                            step="1"
                            value={Math.round(selectedPhoto.heightPercent * (templateImageDimensions?.height || STANDARD_CANVAS_HEIGHT))}
                            onChange={(e) => {
                              const templateWidth = templateImageDimensions?.width || STANDARD_CANVAS_WIDTH;
                              const templateHeight = templateImageDimensions?.height || STANDARD_CANVAS_HEIGHT;
                              const heightPx = Number(e.target.value);
                              const newHeightPercent = heightPx / templateHeight;
                              
                              if (selectedPhoto.maintainAspectRatio && selectedPhoto.originalWidth && selectedPhoto.originalHeight) {
                                const aspectRatio = selectedPhoto.originalWidth / selectedPhoto.originalHeight;
                                const widthPx = heightPx * aspectRatio;
                                const newWidthPercent = widthPx / templateWidth;
                                updatePhotoLayer(selectedPhoto.id, { 
                                  height: heightPx,
                                  heightPercent: newHeightPercent,
                                  width: widthPx,
                                  widthPercent: newWidthPercent
                                });
                              } else {
                                updatePhotoLayer(selectedPhoto.id, { 
                                  height: heightPx,
                                  heightPercent: newHeightPercent 
                                });
                              }
                            }}
                            className="h-8 text-xs"
                          />
                        </div>
                      </div>

                      {/* Opacity */}
                      <div>
                        <Label className="text-xs">Opacity ({Math.round(selectedPhoto.opacity * 100)}%)</Label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={selectedPhoto.opacity * 100}
                          onChange={(e) => updatePhotoLayer(selectedPhoto.id, { 
                            opacity: Number(e.target.value) / 100 
                          })}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                        />
                      </div>

                      {/* Rotation */}
                      <div>
                        <Label className="text-xs">Rotation ({selectedPhoto.rotation}°)</Label>
                        <input
                          type="range"
                          min="-180"
                          max="180"
                          value={selectedPhoto.rotation}
                          onChange={(e) => updatePhotoLayer(selectedPhoto.id, { 
                            rotation: Number(e.target.value) 
                          })}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                        />
                      </div>

                    </div>
                  </div>
                );
              })()}

              {/* Layer Properties */}
              {selectedLayer && (
                <div className="border-t border-gray-200 dark:border-gray-800 pt-3 sm:pt-4">
                  <h3 className="text-[10px] sm:text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 sm:mb-3 uppercase tracking-wide truncate">
                    {selectedLayer.id}
                  </h3>
                  <div className="space-y-2 sm:space-y-3">
                    {/* Default Text with Rich Text Formatting - For custom layers only */}
                    {!['name', 'certificate_no', 'issue_date'].includes(selectedLayer.id) && (
                      <div className="bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-900/40 rounded-lg p-2 sm:p-3 space-y-2">
                        <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                          <Label className="text-[10px] sm:text-xs font-semibold text-green-900 dark:text-green-300">Default Text</Label>
                          <label className="flex items-center gap-1 sm:gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedLayer.useDefaultText || false}
                              onChange={(e) => updateLayer(selectedLayer.id, { useDefaultText: e.target.checked })}
                              className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-green-600 rounded border-green-300 dark:border-green-500"
                            />
                            <span className="text-[10px] sm:text-xs text-green-900 dark:text-green-300">Use</span>
                          </label>
                        </div>
                        
                        {/* Rich Text Editor */}
                        <RichTextEditor
                          value={selectedLayer.richText || plainTextToRichText(selectedLayer.defaultText || '', {
                            fontWeight: selectedLayer.fontWeight,
                            fontFamily: selectedLayer.fontFamily,
                            // fontSize excluded - inherit from layer
                            color: selectedLayer.color
                          })}
                          defaultStyle={{
                            fontWeight: selectedLayer.fontWeight,
                            fontFamily: selectedLayer.fontFamily,
                            fontSize: selectedLayer.fontSize,
                            color: selectedLayer.color
                          }}
                          onChange={(richText) => {
                            const plainText = richTextToPlainText(richText);
                            updateLayer(selectedLayer.id, { 
                              richText, 
                              defaultText: plainText,
                              hasInlineFormatting: true 
                            });
                            setPreviewTexts(prev => ({
                              ...prev,
                              [selectedLayer.id]: plainText
                            }));
                          }}
                          onSelectionChange={(start, end) => setRichTextSelection({ start, end })}
                          className="h-auto min-h-[28px] sm:min-h-[32px] px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                        />
                      </div>
                    )}

                    {/* Position - Compact Grid */}
                    <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                      <div>
                        <Label className="text-[10px] sm:text-xs text-gray-700 dark:text-gray-300">X Position</Label>
                        <Input
                          type="number"
                          value={selectedLayer.x}
                          onChange={(e) => {
                            const newX = parseInt(e.target.value) || 0;
                            // Use template's actual dimensions for percentage calculation
                            const templateWidth = templateImageDimensions?.width || STANDARD_CANVAS_WIDTH;
                            updateLayer(selectedLayer.id, { 
                              x: newX,
                              xPercent: newX / templateWidth
                            });
                          }}
                          className="h-7 sm:h-8 text-xs dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] sm:text-xs text-gray-700 dark:text-gray-300">Y Position</Label>
                        <Input
                          type="number"
                          value={selectedLayer.y}
                          onChange={(e) => {
                            const newY = parseInt(e.target.value) || 0;
                            // Use template's actual dimensions for percentage calculation
                            const templateHeight = templateImageDimensions?.height || STANDARD_CANVAS_HEIGHT;
                            updateLayer(selectedLayer.id, { 
                              y: newY,
                              yPercent: newY / templateHeight
                            });
                          }}
                          className="h-7 sm:h-8 text-xs dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
                        />
                      </div>
                    </div>

                    {/* Font Size */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <Label className="text-[10px] sm:text-xs text-gray-700 dark:text-gray-300">Font Size (px)</Label>
                      </div>
                      <Input
                        type="number"
                        value={selectedLayer.fontSize}
                        onChange={(e) => {
                          const newSize = parseInt(e.target.value) || 12;
                          const currentRichText = selectedLayer.richText || plainTextToRichText(selectedLayer.defaultText || '', {
                            fontWeight: selectedLayer.fontWeight,
                            fontFamily: selectedLayer.fontFamily,
                            // fontSize excluded - inherit from layer
                          });
                          
                          // CRITICAL: Remove fontSize from all spans so they inherit from layer
                          const newRichText = currentRichText.map(span => {
                            const { fontSize, ...spanWithoutFontSize } = span;
                            return spanWithoutFontSize;
                          });
                          
                          updateLayer(selectedLayer.id, { 
                            fontSize: newSize,
                            richText: newRichText
                          });
                        }}
                        className="h-7 sm:h-8 text-xs dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
                        title={`Font size ini akan sama dengan hasil generate. Preview menggunakan font size yang sama seperti generate.`}
                      />
                    </div>

                    {/* Font Family & Weight - Side by Side */}
                    <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                      <div>
                        <Label className="text-[10px] sm:text-xs text-gray-700 dark:text-gray-300">Font Family</Label>
                        <FontFamilySelect
                          value={(() => {
                            const currentRichText = selectedLayer.richText || plainTextToRichText(selectedLayer.defaultText || '');
                            const { start, end } = richTextSelection;
                            
                            // If has selection, check selection range
                            if (start !== end) {
                              const commonValue = getCommonStyleValue(currentRichText, start, end, 'fontFamily');
                              return commonValue === 'mixed' ? 'mixed' : (commonValue || selectedLayer.fontFamily);
                            }
                            
                            // No selection - check if whole richText has mixed styles
                            // Check richText even if hasInlineFormatting is not set
                            if (selectedLayer.richText && selectedLayer.richText.length > 1) {
                              if (hasMixedStyle(currentRichText, 'fontFamily')) {
                                return 'mixed';
                              }
                            }
                            
                            return selectedLayer.fontFamily;
                          })()}
                          onValueChange={(value) => {
                            const currentRichText = selectedLayer.richText || plainTextToRichText(selectedLayer.defaultText || '', {
                              fontWeight: selectedLayer.fontWeight,
                              fontFamily: selectedLayer.fontFamily
                            });
                            const { start, end } = richTextSelection;
                            
                            if (start === end) {
                              // No selection - update whole layer AND apply to richText
                              const newRichText = currentRichText.map(span => ({
                                ...span,
                                fontFamily: value
                              }));
                              updateLayer(selectedLayer.id, { 
                                fontFamily: value,
                                richText: newRichText
                              });
                            } else {
                              // Has selection - apply to selected text only
                              const newRichText = applyStyleToRange(currentRichText, start, end, { fontFamily: value });
                              const plainText = richTextToPlainText(newRichText);
                              updateLayer(selectedLayer.id, { 
                                richText: newRichText, 
                                defaultText: plainText,
                                hasInlineFormatting: true 
                              });
                              // Update preview text as well
                              setPreviewTexts(prev => ({
                                ...prev,
                                [selectedLayer.id]: plainText
                              }));
                            }
                          }}
                          className="h-7 sm:h-8 text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] sm:text-xs text-gray-700 dark:text-gray-300">Weight</Label>
                        <FontWeightSelect
                          value={(() => {
                            const currentRichText = selectedLayer.richText || plainTextToRichText(selectedLayer.defaultText || '');
                            const { start, end } = richTextSelection;
                            
                            // If has selection, check selection range
                            if (start !== end) {
                              const commonValue = getCommonStyleValue(currentRichText, start, end, 'fontWeight');
                              return commonValue === 'mixed' ? 'mixed' : (commonValue || selectedLayer.fontWeight || 'normal');
                            }
                            
                            // No selection - check if whole richText has mixed styles
                            if (selectedLayer.richText && selectedLayer.richText.length > 1) {
                              if (hasMixedStyle(currentRichText, 'fontWeight')) {
                                return 'mixed';
                              }
                            }
                            
                            return selectedLayer.fontWeight || 'normal';
                          })()}
                          onValueChange={(value) => {
                            const currentRichText = selectedLayer.richText || plainTextToRichText(selectedLayer.defaultText || '', {
                              fontWeight: selectedLayer.fontWeight,
                              fontFamily: selectedLayer.fontFamily
                            });
                            const { start, end } = richTextSelection;
                            
                            if (start === end) {
                              // No selection - update whole layer AND apply to richText
                              const newRichText = currentRichText.map(span => ({
                                ...span,
                                fontWeight: value
                              }));
                              updateLayer(selectedLayer.id, { 
                                fontWeight: value,
                                richText: newRichText
                              });
                            } else {
                              // Has selection - apply to selected text only
                              const newRichText = applyStyleToRange(currentRichText, start, end, { fontWeight: value });
                              const plainText = richTextToPlainText(newRichText);
                              updateLayer(selectedLayer.id, { 
                                richText: newRichText, 
                                defaultText: plainText,
                                hasInlineFormatting: true 
                              });
                              // Update preview text as well
                              setPreviewTexts(prev => ({
                                ...prev,
                                [selectedLayer.id]: plainText
                              }));
                            }
                          }}
                          className="h-7 sm:h-8 text-xs"
                        />
                      </div>
                    </div>

                    {/* Text Align & Line Height */}
                    <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                      {/* Hide Text Align only for certificate_no and issue_date */}
                      {!['certificate_no', 'issue_date'].includes(selectedLayer.id) && (
                        <div>
                          <Label className="text-[10px] sm:text-xs text-gray-700 dark:text-gray-300">Text Align</Label>
                          <Select 
                            value={selectedLayer.textAlign || 'left'}
                            onValueChange={(value) => updateLayer(selectedLayer.id, { textAlign: value as TextLayer['textAlign'] })}
                          >
                            <SelectTrigger className="h-7 sm:h-8 text-xs dark:bg-gray-900 dark:text-gray-100 dark:border-gray-700">
                              <SelectValue placeholder="Align" />
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100">
                              <SelectItem value="left">Left</SelectItem>
                              <SelectItem value="center">Center</SelectItem>
                              <SelectItem value="right">Right</SelectItem>
                              <SelectItem value="justify">Justify</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      <div className={['certificate_no', 'issue_date'].includes(selectedLayer.id) ? 'col-span-2' : ''}>
                        <Label className="text-[10px] sm:text-xs text-gray-700 dark:text-gray-300">Line Height</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={selectedLayer.lineHeight || 1.2}
                          onChange={(e) => updateLayer(selectedLayer.id, { lineHeight: parseFloat(e.target.value) || 1.2 })}
                          className="h-7 sm:h-8 text-xs dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
                        />
                      </div>
                    </div>

                    {/* Max Width */}
                    <div>
                      <Label className="text-[10px] sm:text-xs text-gray-700 dark:text-gray-300">Max Width (px)</Label>
                      <Input
                        type="number"
                        value={selectedLayer.maxWidth || 0}
                        onChange={(e) => updateLayer(selectedLayer.id, { maxWidth: parseInt(e.target.value) || 0 })}
                        className="h-7 sm:h-8 text-xs dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
                      />
                    </div>

                    {/* Color Picker */}
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label className="text-[10px] sm:text-xs text-gray-700 dark:text-gray-300">Text Color</Label>
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <input
                          type="color"
                          value={selectedLayer.color || '#000000'}
                          onChange={(e) => {
                            const newColor = e.target.value;
                            const currentRichText = selectedLayer.richText || plainTextToRichText(selectedLayer.defaultText || '', {
                              fontWeight: selectedLayer.fontWeight,
                              fontFamily: selectedLayer.fontFamily,
                              // fontSize excluded - inherit from layer
                              color: selectedLayer.color
                            });
                            
                            // Update richText to apply new color
                            const newRichText = currentRichText.map(span => ({
                              ...span,
                              color: newColor
                            }));
                            
                            updateLayer(selectedLayer.id, { 
                              color: newColor,
                              richText: newRichText
                            });
                          }}
                          className="h-7 sm:h-8 w-10 sm:w-12 border border-gray-200 dark:border-gray-700 rounded bg-transparent flex-shrink-0"
                        />
                        <Input
                          type="text"
                          value={selectedLayer.color || '#000000'}
                          onChange={(e) => {
                            const newColor = e.target.value;
                            const currentRichText = selectedLayer.richText || plainTextToRichText(selectedLayer.defaultText || '', {
                              fontWeight: selectedLayer.fontWeight,
                              fontFamily: selectedLayer.fontFamily,
                              // fontSize excluded - inherit from layer
                              color: selectedLayer.color
                            });
                            
                            // Update richText to apply new color
                            const newRichText = currentRichText.map(span => ({
                              ...span,
                              color: newColor
                            }));
                            
                            updateLayer(selectedLayer.id, { 
                              color: newColor,
                              richText: newRichText
                            });
                          }}
                          className="h-7 sm:h-8 text-xs dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100 flex-1"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Validation */}
              
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* Full Preview Modal */}
      <Dialog open={previewModalOpen} onOpenChange={setPreviewModalOpen}>
        <DialogContent className="max-w-5xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto p-3 sm:p-6 animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-4 duration-300">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">
              {t('configure.templatePreview')}
            </DialogTitle>
          </DialogHeader>
          
          {/* Template Information */}
          <div className="mt-3 sm:mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('configure.templateName')}</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{template.name}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('configure.category')}</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{template.category || '-'}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('configure.format')}</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{template.orientation || '-'}</p>
            </div>
          </div>

          {/* Preview Canvas */}
          <div className="mt-3 sm:mt-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 sm:mb-3">{t('configure.previewTemplate')}</h3>
            <div 
              className="relative border-2 border-gray-300 dark:border-gray-700 rounded-lg bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 overflow-hidden mx-auto"
              style={{ 
                width: '100%',
                aspectRatio: templateImageDimensions 
                  ? `${templateImageDimensions.width}/${templateImageDimensions.height}`
                  : `${STANDARD_CANVAS_WIDTH}/${STANDARD_CANVAS_HEIGHT}`,
                maxWidth: '800px',
                cursor: 'default',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                MozUserSelect: 'none',
                msUserSelect: 'none'
              }}
            >
              {/* Template Background */}
              {templateImageUrl && (
                <div className="absolute inset-0" style={{ userSelect: 'none', pointerEvents: 'none' }}>
                  <Image
                    src={templateImageUrl}
                    alt={template.name}
                    fill
                    className="object-contain"
                    style={{ userSelect: 'none', pointerEvents: 'none' }}
                    unoptimized
                    draggable={false}
                  />
                </div>
              )}
              
              {/* Text Layers */}
              {textLayers.filter(layer => layer.visible !== false).map(layer => {
                // Priority: preview text > default text > dummy data > layer id
                const text = previewTexts[layer.id] || 
                             layer.defaultText || 
                             DUMMY_DATA[layer.id as keyof typeof DUMMY_DATA] || 
                             layer.id;
                
                // Calculate transform based on alignment
                const getTransform = () => {
                  if (layer.id === 'certificate_no' || layer.id === 'issue_date') {
                    return 'translate(0%, -50%)';
                  }
                  
                  // All other layers (including score layers) use their alignment setting
                  const align = layer.textAlign || 'left';
                  if (align === 'center') return 'translate(-50%, -50%)';
                  if (align === 'right') return 'translate(-100%, -50%)';
                  return 'translate(0%, -50%)';
                };
                
                // Use template's actual dimensions for positioning
                const templateWidth = templateImageDimensions?.width || STANDARD_CANVAS_WIDTH;
                const templateHeight = templateImageDimensions?.height || STANDARD_CANVAS_HEIGHT;
                
                // Use percentage-based positioning (resolution-independent)
                const leftPercent = layer.xPercent !== undefined && layer.xPercent !== null
                  ? layer.xPercent * 100
                  : (layer.x / templateWidth) * 100;
                const topPercent = layer.yPercent !== undefined && layer.yPercent !== null
                  ? layer.yPercent * 100
                  : (layer.y / templateHeight) * 100;
                
                // ✅ CRITICAL: Scale font size to match generation output
                // Generation uses: fontSize * (templateWidth / STANDARD_CANVAS_WIDTH)
                // Preview modal must use the same scaling
                const templateScale = templateWidth / STANDARD_CANVAS_WIDTH;
                
                return (
                  <div
                    key={layer.id}
                    className="absolute"
                    style={{
                      left: `${leftPercent}%`,
                      top: `${topPercent}%`,
                      transform: getTransform(),
                      zIndex: 1
                    }}
                  >
                    <div
                      className="relative"
                      style={{
                        // ✅ CRITICAL: Use same scaling as generation
                        // Template 6250px: font 30 * (6250/1500) = 125px
                        // This ensures preview modal matches generation exactly
                        fontSize: `${layer.fontSize * templateScale}px`,
                        color: layer.color,
                        fontWeight: layer.fontWeight,
                        fontFamily: layer.fontFamily,
                        textAlign: (layer.id === 'certificate_no' || layer.id === 'issue_date') ? 'left' : (layer.textAlign || 'left'),
                        whiteSpace: layer.maxWidth ? 'normal' : 'nowrap',
                        width: layer.maxWidth ? `${layer.maxWidth * templateScale}px` : 'auto',
                        minHeight: `${(layer.fontSize * (layer.lineHeight || 1.2)) * templateScale}px`,
                        lineHeight: layer.lineHeight || 1.2,
                        wordWrap: 'break-word',
                        overflowWrap: 'break-word',
                        userSelect: 'none',
                      }}
                    >
                      {text}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Toaster position="top-right" richColors />
    </div>
  );
}

export default function ConfigureLayoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading configuration...</p>
        </div>
      </div>
    }>
      <ConfigureLayoutContent />
    </Suspense>
  );
}
