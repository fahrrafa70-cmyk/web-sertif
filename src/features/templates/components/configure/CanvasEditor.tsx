"use client";
import Image from "next/image";
import { STANDARD_CANVAS_WIDTH, STANDARD_CANVAS_HEIGHT } from "@/lib/constants/canvas";
import { DUMMY_DATA } from "@/features/templates/hooks/useConfigurePage";
import { logPreviewPositioning } from "@/lib/debug/positioning-debug";
import { QrCode } from "lucide-react";
import { supabaseClient } from "@/lib/supabase/client";
import type { TextLayerConfig, PhotoLayerConfig, QRCodeLayerConfig } from "@/types/template-layout";
import type { Template } from "@/lib/supabase/templates";

// Get QR preview image URL from storage
function getQRPreviewUrl(): string {
  const { data } = supabaseClient.storage.from('templates').getPublicUrl('qr/QR.png');
  return data.publicUrl;
}

interface CanvasEditorProps {
  template: Template;
  templateImageUrl: string | null;
  templateImageDimensions: { width: number; height: number } | null;
  textLayers: TextLayerConfig[];
  photoLayers: PhotoLayerConfig[];
  qrLayers: QRCodeLayerConfig[];
  selectedLayerId: string | null;
  selectedPhotoLayerId: string | null;
  selectedQRLayerId: string | null;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  canvasScale: number;
  isDesktop: boolean;
  isTablet: boolean;
  configMode: 'certificate' | 'score';
  imagesLoaded: { certificate: boolean; score: boolean };
  previewTexts: Record<string, string>;
  setSelectedLayerId: (id: string | null) => void;
  setSelectedPhotoLayerId: (id: string | null) => void;
  setSelectedQRLayerId: (id: string | null) => void;
  handleLayerPointerDown: (id: string, e: React.PointerEvent) => void;
  handleResizePointerDown: (id: string, e: React.PointerEvent, direction: "right" | "left" | "top" | "bottom" | "corner") => void;
  handleQRResizePointerDown: (id: string, e: React.PointerEvent, direction: "right" | "left" | "top" | "bottom" | "corner") => void;
  handlePhotoLayerMouseDown: (id: string, e: React.MouseEvent) => void;
  handleQRLayerMouseDown: (id: string, e: React.MouseEvent) => void;
}

export function CanvasEditor({
  template, templateImageUrl, templateImageDimensions,
  textLayers, photoLayers, qrLayers,
  selectedLayerId, selectedPhotoLayerId, selectedQRLayerId,
  canvasRef, canvasScale, isDesktop, isTablet, configMode, imagesLoaded, previewTexts,
  setSelectedLayerId, setSelectedPhotoLayerId, setSelectedQRLayerId,
  handleLayerPointerDown, handleResizePointerDown, handleQRResizePointerDown,
  handlePhotoLayerMouseDown, handleQRLayerMouseDown,
}: CanvasEditorProps) {
  return (
    <div
      className="lg:flex-1 order-1 lg:order-1 relative"
      style={{
        maxHeight: isDesktop
          ? (templateImageDimensions && templateImageDimensions.height > templateImageDimensions.width ? '900px' : '600px')
          : (templateImageDimensions && templateImageDimensions.height > templateImageDimensions.width ? '55vh' : '38vh'),
        height: isDesktop ? 'fit-content' : 'auto',
        alignSelf: isDesktop ? 'flex-start' : 'auto'
      }}
    >
      <div
        className={`bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-800 p-2 sm:p-3 md:p-4 lg:p-6 overflow-visible ${
          !templateImageDimensions || (templateImageDimensions && templateImageDimensions.height > templateImageDimensions.width)
            ? 'w-full lg:max-w-[650px] lg:mx-auto'
            : 'w-full'
        }`}
        style={{ height: isDesktop ? 'fit-content' : '100%', flexShrink: 0 }}
      >
        {/* Loading skeleton */}
        {!templateImageDimensions && (
          <div className="animate-pulse">
            <div className="bg-gray-200 dark:bg-gray-800 rounded-lg mx-auto" style={{ aspectRatio: '3/4', maxHeight: '800px', width: 'auto' }}>
              <div className="flex items-center justify-center h-full">
                <div className="text-gray-400 dark:text-gray-600">Loading preview...</div>
              </div>
            </div>
          </div>
        )}

        {/* Canvas wrapper - maintains aspect ratio */}
        {templateImageDimensions && (
          <div
            ref={canvasRef}
            className="relative overflow-visible mx-auto transition-opacity duration-300 ease-in-out"
            style={{
              aspectRatio: `${templateImageDimensions.width}/${templateImageDimensions.height}`,
              maxHeight: isDesktop && templateImageDimensions.height > templateImageDimensions.width ? '800px' : 'none',
              width: isDesktop && templateImageDimensions.height > templateImageDimensions.width ? 'auto' : '100%',
              transform: !isDesktop && templateImageDimensions.height > templateImageDimensions.width ? 'scale(0.92)' : 'none',
              transformOrigin: 'top center'
            }}
          >
            {/* Inner canvas */}
            <div
              className="absolute top-0 left-0 border-2 border-gray-300 dark:border-gray-700 rounded-lg bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 overflow-hidden"
              style={{
                width: isDesktop ? `${templateImageDimensions.width}px` : '100%',
                height: isDesktop ? `${templateImageDimensions.height}px` : '100%',
                transform: isDesktop ? `scale(${canvasScale})` : 'none',
                transformOrigin: 'top left',
                cursor: 'default',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                MozUserSelect: 'none',
                msUserSelect: 'none',
              }}
              onClick={() => {
                setSelectedLayerId(null);
                setSelectedPhotoLayerId(null);
                setSelectedQRLayerId(null);
              }}
            >
              {/* Template Background */}
              {templateImageUrl && (
                <div className="absolute inset-0" style={{ userSelect: 'none', pointerEvents: 'none' }}>
                  {template.certificate_image_url && (
                    <div className={`absolute inset-0 transition-opacity duration-300 ease-in-out ${
                      configMode === 'certificate' && imagesLoaded.certificate ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}>
                      <Image src={template.certificate_image_url} alt={`${template.name} - Certificate`}
                        fill className="object-contain" style={{ userSelect: 'none', pointerEvents: 'none' }}
                        unoptimized draggable={false} priority={configMode === 'certificate'} />
                    </div>
                  )}
                  {template.score_image_url && (
                    <div className={`absolute inset-0 transition-opacity duration-300 ease-in-out ${
                      configMode === 'score' && imagesLoaded.score ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}>
                      <Image src={template.score_image_url} alt={`${template.name} - Score`}
                        fill className="object-contain" style={{ userSelect: 'none', pointerEvents: 'none' }}
                        unoptimized draggable={false} priority={configMode === 'score'} />
                    </div>
                  )}
                  {((configMode === 'certificate' && !imagesLoaded.certificate) || (configMode === 'score' && !imagesLoaded.score)) && (
                    <div className="absolute inset-0 bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                      <div className="animate-pulse text-gray-400 dark:text-gray-500 text-sm">Loading {configMode} image...</div>
                    </div>
                  )}
                  {(!template.certificate_image_url || !template.score_image_url) && (
                    <div className="absolute inset-0">
                      <Image src={templateImageUrl} alt={`${template.name} - ${configMode}`}
                        fill className="object-contain" style={{ userSelect: 'none', pointerEvents: 'none' }}
                        unoptimized draggable={false} priority />
                    </div>
                  )}
                </div>
              )}

              {/* Text Layers */}
              {textLayers.filter((layer) => layer.visible !== false).map((layer) => {
                const plainText = previewTexts[layer.id] || layer.defaultText || DUMMY_DATA[layer.id as keyof typeof DUMMY_DATA] || layer.id;
                const isSelected = selectedLayerId === layer.id;
                const templateWidth = templateImageDimensions.width;
                const templateHeight = templateImageDimensions.height;
                const layerXPercent = layer.xPercent !== undefined && layer.xPercent !== null ? layer.xPercent : layer.x / STANDARD_CANVAS_WIDTH;
                const layerYPercent = layer.yPercent !== undefined && layer.yPercent !== null ? layer.yPercent : layer.y / STANDARD_CANVAS_HEIGHT;
                const leftPercent = layerXPercent * 100;
                const topPercent = layerYPercent * 100;

                const renderText = () => {
                  if (layer.richText && layer.hasInlineFormatting) {
                    const templateScale = templateWidth / STANDARD_CANVAS_WIDTH;
                    const domScale = isDesktop ? templateScale : templateScale * canvasScale;
                    return (layer.richText as Array<{ text: string; fontWeight?: string; fontStyle?: string; fontSize?: number; fontFamily?: string; color?: string; textDecoration?: string }>).map((span, idx) => {
                      const style = span.fontStyle || layer.fontStyle || 'normal';
                      const isDecoration = style === 'underline' || style === 'line-through' || style === 'overline';
                      return (
                        <span key={idx} style={{
                          fontWeight: span.fontWeight || layer.fontWeight,
                          fontFamily: span.fontFamily || layer.fontFamily,
                          fontSize: span.fontSize ? `${span.fontSize * domScale}px` : undefined,
                          color: span.color || layer.color,
                          fontStyle: isDecoration ? 'normal' : style,
                          textDecoration: isDecoration ? style : (span.textDecoration || layer.textDecoration || 'none')
                        }}>{span.text}</span>
                      );
                    });
                  }
                  return plainText;
                };

                const getTransform = () => {
                  const isSpecialLayer = layer.id === 'certificate_no' || layer.id === 'issue_date';
                  const isNilaiPrestasiLayer = configMode === 'score' && ['Nilai / Prestasi'].includes(layer.id) && (layer.textAlign === 'left' || !layer.textAlign);
                  const isKompetensiLayer = configMode === 'score' &&
                    (layer.id === 'kompetensi' || layer.id === 'Kompetensi' || layer.id.toLowerCase().includes('kompetensi')) &&
                    !layer.id.toLowerCase().includes('nilai') && (layer.textAlign === 'left' || !layer.textAlign);

                  if (isSpecialLayer || isNilaiPrestasiLayer || isKompetensiLayer) {
                    if (isTablet && (layer.id === 'certificate_no' || layer.id === 'issue_date')) {
                      let tabletHorizontalOffset = 0;
                      let tabletVerticalOffset = -50;
                      if (canvasScale < 1.0) {
                        const iPadProScale = 0.948;
                        const relativeScaleDiff = iPadProScale - canvasScale;
                        tabletHorizontalOffset = -0.1 + (-(relativeScaleDiff * 2));
                        if (layer.id === 'issue_date') {
                          tabletVerticalOffset = -50 + (0.05 + relativeScaleDiff * 1);
                        }
                      } else if (canvasScale > 1.0) {
                        tabletHorizontalOffset = (canvasScale - 1.0) * 1;
                      }
                      return `translate(${tabletHorizontalOffset}%, ${tabletVerticalOffset}%)`;
                    }
                    if (!isDesktop && !isTablet) {
                      let mobileVerticalOffset = -50;
                      let mobileHorizontalOffset = 0;
                      if (canvasScale < 1.0) {
                        const scaleDifference = 1.0 - canvasScale;
                        if (layer.id === 'issue_date' && configMode === 'certificate') {
                          mobileVerticalOffset = -45 + (scaleDifference * 2.5);
                          mobileHorizontalOffset = -(scaleDifference * 2);
                        } else if (layer.id === 'issue_date' && configMode === 'score') {
                          mobileVerticalOffset = -49.5 + (scaleDifference * 2.5);
                          mobileHorizontalOffset = -(scaleDifference * 5);
                        } else if (layer.id === 'certificate_no') {
                          mobileVerticalOffset = -40 - (scaleDifference * 1);
                          mobileHorizontalOffset = -2 - (scaleDifference * 1);
                        } else if (isNilaiPrestasiLayer) {
                          mobileVerticalOffset = -10 - (scaleDifference * 40);
                          mobileHorizontalOffset = 10 - (scaleDifference * 15);
                        } else if (isKompetensiLayer) {
                          mobileVerticalOffset = -50 - (scaleDifference * 3);
                          mobileHorizontalOffset = -1 - (scaleDifference * 1);
                        }
                      } else if (canvasScale > 1.0) {
                        const scaleDifference = canvasScale - 1.0;
                        mobileVerticalOffset = -50 + (scaleDifference * 10);
                        mobileHorizontalOffset = scaleDifference * 5;
                      }
                      return `translate(${mobileHorizontalOffset}%, ${mobileVerticalOffset}%)`;
                    }
                    return 'translate(0%, -50%)';
                  }
                  switch (layer.textAlign) {
                    case 'center': return 'translate(-50%, -50%)';
                    case 'right': return 'translate(-100%, -50%)';
                    default: return 'translate(0%, -50%)';
                  }
                };

                if (layer.id === 'certificate_no' || layer.id === 'issue_date' || layer.id === 'Nilai / Prestasi') {
                  logPreviewPositioning(layer.id, layer, { width: templateWidth, height: templateHeight }, getTransform());
                }

                const isSpecialNoWrap = layer.id === 'certificate_no' || layer.id === 'issue_date' || (configMode === 'score' && layer.id === 'Nilai / Prestasi');
                const templateScale = templateWidth / STANDARD_CANVAS_WIDTH;
                const domScale = isDesktop ? templateScale : templateScale * canvasScale;
                let widthCompensation = 1;
                if (!isDesktop && layer.maxWidth) {
                  widthCompensation = layer.id === 'description' ? 1.06 : 1.035;
                }

                return (
                  <div key={layer.id} className="absolute" style={{ left: `${leftPercent}%`, top: `${topPercent}%`, transform: getTransform(), zIndex: isSelected ? 10 : 1 }}>
                    <div
                      className={`relative cursor-move transition-all ${isSelected ? 'bg-blue-50/30' : 'before:content-[""] before:absolute before:inset-[-12px] before:z-[-1]'}`}
                      style={{
                        fontSize: `${layer.fontSize * domScale}px`,
                        width: layer.maxWidth ? `${layer.maxWidth * domScale * widthCompensation}px` : 'auto',
                        maxWidth: layer.maxWidth ? `${layer.maxWidth * domScale * widthCompensation}px` : 'none',
                        minHeight: `${(layer.fontSize * (layer.lineHeight || 1.2)) * domScale}px`,
                        letterSpacing: layer.letterSpacing ? `${layer.letterSpacing * domScale}px` : undefined,
                        color: layer.color, fontWeight: layer.fontWeight, fontFamily: layer.fontFamily,
                        fontStyle: (() => { const s = layer.fontStyle || 'normal'; return ['underline','line-through','overline'].includes(s) ? 'normal' : s; })(),
                        textDecoration: (() => { const s = layer.fontStyle || 'normal'; return ['underline','line-through','overline'].includes(s) ? s : (layer.textDecoration || 'none'); })(),
                        textAlign: isSpecialNoWrap ? 'left' : (layer.textAlign || 'left'),
                        whiteSpace: isSpecialNoWrap ? 'nowrap' : (layer.maxWidth ? 'normal' : 'nowrap'),
                        lineHeight: layer.lineHeight || 1.2,
                        textOverflow: isSpecialNoWrap ? 'ellipsis' : 'clip',
                        overflow: isSpecialNoWrap ? 'hidden' : 'visible',
                        wordWrap: isSpecialNoWrap ? 'normal' : 'break-word',
                        overflowWrap: isSpecialNoWrap ? 'normal' : 'break-word',
                        userSelect: 'none', padding: '0px',
                        border: isSelected ? '5px dashed #3b82f6' : '5px dashed transparent',
                        borderRadius: '4px', boxSizing: 'border-box',
                        boxShadow: isSelected ? '0 0 0 1px rgba(59, 130, 246, 0.2)' : 'none',
                        touchAction: 'none', WebkitTouchCallout: 'none', WebkitUserSelect: 'none',
                        cursor: isSelected ? 'move' : 'pointer', position: 'relative',
                      }}
                      onClick={(e) => { e.stopPropagation(); setSelectedLayerId(layer.id); setSelectedPhotoLayerId(null); setSelectedQRLayerId(null); }}
                      onPointerDown={(e) => {
                        if (!isSelected) { e.stopPropagation(); setSelectedLayerId(layer.id); setSelectedPhotoLayerId(null); setSelectedQRLayerId(null); }
                        else { handleLayerPointerDown(layer.id, e); }
                      }}
                    >
                      {renderText()}
                    </div>
                    {isSelected && (
                      <>
                        <div className="absolute top-0 -right-2 w-4 h-full cursor-ew-resize" style={{ userSelect: 'none', touchAction: 'none' }} onPointerDown={(e) => handleResizePointerDown(layer.id, e, 'right')} />
                        <div className="absolute -bottom-2 left-0 h-4 w-full cursor-ns-resize" style={{ userSelect: 'none', touchAction: 'none' }} onPointerDown={(e) => handleResizePointerDown(layer.id, e, 'bottom')} />
                        <div className="absolute -bottom-2 -right-2 w-4 h-4 cursor-nwse-resize group" style={{ userSelect: 'none', touchAction: 'none' }} onPointerDown={(e) => handleResizePointerDown(layer.id, e, 'corner')}>
                          <div className="w-2 h-2 bg-blue-500 rounded-full absolute bottom-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="absolute -bottom-2 -left-2 w-4 h-4 cursor-nesw-resize group" style={{ userSelect: 'none', touchAction: 'none' }} onPointerDown={(e) => handleResizePointerDown(layer.id, e, 'corner')}>
                          <div className="w-2 h-2 bg-blue-500 rounded-full absolute bottom-0 left-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="absolute -top-2 -right-2 w-4 h-4 cursor-nesw-resize group" style={{ userSelect: 'none', touchAction: 'none' }} onPointerDown={(e) => handleResizePointerDown(layer.id, e, 'corner')}>
                          <div className="w-2 h-2 bg-blue-500 rounded-full absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="absolute -top-2 -left-2 w-4 h-4 cursor-nwse-resize group" style={{ userSelect: 'none', touchAction: 'none' }} onPointerDown={(e) => handleResizePointerDown(layer.id, e, 'corner')}>
                          <div className="w-2 h-2 bg-blue-500 rounded-full absolute top-0 left-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="absolute top-0 -left-2 w-4 h-full cursor-ew-resize" style={{ userSelect: 'none', touchAction: 'none' }} onPointerDown={(e) => handleResizePointerDown(layer.id, e, 'left')} />
                        <div className="absolute -top-2 left-0 h-4 w-full cursor-ns-resize" style={{ userSelect: 'none', touchAction: 'none' }} onPointerDown={(e) => handleResizePointerDown(layer.id, e, 'top')} />
                      </>
                    )}
                  </div>
                );
              })}

              {/* Photo Layers */}
              {photoLayers.sort((a, b) => a.zIndex - b.zIndex).map(layer => {
                const layerXPercent = layer.xPercent !== undefined && layer.xPercent !== null ? layer.xPercent : layer.x! / STANDARD_CANVAS_WIDTH;
                const layerYPercent = layer.yPercent !== undefined && layer.yPercent !== null ? layer.yPercent : layer.y! / STANDARD_CANVAS_HEIGHT;
                const leftPercent = layerXPercent * 100;
                const topPercent = layerYPercent * 100;
                const widthPercent = layer.widthPercent * 100;
                const heightPercent = layer.heightPercent * 100;
                const isSelected = selectedPhotoLayerId === layer.id;
                const getMaskStyle = () => {
                  if (!layer.mask || layer.mask.type === 'none') return {};
                  if (layer.mask.type === 'circle' || layer.mask.type === 'ellipse') return { borderRadius: '50%' };
                  if (layer.mask.type === 'roundedRect') return { borderRadius: layer.mask.borderRadius ? `${layer.mask.borderRadius}px` : '8px' };
                  return {};
                };
                return (
                  <div key={layer.id} className="absolute" style={{
                    left: `${leftPercent}%`, top: `${topPercent}%`, width: `${widthPercent}%`, height: `${heightPercent}%`,
                    transform: `rotate(${layer.rotation}deg)`, opacity: layer.opacity, zIndex: layer.zIndex,
                    cursor: isSelected ? 'move' : 'pointer'
                  }}
                    onClick={(e) => { e.stopPropagation(); setSelectedPhotoLayerId(layer.id); setSelectedLayerId(null); setSelectedQRLayerId(null); }}
                    onMouseDown={(e) => {
                      if (!isSelected) { e.stopPropagation(); setSelectedPhotoLayerId(layer.id); setSelectedLayerId(null); setSelectedQRLayerId(null); }
                      else { handlePhotoLayerMouseDown(layer.id, e); }
                    }}
                  >
                    <Image src={layer.src} alt={layer.id} fill style={{ width: '100%', height: '100%', objectFit: layer.fitMode, ...getMaskStyle(), userSelect: 'none', pointerEvents: 'none' }} draggable={false} />
                    {isSelected && (
                      <div style={{ position: 'absolute', inset: -2, border: '2px solid #a855f7', borderRadius: layer.mask?.type === 'circle' || layer.mask?.type === 'ellipse' ? '50%' : layer.mask?.type === 'roundedRect' ? '8px' : '0', pointerEvents: 'none' }} />
                    )}
                  </div>
                );
              })}

              {/* QR Code Layers */}
              {qrLayers.sort((a, b) => a.zIndex - b.zIndex).map(layer => {
                const layerXPercent = layer.xPercent !== undefined && layer.xPercent !== null ? layer.xPercent : layer.x! / STANDARD_CANVAS_WIDTH;
                const layerYPercent = layer.yPercent !== undefined && layer.yPercent !== null ? layer.yPercent : layer.y! / STANDARD_CANVAS_HEIGHT;
                const leftPercent = layerXPercent * 100;
                const topPercent = layerYPercent * 100;
                const widthPercent = layer.widthPercent * 100;
                const heightPercent = layer.heightPercent * 100;
                const isSelected = selectedQRLayerId === layer.id;
                return (
                  <div key={layer.id} className="absolute flex items-center justify-center" style={{
                    left: `${leftPercent}%`, top: `${topPercent}%`, width: `${widthPercent}%`, height: `${heightPercent}%`,
                    transform: `rotate(${layer.rotation}deg)`, opacity: layer.opacity, zIndex: layer.zIndex,
                    cursor: isSelected ? 'move' : 'pointer', backgroundColor: '#FFFFFF',
                    border: isSelected ? '3px solid #3b82f6' : '1px solid #e5e7eb'
                  }}
                    onClick={(e) => { e.stopPropagation(); setSelectedQRLayerId(layer.id); setSelectedLayerId(null); setSelectedPhotoLayerId(null); }}
                    onMouseDown={(e) => {
                      if (!isSelected) { e.stopPropagation(); setSelectedQRLayerId(layer.id); setSelectedLayerId(null); setSelectedPhotoLayerId(null); }
                      else { handleQRLayerMouseDown(layer.id, e); }
                    }}
                  >
                    <Image src={getQRPreviewUrl()} alt="QR Code Preview" width={200} height={200} className="w-full h-full object-contain p-1"
                      style={{ opacity: layer.opacity, transform: `rotate(${layer.rotation}deg)` }}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const fallback = target.nextElementSibling as HTMLElement;
                        if (fallback) fallback.style.display = 'flex';
                      }}
                    />
                    <div className="flex flex-col items-center justify-center w-full h-full p-2" style={{ display: 'none' }}>
                      <QrCode className="w-1/2 h-1/2 text-black" />
                      <span className="text-[8px] mt-1 font-mono text-black">QR Code</span>
                    </div>
                    {isSelected && (
                      <div style={{ position: 'absolute', inset: -2, border: '2px dashed #3b82f6', borderRadius: '4px', pointerEvents: 'none' }} />
                    )}
                    {isSelected && (
                      <>
                        <div className="absolute -bottom-3 -right-3 w-6 h-6 cursor-nwse-resize group" style={{ userSelect: 'none', touchAction: 'none', zIndex: 1000 }} onPointerDown={(e) => handleQRResizePointerDown(layer.id, e, 'corner')}>
                          <div className="w-3 h-3 bg-blue-500 rounded-full absolute bottom-0 right-0 border-2 border-white shadow-md" />
                        </div>
                        <div className="absolute -bottom-3 -left-3 w-6 h-6 cursor-nesw-resize group" style={{ userSelect: 'none', touchAction: 'none', zIndex: 1000 }} onPointerDown={(e) => handleQRResizePointerDown(layer.id, e, 'corner')}>
                          <div className="w-3 h-3 bg-blue-500 rounded-full absolute bottom-0 left-0 border-2 border-white shadow-md" />
                        </div>
                        <div className="absolute -top-3 -right-3 w-6 h-6 cursor-nesw-resize group" style={{ userSelect: 'none', touchAction: 'none', zIndex: 1000 }} onPointerDown={(e) => handleQRResizePointerDown(layer.id, e, 'corner')}>
                          <div className="w-3 h-3 bg-blue-500 rounded-full absolute top-0 right-0 border-2 border-white shadow-md" />
                        </div>
                        <div className="absolute -top-3 -left-3 w-6 h-6 cursor-nwse-resize group" style={{ userSelect: 'none', touchAction: 'none', zIndex: 1000 }} onPointerDown={(e) => handleQRResizePointerDown(layer.id, e, 'corner')}>
                          <div className="w-3 h-3 bg-blue-500 rounded-full absolute top-0 left-0 border-2 border-white shadow-md" />
                        </div>
                        <div className="absolute top-0 -right-2 w-4 h-full cursor-ew-resize" style={{ userSelect: 'none', touchAction: 'none', zIndex: 999 }} onPointerDown={(e) => handleQRResizePointerDown(layer.id, e, 'right')} />
                        <div className="absolute top-0 -left-2 w-4 h-full cursor-ew-resize" style={{ userSelect: 'none', touchAction: 'none', zIndex: 999 }} onPointerDown={(e) => handleQRResizePointerDown(layer.id, e, 'left')} />
                        <div className="absolute -bottom-2 left-0 h-4 w-full cursor-ns-resize" style={{ userSelect: 'none', touchAction: 'none', zIndex: 999 }} onPointerDown={(e) => handleQRResizePointerDown(layer.id, e, 'bottom')} />
                        <div className="absolute -top-2 left-0 h-4 w-full cursor-ns-resize" style={{ userSelect: 'none', touchAction: 'none', zIndex: 999 }} onPointerDown={(e) => handleQRResizePointerDown(layer.id, e, 'top')} />
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
