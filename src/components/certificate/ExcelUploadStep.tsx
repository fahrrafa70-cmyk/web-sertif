/**
 * Excel Upload Step Component
 * Handles progressive upload for single or dual template Excel files
 */

import React, { useRef } from 'react';
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, Award, CheckCircle } from "lucide-react";
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
      toast.success(`✓ ${data.length} baris data nilai dimuat`);
    } catch (error) {
      console.error('Excel parse error:', error);
      toast.error('Gagal membaca file Excel nilai');
    }
  };

  // Show main upload area if no data uploaded yet
  if (mainData.length === 0) {
    return (
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
        <FileSpreadsheet className="w-12 h-12 mx-auto mb-4 text-gray-400" />
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
        <p className="text-sm text-gray-500">
          Unggah file .xlsx atau .xls
        </p>
      </div>
    );
  }

  // Main data uploaded - show success and optionally score upload for dual template
  return (
    <div className="space-y-4">
      {/* Main Data Success */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="font-medium text-green-900">
              {isDualTemplate ? 'Excel Data Utama' : 'Excel Data Berhasil Dimuat'}
            </p>
            <p className="text-sm text-green-700">
              📄 {mainData.length} baris data
            </p>
          </div>
        </div>
      </div>

      {/* Score Upload for Dual Template */}
      {isDualTemplate && scoreData.length === 0 && (
        <div className="border-2 border-dashed border-yellow-300 rounded-lg p-8 text-center">
          <Award className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
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
            Pilih File Excel Data Nilai
          </Button>
          <p className="text-sm text-gray-500">
            Unggah file .xlsx atau .xls dengan data nilai
          </p>
        </div>
      )}

      {/* Both Uploaded (Dual Template) */}
      {isDualTemplate && scoreData.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="font-medium text-green-900">
                Excel Data Nilai
              </p>
              <p className="text-sm text-green-700">
                🏆 {scoreData.length} baris data
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
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-sm text-yellow-800">
            ⚠️ Jumlah baris tidak sama! 
            <br />
            Data Utama: {mainData.length} baris, Data Nilai: {scoreData.length} baris
            <br />
            Pastikan urutan data sesuai.
          </p>
        </div>
      )}
    </div>
  );
}
