import { Button } from "@/components/ui/button";
import { TextLayerList } from "@/features/templates/components/configure/TextLayerList";
import { PhotoLayerSection } from "@/features/templates/components/configure/PhotoLayerSection";
import { QRLayerSection } from "@/features/templates/components/configure/QRLayerSection";
import { TextLayerProperties } from "@/features/templates/components/configure/TextLayerProperties";
import type { Template } from "@/lib/supabase/templates";
import type { TextLayer } from "@/features/templates/hooks/useConfigurePage";
import type { PhotoLayerConfig, QRCodeLayerConfig } from "@/types/template-layout";

interface ConfigureSidebarProps {
  template: Template;
  templateImageDimensions: { width: number; height: number } | null;
  configMode: "certificate" | "score";
  setConfigMode: (mode: "certificate" | "score") => void;
  isDesktop: boolean;
  
  textLayers: TextLayer[];
  selectedLayerId: string | null;
  renamingLayerId: string | null;
  renameValue: string;
  selectedLayer: TextLayer | undefined;
  setSelectedLayerId: (id: string | null) => void;
  setRenamingLayerId: (id: string | null) => void;
  setRenameValue: (val: string) => void;
  addTextLayer: () => void;
  deleteLayer: (id: string) => void;
  toggleLayerVisibility: (id: string) => void;
  handleLayerDoubleClick: (id: string) => void;
  handleRenameSubmit: (oldId: string) => void;
  richTextSelection: { start: number; end: number };
  setRichTextSelection: (sel: { start: number; end: number }) => void;
  updateLayer: (id: string, updates: Partial<TextLayer>) => void;
  setPreviewTexts: React.Dispatch<React.SetStateAction<Record<string, string>>>;

  photoLayers: PhotoLayerConfig[];
  selectedPhotoLayerId: string | null;
  setSelectedPhotoLayerId: (id: string | null) => void;
  uploadingPhoto: boolean;
  handlePhotoUpload: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  updatePhotoLayer: (id: string, updates: Partial<PhotoLayerConfig>) => void;
  deletePhotoLayer: (id: string) => void;

  qrLayers: QRCodeLayerConfig[];
  selectedQRLayerId: string | null;
  setSelectedQRLayerId: (id: string | null) => void;
  addQRCodeLayer: () => void;
  updateQRLayer: (id: string, updates: Partial<QRCodeLayerConfig>) => void;
  deleteQRLayer: (id: string) => void;

  t: (key: string) => string;
}

export function ConfigureSidebar({
  template,
  templateImageDimensions,
  configMode,
  setConfigMode,
  isDesktop,
  
  textLayers,
  selectedLayerId,
  renamingLayerId,
  renameValue,
  selectedLayer,
  setSelectedLayerId,
  setRenamingLayerId,
  setRenameValue,
  addTextLayer,
  deleteLayer,
  toggleLayerVisibility,
  handleLayerDoubleClick,
  handleRenameSubmit,
  richTextSelection,
  setRichTextSelection,
  updateLayer,
  setPreviewTexts,

  photoLayers,
  selectedPhotoLayerId,
  setSelectedPhotoLayerId,
  uploadingPhoto,
  handlePhotoUpload,
  updatePhotoLayer,
  deletePhotoLayer,

  qrLayers,
  selectedQRLayerId,
  setSelectedQRLayerId,
  addQRCodeLayer,
  updateQRLayer,
  deleteQRLayer,

  t,
}: ConfigureSidebarProps) {
  return (
    <div
      className="lg:w-1/3 lg:flex-shrink-0 order-2 lg:order-2 fixed lg:static lg:top-auto left-0 right-0 lg:left-auto lg:right-auto bottom-0 lg:bottom-auto z-10 lg:z-auto px-3 sm:px-4 md:px-6 lg:px-0"
      style={{
        top: isDesktop ? 'auto' : (templateImageDimensions && templateImageDimensions.height > templateImageDimensions.width
          ? 'calc(55vh + 6.5rem)'
          : 'calc(38vh + 5.5rem)')
      }}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-800 pt-3 sm:pt-4 md:pt-6 px-3 sm:px-4 md:px-6 pb-3 space-y-4 sm:space-y-6 lg:sticky lg:top-24 lg:h-auto lg:p-6 lg:space-y-6 h-auto lg:max-h-[calc(100vh-8rem)] overflow-y-auto"
        style={{
          maxHeight: isDesktop ? 'calc(100vh - 8rem)' : (templateImageDimensions && templateImageDimensions.height > templateImageDimensions.width
            ? 'calc(100vh - 55vh - 6.5rem)'
            : 'calc(100vh - 38vh - 5.5rem)')
        }}
      >
        {/* Mode Switcher - Only for dual templates */}
        {template.is_dual_template && (
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 mb-4">
            <Button
              variant={configMode === 'certificate' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setConfigMode('certificate')}
              className={`flex-1 h-8 px-3 text-sm ${configMode === 'certificate' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
            >
              {t('configure.front')}
            </Button>
            <Button
              variant={configMode === 'score' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setConfigMode('score')}
              className={`flex-1 h-8 px-3 text-sm ${configMode === 'score' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
            >
              {t('configure.back')}
            </Button>
          </div>
        )}

        {/* Text Layers List */}
        <TextLayerList
          textLayers={textLayers}
          configMode={configMode}
          selectedLayerId={selectedLayerId}
          renamingLayerId={renamingLayerId}
          renameValue={renameValue}
          setSelectedLayerId={setSelectedLayerId}
          setSelectedPhotoLayerId={setSelectedPhotoLayerId}
          setSelectedQRLayerId={setSelectedQRLayerId}
          setRenamingLayerId={setRenamingLayerId}
          setRenameValue={setRenameValue}
          addTextLayer={addTextLayer}
          deleteLayer={deleteLayer}
          toggleLayerVisibility={toggleLayerVisibility}
          handleLayerDoubleClick={handleLayerDoubleClick}
          handleRenameSubmit={handleRenameSubmit}
          t={t}
        />

        {/* Text Layer Properties */}
        {selectedLayer && (
          <TextLayerProperties
            selectedLayer={selectedLayer}
            templateImageDimensions={templateImageDimensions}
            richTextSelection={richTextSelection}
            setRichTextSelection={setRichTextSelection}
            updateLayer={updateLayer}
            setPreviewTexts={setPreviewTexts}
            t={t}
          />
        )}

        {/* Photo Layers */}
        <PhotoLayerSection
          photoLayers={photoLayers}
          selectedPhotoLayerId={selectedPhotoLayerId}
          uploadingPhoto={uploadingPhoto}
          templateImageDimensions={templateImageDimensions}
          setSelectedPhotoLayerId={setSelectedPhotoLayerId}
          setSelectedLayerId={setSelectedLayerId}
          setSelectedQRLayerId={setSelectedQRLayerId}
          handlePhotoUpload={handlePhotoUpload}
          updatePhotoLayer={updatePhotoLayer}
          deletePhotoLayer={deletePhotoLayer}
          t={t}
        />

        {/* QR Code Layers */}
        <QRLayerSection
          qrLayers={qrLayers}
          selectedQRLayerId={selectedQRLayerId}
          templateImageDimensions={templateImageDimensions}
          setSelectedQRLayerId={setSelectedQRLayerId}
          setSelectedLayerId={setSelectedLayerId}
          setSelectedPhotoLayerId={setSelectedPhotoLayerId}
          addQRCodeLayer={addQRCodeLayer}
          updateQRLayer={updateQRLayer}
          deleteQRLayer={deleteQRLayer}
          t={t}
        />
      </div>
    </div>
  );
}
