"use client";
import { Suspense } from "react";
import { Toaster } from "sonner";
import { useConfigurePage } from "@/features/templates/hooks/useConfigurePage";
import { ConfigureHeader } from "@/features/templates/components/configure/ConfigureHeader";
import { CanvasEditor } from "@/features/templates/components/configure/CanvasEditor";
import { PreviewModal } from "@/features/templates/components/configure/PreviewModal";
import { ConfigureLoading } from "@/features/templates/components/configure/ConfigureLoading";
import { ConfigureSidebar } from "@/features/templates/components/configure/ConfigureSidebar";

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

  if (loading) return <ConfigureLoading t={t} />;
  if (!template) return null;

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

            {/* Configuration Panel Sidebar */}
            <ConfigureSidebar
              template={template}
              templateImageDimensions={templateImageDimensions}
              configMode={configMode}
              setConfigMode={setConfigMode}
              isDesktop={isDesktop}
              textLayers={textLayers}
              selectedLayerId={selectedLayerId}
              renamingLayerId={renamingLayerId}
              renameValue={renameValue}
              selectedLayer={selectedLayer}
              setSelectedLayerId={setSelectedLayerId}
              setRenamingLayerId={setRenamingLayerId}
              setRenameValue={setRenameValue}
              addTextLayer={addTextLayer}
              deleteLayer={deleteLayer}
              toggleLayerVisibility={toggleLayerVisibility}
              handleLayerDoubleClick={handleLayerDoubleClick}
              handleRenameSubmit={handleRenameSubmit}
              richTextSelection={richTextSelection}
              setRichTextSelection={setRichTextSelection}
              updateLayer={updateLayer}
              setPreviewTexts={setPreviewTexts}
              photoLayers={photoLayers}
              selectedPhotoLayerId={selectedPhotoLayerId}
              setSelectedPhotoLayerId={setSelectedPhotoLayerId}
              uploadingPhoto={uploadingPhoto}
              handlePhotoUpload={handlePhotoUpload}
              updatePhotoLayer={updatePhotoLayer}
              deletePhotoLayer={deletePhotoLayer}
              qrLayers={qrLayers}
              selectedQRLayerId={selectedQRLayerId}
              setSelectedQRLayerId={setSelectedQRLayerId}
              addQRCodeLayer={addQRCodeLayer}
              updateQRLayer={updateQRLayer}
              deleteQRLayer={deleteQRLayer}
              t={t}
            />

          </div>
        </div>
      </div>

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
