"use client";

/**
 * Template Layout Configuration Page with Full Drag-Drop Interface
 * Allows visual configuration of text layers with drag, resize, and font customization
 */

import { Suspense, useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Plus, Trash2, Type, Check, X, AlignLeft, AlignCenter, AlignRight, AlignJustify } from "lucide-react";
import { getTemplate, getTemplateImageUrl, saveTemplateLayout, getTemplateLayout } from "@/lib/supabase/templates";
import { Template } from "@/lib/supabase/templates";
import { toast, Toaster } from "sonner";
import type { TemplateLayoutConfig, TextLayerConfig } from "@/types/template-layout";
import { STANDARD_CANVAS_WIDTH, STANDARD_CANVAS_HEIGHT } from "@/lib/constants/canvas";
import Image from "next/image";

// Dummy data for preview
const DUMMY_DATA = {
  name: "John Doe",
  certificate_no: "CERT-2025-001",
  issue_date: "30 October 2025",
  expired_date: "30 October 2028",
  description: "For outstanding achievement"
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
  
  // Text layers state
  const [textLayers, setTextLayers] = useState<TextLayer[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [draggedLayerId, setDraggedLayerId] = useState<string | null>(null);
  const [renamingLayerId, setRenamingLayerId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  
  // Canvas ref
  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasScale, setCanvasScale] = useState(1);

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
        
        // Load template image
        const imgUrl = await getTemplateImageUrl(tpl);
        setTemplateImageUrl(imgUrl);
        
        // Load existing layout if available
        const existingLayout = await getTemplateLayout(templateId);
        if (existingLayout && existingLayout.certificate) {
          console.log('📦 Loading existing layout configuration');
          setTextLayers(existingLayout.certificate.textLayers as TextLayer[]);
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
    const defaultLayers: TextLayer[] = [
      {
        id: "name",
        x: 400,
        y: 300,
        xPercent: 400 / STANDARD_CANVAS_WIDTH,
        yPercent: 300 / STANDARD_CANVAS_HEIGHT,
        fontSize: 48,
        color: "#000000",
        fontWeight: "bold",
        fontFamily: "Arial",
        textAlign: "center"
      },
      {
        id: "certificate_no",
        x: 100,
        y: 100,
        xPercent: 100 / STANDARD_CANVAS_WIDTH,
        yPercent: 100 / STANDARD_CANVAS_HEIGHT,
        fontSize: 24,
        color: "#000000",
        fontWeight: "normal",
        fontFamily: "Arial",
        textAlign: "left"
      },
      {
        id: "issue_date",
        x: 100,
        y: 500,
        xPercent: 100 / STANDARD_CANVAS_WIDTH,
        yPercent: 500 / STANDARD_CANVAS_HEIGHT,
        fontSize: 20,
        color: "#000000",
        fontWeight: "normal",
        fontFamily: "Arial",
        textAlign: "left"
      }
    ];
    setTextLayers(defaultLayers);
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

  // Handle text layer drag
  const handleLayerMouseDown = (layerId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedLayerId(layerId);
    setDraggedLayerId(layerId);
    
    const layer = textLayers.find(l => l.id === layerId);
    if (!layer || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const canvasRect = canvas.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const startLayerX = layer.x;
    const startLayerY = layer.y;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = (moveEvent.clientX - startX) / canvasScale;
      const deltaY = (moveEvent.clientY - startY) / canvasScale;
      
      const newX = Math.max(0, Math.min(STANDARD_CANVAS_WIDTH, startLayerX + deltaX));
      const newY = Math.max(0, Math.min(STANDARD_CANVAS_HEIGHT, startLayerY + deltaY));

      setTextLayers(prev => prev.map(l => 
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
      ));
    };

    const handleMouseUp = () => {
      setDraggedLayerId(null);
      setTextLayers(prev => prev.map(l => ({ ...l, isDragging: false })));
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Update text layer property
  const updateLayer = (layerId: string, updates: Partial<TextLayer>) => {
    setTextLayers(prev => prev.map(l => 
      l.id === layerId ? { ...l, ...updates } : l
    ));
  };

  // Add new text layer
  const addTextLayer = () => {
    const newId = `custom_${Date.now()}`;
    const newLayer: TextLayer = {
      id: newId,
      x: 200,
      y: 200,
      xPercent: 200 / STANDARD_CANVAS_WIDTH,
      yPercent: 200 / STANDARD_CANVAS_HEIGHT,
      fontSize: 24,
      color: "#000000",
      fontWeight: "normal",
      fontFamily: "Arial",
      textAlign: "left"
    };
    setTextLayers(prev => [...prev, newLayer]);
    setSelectedLayerId(newId);
    toast.success("New text layer added");
  };

  // Delete text layer
  const deleteLayer = (layerId: string) => {
    // Prevent deleting required fields
    const requiredFields = ['name', 'certificate_no', 'issue_date'];
    if (requiredFields.includes(layerId)) {
      toast.error("Cannot delete required field");
      return;
    }
    
    setTextLayers(prev => prev.filter(l => l.id !== layerId));
    if (selectedLayerId === layerId) {
      setSelectedLayerId(null);
    }
    toast.success("Text layer deleted");
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
          textLayers: textLayers.map(({ isDragging, isEditing, ...layer }) => layer)
        },
        canvas: {
          width: STANDARD_CANVAS_WIDTH,
          height: STANDARD_CANVAS_HEIGHT
        },
        version: "1.0",
        lastSavedAt: new Date().toISOString()
      };

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
    
    // Check if new ID already exists
    if (textLayers.some(l => l.id === renameValue && l.id !== oldId)) {
      toast.error('Layer ID already exists');
      return;
    }
    
    // Update layer ID
    setTextLayers(prev => prev.map(l => 
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading template...</p>
        </div>
      </div>
    );
  }

  if (!template) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 fixed top-0 left-0 right-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/templates")}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Templates
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Configure Layout: {template.name}
                </h1>
                <p className="text-sm text-gray-500">
                  Drag text layers to position them on the template
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={addTextLayer}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Text Layer
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="gradient-primary text-white"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Layout
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8 mt-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Canvas Preview */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Template Preview (Drag to Position)
              </h2>
              <div 
                ref={canvasRef}
                className="relative border-2 border-gray-300 rounded-lg bg-gray-50 overflow-hidden"
                style={{ 
                  aspectRatio: `${STANDARD_CANVAS_WIDTH}/${STANDARD_CANVAS_HEIGHT}`,
                  cursor: 'default'
                }}
                onClick={() => setSelectedLayerId(null)}
              >
                {/* Template Background */}
                {templateImageUrl && (
                  <div className="absolute inset-0">
                    <Image
                      src={templateImageUrl}
                      alt={template.name}
                      fill
                      className="object-contain pointer-events-none"
                      unoptimized
                    />
                  </div>
                )}
                
                {/* Text Layers */}
                {textLayers.map(layer => {
                  const text = DUMMY_DATA[layer.id as keyof typeof DUMMY_DATA] || layer.id;
                  const isSelected = selectedLayerId === layer.id;
                  
                  return (
                    <div
                      key={layer.id}
                      className={`absolute cursor-move transition-all ${
                        isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''
                      } ${layer.isDragging ? 'opacity-70' : ''}`}
                      style={{
                        left: `${(layer.x / STANDARD_CANVAS_WIDTH) * 100}%`,
                        top: `${(layer.y / STANDARD_CANVAS_HEIGHT) * 100}%`,
                        transform: 'translate(-50%, -50%)',
                        fontSize: `${layer.fontSize * canvasScale}px`,
                        color: layer.color,
                        fontWeight: layer.fontWeight,
                        fontFamily: layer.fontFamily,
                        textAlign: layer.textAlign || 'left',
                        whiteSpace: 'nowrap',
                        userSelect: 'none',
                        zIndex: isSelected ? 10 : 1
                      }}
                      onMouseDown={(e) => handleLayerMouseDown(layer.id, e)}
                    >
                      {text}
                      {isSelected && (
                        <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                          {layer.id}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="text-sm text-gray-500 mt-4">
                💡 <strong>Tip:</strong> Click and drag text to reposition. Select a layer to edit its properties in the right panel.
              </p>
            </div>
          </div>

          {/* Configuration Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
              {/* Text Layers List */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Text Layers ({textLayers.length})
                </h2>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {textLayers.map(layer => {
                    const isRequired = ['name', 'certificate_no', 'issue_date'].includes(layer.id);
                    const isSelected = selectedLayerId === layer.id;
                    
                    return (
                      <div
                        key={layer.id}
                        className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          isSelected 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setSelectedLayerId(layer.id)}
                      >
                        <div className="flex items-center gap-2 flex-1">
                          <Type className="w-4 h-4 text-gray-400" />
                          <div className="flex-1">
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
                                className="h-6 text-sm"
                              />
                            ) : (
                              <div 
                                className="font-medium text-sm"
                                onDoubleClick={() => handleLayerDoubleClick(layer.id)}
                              >
                                {layer.id}
                              </div>
                            )}
                            <div className="text-xs text-gray-500">
                              {layer.fontSize}px • {layer.fontFamily}
                            </div>
                          </div>
                          {isRequired && (
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
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
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Layer Properties */}
              {selectedLayer && (
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">
                    Layer Properties: {selectedLayer.id}
                  </h3>
                  <div className="space-y-4">
                    {/* Position */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">X Position</Label>
                        <Input
                          type="number"
                          value={selectedLayer.x}
                          onChange={(e) => updateLayer(selectedLayer.id, { 
                            x: parseInt(e.target.value) || 0,
                            xPercent: (parseInt(e.target.value) || 0) / STANDARD_CANVAS_WIDTH
                          })}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Y Position</Label>
                        <Input
                          type="number"
                          value={selectedLayer.y}
                          onChange={(e) => updateLayer(selectedLayer.id, { 
                            y: parseInt(e.target.value) || 0,
                            yPercent: (parseInt(e.target.value) || 0) / STANDARD_CANVAS_HEIGHT
                          })}
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>

                    {/* Font Size */}
                    <div>
                      <Label className="text-xs">Font Size</Label>
                      <Input
                        type="number"
                        value={selectedLayer.fontSize}
                        onChange={(e) => updateLayer(selectedLayer.id, { fontSize: parseInt(e.target.value) || 12 })}
                        className="h-8 text-sm"
                      />
                    </div>

                    {/* Font Family */}
                    <div>
                      <Label className="text-xs">Font Family</Label>
                      <Select 
                        value={selectedLayer.fontFamily} 
                        onValueChange={(value) => updateLayer(selectedLayer.id, { fontFamily: value })}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Arial">Arial</SelectItem>
                          <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                          <SelectItem value="Courier New">Courier New</SelectItem>
                          <SelectItem value="Georgia">Georgia</SelectItem>
                          <SelectItem value="Verdana">Verdana</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Font Weight */}
                    <div>
                      <Label className="text-xs">Font Weight</Label>
                      <Select 
                        value={selectedLayer.fontWeight} 
                        onValueChange={(value) => updateLayer(selectedLayer.id, { fontWeight: value })}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="bold">Bold</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Color */}
                    <div>
                      <Label className="text-xs">Color</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={selectedLayer.color}
                          onChange={(e) => updateLayer(selectedLayer.id, { color: e.target.value })}
                          className="h-8 w-16"
                        />
                        <Input
                          type="text"
                          value={selectedLayer.color}
                          onChange={(e) => updateLayer(selectedLayer.id, { color: e.target.value })}
                          className="h-8 flex-1 text-sm"
                        />
                      </div>
                    </div>

                    {/* Text Align */}
                    <div>
                      <Label className="text-xs">Text Align</Label>
                      <Select 
                        value={selectedLayer.textAlign || 'left'} 
                        onValueChange={(value: 'left' | 'center' | 'right' | 'justify') => updateLayer(selectedLayer.id, { textAlign: value })}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="left">
                            <div className="flex items-center gap-2">
                              <AlignLeft className="w-4 h-4" />
                              Left
                            </div>
                          </SelectItem>
                          <SelectItem value="center">
                            <div className="flex items-center gap-2">
                              <AlignCenter className="w-4 h-4" />
                              Center
                            </div>
                          </SelectItem>
                          <SelectItem value="right">
                            <div className="flex items-center gap-2">
                              <AlignRight className="w-4 h-4" />
                              Right
                            </div>
                          </SelectItem>
                          <SelectItem value="justify">
                            <div className="flex items-center gap-2">
                              <AlignJustify className="w-4 h-4" />
                              Justify
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              {/* Validation */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">
                  Validation
                </h3>
                <div className="space-y-2 text-sm">
                  {['name', 'certificate_no', 'issue_date'].map(fieldId => {
                    const exists = textLayers.some(l => l.id === fieldId);
                    return (
                      <div key={fieldId} className="flex items-center gap-2">
                        {exists ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <X className="w-4 h-4 text-red-500" />
                        )}
                        <span className={exists ? 'text-gray-700' : 'text-red-600'}>
                          {fieldId.replace(/_/g, ' ')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Toaster position="top-right" richColors />
    </div>
  );
}

export default function ConfigureLayoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading configuration...</p>
        </div>
      </div>
    }>
      <ConfigureLayoutContent />
    </Suspense>
  );
}
