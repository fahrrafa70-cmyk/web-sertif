/**
 * Column Mapping Step Component
 * Maps Excel columns to template text layers with auto-mapping support
 */

import React, { useMemo } from 'react';
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { FileSpreadsheet, Award, ArrowRight } from "lucide-react";
import { TextLayerConfig } from "@/types/template-layout";
import { formatFieldLabel } from "@/lib/utils/excel-mapping";

interface ColumnMappingStepProps {
  isDualTemplate: boolean;
  dataSource: 'excel' | 'member';
  // Main data mapping
  mainColumns: string[];
  mainLayers: TextLayerConfig[];
  mainMapping: Record<string, string>;
  mainPreviewData: Record<string, unknown>;
  onMainMappingChange: (mapping: Record<string, string>) => void;
  // Score data mapping (for dual template) 
  scoreColumns?: string[];
  scoreLayers?: TextLayerConfig[];
  scoreMapping?: Record<string, string>;
  scorePreviewData?: Record<string, unknown>;
  onScoreMappingChange?: (mapping: Record<string, string>) => void;
}

function MappingRow({
  layer,
  excelColumns,
  selectedColumn,
  previewData,
  onSelect
}: {
  layer: TextLayerConfig;
  excelColumns: string[];
  selectedColumn: string;
  previewData: Record<string, unknown>;
  onSelect: (column: string) => void;
}) {
  return (
    <div className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
      {/* Text Layer */}
      <div className="w-1/3">
        <Label className="font-medium text-sm">
          {formatFieldLabel(layer.id)}
          <span className="text-red-500 ml-1">*</span>
        </Label>
      </div>

      {/* Arrow */}
      <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />

      {/* Excel Column Selector */}
      <div className="flex-1">
        <Select 
          value={selectedColumn || '__none__'} 
          onValueChange={(value) => {
            // Convert __none__ back to empty string
            onSelect(value === '__none__' ? '' : value);
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Pilih kolom Excel..." />
          </SelectTrigger>
          <SelectContent position="popper" className="z-[9999] max-h-[300px]">
            <SelectItem value="__none__">-- Tidak dipetakan --</SelectItem>
            {excelColumns.map(col => (
              <SelectItem key={col} value={col}>
                <div className="flex flex-col">
                  <span className="font-medium">{col}</span>
                  {previewData[col] !== undefined && (
                    <span className="text-xs text-gray-500">
                      Contoh: {String(previewData[col]).substring(0, 30)}
                      {String(previewData[col]).length > 30 ? '...' : ''}
                    </span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Match Indicator */}
      {selectedColumn && (
        <Badge variant="default" className="bg-green-500 text-white flex-shrink-0">
          ✓
        </Badge>
      )}
    </div>
  );
}

export function ColumnMappingStep({
  isDualTemplate,
  dataSource,
  mainColumns,
  mainLayers,
  mainMapping,
  mainPreviewData,
  onMainMappingChange,
  scoreColumns = [],
  scoreLayers = [],
  scoreMapping = {},
  scorePreviewData = {},
  onScoreMappingChange
}: ColumnMappingStepProps) {
  // For Excel mode, show ALL layers without filtering
  // For Member mode, apply filtering rules
  // Use useMemo to ensure re-computation when dependencies change
  const mappableMainLayers = useMemo(() => {
    if (dataSource === 'excel') {
      return mainLayers;
    }
    
    return mainLayers.filter(layer => {
      // Exclude auto-generated fields
      if (['certificate_no', 'issue_date', 'expired_date'].includes(layer.id)) {
        return false;
      }
      
      // Exclude layers with useDefaultText=true
      if (layer.useDefaultText === true) {
        return false;
      }
      
      return true;
    });
  }, [dataSource, mainLayers]);

  const mappedMainCount = Object.keys(mainMapping).filter(k => mainMapping[k]).length;
  const mappedScoreCount = Object.keys(scoreMapping).filter(k => scoreMapping[k]).length;

  if (!isDualTemplate) {
    // Single mapping for non-dual template
    return (
      <div className="space-y-4">
        {/* Auto-mapping info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-800">
            ✨ Auto-mapping menemukan {mappedMainCount}/{mappableMainLayers.length} kolom
          </p>
        </div>

        {/* Mapping rows */}
        <div className="space-y-3">
          {mappableMainLayers.map(layer => (
            <MappingRow
              key={layer.id}
              layer={layer}
              excelColumns={mainColumns}
              selectedColumn={mainMapping[layer.id] || ''}
              previewData={mainPreviewData}
              onSelect={(col) => {
                onMainMappingChange({ ...mainMapping, [layer.id]: col });
              }}
            />
          ))}
        </div>

        {/* Preview */}
        {Object.keys(mainMapping).length > 0 && (
          <div className="mt-6 border rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
            <h4 className="font-semibold mb-3">Preview Data (Baris 1):</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              {Object.entries(mainMapping)
                .filter(([, col]) => col)
                .map(([layerId, excelCol]) => (
                  <div key={layerId} className="flex gap-2">
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      {formatFieldLabel(layerId)}:
                    </span>
                    <span className="text-gray-600 dark:text-gray-400">
                      {String(mainPreviewData[excelCol] || '-')}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Dual template - show tabs
  return (
    <div className="space-y-4">
      <Tabs defaultValue="main" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="main" className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4" />
            Data Utama ({mappedMainCount}/{mappableMainLayers.length})
          </TabsTrigger>
          <TabsTrigger value="score" className="flex items-center gap-2">
            <Award className="w-4 h-4" />
            Data Nilai ({mappedScoreCount}/{scoreLayers.length})
          </TabsTrigger>
        </TabsList>

        {/* Main Data Mapping */}
        <TabsContent value="main" className="space-y-4 mt-4">

          <div className="space-y-3">
            {mappableMainLayers.map(layer => (
              <MappingRow
                key={layer.id}
                layer={layer}
                excelColumns={mainColumns}
                selectedColumn={mainMapping[layer.id] || ''}
                previewData={mainPreviewData}
                onSelect={(col) => {
                  onMainMappingChange({ ...mainMapping, [layer.id]: col });
                }}
              />
            ))}
          </div>
        </TabsContent>

        {/* Score Data Mapping */}
        <TabsContent value="score" className="space-y-4 mt-4">

          <div className="space-y-3">
            {scoreLayers.map(layer => (
              <MappingRow
                key={layer.id}
                layer={layer}
                excelColumns={scoreColumns}
                selectedColumn={scoreMapping[layer.id] || ''}
                previewData={scorePreviewData}
                onSelect={(col) => {
                  onScoreMappingChange?.({ ...scoreMapping, [layer.id]: col });
                }}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
