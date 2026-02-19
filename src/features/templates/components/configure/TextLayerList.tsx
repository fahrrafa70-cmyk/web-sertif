"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Type, Eye, EyeOff, Pencil } from "lucide-react";
import type { TextLayer } from "@/features/templates/hooks/useConfigurePage";

interface TextLayerListProps {
  textLayers: TextLayer[];
  configMode: 'certificate' | 'score';
  selectedLayerId: string | null;
  renamingLayerId: string | null;
  renameValue: string;
  setSelectedLayerId: (id: string | null) => void;
  setSelectedPhotoLayerId: (id: string | null) => void;
  setSelectedQRLayerId: (id: string | null) => void;
  setRenamingLayerId: (id: string | null) => void;
  setRenameValue: (value: string) => void;
  addTextLayer: () => void;
  deleteLayer: (id: string) => void;
  toggleLayerVisibility: (id: string) => void;
  handleLayerDoubleClick: (id: string) => void;
  handleRenameSubmit: (id: string) => void;
  t: (key: string) => string;
}

export function TextLayerList({
  textLayers, configMode, selectedLayerId, renamingLayerId, renameValue,
  setSelectedLayerId, setSelectedPhotoLayerId, setSelectedQRLayerId,
  setRenamingLayerId, setRenameValue, addTextLayer, deleteLayer,
  toggleLayerVisibility, handleLayerDoubleClick, handleRenameSubmit, t
}: TextLayerListProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3 sm:mb-4 gap-2">
        <h2 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 dark:text-gray-100">
          {t('configure.textLayers')} ({textLayers.length})
        </h2>
        <Button variant="outline" size="sm" onClick={addTextLayer} className="h-7 sm:h-8 px-2 sm:px-3 text-xs sm:text-sm">
          <Plus className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
          <span className="hidden sm:inline">{t('configure.addLayer')}</span>
        </Button>
      </div>
      <div className="space-y-2 max-h-48 sm:max-h-64 overflow-y-auto">
        {textLayers.map(layer => {
          const isRequired = configMode === 'certificate'
            ? ['name', 'certificate_no', 'issue_date', 'description'].includes(layer.id)
            : ['issue_date', 'description'].includes(layer.id);
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
                setSelectedQRLayerId(null);
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
                      className="font-medium text-xs sm:text-sm text-gray-900 dark:text-gray-100 truncate cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors group relative flex items-center gap-1"
                      onDoubleClick={() => handleLayerDoubleClick(layer.id)}
                      title="Double-click to rename"
                    >
                      {layer.id}
                      <Pencil className="w-3 h-3 text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    </div>
                  )}
                  <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 truncate">
                    {layer.fontSize}px • {layer.fontFamily}
                  </div>
                </div>
                {isRequired && (
                  <span className="text-[10px] sm:text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 px-1.5 sm:px-2 py-0.5 rounded flex-shrink-0">
                    {t('configure.required')}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {isRequired && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); toggleLayerVisibility(layer.id); }}
                    className={`h-7 w-7 sm:h-8 sm:w-8 p-0 flex-shrink-0 ${
                      layer.visible === false
                        ? 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-400'
                        : 'text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300'
                    }`}
                    title={layer.visible === false ? 'Show layer' : 'Hide layer'}
                  >
                    {layer.visible === false ? <EyeOff className="w-3 h-3 sm:w-4 sm:h-4" /> : <Eye className="w-3 h-3 sm:w-4 sm:h-4" />}
                  </Button>
                )}
                {!isRequired && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); deleteLayer(layer.id); }}
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
  );
}
