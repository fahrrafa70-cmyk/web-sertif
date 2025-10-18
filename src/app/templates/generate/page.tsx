"use client";

import Header from "@/components/header";
import Footer from "@/components/footer";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Download, Eye, FileText } from "lucide-react";
import { useBodyScrollLock } from "@/hooks/use-body-scroll-lock";
import { useLanguage } from "@/contexts/language-context";
import { getTemplate, getTemplateImageUrl } from "@/lib/supabase/templates";
import { Template } from "@/lib/supabase/templates";
import { createCertificate, CreateCertificateData } from "@/lib/supabase/certificates";
import { toast, Toaster } from "sonner";

type CertificateData = {
  certificate_no: string;
  name: string;
  description: string;
  issue_date: string;
  expired_date: string;
  qr_code: string;
};

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

export default function CertificateGeneratorPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateId = searchParams?.get("template");
  
  const [role, setRole] = useState<"Admin" | "Team" | "Public">("Public");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [textLayers, setTextLayers] = useState<TextLayer[]>([]);
  const [draggingLayer, setDraggingLayer] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [isAddingText, setIsAddingText] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  // FIX: Standard canvas dimensions for consistent positioning
  const STANDARD_CANVAS_WIDTH = 800;
  const STANDARD_CANVAS_HEIGHT = 600;
  const [canvasDimensions, setCanvasDimensions] = useState({ width: STANDARD_CANVAS_WIDTH, height: STANDARD_CANVAS_HEIGHT });
  const [snapGridEnabled, setSnapGridEnabled] = useState(false);
  const [gridSize, setGridSize] = useState(20); // Grid spacing in pixels
  const [certificateData, setCertificateData] = useState<CertificateData>({
    certificate_no: "CERT-2024-001",
    name: "John Doe",
    description: "This certificate is awarded for successful completion of the program.",
    issue_date: new Date().toISOString().split('T')[0],
    expired_date: "",
    qr_code: "https://e-certificate.my.id/verify/CERT-2024-001"
  });

  // Prevent body scroll when page loads (optional - for consistency)
  useBodyScrollLock(false);

  // Check role and redirect if not authorized
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("ecert-role");
      const normalized = (saved || "").toLowerCase();
      if (["admin","team","public"].includes(normalized)) {
        const mapped = normalized === "admin" ? "Admin" : normalized === "team" ? "Team" : "Public";
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

  // Find selected template
  useEffect(() => {
    const loadTemplate = async () => {
      if (templateId) {
        try {
          setLoading(true);
          const template = await getTemplate(templateId);
          setSelectedTemplate(template);
          // Template loaded successfully
        } catch (error) {
          console.error('Failed to load template:', error);
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

  const updateCertificateData = (field: keyof CertificateData, value: string) => {
    setCertificateData(prev => ({ ...prev, [field]: value }));
  };

  // FIX: Utility functions for normalized coordinates using standard canvas size
  const getNormalizedPosition = useCallback((x: number, y: number) => {
    return {
      xPercent: x / STANDARD_CANVAS_WIDTH,
      yPercent: y / STANDARD_CANVAS_HEIGHT
    };
  }, []);

  const getAbsolutePosition = useCallback((xPercent: number, yPercent: number) => {
    return {
      x: xPercent * STANDARD_CANVAS_WIDTH,
      y: yPercent * STANDARD_CANVAS_HEIGHT
    };
  }, []);

  // Snap grid utility functions
  const snapToGrid = useCallback((x: number, y: number) => {
    if (!snapGridEnabled) return { x, y };
    
    const snappedX = Math.round(x / gridSize) * gridSize;
    const snappedY = Math.round(y / gridSize) * gridSize;
    
    return { x: snappedX, y: snappedY };
  }, [snapGridEnabled, gridSize]);

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
        id: 'certificate_no',
        text: certificateData.certificate_no,
        x: STANDARD_CANVAS_WIDTH * 0.1, // 10% from left
        y: STANDARD_CANVAS_HEIGHT * 0.1, // 10% from top
        xPercent: 0.1,
        yPercent: 0.1,
        fontSize: 16,
        color: '#374151',
        fontWeight: 'normal',
        fontFamily: 'Arial'
      },
      {
        id: 'name',
        text: certificateData.name || 'Full Name', // Default centered name
        x: STANDARD_CANVAS_WIDTH * 0.5, // 50% from left (center)
        y: STANDARD_CANVAS_HEIGHT * 0.45, // 45% from top
        xPercent: 0.5,
        yPercent: 0.45,
        fontSize: 28,
        color: '#1f2937',
        fontWeight: 'bold',
        fontFamily: 'Arial'
      },
      {
        id: 'description',
        text: certificateData.description,
        x: STANDARD_CANVAS_WIDTH * 0.5, // 50% from left (center)
        y: STANDARD_CANVAS_HEIGHT * 0.55, // 55% from top
        xPercent: 0.5,
        yPercent: 0.55,
        fontSize: 14,
        color: '#374151',
        fontWeight: 'normal',
        fontFamily: 'Arial'
      },
      {
        id: 'issue_date',
        text: certificateData.issue_date,
        x: STANDARD_CANVAS_WIDTH * 0.1, // 10% from left
        y: STANDARD_CANVAS_HEIGHT * 0.85, // 85% from top
        xPercent: 0.1,
        yPercent: 0.85,
        fontSize: 14,
        color: '#6b7280',
        fontWeight: 'normal',
        fontFamily: 'Arial'
      },
      {
        id: 'expired_date',
        text: certificateData.expired_date,
        x: STANDARD_CANVAS_WIDTH * 0.3, // 30% from left
        y: STANDARD_CANVAS_HEIGHT * 0.85, // 85% from top
        xPercent: 0.3,
        yPercent: 0.85,
        fontSize: 14,
        color: '#6b7280',
        fontWeight: 'normal',
        fontFamily: 'Arial'
      },
      {
        id: 'qr_code',
        text: certificateData.qr_code,
        x: STANDARD_CANVAS_WIDTH * 0.1, // 10% from left
        y: STANDARD_CANVAS_HEIGHT * 0.75, // 75% from top
        xPercent: 0.1,
        yPercent: 0.75,
        fontSize: 12,
        color: '#9ca3af',
        fontWeight: 'normal',
        fontFamily: 'Arial'
      }
    ];
    setTextLayers(layers);
  }, [certificateData]);

  // FIX: Update description text layer when certificate data changes
  useEffect(() => {
    setTextLayers(prev => prev.map(layer => {
      if (layer.id === 'description') {
        return { ...layer, text: certificateData.description };
      }
      return layer;
    }));
  }, [certificateData.description]);

  // Initialize text layers only once when template is loaded
  useEffect(() => {
    if (selectedTemplate && textLayers.length === 0) {
      initializeTextLayers();
    }
  }, [selectedTemplate, initializeTextLayers]);

  // Update canvas dimensions on mount and resize
  useEffect(() => {
    updateCanvasDimensions();
    
    const handleResize = () => {
      updateCanvasDimensions();
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [updateCanvasDimensions]);

  // FIX: Update text layer positions when canvas dimensions change
  useEffect(() => {
    if (textLayers.length > 0) {
      setTextLayers(prev => prev.map(layer => {
        // Keep normalized coordinates, only update absolute coordinates for display
        const newPos = getAbsolutePosition(layer.xPercent, layer.yPercent);
        return { ...layer, x: newPos.x, y: newPos.y };
      }));
    }
  }, [canvasDimensions, getAbsolutePosition]);

  // FIX: Dragging functionality with proper coordinate handling
  const handleMouseDown = useCallback((e: React.MouseEvent, layerId: string) => {
    e.preventDefault();
    const layer = textLayers.find(l => l.id === layerId);
    if (!layer || layer.isEditing) return;

    setDraggingLayer(layerId);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      // Calculate actual position on screen using normalized coordinates
      const actualX = layer.xPercent * canvasDimensions.width;
      const actualY = layer.yPercent * canvasDimensions.height;
      
      setDragOffset({
        x: e.clientX - rect.left - actualX,
        y: e.clientY - rect.top - actualY
      });
    }
  }, [textLayers, canvasDimensions]);

  // FIX: Handle mouse move with proper coordinate normalization
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!draggingLayer || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const newX = e.clientX - rect.left - dragOffset.x;
    const newY = e.clientY - rect.top - dragOffset.y;

    // Convert to standard canvas coordinates
    const scaleX = rect.width / STANDARD_CANVAS_WIDTH;
    const scaleY = rect.height / STANDARD_CANVAS_HEIGHT;
    const standardX = newX / scaleX;
    const standardY = newY / scaleY;

    // Constrain to standard canvas bounds
    const constrainedX = Math.max(0, Math.min(standardX, STANDARD_CANVAS_WIDTH - 100));
    const constrainedY = Math.max(0, Math.min(standardY, STANDARD_CANVAS_HEIGHT - 50));

    // Apply snap grid if enabled
    const snappedPos = snapToGrid(constrainedX, constrainedY);
    
    // Calculate normalized position
    const normalizedPos = getNormalizedPosition(snappedPos.x, snappedPos.y);

    setTextLayers(prev => prev.map(layer => 
      layer.id === draggingLayer 
        ? { 
            ...layer, 
            x: snappedPos.x, 
            y: snappedPos.y,
            xPercent: normalizedPos.xPercent,
            yPercent: normalizedPos.yPercent
          }
        : layer
    ));
  }, [draggingLayer, dragOffset, getNormalizedPosition, snapToGrid]);

  const handleMouseUp = useCallback(() => {
    setDraggingLayer(null);
  }, []);

  // Add event listeners for mouse events
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (draggingLayer && canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const newX = e.clientX - rect.left - dragOffset.x;
        const newY = e.clientY - rect.top - dragOffset.y;

        // Convert to standard canvas coordinates
        const scaleX = rect.width / STANDARD_CANVAS_WIDTH;
        const scaleY = rect.height / STANDARD_CANVAS_HEIGHT;
        const standardX = newX / scaleX;
        const standardY = newY / scaleY;

        const constrainedX = Math.max(0, Math.min(standardX, STANDARD_CANVAS_WIDTH - 100));
        const constrainedY = Math.max(0, Math.min(standardY, STANDARD_CANVAS_HEIGHT - 50));

        // Apply snap grid if enabled
        const snappedPos = snapToGrid(constrainedX, constrainedY);
        
        // Calculate normalized position
        const normalizedPos = getNormalizedPosition(snappedPos.x, snappedPos.y);

        setTextLayers(prev => prev.map(layer => 
          layer.id === draggingLayer 
            ? { 
                ...layer, 
                x: snappedPos.x, 
                y: snappedPos.y,
                xPercent: normalizedPos.xPercent,
                yPercent: normalizedPos.yPercent
              }
            : layer
        ));
      }
    };

    const handleGlobalMouseUp = () => {
      setDraggingLayer(null);
    };

    if (draggingLayer) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [draggingLayer, dragOffset, snapToGrid, getNormalizedPosition]);

  // FIX: Add new text using standard canvas dimensions
  const addNewText = useCallback(() => {
    const centerX = STANDARD_CANVAS_WIDTH / 2 - 50; // Approximate text width
    const centerY = STANDARD_CANVAS_HEIGHT / 2 - 10; // Approximate text height
    const normalizedPos = getNormalizedPosition(centerX, centerY);
    
    const newTextLayer: TextLayer = {
      id: `custom_text_${Date.now()}`,
      text: 'New Text',
      x: centerX,
      y: centerY,
      xPercent: normalizedPos.xPercent,
      yPercent: normalizedPos.yPercent,
      fontSize: 20,
      color: '#000000',
      fontWeight: 'normal',
      fontFamily: 'Arial',
      isEditing: true
    };
    
    setTextLayers(prev => [...prev, newTextLayer]);
    setSelectedLayerId(newTextLayer.id);
    setIsAddingText(false);
  }, [getNormalizedPosition]);

  // FIX: Update text layer with proper coordinate normalization
  const updateTextLayer = useCallback((id: string, updates: Partial<TextLayer>) => {
    setTextLayers(prev => prev.map(layer => {
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
        const normalizedPos = getNormalizedPosition(updatedLayer.x, updatedLayer.y);
        updatedLayer.xPercent = normalizedPos.xPercent;
        updatedLayer.yPercent = normalizedPos.yPercent;
      } else {
        // Ensure normalized coordinates exist even if position wasn't updated
        if (updatedLayer.xPercent === undefined || updatedLayer.yPercent === undefined) {
          const normalizedPos = getNormalizedPosition(updatedLayer.x, updatedLayer.y);
          updatedLayer.xPercent = normalizedPos.xPercent;
          updatedLayer.yPercent = normalizedPos.yPercent;
        }
      }
      
      return updatedLayer;
    }));
  }, [getNormalizedPosition]);

  // FIX: Center text layer using standard canvas dimensions
  const centerTextLayer = useCallback((id: string) => {
    const centerX = STANDARD_CANVAS_WIDTH / 2;
    const centerY = STANDARD_CANVAS_HEIGHT / 2;
    const normalizedPos = getNormalizedPosition(centerX, centerY);
    
    setTextLayers(prev => prev.map(layer => {
      if (layer.id !== id) return layer;
      
      return {
        ...layer,
        x: centerX - 50, // Approximate text width offset
        y: centerY - 10, // Approximate text height offset
        xPercent: normalizedPos.xPercent,
        yPercent: normalizedPos.yPercent
      };
    }));
  }, [getNormalizedPosition]);

  const deleteTextLayer = useCallback((id: string) => {
    // Additional safety: Don't delete if user is currently editing
    const layer = textLayers.find(l => l.id === id);
    if (layer?.isEditing) {
      return; // Don't delete while editing
    }
    
    setTextLayers(prev => prev.filter(layer => layer.id !== id));
    if (selectedLayerId === id) {
      setSelectedLayerId(null);
    }
  }, [selectedLayerId, textLayers]);

  const selectTextLayer = useCallback((id: string) => {
    setSelectedLayerId(id);
  }, []);

  const startEditingText = useCallback((id: string) => {
    setTextLayers(prev => prev.map(layer => 
      layer.id === id ? { ...layer, isEditing: true } : { ...layer, isEditing: false }
    ));
  }, []);

  const stopEditingText = useCallback((id: string) => {
    setTextLayers(prev => prev.map(layer => 
      layer.id === id ? { ...layer, isEditing: false } : layer
    ));
  }, []);

  // Safe text update that prevents text from disappearing
  const updateTextContent = useCallback((id: string, newText: string) => {
    setTextLayers(prev => prev.map(layer => {
      if (layer.id === id) {
        // Always preserve the layer, even if text is empty
        return { ...layer, text: newText || '' }; // Ensure text is never undefined/null
      }
      return layer;
    }));
  }, []);

  // Handle keyboard events for text editing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // CRITICAL FIX: Don't handle keyboard events when user is editing text
      if (document.activeElement?.isContentEditable || 
          document.activeElement?.tagName === 'INPUT' || 
          document.activeElement?.tagName === 'TEXTAREA') {
        return; // Let the input handle its own events
      }

      if (selectedLayerId) {
        if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault();
          deleteTextLayer(selectedLayerId);
        } else if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          stopEditingText(selectedLayerId);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          stopEditingText(selectedLayerId);
          setSelectedLayerId(null);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedLayerId, deleteTextLayer, stopEditingText]);

  // FIX: Function to create merged certificate image with consistent dimensions
  const createMergedCertificateImage = async (): Promise<string> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      // Use standard canvas dimensions for consistency
      const canvasWidth = STANDARD_CANVAS_WIDTH;
      const canvasHeight = STANDARD_CANVAS_HEIGHT;
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      // Create a white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      // Load template image if available
      if (selectedTemplate && getTemplateImageUrl(selectedTemplate)) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          // Draw template image
          ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
          
          // Draw text layers using normalized coordinates
          textLayers.forEach(layer => {
            if (layer.text && layer.text.trim()) {
              ctx.font = `${layer.fontWeight} ${layer.fontSize}px ${layer.fontFamily}`;
              ctx.fillStyle = layer.color;
              ctx.textAlign = 'left';
              ctx.textBaseline = 'top';
              
              // Use normalized coordinates for consistent positioning
              const x = layer.xPercent * canvasWidth;
              const y = layer.yPercent * canvasHeight;
              
              ctx.fillText(layer.text, x, y);
            }
          });
          
          // Convert to data URL
          const dataURL = canvas.toDataURL('image/png');
          resolve(dataURL);
        };
        img.onerror = () => {
          // If template image fails to load, just draw text on white background
          textLayers.forEach(layer => {
            if (layer.text && layer.text.trim()) {
              ctx.font = `${layer.fontWeight} ${layer.fontSize}px ${layer.fontFamily}`;
              ctx.fillStyle = layer.color;
              ctx.textAlign = 'left';
              ctx.textBaseline = 'top';
              
              // Use normalized coordinates for consistent positioning
              const x = layer.xPercent * canvasWidth;
              const y = layer.yPercent * canvasHeight;
              
              ctx.fillText(layer.text, x, y);
            }
          });
          
          const dataURL = canvas.toDataURL('image/png');
          resolve(dataURL);
        };
        img.src = getTemplateImageUrl(selectedTemplate)!;
      } else {
        // No template image, just draw text on white background
        textLayers.forEach(layer => {
          if (layer.text && layer.text.trim()) {
            ctx.font = `${layer.fontWeight} ${layer.fontSize}px ${layer.fontFamily}`;
            ctx.fillStyle = layer.color;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            
            // Use normalized coordinates for consistent positioning
            const x = layer.xPercent * canvasWidth;
            const y = layer.yPercent * canvasHeight;
            
            ctx.fillText(layer.text, x, y);
          }
        });
        
        const dataURL = canvas.toDataURL('image/png');
        resolve(dataURL);
      }
    });
  };

  const generatePreview = async () => {
    console.log("🔄 Generate Certificate button clicked!");
    console.log("Current certificate data:", certificateData);
    console.log("Current text layers:", textLayers);
    
    try {
      // Update text layers with current certificate data while preserving positions and normalized coordinates
      const updatedLayers = textLayers.map(layer => {
        switch (layer.id) {
          case 'certificate_no':
            return { ...layer, text: certificateData.certificate_no };
          case 'name':
            return { ...layer, text: certificateData.name || 'Full Name' };
          case 'description':
            return { ...layer, text: certificateData.description };
          case 'issue_date':
            return { ...layer, text: certificateData.issue_date };
          case 'expired_date':
            return { ...layer, text: certificateData.expired_date };
          case 'qr_code':
            return { ...layer, text: certificateData.qr_code };
          default:
            return layer;
        }
      });
      
      setTextLayers(updatedLayers);
      console.log("✅ Preview updated with layers:", updatedLayers);
      
      // Validate required fields
      if (!certificateData.certificate_no.trim() || !certificateData.name.trim() || !certificateData.issue_date) {
        toast.error("Please fill in all required fields (Certificate Number, Name, and Issue Date)");
        return;
      }

      // FIX: Create merged certificate image
      console.log("🎨 Creating merged certificate image...");
      const mergedImageDataUrl = await createMergedCertificateImage();
      console.log("✅ Merged image created:", mergedImageDataUrl.substring(0, 50) + "...");

      // Prepare certificate data for database
      const certificateDataToSave: CreateCertificateData = {
        certificate_no: certificateData.certificate_no.trim(),
        name: certificateData.name.trim(),
        description: certificateData.description.trim() || undefined,
        issue_date: certificateData.issue_date,
        expired_date: certificateData.expired_date || undefined,
        qr_code: certificateData.qr_code.trim() || undefined,
        category: selectedTemplate?.category || undefined,
        template_id: selectedTemplate?.id || undefined,
        text_layers: updatedLayers,
        merged_image: mergedImageDataUrl // FIX: Include merged image
      };

      // Save certificate to database
      const savedCertificate = await createCertificate(certificateDataToSave);
      
      console.log("✅ Certificate saved successfully:", savedCertificate);
      toast.success("Certificate generated and saved successfully!");
      
      // Ask user if they want to view the certificates page
      if (confirm("Certificate saved successfully! Would you like to view all certificates?")) {
        router.push("/certificates");
      }
      
    } catch (error) {
      console.error("❌ Failed to generate certificate:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate certificate");
    }
  };



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
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Loading template...</h1>
              <p className="text-gray-500">Please wait while we load your template.</p>
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
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Template Not Found</h1>
              <Button onClick={() => router.push("/templates")} className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to {t('templates.title')}
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
      <main className="pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Button 
                variant="outline" 
                className="border-gray-300" 
                onClick={() => router.push("/templates")}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to {t('templates.title')}
              </Button>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('generator.title')}</h1>
                <p className="text-gray-500 mt-1">Using template: {selectedTemplate.name}</p>
              </div>
            </div>
          </div>

          {/* Dual Pane Layout - wider left preview (landscape) */}
          <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] lg:grid-cols-[1.7fr_1fr] gap-8 min-h-[720px]">
            {/* Left Section - Certificate Preview */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="bg-white rounded-xl border border-gray-200 shadow-lg p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{t('generator.preview')}</h2>
                  <p className="text-xs text-gray-500 mt-1">
                    Click &quot;Add Text&quot; to add custom text • Double-click text to edit • Drag to move • Press Delete to remove
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
                    className={`border-gray-300 ${snapGridEnabled ? 'bg-blue-50 border-blue-300' : ''}`}
                    onClick={() => setSnapGridEnabled(!snapGridEnabled)}
                    size="sm"
                  >
                    <div className="w-4 h-4 mr-2 grid grid-cols-2 gap-0.5">
                      <div className="w-1 h-1 bg-current rounded-sm"></div>
                      <div className="w-1 h-1 bg-current rounded-sm"></div>
                      <div className="w-1 h-1 bg-current rounded-sm"></div>
                      <div className="w-1 h-1 bg-current rounded-sm"></div>
                    </div>
                    Snap Grid {snapGridEnabled ? 'ON' : 'OFF'}
                  </Button>
                  <Button 
                    variant="outline" 
                    className="border-gray-300" 
                    onClick={generatePreview}
                    size="sm"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </div>
              
              {/* FIX: Certificate Display with consistent aspect ratio */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 xl:p-6 border-2 border-dashed border-blue-200 min-h-[560px] xl:min-h-[680px] flex items-center justify-center">
                <div 
                  ref={canvasRef}
                  className="bg-white rounded-xl shadow-lg relative overflow-hidden"
                  style={{
                    width: '100%',
                    maxWidth: '800px',
                    aspectRatio: '800/600', // FIX: Maintain consistent aspect ratio
                    margin: '0 auto'
                  }}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onClick={(e) => {
                    // Deselect text if clicking on empty area
                    if (e.target === e.currentTarget) {
                      setSelectedLayerId(null);
                    }
                  }}
                >
                  {selectedTemplate && getTemplateImageUrl(selectedTemplate) ? (
                    <img 
                      src={getTemplateImageUrl(selectedTemplate)!} 
                      alt="Certificate Template" 
                      className="absolute inset-0 w-full h-full object-cover" 
                      style={{ objectFit: 'cover' }}
                    />
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
                          <pattern id="grid" width={gridSize} height={gridSize} patternUnits="userSpaceOnUse">
                            <path d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`} fill="none" stroke="rgba(59, 130, 246, 0.2)" strokeWidth="0.5"/>
                          </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#grid)" />
                      </svg>
                    </div>
                  )}

                  {/* FIX: Draggable text layers with consistent positioning */}
                  {textLayers.map((layer) => {
                    // Calculate actual position based on current canvas dimensions
                    const actualX = layer.xPercent * canvasDimensions.width;
                    const actualY = layer.yPercent * canvasDimensions.height;
                    
                    return (
                      <div
                        key={layer.id}
                        className={`absolute select-none group ${selectedLayerId === layer.id ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}`}
                        style={{
                          left: actualX,
                          top: actualY,
                          fontSize: layer.fontSize,
                          color: layer.color,
                          fontWeight: layer.fontWeight,
                          fontFamily: layer.fontFamily,
                          userSelect: 'none',
                          pointerEvents: 'auto',
                          cursor: draggingLayer === layer.id ? 'grabbing' : 'move'
                        }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        selectTextLayer(layer.id);
                        handleMouseDown(e, layer.id);
                      }}
                      onDoubleClick={(e) => {
                        e.preventDefault();
                        startEditingText(layer.id);
                      }}
                    >
                      {layer.isEditing ? (
                        <input
                          type="text"
                          value={layer.text || ''}
                          onChange={(e) => updateTextContent(layer.id, e.target.value)}
                          onBlur={() => stopEditingText(layer.id)}
                          onKeyDown={(e) => {
                            // Stop event propagation to prevent global handlers
                            e.stopPropagation();
                            
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              stopEditingText(layer.id);
                            } else if (e.key === 'Escape') {
                              e.preventDefault();
                              stopEditingText(layer.id);
                            }
                            // Let Backspace and Delete work normally for text editing
                          }}
                          className="bg-transparent border-none outline-none px-1 py-0.5 rounded"
                          style={{
                            fontSize: layer.fontSize,
                            color: layer.color,
                            fontWeight: layer.fontWeight,
                            fontFamily: layer.fontFamily,
                            minWidth: '100px',
                            backgroundColor: 'rgba(59, 130, 246, 0.1)'
                          }}
                          autoFocus
                        />
                      ) : (
                        <div className="relative">
                          <span 
                            className="px-1 py-0.5 rounded"
                            style={{
                              backgroundColor: selectedLayerId === layer.id ? 'rgba(59, 130, 246, 0.1)' : 'transparent'
                            }}
                          >
                            {layer.text || 'Click to edit'}
                          </span>
                          {/* Delete button - only show on hover or when selected */}
                          <button
                            className={`absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs transition-opacity duration-200 flex items-center justify-center ${
                              selectedLayerId === layer.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteTextLayer(layer.id);
                            }}
                            title="Delete text"
                          >
                            ×
                          </button>
                        </div>
                      )}
                    </div>
                    );
                  })}

                  {/* Certificate Content - Only show if no template image and no text layers */}
                  {(!selectedTemplate || !getTemplateImageUrl(selectedTemplate)) && textLayers.length === 0 && (
                    <div className="relative z-10 text-center p-6 xl:p-10">
                      <div className="mb-4 xl:mb-6">
                        <h3 className="text-2xl xl:text-3xl font-bold text-gray-800 mb-2">CERTIFICATE</h3>
                        <div className="w-16 xl:w-20 h-1 bg-gradient-to-r from-blue-500 to-blue-600 mx-auto rounded-full"></div>
                      </div>

                      <p className="text-gray-600 mb-3 xl:mb-4">This is to certify that</p>
                      <h4 className="text-xl xl:text-2xl font-bold text-gray-800 mb-3 xl:mb-4">{certificateData.name}</h4>
                      <p className="text-gray-600 mb-6">
                        has successfully completed the<br />
                        <span className="font-semibold">{certificateData.description}</span>
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
                            <div key={i} className="bg-gray-600 rounded-sm"></div>
                          ))}
                        </div>
                      </div>

                      <p className="text-xs text-gray-500">Verify at: e-certificate.my.id/verify</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Right Section - Input Form */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="bg-white rounded-xl border border-gray-200 shadow-lg p-6"
            >
              <h2 className="text-lg font-semibold text-gray-900 mb-6">{t('generator.recipient')}</h2>
              
              <div className="space-y-4">

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Certificate Number</label>
                  <Input
                    value={certificateData.certificate_no}
                    onChange={(e) => updateCertificateData("certificate_no", e.target.value)}
                    placeholder="Enter certificate number"
                    className="border-gray-300"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Recipient Name</label>
                  <Input
                    value={certificateData.name}
                    onChange={(e) => updateCertificateData("name", e.target.value)}
                    placeholder="Enter recipient name"
                    className="border-gray-300"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    value={certificateData.description}
                    onChange={(e) => updateCertificateData("description", e.target.value)}
                    placeholder="Enter certificate description"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Issue Date</label>
                    <Input
                      type="date"
                      value={certificateData.issue_date}
                      onChange={(e) => updateCertificateData("issue_date", e.target.value)}
                      className="border-gray-300"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Expiry Date (Optional)</label>
                    <Input
                      type="date"
                      value={certificateData.expired_date}
                      onChange={(e) => updateCertificateData("expired_date", e.target.value)}
                      className="border-gray-300"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">QR Code Data</label>
                  <Input
                    value={certificateData.qr_code}
                    onChange={(e) => updateCertificateData("qr_code", e.target.value)}
                    placeholder="Enter QR code data or URL"
                    className="border-gray-300"
                  />
                </div>

                {/* Text Editing Controls */}
                {selectedLayerId && (() => {
                  const selectedLayer = textLayers.find(layer => layer.id === selectedLayerId);
                  if (!selectedLayer) return null;
                  
                  // FIX: Only show editing controls for custom text layers, not system-generated ones
                  const isSystemLayer = ['certificate_no', 'name', 'description', 'issue_date', 'expired_date', 'qr_code'].includes(selectedLayerId);
                  
                  if (isSystemLayer) {
                    return (
                      <div className="space-y-4 pt-4 border-t border-gray-200">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-gray-700">System Text Layer</h3>
                          <span className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
                            Edit via form fields
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                          <p className="font-medium mb-1">This is a system-generated text layer.</p>
                          <p>To edit this text, use the corresponding form fields in the &quot;Recipient Information&quot; section above.</p>
                          {selectedLayerId === 'description' && (
                            <p className="mt-2 text-blue-600">💡 Use the &quot;Description&quot; field above to edit this text.</p>
                          )}
                        </div>
                      </div>
                    );
                  }
                  
                  return (
                    <div className="space-y-4 pt-4 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-gray-700">Edit Selected Text</h3>
                        {selectedLayer?.isEditing ? (
                          <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                            Editing...
                          </span>
                        ) : null}
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Text Content</label>
                        <Input
                          value={selectedLayer.text || ''}
                          onChange={(e) => updateTextContent(selectedLayerId, e.target.value)}
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
                          <label className="text-sm font-medium text-gray-700">Font Family</label>
                          <select
                            value={selectedLayer.fontFamily}
                            onChange={(e) => updateTextLayer(selectedLayerId, { fontFamily: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="Arial">Arial</option>
                            <option value="Times New Roman">Times New Roman</option>
                            <option value="Roboto">Roboto</option>
                            <option value="Montserrat">Montserrat</option>
                            <option value="Open Sans">Open Sans</option>
                            <option value="Lato">Lato</option>
                            <option value="Poppins">Poppins</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">Font Weight</label>
                          <select
                            value={selectedLayer.fontWeight}
                            onChange={(e) => updateTextLayer(selectedLayerId, { fontWeight: e.target.value })}
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
                          <label className="text-sm font-medium text-gray-700">Font Size (px)</label>
                          <Input
                            type="number"
                            value={selectedLayer.fontSize}
                            onChange={(e) => updateTextLayer(selectedLayerId, { fontSize: parseInt(e.target.value) || 16 })}
                            min="8"
                            max="72"
                            className="border-gray-300"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">Text Color</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={selectedLayer.color}
                              onChange={(e) => updateTextLayer(selectedLayerId, { color: e.target.value })}
                              className="w-10 h-8 border border-gray-300 rounded cursor-pointer"
                            />
                            <Input
                              value={selectedLayer.color}
                              onChange={(e) => updateTextLayer(selectedLayerId, { color: e.target.value })}
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
                          onClick={() => centerTextLayer(selectedLayerId)}
                          variant="outline"
                          size="sm"
                          className="flex-1 text-blue-600 border-blue-300 hover:bg-blue-50"
                        >
                          Center
                        </Button>
                        <Button
                          onClick={() => deleteTextLayer(selectedLayerId)}
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
                    disabled={false}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Generate & Save Certificate
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
      
      {/* Toast Notifications */}
      <Toaster position="top-right" richColors />
    </div>
  );
}

