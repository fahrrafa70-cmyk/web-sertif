"use client";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Toaster } from "sonner";
import { useConfigurePage } from "@/features/templates/hooks/useConfigurePage";
import { ConfigureHeader } from "@/features/templates/components/configure/ConfigureHeader";
import { CanvasEditor } from "@/features/templates/components/configure/CanvasEditor";
import { TextLayerList } from "@/features/templates/components/configure/TextLayerList";
import { PhotoLayerSection } from "@/features/templates/components/configure/PhotoLayerSection";
import { QRLayerSection } from "@/features/templates/components/configure/QRLayerSection";
import { TextLayerProperties } from "@/features/templates/components/configure/TextLayerProperties";
import { PreviewModal } from "@/features/templates/components/configure/PreviewModal";

function ConfigureLayoutContent() {
  const {
    template, loading, saving, templateImageUrl, templateImageDimensions,
    configMode, setConfigMode,
    textLayers,
    selectedLayerId, setSelectedLayerId,
    renamingLayerId, setRenamingLayerId,
    renameValue, setRenameValue,
    selectedLayer,
    photoLayers,
    selectedPhotoLayerId, setSelectedPhotoLayerId,
    uploadingPhoto,
    qrLayers,
    selectedQRLayerId, setSelectedQRLayerId,
    previewTexts, setPreviewTexts,
    richTextSelection, setRichTextSelection,
    canvasRef, canvasScale,
    isDesktop, isTablet,
    previewModalOpen, setPreviewModalOpen,
    imagesLoaded,
    handleLayerPointerDown, handleResizePointerDown, handleQRResizePointerDown,
    handlePhotoLayerMouseDown, handleQRLayerMouseDown,
    updateLayer,
    addTextLayer, deleteLayer, toggleLayerVisibility,
    handlePhotoUpload, updatePhotoLayer, deletePhotoLayer,
    addQRCodeLayer, updateQRLayer, deleteQRLayer,
    handleSave,
    handleLayerDoubleClick, handleRenameSubmit,
    t, router,
  } = useConfigurePage();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">{t('configure.loading')}</p>
        </div>
      </div>
    );
  }

  if (!template) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 text-gray-900 dark:text-gray-100">
      <ConfigureHeader
        templateName={template.name}
        saving={saving}
        onBack={() => router.push("/templates")}
        onSave={handleSave}
        onPreview={() => setPreviewModalOpen(true)}
        t={t}
      />

      {/* Main Content */}
      <div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 pt-14 sm:pt-16">
        <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
          <div className="flex flex-col lg:flex-row lg:items-start gap-3 sm:gap-4">

            {/* Canvas Editor */}
            <div
              className="lg:flex-1 lg:w-2/3 lg:self-start order-1 lg:order-1 fixed lg:static top-20 sm:top-24 left-0 right-0 lg:left-auto lg:right-auto z-20 lg:z-auto bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 lg:bg-transparent pb-3 lg:pb-0 shadow-md lg:shadow-none overflow-hidden lg:overflow-visible px-3 sm:px-4 md:px-6 lg:px-0 pt-2 lg:pt-0 rounded-b-2xl lg:rounded-none"
            >
              <CanvasEditor
                template={template}
                templateImageUrl={templateImageUrl}
                templateImageDimensions={templateImageDimensions}
                textLayers={textLayers}
                photoLayers={photoLayers}
                qrLayers={qrLayers}
                selectedLayerId={selectedLayerId}
                selectedPhotoLayerId={selectedPhotoLayerId}
                selectedQRLayerId={selectedQRLayerId}
                canvasRef={canvasRef}
                canvasScale={canvasScale}
                isDesktop={isDesktop}
                isTablet={isTablet}
                configMode={configMode}
                imagesLoaded={imagesLoaded}
                previewTexts={previewTexts}
                setSelectedLayerId={setSelectedLayerId}
                setSelectedPhotoLayerId={setSelectedPhotoLayerId}
                setSelectedQRLayerId={setSelectedQRLayerId}
                handleLayerPointerDown={handleLayerPointerDown}
                handleResizePointerDown={handleResizePointerDown}
                handleQRResizePointerDown={handleQRResizePointerDown}
                handlePhotoLayerMouseDown={handlePhotoLayerMouseDown}
                handleQRLayerMouseDown={handleQRLayerMouseDown}
              />
            </div>

            {/* Configuration Panel */}
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
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      <PreviewModal
        open={previewModalOpen}
        onOpenChange={setPreviewModalOpen}
        template={template}
        templateImageUrl={templateImageUrl}
        templateImageDimensions={templateImageDimensions}
        textLayers={textLayers}
        previewTexts={previewTexts}
        t={t}
      />

      <Toaster />
    </div>
  );
}

export default function ConfigurePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <ConfigureLayoutContent />
    </Suspense>
  );
}
