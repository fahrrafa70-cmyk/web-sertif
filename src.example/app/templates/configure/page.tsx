"use client";

/**
 * Template Layout Configuration Page with Full Drag-Drop Interface
 * Allows visual configuration of text layers with drag, resize, and font customization
 */

import { Suspense, useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Plus, Trash2, Type } from "lucide-react";
import { getTemplate, getTemplateImageUrl, saveTemplateLayout, getTemplateLayout } from "@/lib/supabase/templates";
import { Template } from "@/lib/supabase/templates";
import { toast, Toaster } from "sonner";
import type { TemplateLayoutConfig, TextLayerConfig } from "@/types/template-layout";
import { STANDARD_CANVAS_WIDTH, STANDARD_CANVAS_HEIGHT } from "@/lib/constants/canvas";
import Image from "next/image";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { RichText, plainTextToRichText, getCommonStyleValue, applyStyleToRange, getSelectionOffsets } from "@/types/rich-text";
import { FontWeightSelect, FontFamilySelect } from "@/components/editor/MixedStyleSelect";

const getTodayDate = () => {
  const today = new Date();
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return `${today.getDate()} ${months[today.getMonth()]} ${today.getFullYear()}`;
};

// Dummy data for preview
const DUMMY_DATA = {
  name: "John Doe",
  certificate_no: "251103000",
  issue_date: getTodayDate(),
  expired_date: "30 October 2028"
};

// Dummy data for score fields
const SCORE_DUMMY_DATA: Record<string, string> = {
  nilai_teori: "85",
  nilai_praktek: "90",
  total_score: "87.5",
  grade: "A",
  nilai_akhir: "88",
  predikat: "Sangat Baik"
};

interface TextLayer extends TextLayerConfig {
  isEditing?: boolean;
  isDragging?: boolean;
}

function ConfigureLayoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateId = searchParams?.get("template");
  
  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [templateImageUrl, setTemplateImageUrl] = useState<string | null>(null);
  
  // Dual template mode state
  const [currentMode, setCurrentMode] = useState<'certificate' | 'score'>('certificate');
  const [scoreImageUrl, setScoreImageUrl] = useState<string | null>(null);
  
  // Text layers state (certificate mode)
  const [textLayers, setTextLayers] = useState<TextLayer[]>([]);
  // Text layers state (score mode)
  const [scoreTextLayers, setScoreTextLayers] = useState<TextLayer[]>([]);
  
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [renamingLayerId, setRenamingLayerId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  
  // Preview text state (for testing display only, not saved)
  const [previewTexts, setPreviewTexts] = useState<Record<string, string>>({});
  
  // Rich text state for inline formatting
  const [layerRichTexts, setLayerRichTexts] = useState<Record<string, RichText>>({});
  const [textSelection, setTextSelection] = useState<{ start: number; end: number } | null>(null);
  const textLayerRefs = useRef<Record<string, HTMLDivElement | null>>({});
  
  // Canvas ref
  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasScale, setCanvasScale] = useState(1);
  
  // Preview modal state
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  
  // Debug: Log current mode and layers whenever they change
  useEffect(() => {
    console.log('🔍 Mode & Layers State:', {
      currentMode,
      certificateLayers: textLayers.length,
      scoreLayers: scoreTextLayers.length,
      selectedLayerId
    });
  }, [currentMode, textLayers.length, scoreTextLayers.length, selectedLayerId]);

  // Load template and existing layout
  useEffect(() => {
    async function loadTemplate() {
      if (!templateId) {
        toast.error("No template ID provided");
        router.push("/templates");
        return;
      }

      try {
        const tpl = await getTemplate(templateId);
        if (!tpl) {
          toast.error("Template not found");
          router.push("/templates");
          return;
        }

        setTemplate(tpl);
        
        // Load template image(s)
        const imgUrl = await getTemplateImageUrl(tpl);
        setTemplateImageUrl(imgUrl);
        
        // Load score image if dual template
        if (tpl.is_dual_template && tpl.score_image_url) {
          setScoreImageUrl(tpl.score_image_url);
          console.log('📊 Dual template detected - score image loaded');
        }
        
        // Load existing layout if available
        const existingLayout = await getTemplateLayout(templateId);
        if (existingLayout && existingLayout.certificate) {
          console.log('📦 Loading existing layout configuration');
          
          // Migrate old data: ensure all layers have maxWidth and lineHeight
          // Remove textAlign for certificate_no and issue_date (they always use left alignment)
          const migratedLayers = (existingLayout.certificate.textLayers as TextLayer[]).map(layer => {
            const migrated = {
              ...layer,
              maxWidth: layer.maxWidth || 300, // Default maxWidth if missing
              lineHeight: layer.lineHeight || 1.2, // Default lineHeight if missing
            };
            // Remove textAlign property for certificate_no and issue_date
            if (layer.id === 'certificate_no' || layer.id === 'issue_date') {
              const { textAlign, ...rest } = migrated;
              void textAlign;
              return rest;
            }
            return migrated;
          });
          
          setTextLayers(migratedLayers);
          
          // Initialize rich text state from database
          const richTexts: Record<string, RichText> = {};
          migratedLayers.forEach(layer => {
            // CRITICAL: For certificate_no and issue_date, ALWAYS force reset to DUMMY_DATA
            // These are auto-generated fields and should never use saved richText
            if (layer.id === 'certificate_no' || layer.id === 'issue_date') {
              const text = DUMMY_DATA[layer.id as keyof typeof DUMMY_DATA] || layer.id;
              console.log(`🔍 Setting ${layer.id} to:`, text);
              richTexts[layer.id] = plainTextToRichText(text);
              console.log(`✅ Rich text for ${layer.id}:`, richTexts[layer.id]);
            } else if (layer.richText && layer.hasInlineFormatting) {
              // Load existing rich text from database for other layers
              richTexts[layer.id] = layer.richText;
            } else {
              // Convert plain text to rich text format
              const text = layer.defaultText || DUMMY_DATA[layer.id as keyof typeof DUMMY_DATA] || layer.id;
              richTexts[layer.id] = plainTextToRichText(text);
            }
          });
          setLayerRichTexts(richTexts);
          console.log('✅ Migrated layers with default maxWidth and lineHeight');
          console.log('✅ Initialized rich text state:', richTexts);
          
          // Load score text layers if dual template
          if (tpl.is_dual_template) {
            if (existingLayout.score?.textLayers) {
              console.log('📊 Loading score text layers from database');
              console.log('📊 Raw score layers from DB:', existingLayout.score.textLayers.map((l: TextLayer) => ({
                id: l.id,
                x: l.x,
                y: l.y,
                xPercent: l.xPercent,
                yPercent: l.yPercent
              })));
              
              const migratedScoreLayers = (existingLayout.score.textLayers as TextLayer[]).map(layer => ({
                ...layer,
                maxWidth: layer.maxWidth || 300,
                lineHeight: layer.lineHeight || 1.2,
              }));
              setScoreTextLayers(migratedScoreLayers);
              
              console.log('📊 Migrated score layers:', migratedScoreLayers.map(l => ({
                id: l.id,
                x: l.x,
                y: l.y,
                xPercent: l.xPercent,
                yPercent: l.yPercent
              })));
              
              // Initialize rich text state for score layers
              migratedScoreLayers.forEach(layer => {
                if (layer.richText && layer.hasInlineFormatting) {
                  richTexts[layer.id] = layer.richText;
                } else {
                  const text = layer.defaultText || SCORE_DUMMY_DATA[layer.id] || layer.id;
                  richTexts[layer.id] = plainTextToRichText(text);
                }
              });
              setLayerRichTexts(richTexts);
              
              console.log('✅ Score text layers loaded:', migratedScoreLayers.length);
            } else {
              // Auto-initialize score layers with default date layer
              console.log('🆕 Initializing default score layers with date');
              const defaultScoreLayers: TextLayerConfig[] = [
                {
                  id: 'score_date',
                  x: 400,
                  y: 550,
                  xPercent: 400 / STANDARD_CANVAS_WIDTH,
                  yPercent: 550 / STANDARD_CANVAS_HEIGHT,
                  fontSize: 14,
                  color: '#000000',
                  fontWeight: 'normal',
                  fontFamily: 'Arial',
                  textAlign: 'center',
                  maxWidth: 200,
                  lineHeight: 1.2,
                  defaultText: getTodayDate(),
                  useDefaultText: true,
                }
              ];
              setScoreTextLayers(defaultScoreLayers);
              
              // Initialize rich text for default score layers
              defaultScoreLayers.forEach(layer => {
                const text = layer.defaultText || SCORE_DUMMY_DATA[layer.id] || layer.id;
                richTexts[layer.id] = plainTextToRichText(text);
              });
              setLayerRichTexts(richTexts);
              
              console.log('✅ Default score layers initialized with date');
            }
          }
        } else {
          // Initialize with default text layers
          console.log('🆕 Initializing default text layers');
          initializeDefaultLayers();
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Failed to load template:", error);
        toast.error("Failed to load template");
        router.push("/templates");
      }
    }

    loadTemplate();
  }, [templateId, router]);

  // Initialize default text layers
  const initializeDefaultLayers = () => {
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
    setTextLayers(defaultLayers);
    
    // Initialize rich text state for default layers
    const richTexts: Record<string, RichText> = {};
    defaultLayers.forEach(layer => {
      const text = DUMMY_DATA[layer.id as keyof typeof DUMMY_DATA] || layer.id;
      richTexts[layer.id] = plainTextToRichText(text);
    });
    setLayerRichTexts(richTexts);
    console.log('✅ Initialized rich text for default layers');
    
    if (defaultLayers.length > 0) {
      setSelectedLayerId(defaultLayers[0].id);
    }
  };

  // Calculate canvas scale based on container width
  useEffect(() => {
    const updateScale = () => {
      if (canvasRef.current) {
        const containerWidth = canvasRef.current.offsetWidth;
        const scale = containerWidth / STANDARD_CANVAS_WIDTH;
        setCanvasScale(scale);
      }
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  // Handle text layer drag (mode-aware)
  const handleLayerMouseDown = (layerId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedLayerId(layerId);
    
    // Find layer from appropriate set based on mode
    const layers = currentMode === 'certificate' ? textLayers : scoreTextLayers;
    const layer = layers.find(l => l.id === layerId);
    if (!layer || !canvasRef.current) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const startLayerX = layer.x;
    const startLayerY = layer.y;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = (moveEvent.clientX - startX) / canvasScale;
      const deltaY = (moveEvent.clientY - startY) / canvasScale;
      
      const newX = Math.max(0, Math.min(STANDARD_CANVAS_WIDTH, startLayerX + deltaX));
      const newY = Math.max(0, Math.min(STANDARD_CANVAS_HEIGHT, startLayerY + deltaY));

      const updateFn = (prev: TextLayer[]) => prev.map(l => 
        l.id === layerId 
          ? { 
              ...l, 
              x: Math.round(newX), 
              y: Math.round(newY),
              xPercent: newX / STANDARD_CANVAS_WIDTH,
              yPercent: newY / STANDARD_CANVAS_HEIGHT,
              isDragging: true
            }
          : l
      );
      
      if (currentMode === 'certificate') {
        setTextLayers(updateFn);
      } else {
        setScoreTextLayers(updateFn);
      }
    };

    const handleMouseUp = () => {
      const updateFn = (prev: TextLayer[]) => prev.map(l => ({ ...l, isDragging: false }));
      if (currentMode === 'certificate') {
        setTextLayers(updateFn);
      } else {
        setScoreTextLayers(updateFn);
      }
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Handle resize handle drag (mode-aware)
  const handleResizeMouseDown = (layerId: string, e: React.MouseEvent, direction: 'right' | 'left' | 'top' | 'bottom' | 'corner' = 'right') => {
    e.stopPropagation();
    
    // Find layer from appropriate set based on mode
    const layers = currentMode === 'certificate' ? textLayers : scoreTextLayers;
    const layer = layers.find(l => l.id === layerId);
    if (!layer || !canvasRef.current) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = layer.maxWidth || 300;
    const startHeight = layer.fontSize * (layer.lineHeight || 1.2);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = (moveEvent.clientX - startX) / canvasScale;
      const deltaY = (moveEvent.clientY - startY) / canvasScale;
      
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

      const updateFn = (prev: TextLayer[]) => prev.map(l => 
        l.id === layerId ? { ...l, ...updates } : l
      );
      
      if (currentMode === 'certificate') {
        setTextLayers(updateFn);
      } else {
        setScoreTextLayers(updateFn);
      }
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

  // Update text layer property (mode-aware)
  const updateLayer = (layerId: string, updates: Partial<TextLayer>) => {
    const updateFn = (prev: TextLayer[]) => {
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
        
        // Clamp and update x and xPercent
        newX = Math.max(0, Math.min(STANDARD_CANVAS_WIDTH, Math.round(newX)));
        updates.x = newX;
        updates.xPercent = newX / STANDARD_CANVAS_WIDTH;
      }
      
      return prev.map(l => 
        l.id === layerId ? { ...l, ...updates } : l
      );
    };
    
    // Apply update to appropriate layer set based on current mode
    if (currentMode === 'certificate') {
      setTextLayers(updateFn);
    } else {
      setScoreTextLayers(updateFn);
    }
  };

  // Add new text layer (mode-aware)
  const addTextLayer = () => {
    // Different default positions for certificate vs score mode
    const defaultY = currentMode === 'certificate' ? 200 : 350; // Score layers start lower
    
    const newLayer: TextLayerConfig = {
      id: `custom_${Date.now()}`,
      x: 400,
      y: defaultY,
      xPercent: 400 / STANDARD_CANVAS_WIDTH,
      yPercent: defaultY / STANDARD_CANVAS_HEIGHT,
      fontSize: 24,
      color: '#000000',
      fontWeight: 'normal',
      fontFamily: 'Arial',
      textAlign: 'left',
      maxWidth: 300,
      lineHeight: 1.2,
    };
    
    // Add to appropriate layer set based on current mode
    if (currentMode === 'certificate') {
      setTextLayers([...textLayers, newLayer]);
    } else {
      setScoreTextLayers([...scoreTextLayers, newLayer]);
    }
    
    setSelectedLayerId(newLayer.id);
    
    // Initialize rich text for new layer
    setLayerRichTexts(prev => ({
      ...prev,
      [newLayer.id]: plainTextToRichText('New Text')
    }));
  };

  // Delete text layer (mode-aware)
  const deleteLayer = (layerId: string) => {
    // Prevent deleting required fields (only for certificate mode)
    if (currentMode === 'certificate') {
      const requiredFields = ['name', 'certificate_no', 'issue_date'];
      if (requiredFields.includes(layerId)) {
        toast.error("Cannot delete required field");
        return;
      }
    }
    
    // Delete from appropriate layer set based on current mode
    if (currentMode === 'certificate') {
      setTextLayers(prev => prev.filter(l => l.id !== layerId));
    } else {
      setScoreTextLayers(prev => prev.filter(l => l.id !== layerId));
    }
    
    if (selectedLayerId === layerId) {
      setSelectedLayerId(null);
    }
    
    // Cleanup rich text state
    setLayerRichTexts(prev => {
      const { [layerId]: deleted, ...rest } = prev;
      void deleted;
      return rest;
    });
    
    toast.success("Text layer deleted");
  };

  // Track text selection for inline formatting
  useEffect(() => {
    const handleSelectionChange = () => {
      if (!selectedLayerId) return;
      
      const element = textLayerRefs.current[selectedLayerId];
      if (!element) return;
      
      const offsets = getSelectionOffsets(element);
      setTextSelection(offsets);
    };
    
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [selectedLayerId]);

  // Apply font weight to selected text or whole layer
  const applyFontWeight = (layerId: string, weight: string) => {
    const richText = layerRichTexts[layerId];
    if (!richText) return;
    
    if (textSelection && textSelection.start !== textSelection.end) {
      // Apply to selected text only
      const newRichText = applyStyleToRange(
        richText,
        textSelection.start,
        textSelection.end,
        { fontWeight: weight }
      );
      setLayerRichTexts(prev => ({ ...prev, [layerId]: newRichText }));
      
      // Mark layer as having inline formatting
      setTextLayers(prev => prev.map(l => 
        l.id === layerId ? { ...l, hasInlineFormatting: true, richText: newRichText } : l
      ));
    } else {
      // Apply to whole layer (update layer-level style)
      setTextLayers(prev => prev.map(l => 
        l.id === layerId ? { ...l, fontWeight: weight } : l
      ));
    }
  };

  // Apply font family to selected text or whole layer
  const applyFontFamily = (layerId: string, family: string) => {
    const richText = layerRichTexts[layerId];
    if (!richText) return;
    
    if (textSelection && textSelection.start !== textSelection.end) {
      // Apply to selected text only
      const newRichText = applyStyleToRange(
        richText,
        textSelection.start,
        textSelection.end,
        { fontFamily: family }
      );
      setLayerRichTexts(prev => ({ ...prev, [layerId]: newRichText }));
      
      // Mark layer as having inline formatting
      setTextLayers(prev => prev.map(l => 
        l.id === layerId ? { ...l, hasInlineFormatting: true, richText: newRichText } : l
      ));
    } else {
      // Apply to whole layer (update layer-level style)
      setTextLayers(prev => prev.map(l => 
        l.id === layerId ? { ...l, fontFamily: family } : l
      ));
    }
  };

  // Get current font weight (may be "mixed")
  const getCurrentFontWeight = (layerId: string): string | 'mixed' => {
    const layer = textLayers.find(l => l.id === layerId);
    if (!layer) return '400';
    
    const richText = layerRichTexts[layerId];
    if (richText && layer.hasInlineFormatting) {
      // If there's a text selection, check only selected spans
      if (textSelection && textSelection.start !== textSelection.end) {
        const selectionRichText: RichText = [];
        let offset = 0;
        for (const span of richText) {
          const spanEnd = offset + span.text.length;
          if (spanEnd > textSelection.start && offset < textSelection.end) {
            selectionRichText.push(span);
          }
          offset = spanEnd;
        }
        
        if (selectionRichText.length > 0) {
          const weight = getCommonStyleValue(selectionRichText, 'fontWeight');
          return weight === 'mixed' ? 'mixed' : (weight as string || layer.fontWeight);
        }
      } else {
        // No selection: check if ALL spans have mixed styles
        const weight = getCommonStyleValue(richText, 'fontWeight');
        return weight === 'mixed' ? 'mixed' : (weight as string || layer.fontWeight);
      }
    }
    
    return layer.fontWeight;
  };

  // Get current font family (may be "mixed")
  const getCurrentFontFamily = (layerId: string): string | 'mixed' => {
    const layer = textLayers.find(l => l.id === layerId);
    if (!layer) return 'Arial';
    
    const richText = layerRichTexts[layerId];
    if (richText && layer.hasInlineFormatting) {
      // If there's a text selection, check only selected spans
      if (textSelection && textSelection.start !== textSelection.end) {
        const selectionRichText: RichText = [];
        let offset = 0;
        for (const span of richText) {
          const spanEnd = offset + span.text.length;
          if (spanEnd > textSelection.start && offset < textSelection.end) {
            selectionRichText.push(span);
          }
          offset = spanEnd;
        }
        
        if (selectionRichText.length > 0) {
          const family = getCommonStyleValue(selectionRichText, 'fontFamily');
          return family === 'mixed' ? 'mixed' : (family as string || layer.fontFamily);
        }
      } else {
        // No selection: check if ALL spans have mixed styles
        const family = getCommonStyleValue(richText, 'fontFamily');
        return family === 'mixed' ? 'mixed' : (family as string || layer.fontFamily);
      }
    }
    
    return layer.fontFamily;
  };

  // Save layout configuration
  const handleSave = async () => {
    if (!template) return;
    
    // Validate required fields
    const requiredFields = ['name', 'certificate_no', 'issue_date'];
    const existingIds = textLayers.map(l => l.id);
    const missingFields = requiredFields.filter(f => !existingIds.includes(f));
    
    if (missingFields.length > 0) {
      toast.error(`Missing required fields: ${missingFields.join(', ')}`);
      return;
    }
    
    setSaving(true);
    
    try {
      const layoutConfig: TemplateLayoutConfig = {
        certificate: {
          textLayers: textLayers.map(layer => {
            const { isDragging, isEditing, ...rest } = layer;
            void isDragging;
            void isEditing;
            
            // Include rich text if layer has inline formatting
            const layerWithRichText = layer.hasInlineFormatting && layerRichTexts[layer.id]
              ? { ...rest, richText: layerRichTexts[layer.id], hasInlineFormatting: true }
              : rest;
            
            // Remove textAlign property for certificate_no and issue_date
            if (layer.id === 'certificate_no' || layer.id === 'issue_date') {
              const { textAlign, ...restWithoutTextAlign } = layerWithRichText;
              void textAlign;
              return restWithoutTextAlign;
            }
            return layerWithRichText;
          })
        },
        canvas: {
          width: STANDARD_CANVAS_WIDTH,
          height: STANDARD_CANVAS_HEIGHT
        },
        version: "1.0",
        lastSavedAt: new Date().toISOString()
      };
      
      // Add score layout if dual template
      if (template.is_dual_template && scoreTextLayers.length > 0) {
        layoutConfig.score = {
          textLayers: scoreTextLayers.map(layer => {
            const { isDragging, isEditing, ...rest } = layer;
            void isDragging;
            void isEditing;
            
            // Include rich text if layer has inline formatting
            const layerWithRichText = layer.hasInlineFormatting && layerRichTexts[layer.id]
              ? { ...rest, richText: layerRichTexts[layer.id], hasInlineFormatting: true }
              : rest;
            
            return layerWithRichText;
          })
        };
        console.log('💾 Saving score layout with', scoreTextLayers.length, 'layers');
      }

      await saveTemplateLayout(template.id, layoutConfig);
      
      toast.success("Layout configuration saved successfully!");
      
      // Redirect back to templates page after 1 second
      setTimeout(() => {
        router.push("/templates");
      }, 1000);
      
    } catch (error) {
      console.error("Failed to save layout:", error);
      toast.error("Failed to save layout configuration");
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
    
    // Check if new ID already exists (mode-aware)
    const layers = currentMode === 'certificate' ? textLayers : scoreTextLayers;
    if (layers.some(l => l.id === renameValue && l.id !== oldId)) {
      toast.error('Layer ID already exists');
      return;
    }
    
    // Update layer ID (mode-aware)
    const updateFn = (prev: TextLayer[]) => prev.map(l => 
      l.id === oldId ? { ...l, id: renameValue.trim() } : l
    );
    
    if (currentMode === 'certificate') {
      setTextLayers(updateFn);
    } else {
      setScoreTextLayers(updateFn);
    }
    
    // Update selected layer if it was the renamed one
    if (selectedLayerId === oldId) {
      setSelectedLayerId(renameValue.trim());
    }
    
    setRenamingLayerId(null);
    toast.success('Layer renamed successfully');
  };

  // Get selected layer (mode-aware)
  const selectedLayer = (currentMode === 'certificate' ? textLayers : scoreTextLayers).find(l => l.id === selectedLayerId);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Loading template...
          </h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Please wait while we load the template configuration.
          </p>
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
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 fixed top-0 left-0 right-0 z-50 shadow-sm h-14 sm:h-16">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 h-full">
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
              <Button
                onClick={handleSave}
                disabled={saving}
                className="gradient-primary text-white h-8 sm:h-9 px-3 sm:px-4 text-xs sm:text-sm"
              >
                {saving ? (
                  <>
                    <div className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span className="hidden sm:inline">Saving...</span>
                    <span className="sm:hidden">Save</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Save</span>
                    <span className="sm:hidden">Save</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8 mt-14 sm:mt-16 md:mt-20">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Compact Canvas for Editing */}
          <div className="lg:col-span-3 order-1 lg:order-1">
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-800 p-3 sm:p-4 md:p-6">
              <div 
                ref={canvasRef}
                className="relative border-2 border-gray-300 dark:border-gray-700 rounded-lg bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 overflow-hidden"
                style={{ 
                  width: '100%',
                  aspectRatio: `${STANDARD_CANVAS_WIDTH}/${STANDARD_CANVAS_HEIGHT}`,
                  cursor: 'default',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  MozUserSelect: 'none',
                  msUserSelect: 'none'
                }}
                onClick={() => setSelectedLayerId(null)}
              >
                {/* CANVA-STYLE: Wrapper to center the scaled canvas */}
                <div className="absolute inset-0 flex items-center justify-center">
                  {/* CANVA-STYLE: Inner canvas with fixed 800×600 size, scaled via CSS transform */}
                  <div
                    style={{
                      width: `${STANDARD_CANVAS_WIDTH}px`,
                      height: `${STANDARD_CANVAS_HEIGHT}px`,
                      transform: `scale(${canvasScale})`,
                      transformOrigin: 'center center',
                      position: 'relative'
                    }}
                  >
                {/* Template Background - Conditional based on mode */}
                {currentMode === 'certificate' && templateImageUrl && (
                  <div className="absolute inset-0" style={{ userSelect: 'none', pointerEvents: 'none' }}>
                    <Image
                      src={templateImageUrl}
                      alt={`${template.name} - Certificate`}
                      fill
                      className="object-contain"
                      style={{ userSelect: 'none', pointerEvents: 'none' }}
                      unoptimized
                      draggable={false}
                    />
                  </div>
                )}
                
                {currentMode === 'score' && scoreImageUrl && (
                  <div className="absolute inset-0" style={{ userSelect: 'none', pointerEvents: 'none' }}>
                    <Image
                      src={scoreImageUrl}
                      alt={`${template.name} - Score`}
                      fill
                      className="object-contain"
                      style={{ userSelect: 'none', pointerEvents: 'none' }}
                      unoptimized
                      draggable={false}
                    />
                  </div>
                )}
                
                {/* Text Layers - Conditional based on mode */}
                {(currentMode === 'certificate' ? textLayers : scoreTextLayers).map(layer => {
                  // Priority: preview text > default text > dummy data (mode-specific) > layer id
                  const dummyData = currentMode === 'certificate' ? DUMMY_DATA : SCORE_DUMMY_DATA;
                  const text = previewTexts[layer.id] || 
                               layer.defaultText || 
                               dummyData[layer.id as keyof typeof dummyData] || 
                               layer.id;
                  const isSelected = selectedLayerId === layer.id;
                  
                  // Calculate transform based on alignment
                  // certificate_no and issue_date always use left alignment (no textAlign property)
                  const getTransform = () => {
                    // Force left alignment for certificate_no and issue_date
                    if (layer.id === 'certificate_no' || layer.id === 'issue_date') {
                      return 'translate(0%, -50%)'; // Always left-aligned
                    }
                    const align = layer.textAlign || 'left';
                    if (align === 'center') return 'translate(-50%, -50%)';
                    if (align === 'right') return 'translate(-100%, -50%)'; // Anchor at right
                    return 'translate(0%, -50%)'; // Anchor at left
                  };
                  
                  return (
                    <div
                      key={layer.id}
                      className="absolute"
                      style={{
                        left: `${layer.x}px`,
                        top: `${layer.y}px`,
                        transform: getTransform(),
                        zIndex: isSelected ? 10 : 1
                      }}
                    >
                      {/* Text content - Rich text with contentEditable */}
                      <div
                        ref={el => { textLayerRefs.current[layer.id] = el; }}
                        contentEditable={isSelected && layer.id !== 'certificate_no' && layer.id !== 'issue_date'}
                        suppressContentEditableWarning
                        className={`relative cursor-move transition-all ${
                          isSelected ? (layer.id === 'certificate_no' || layer.id === 'issue_date' ? 'bg-gray-100/50' : 'bg-blue-50/30') : ''
                        } ${layer.isDragging ? 'opacity-70' : ''}`}
                        style={{
                          fontSize: `${layer.fontSize}px`,
                          color: layer.color,
                          fontWeight: layer.fontWeight,
                          fontFamily: layer.fontFamily,
                          // certificate_no and issue_date always use left alignment
                          textAlign: (layer.id === 'certificate_no' || layer.id === 'issue_date') ? 'left' : (layer.textAlign || 'left'),
                          whiteSpace: layer.maxWidth ? 'normal' : 'nowrap',
                          width: layer.maxWidth ? `${layer.maxWidth}px` : 'auto',
                          minHeight: `${layer.fontSize * (layer.lineHeight || 1.2)}px`,
                          lineHeight: layer.lineHeight || 1.2,
                          wordWrap: 'break-word',
                          overflowWrap: 'break-word',
                          userSelect: 'none', // Disable text selection for all layers (preview only)
                          outline: 'none',
                          // Always have padding and border to prevent layout shift
                          padding: '4px 8px',
                          border: isSelected 
                            ? (layer.id === 'certificate_no' || layer.id === 'issue_date' 
                              ? '2px dashed #9ca3af' // Gray border for read-only
                              : '2px dashed #3b82f6') // Blue border for editable
                            : '2px dashed transparent',
                          borderRadius: '4px',
                          boxSizing: 'border-box',
                          cursor: (layer.id === 'certificate_no' || layer.id === 'issue_date') ? 'move' : 'move'
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLayerId(layer.id);
                        }}
                        onMouseDown={(e) => {
                          if (!isSelected) {
                            e.stopPropagation();
                            setSelectedLayerId(layer.id);
                          } else {
                            // Check if clicking on text (not dragging)
                            const selection = window.getSelection();
                            if (selection && selection.toString().length > 0) {
                              // User is selecting text, don't start drag
                              return;
                            }
                            handleLayerMouseDown(layer.id, e);
                          }
                        }}
                        onInput={(e) => {
                          // Update rich text on typing (converts to plain text for now)
                          const newText = e.currentTarget.textContent || '';
                          setLayerRichTexts(prev => ({
                            ...prev,
                            [layer.id]: plainTextToRichText(newText)
                          }));
                        }}
                      >
                        {/* Render rich text spans */}
                        {/* CRITICAL: For certificate_no and issue_date, ALWAYS use DUMMY_DATA (ignore layerRichTexts) */}
                        {(layer.id === 'certificate_no' || layer.id === 'issue_date') ? (
                          DUMMY_DATA[layer.id as keyof typeof DUMMY_DATA] || layer.id
                        ) : layerRichTexts[layer.id] ? (
                          layerRichTexts[layer.id].map((span, i) => (
                            <span
                              key={i}
                              style={{
                                fontWeight: span.fontWeight || layer.fontWeight,
                                fontFamily: span.fontFamily || layer.fontFamily,
                                fontSize: span.fontSize ? `${span.fontSize}px` : undefined,
                                color: span.color || undefined,
                                fontStyle: span.fontStyle || 'normal',
                                textDecoration: span.textDecoration || 'none',
                              }}
                            >
                              {span.text}
                            </span>
                          ))
                        ) : (
                          text
                        )}
                      </div>
                      
                      {/* Label and resize handles (Word-style) */}
                      {isSelected && (
                        <>
                          {/* Layer name label */}
                          <div className={`absolute -top-5 sm:-top-6 left-0 text-white text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded whitespace-nowrap pointer-events-none max-w-[90vw] truncate ${
                            layer.id === 'certificate_no' || layer.id === 'issue_date' 
                              ? 'bg-gray-500' // Gray for read-only
                              : 'bg-blue-500' // Blue for editable
                          }`}>
                            <span className="truncate inline-block max-w-full">
                              {layer.id}
                              {(layer.id === 'certificate_no' || layer.id === 'issue_date') && (
                                <span className="ml-1 opacity-75 text-[9px] sm:text-[10px]"></span>
                              )}
                            </span>
                            {layer.maxWidth && (
                              <span className="ml-1 sm:ml-2 opacity-75 hidden sm:inline">{Math.round(layer.maxWidth)}px</span>
                            )}
                          </div>
                          
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
                  </div>
                  {/* End of CANVA-STYLE inner canvas (800x600) */}
                </div>
                {/* End of centering wrapper */}
              </div>
            </div>
          </div>

          {/* Configuration Panel */}
          <div className="lg:col-span-1 order-2 lg:order-2">
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-800 p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 lg:sticky lg:top-24 max-h-[calc(100vh-10rem)] sm:max-h-[calc(100vh-8rem)] overflow-y-auto">
              {/* Mode Selector for Dual Templates - Moved to top of panel */}
              {template?.is_dual_template && (
                <div className="flex items-center justify-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                  <Button
                    variant={currentMode === 'certificate' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setCurrentMode('certificate')}
                    className="h-8 px-4 text-xs font-medium flex-1"
                  >
                    Certificate
                  </Button>
                  <Button
                    variant={currentMode === 'score' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setCurrentMode('score')}
                    className="h-8 px-4 text-xs font-medium flex-1"
                  >
                    Score
                  </Button>
                </div>
              )}
              
              {/* Text Layers List - Mode Aware */}
              <div>
                <div className="flex items-center justify-between mb-3 sm:mb-4 gap-2">
                  <h2 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {currentMode === 'certificate' ? 'Certificate' : 'Score'} Layers ({currentMode === 'certificate' ? textLayers.length : scoreTextLayers.length})
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
                  {(currentMode === 'certificate' ? textLayers : scoreTextLayers).map(layer => {
                    const isRequired = currentMode === 'certificate' && ['name', 'certificate_no', 'issue_date'].includes(layer.id);
                    const isSelected = selectedLayerId === layer.id;
                    
                    return (
                      <div
                        key={layer.id}
                        className={`flex items-center justify-between p-2 sm:p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          isSelected 
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10' 
                            : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
                        }`}
                        onClick={() => setSelectedLayerId(layer.id)}
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
                          {isRequired && (
                            <span className="text-[10px] sm:text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 px-1.5 sm:px-2 py-0.5 rounded flex-shrink-0">
                              Required
                            </span>
                          )}
                        </div>
                        {!isRequired && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteLayer(layer.id);
                            }}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 h-7 w-7 sm:h-8 sm:w-auto sm:px-2 p-0 flex-shrink-0"
                          >
                            <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Layer Properties */}
              {selectedLayer && (
                <div className="border-t border-gray-200 dark:border-gray-800 pt-3 sm:pt-4">
                  <h3 className="text-[10px] sm:text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 sm:mb-3 uppercase tracking-wide truncate">
                    {selectedLayer.id}
                  </h3>
                  <div className="space-y-2 sm:space-y-3">
                    {/* Default Text - Only for custom layers (hide for certificate required fields) */}
                    {!(currentMode === 'certificate' && ['name', 'certificate_no', 'issue_date'].includes(selectedLayer.id)) && (
                      <div className="bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-900/40 rounded-lg p-2 sm:p-3">
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
                        <Input
                          type="text"
                          value={selectedLayer.defaultText || ''}
                          onChange={(e) => {
                            const newValue = e.target.value;
                            updateLayer(selectedLayer.id, { defaultText: newValue });
                            // Update preview text as well
                            setPreviewTexts(prev => ({
                              ...prev,
                              [selectedLayer.id]: newValue
                            }));
                          }}
                          placeholder="Enter text..."
                          className="h-7 sm:h-8 text-xs dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
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
                          onChange={(e) => updateLayer(selectedLayer.id, { 
                            x: parseInt(e.target.value) || 0,
                            xPercent: (parseInt(e.target.value) || 0) / STANDARD_CANVAS_WIDTH
                          })}
                          className="h-7 sm:h-8 text-xs dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] sm:text-xs text-gray-700 dark:text-gray-300">Y Position</Label>
                        <Input
                          type="number"
                          value={selectedLayer.y}
                          onChange={(e) => updateLayer(selectedLayer.id, { 
                            y: parseInt(e.target.value) || 0,
                            yPercent: (parseInt(e.target.value) || 0) / STANDARD_CANVAS_HEIGHT
                          })}
                          className="h-7 sm:h-8 text-xs dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
                        />
                      </div>
                    </div>

                    {/* Font Size */}
                    <div>
                      <Label className="text-[10px] sm:text-xs text-gray-700 dark:text-gray-300">Font Size</Label>
                      <Input
                        type="number"
                        value={selectedLayer.fontSize}
                        onChange={(e) => updateLayer(selectedLayer.id, { fontSize: parseInt(e.target.value) || 12 })}
                        className="h-7 sm:h-8 text-xs dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
                      />
                    </div>

                    {/* Font Family & Weight - Side by Side with Rich Text Support */}
                    <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                      <div>
                        <Label className="text-[10px] sm:text-xs text-gray-700 dark:text-gray-300">
                          Font Family
                          {textSelection && textSelection.start !== textSelection.end && (
                            <span className="ml-1 text-[9px] text-blue-500">(selection)</span>
                          )}
                        </Label>
                        <FontFamilySelect
                          value={getCurrentFontFamily(selectedLayer.id)}
                          onValueChange={(value) => applyFontFamily(selectedLayer.id, value)}
                          className="h-7 sm:h-8 text-xs dark:bg-gray-900 dark:text-gray-100 dark:border-gray-700"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] sm:text-xs text-gray-700 dark:text-gray-300">
                          Weight
                          {textSelection && textSelection.start !== textSelection.end && (
                            <span className="ml-1 text-[9px] text-blue-500">(selection)</span>
                          )}
                        </Label>
                        <FontWeightSelect
                          value={getCurrentFontWeight(selectedLayer.id)}
                          onValueChange={(value) => applyFontWeight(selectedLayer.id, value)}
                          className="h-7 sm:h-8 text-xs dark:bg-gray-900 dark:text-gray-100 dark:border-gray-700"
                        />
                      </div>
                    </div>

                    {/* Text Align & Line Height */}
                    <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                      {/* Hide Text Align for certificate_no and issue_date - they always use left alignment */}
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
                          onChange={(e) => updateLayer(selectedLayer.id, { color: e.target.value })}
                          className="h-7 sm:h-8 w-10 sm:w-12 border border-gray-200 dark:border-gray-700 rounded bg-transparent flex-shrink-0"
                        />
                        <Input
                          type="text"
                          value={selectedLayer.color || '#000000'}
                          onChange={(e) => updateLayer(selectedLayer.id, { color: e.target.value })}
                          className="h-7 sm:h-8 text-xs dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100 flex-1"
                        />
                      </div>
                    </div>

                    {/* Preview Text Input */}
                    <div>
                      <Label className="text-[10px] sm:text-xs text-gray-700 dark:text-gray-300">Preview Text</Label>
                      <Input
                        type="text"
                        value={previewTexts[selectedLayer.id] || ''}
                        onChange={(e) => setPreviewTexts(prev => ({
                          ...prev,
                          [selectedLayer.id]: e.target.value
                        }))}
                        className="h-7 sm:h-8 text-xs dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Validation */}
              
            </div>
          </div>
        </div>
      </div>

      {/* Full Preview Modal */}
      <Dialog open={previewModalOpen} onOpenChange={setPreviewModalOpen}>
        <DialogContent className="max-w-5xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto p-3 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">
              Template Preview
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600 dark:text-gray-400">
              Informasi dan preview template sertifikat
            </DialogDescription>
          </DialogHeader>
          
          {/* Template Information */}
          <div className="mt-3 sm:mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Nama Template</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{template.name}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Kategori</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{template.category || '-'}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Format</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{template.orientation || '-'}</p>
            </div>
          </div>

          {/* Preview Canvas */}
          <div className="mt-3 sm:mt-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 sm:mb-3">Preview Template</h3>
            <div 
              className="relative border-2 border-gray-300 dark:border-gray-700 rounded-lg bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 overflow-hidden mx-auto"
              style={{ 
                width: '100%',
                aspectRatio: `${STANDARD_CANVAS_WIDTH}/${STANDARD_CANVAS_HEIGHT}`,
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
              {textLayers.map(layer => {
                // Priority: preview text > default text > dummy data > layer id
                const text = previewTexts[layer.id] || 
                             layer.defaultText || 
                             DUMMY_DATA[layer.id as keyof typeof DUMMY_DATA] || 
                             layer.id;
                
                // Calculate transform based on alignment
                const getTransform = () => {
                  // Force left alignment for certificate_no and issue_date
                  if (layer.id === 'certificate_no' || layer.id === 'issue_date') {
                    return 'translate(0%, -50%)'; // Always left-aligned
                  }
                  const align = layer.textAlign || 'left';
                  if (align === 'center') return 'translate(-50%, -50%)';
                  if (align === 'right') return 'translate(-100%, -50%)';
                  return 'translate(0%, -50%)';
                };
                
                return (
                  <div
                    key={layer.id}
                    className="absolute"
                    style={{
                      left: `${(layer.x / STANDARD_CANVAS_WIDTH) * 100}%`,
                      top: `${(layer.y / STANDARD_CANVAS_HEIGHT) * 100}%`,
                      transform: getTransform(),
                      zIndex: 1
                    }}
                  >
                    <div
                      className="relative"
                      style={{
                        fontSize: `${layer.fontSize}px`,
                        color: layer.color,
                        fontWeight: layer.fontWeight,
                        fontFamily: layer.fontFamily,
                        textAlign: (layer.id === 'certificate_no' || layer.id === 'issue_date') ? 'left' : (layer.textAlign || 'left'),
                        whiteSpace: layer.maxWidth ? 'normal' : 'nowrap',
                        width: layer.maxWidth ? `${layer.maxWidth}px` : 'auto',
                        minHeight: `${layer.fontSize * (layer.lineHeight || 1.2)}px`,
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
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Loading configuration...
          </h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Please wait while we prepare the editor.
          </p>
        </div>
      </div>
    }>
      <ConfigureLayoutContent />
    </Suspense>
  );
}
