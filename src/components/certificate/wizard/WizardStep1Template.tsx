import React from 'react';
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, FileText, Image as ImageIcon } from "lucide-react";
import { getTemplatePreviewUrl } from "@/lib/supabase/templates";
import { WizardGenerateState } from "./wizard-types";

interface WizardStep1TemplateProps {
  state: WizardGenerateState;
}

export function WizardStep1Template({ state }: WizardStep1TemplateProps) {
  const { templates, selectedTemplate, setSelectedTemplate, t, safeT } = state;

  return (
    <div className="space-y-4 px-1 sm:px-0">
      <div className="text-center">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          {t('wizardGenerate.step1Title')}
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 max-h-[400px] overflow-y-auto">
        {templates.length === 0 ? (
          <div className="col-span-full text-center py-8">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">{t('wizardGenerate.noTemplates')}</p>
          </div>
        ) : (
          templates.map(template => {
            const imageUrl = getTemplatePreviewUrl(template);
            const isSelected = selectedTemplate?.id === template.id;

            return (
              <div
                key={template.id}
                onClick={() => setSelectedTemplate(template)}
                className={`group bg-white dark:bg-gray-800 rounded-lg border overflow-hidden shadow-sm hover:shadow-md transition-transform duration-150 ease-out cursor-pointer flex flex-col sm:flex-row w-full min-h-[140px] ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/40 shadow-md'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                }`}
              >
                {/* Template Thumbnail */}
                <div
                  className={`relative w-full sm:w-[120px] h-[150px] sm:h-[150px] flex-shrink-0 overflow-hidden border-b sm:border-b-0 sm:border-r ${
                    isSelected
                      ? 'bg-blue-100 dark:bg-blue-900/40 border-blue-300 dark:border-blue-700'
                      : 'bg-gray-100 dark:bg-gray-900 border-gray-200 dark:border-gray-700'
                  }`}
                >
                  {imageUrl ? (
                    <Image
                      src={imageUrl}
                      alt={template.name}
                      width={120}
                      height={150}
                      className={`w-full h-full object-contain transition-transform duration-300 ${
                        isSelected ? 'brightness-110' : 'group-hover:scale-105'
                      }`}
                      sizes="120px"
                      priority={false}
                      loading="lazy"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <ImageIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <div className="text-xs text-gray-500">
                          {safeT('wizardGenerate.noImage', 'No image')}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Status Badge - Top Left */}
                  <div className="absolute top-2 left-2 z-10">
                    {template.is_layout_configured ? (
                      <Badge variant="default" className="bg-green-500 hover:bg-green-600 text-white text-xs shadow-sm px-1.5 py-0.5">
                        ✓ Ready
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-yellow-500 hover:bg-yellow-600 text-white text-xs shadow-sm px-1.5 py-0.5">
                        Draft
                      </Badge>
                    )}
                  </div>

                  {/* Selected Indicator - Top Right (simple check badge) */}
                  {isSelected && (
                    <div className="absolute top-2 right-2 flex items-center justify-center rounded-full bg-blue-500 text-white w-6 h-6 shadow-sm">
                      <CheckCircle className="w-4 h-4" />
                    </div>
                  )}
                </div>

                {/* Template Info - Right Side */}
                <div className="flex-1 flex flex-col justify-between min-w-0 p-3 w-full overflow-hidden">
                  {/* Top Section - Title and Metadata */}
                  <div className="min-w-0 flex-1 w-full flex flex-col">
                    <h3 className={`text-sm font-semibold transition-colors mb-2 w-full text-left truncate ${
                      isSelected 
                        ? 'text-blue-700 dark:text-blue-300' 
                        : 'text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400'
                    }`}>
                      {template.name}
                    </h3>
                    
                    {/* Category Badge */}
                    <div className="mb-2 w-full text-left">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium shadow-sm ${
                        template.category === 'Certificate' ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white' :
                        template.category === 'Award' ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white' :
                        template.category === 'Training' ? 'bg-gradient-to-r from-green-500 to-green-600 text-white' :
                        'bg-gradient-to-r from-gray-500 to-gray-600 text-white'
                      }`}>
                        {template.category}
                      </span>
                    </div>
                    
                    {/* Metadata - Compact */}
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 w-full text-left">
                      <div className="flex items-center gap-1">
                        <FileText className="w-3 h-3 flex-shrink-0" />
                        <span className="font-medium text-xs">{template.orientation}</span>
                      </div>
                      {template.created_at && (
                        <span className="text-gray-400 dark:text-gray-500">•</span>
                      )}
                      {template.created_at && (
                        <span className="text-xs">
                          {new Date(template.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Bottom Section - Dual Badge Only */}
                  {template.is_dual_template && (
                    <div className="mt-auto pt-2">
                      <div className="text-xs font-medium text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30 px-2 py-1 rounded inline-block">
                        Dual
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
