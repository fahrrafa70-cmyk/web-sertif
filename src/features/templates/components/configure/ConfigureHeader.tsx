"use client";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { ArrowLeft, Save, Eye } from "lucide-react";

interface ConfigureHeaderProps {
  templateName: string;
  saving: boolean;
  onBack: () => void;
  onPreview: () => void;
  onSave: () => void;
  t: (key: string) => string;
}

export function ConfigureHeader({ templateName, saving, onBack, onPreview, onSave, t }: ConfigureHeaderProps) {
  return (
    <div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 border-b border-gray-200 dark:border-gray-800 fixed top-0 left-0 right-0 z-50 shadow-sm h-14 sm:h-16">
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 h-full">
        <div className="flex items-center justify-between h-full gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 md:gap-4 min-w-0 flex-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="flex-shrink-0 h-9 w-9 sm:h-10 sm:w-10 p-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="min-w-0 flex-1">
              <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white truncate">
                {templateName}
              </h1>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
                {t('configure.subtitle')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={onPreview}
              className="h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm"
            >
              <Eye className="w-3.5 h-3.5 sm:mr-1.5" />
              <span className="hidden sm:inline">{t('configure.preview')}</span>
            </Button>
            <LoadingButton
              size="sm"
              onClick={onSave}
              isLoading={saving}
              loadingText={t('configure.saving')}
              className="h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Save className="w-3.5 h-3.5 sm:mr-1.5" />
              <span className="hidden sm:inline">{t('configure.save')}</span>
            </LoadingButton>
          </div>
        </div>
      </div>
    </div>
  );
}
