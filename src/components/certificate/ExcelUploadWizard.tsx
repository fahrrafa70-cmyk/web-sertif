/**
 * Excel Upload Component for Wizard
 * Handles Excel file parsing and validation
 */

import React, { useRef } from 'react';
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, Upload, CheckCircle, AlertCircle } from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/language-context";

interface ExcelUploadWizardProps {
  onDataLoaded: (data: Array<Record<string, unknown>>) => void;
  dataCount: number;
  templateFields?: Array<{ id: string; text?: string; useDefaultText?: boolean; }>;
}

export function ExcelUploadWizard({ onDataLoaded, dataCount, templateFields = [] }: ExcelUploadWizardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useLanguage();

  const parseExcelFile = async (file: File): Promise<Array<Record<string, unknown>>> => {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    return XLSX.utils.sheet_to_json(worksheet, { defval: "" }) as Array<Record<string, unknown>>;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await parseExcelFile(file);
      
      if (data.length === 0) {
        toast.error(t('excelWizard.emptyOrInvalid'));
        return;
      }

      // Validate required columns
      const firstRow = data[0];
      const hasName = 'name' in firstRow || 'nama' in firstRow;
      
      if (!hasName) {
        toast.error(t('excelWizard.nameColumnRequired'));
        return;
      }

      onDataLoaded(data);
      toast.success(t('excelWizard.loadedCount').replace('{count}', String(data.length)));
    } catch (error) {
      console.error('Excel parse error:', error);
      toast.error(t('excelWizard.readFailed'));
    }
  };

  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 text-center transition-colors hover:border-gray-400 dark:hover:border-gray-600">
        <FileSpreadsheet className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        
        <div className="space-y-4">
          <div>
            <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              {t('excelWizard.uploadTitle')}
            </h4>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              {t('excelWizard.uploadSubtitle')}
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileUpload}
            className="hidden"
          />
          
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="mx-auto"
          >
            <Upload className="w-4 h-4 mr-2" />
            {t('excelWizard.chooseFile')}
          </Button>
        </div>
      </div>

      {/* Upload Status */}
      {dataCount > 0 && (
        <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
            <div>
              <p className="text-green-800 dark:text-green-200 font-medium">
                {t('excelWizard.uploadSuccessTitle')}
              </p>
              <p className="text-green-700 dark:text-green-300 text-sm">
                {t('excelWizard.uploadSuccessDescription').replace('{count}', String(dataCount))}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Format Guide */}
      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-blue-800 dark:text-blue-200 font-medium mb-2">
              {t('excelWizard.formatTitle')}
            </p>
            <ul className="text-blue-700 dark:text-blue-300 text-sm space-y-1">
              <li>• {t('excelWizard.certificateNoNote')}</li>
              {templateFields.length > 0 && (
                <>
                  <li className="pt-1 font-medium">• {t('excelWizard.templateColumnsTitle')}</li>
                  {templateFields.map((field) => (
                    <li key={field.id} className="ml-4">
                      • Kolom <strong>{field.id}</strong>
                    </li>
                  ))}
                </>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
