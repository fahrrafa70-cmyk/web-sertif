/**
 * Column Mapping UI Component
 * Allows users to map Excel columns to template score layers
 */

"use client";

import React from 'react';
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { TextLayerConfig } from "@/types/template-layout";
import { CheckCircle2, AlertCircle } from "lucide-react";

interface ColumnMappingUIProps {
  scoreLayers: TextLayerConfig[];
  availableColumns: string[];
  columnMapping: Record<string, string>;
  sampleData?: Record<string, unknown>;
  onChange: (layerId: string, columnName: string) => void;
}

function formatLayerLabel(layerId: string): string {
  return layerId
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function ColumnMappingUI({
  scoreLayers,
  availableColumns,
  columnMapping,
  sampleData,
  onChange
}: ColumnMappingUIProps) {
  // Special value for unmapped state (Radix UI doesn't allow empty string)
  const UNMAPPED_VALUE = '__UNMAPPED__';
  
  // Calculate mapping status
  const mappedCount = Object.values(columnMapping).filter(col => col !== '' && col !== UNMAPPED_VALUE).length;
  const requiredCount = scoreLayers.filter(l => !l.useDefaultText).length;
  
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Map Score Columns
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Pilih column Excel untuk setiap field score template
          </p>
        </div>
        <Badge variant={mappedCount === requiredCount ? "default" : "secondary"}>
          {mappedCount}/{requiredCount} Mapped
        </Badge>
      </div>
      
      {/* Mapping List */}
      <div className="space-y-3">
        {scoreLayers.map((layer, index) => {
          const isDefaultText = layer.useDefaultText;
          const mappedColumn = columnMapping[layer.id] || '';
          // Convert empty string to special value for Select component
          const selectedColumn = mappedColumn === '' ? UNMAPPED_VALUE : mappedColumn;
          const sampleValue = sampleData && mappedColumn && mappedColumn !== UNMAPPED_VALUE ? sampleData[mappedColumn] : null;
          
          return (
            <div
              key={layer.id}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50"
            >
              <div className="flex items-start gap-4">
                {/* Layer Number */}
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-semibold">
                    {index + 1}
                  </div>
                </div>
                
                {/* Layer Info & Mapping */}
                <div className="flex-1 space-y-3">
                  {/* Layer Name */}
                  <div>
                    <Label className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {formatLayerLabel(layer.id)}
                    </Label>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Layer ID: <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">{layer.id}</code>
                    </p>
                  </div>
                  
                  {/* Mapping Select or Default Text Info */}
                  {isDefaultText ? (
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      <span>Uses default text (auto-filled)</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label className="text-xs text-gray-600 dark:text-gray-400">
                        Excel Column:
                      </Label>
                      <Select
                        value={selectedColumn}
                        onValueChange={(value) => {
                          // Convert special value back to empty string for internal state
                          const actualValue = value === UNMAPPED_VALUE ? '' : value;
                          onChange(layer.id, actualValue);
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="<Select Column>" />
                        </SelectTrigger>
                        <SelectContent className="z-[100]">
                          <SelectItem value={UNMAPPED_VALUE}>
                            <span className="text-gray-400 italic">Not Mapped</span>
                          </SelectItem>
                          {availableColumns.map(col => (
                            <SelectItem key={col} value={col}>
                              {col}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      {/* Sample Value Preview */}
                      {mappedColumn && sampleValue !== null && sampleValue !== undefined && (
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-gray-500 dark:text-gray-400">Sample Value:</span>
                          <code className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">
                            {String(sampleValue)}
                          </code>
                        </div>
                      )}
                      
                      {/* Warning if not mapped */}
                      {!mappedColumn && (
                        <div className="flex items-center gap-2 text-xs text-orange-600 dark:text-orange-400">
                          <AlertCircle className="w-3 h-3" />
                          <span>Not mapped - will use default text or be empty</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Status Icon */}
                <div className="flex-shrink-0">
                  {isDefaultText || mappedColumn ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-orange-500" />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
