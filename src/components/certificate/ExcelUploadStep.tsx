/**
 * Excel Upload Step Component
 * Handles progressive upload for single or dual template Excel files
 */

import React, { useRef } from 'react';
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, FileText, CheckCircle } from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";

interface ExcelUploadStepProps {
  isDualTemplate: boolean;
  mainData: Array<Record<string, unknown>>;
  scoreData: Array<Record<string, unknown>>;
  onMainUpload: (data: Array<Record<string, unknown>>) => void;
  onScoreUpload: (data: Array<Record<string, unknown>>) => void;
}

export function ExcelUploadStep({
  isDualTemplate,
  mainData,
  scoreData,
  onMainUpload,
  onScoreUpload
}: ExcelUploadStepProps) {
  const mainInputRef = useRef<HTMLInputElement>(null);
  const scoreInputRef = useRef<HTMLInputElement>(null);

  const parseExcelFile = async (file: File): Promise<Array<Record<string, unknown>>> => {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    return XLSX.utils.sheet_to_json(worksheet, { defval: "" }) as Array<Record<string, unknown>>;
  };

  const handleMainExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await parseExcelFile(file);
      onMainUpload(data);
      toast.success(`✓ ${data.length} baris data dimuat`);
    } catch (error) {
      console.error('Excel parse error:', error);
      toast.error('Gagal membaca file Excel');
    }
  };

  const handleScoreExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await parseExcelFile(file);
      onScoreUpload(data);
      toast.success(`✓ ${data.length} baris data back side dimuat`);
    } catch (error) {
      console.error('Excel parse error:', error);
      toast.error('Gagal membaca file Excel back side');
    }
  };

  // Show main upload area if no data uploaded yet
  if (mainData.length === 0) {
    return (
      <div className="space-y-4">
        {/* Info Box */}
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm text-blue-900 dark:text-blue-100 font-medium mb-2">
            📋 Penting: Pastikan Field Excel Sesuai Template
          </p>
          <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
            Jika template memiliki <span className="font-semibold">custom data</span> (text layer tambahan), 
            pastikan kolom/field pada file Excel Anda sudah sesuai dengan data yang dibutuhkan template. 
            Periksa nama kolom Excel agar cocok dengan field yang ada di template.
          </p>
        </div>

        {/* Upload Area */}
        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
          <FileSpreadsheet className="w-12 h-12 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
          <input
            ref={mainInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleMainExcelUpload}
            className="hidden"
          />
          <Button
            variant="outline"
            onClick={() => mainInputRef.current?.click()}
            className="mb-2"
          >
            Pilih File Excel
          </Button>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Unggah file .xlsx atau .xls
          </p>
        </div>
      </div>
    );
  }

  // Main data uploaded - show success and optionally score upload for dual template
  return (
    <div className="space-y-4">
      {/* Main Data Success */}
      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-500 dark:bg-blue-600 flex items-center justify-center text-white">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="font-medium text-blue-900 dark:text-blue-100">
              {isDualTemplate ? 'Front Side' : 'Excel Data Berhasil Dimuat'}
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              {mainData.length} baris data
            </p>
          </div>
        </div>
      </div>

      {/* Score Upload for Dual Template */}
      {isDualTemplate && scoreData.length === 0 && (
        <div className="border-2 border-dashed border-yellow-300 rounded-lg p-8 text-center">
          <FileText className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
          <input
            ref={scoreInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleScoreExcelUpload}
            className="hidden"
          />
          <Button
            variant="outline"
            onClick={() => scoreInputRef.current?.click()}
            className="mb-2 border-yellow-500 text-yellow-700 hover:bg-yellow-50"
          >
            Pilih File Excel Back Side
          </Button>
          <p className="text-sm text-gray-500">
            Unggah file .xlsx atau .xls untuk back side
          </p>
        </div>
      )}

      {/* Both Uploaded (Dual Template) */}
      {isDualTemplate && scoreData.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500 dark:bg-blue-600 flex items-center justify-center text-white">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="font-medium text-blue-900 dark:text-blue-100">
                Back Side
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                {scoreData.length} baris data
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Row Count Mismatch Warning */}
      {isDualTemplate && 
       mainData.length > 0 && 
       scoreData.length > 0 && 
       mainData.length !== scoreData.length && (
        <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            ⚠️ Jumlah baris tidak sama! 
            <br />
            Front Side: {mainData.length} baris, Back Side: {scoreData.length} baris
            <br />
            Pastikan urutan data sesuai.
          </p>
        </div>
      )}
    </div>
  );
}
