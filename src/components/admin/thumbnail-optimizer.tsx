"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Image, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { toast } from 'sonner';

interface ThumbnailOptimizerProps {
  className?: string;
}

interface RegenerationResult {
  success: boolean;
  processed: number;
  errors: number;
  total: number;
  results?: Array<{
    id: string;
    name: string;
    thumbnails_created?: string[];
    error?: string;
    success: boolean;
  }>;
}

export function ThumbnailOptimizer({ className }: ThumbnailOptimizerProps) {
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<RegenerationResult | null>(null);

  const handleRegenerateThumbnails = async () => {
    setIsRegenerating(true);
    setProgress(0);
    setResult(null);

    try {
      toast.info('🔄 Memulai regenerasi thumbnail untuk template yang sudah ada...');
      
      const response = await fetch('/api/regenerate-thumbnails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        setResult(data);
        setProgress(100);
        toast.success(`✅ Berhasil! ${data.processed} template dioptimasi, ${data.errors} error`);
      } else {
        throw new Error(data.error || 'Regenerasi thumbnail gagal');
      }
    } catch (error) {
      console.error('Error regenerating thumbnails:', error);
      toast.error(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Image className="w-5 h-5" />
          Optimisasi Thumbnail Template
        </CardTitle>
        <CardDescription>
          Buat thumbnail terkompresi untuk template yang sudah ada agar loading lebih cepat
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Info Box */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                Mengapa perlu regenerasi thumbnail?
              </p>
              <ul className="text-blue-700 dark:text-blue-300 space-y-1">
                <li>• Template lama masih menggunakan gambar full resolution</li>
                <li>• Thumbnail terkompresi mengurangi ukuran file 90-95%</li>
                <li>• Loading menjadi 80-85% lebih cepat</li>
                <li>• Menghemat bandwidth dan meningkatkan UX</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-3">
          <Button
            onClick={handleRegenerateThumbnails}
            disabled={isRegenerating}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isRegenerating ? 'animate-spin' : ''}`} />
            {isRegenerating ? 'Memproses...' : 'Regenerasi Thumbnail'}
          </Button>
          
          {isRegenerating && (
            <div className="flex-1">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        {result && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {result.processed}
                </div>
                <div className="text-sm text-green-700 dark:text-green-300">
                  Berhasil
                </div>
              </div>
              <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {result.errors}
                </div>
                <div className="text-sm text-red-700 dark:text-red-300">
                  Error
                </div>
              </div>
              <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                  {result.total}
                </div>
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  Total
                </div>
              </div>
            </div>

            {/* Detailed Results */}
            {result.results && result.results.length > 0 && (
              <div className="max-h-60 overflow-y-auto space-y-2">
                <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300">
                  Detail Hasil:
                </h4>
                {result.results.map((template) => (
                  <div
                    key={template.id}
                    className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded text-sm"
                  >
                    <span className="font-medium truncate flex-1 mr-2">
                      {template.name}
                    </span>
                    <div className="flex items-center gap-2">
                      {template.success ? (
                        <>
                          <Badge variant="default" className="bg-green-500 text-white text-xs">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            {template.thumbnails_created?.length || 0} thumbnail
                          </Badge>
                        </>
                      ) : (
                        <Badge variant="destructive" className="text-xs">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Error
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
          <p>💡 <strong>Tips:</strong></p>
          <p>• Jalankan ini sekali setelah implementasi optimisasi thumbnail</p>
          <p>• Template baru akan otomatis mendapat thumbnail teroptimasi</p>
          <p>• Proses ini aman dan tidak mengubah gambar asli</p>
        </div>
      </CardContent>
    </Card>
  );
}
