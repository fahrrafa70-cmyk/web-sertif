import React from 'react';
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Eye, FileSpreadsheet, Users, Calendar, FileText, Image as ImageIcon } from "lucide-react";
import { getTemplatePreviewUrl } from "@/lib/supabase/templates";
import { WizardGenerateState } from "./wizard-types";

interface WizardStep4SummaryProps {
  state: WizardGenerateState;
}

export function WizardStep4Summary({ state }: WizardStep4SummaryProps) {
  const {
    dataSource, excelData, selectedTemplate, getTemplateFields, selectedMembers,
    certificateData, dateFormat, issueDate, expiredDate, setCurrentStep, t, safeT
  } = state;

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          {t('wizardGenerate.step4Title')}
        </h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Template Preview - Left (1 column) */}
        <div className="lg:col-span-1">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
              <Eye className="w-4 h-4 text-blue-500" />
              {t('wizardGenerate.selectedTemplateTitle')}
            </h4>
            
            {selectedTemplate && (
              <div className="space-y-3">
                <div className="w-full rounded-lg overflow-hidden">
                  {getTemplatePreviewUrl(selectedTemplate) ? (
                    <Image
                      src={getTemplatePreviewUrl(selectedTemplate)!}
                      alt={selectedTemplate.name}
                      width={800}
                      height={500}
                      className="w-full h-auto block"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex items-center justify-center py-8">
                      <div className="text-center">
                        <ImageIcon className="w-8 h-8 text-gray-400 mx-auto mb-1" />
                        <p className="text-xs text-gray-500">{t('wizardGenerate.previewNotAvailable')}</p>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="space-y-1">
                  <h5 className="font-medium text-sm text-gray-900 dark:text-gray-100">{selectedTemplate.name}</h5>
                  <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                    <Badge variant={selectedTemplate.is_dual_template ? "default" : "secondary"} className="text-xs px-2 py-0.5">
                      {selectedTemplate.is_dual_template
                        ? safeT('wizardGenerate.templateTypeDual', 'Dual')
                        : safeT('wizardGenerate.templateTypeSingle', 'Single')}
                    </Badge>
                    <span>•</span>
                    <span>{selectedTemplate.orientation}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Generation Summary - Right (3 columns) */}
        <div className="lg:col-span-3">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-4 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-blue-600" />
              {t('wizardGenerate.summaryTitle')}
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Data Source Info */}
              <div 
                className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-blue-200 dark:border-blue-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                onClick={() => setCurrentStep(2)}
              >
                <div className="flex items-center gap-2 mb-2">
                  {dataSource === 'excel' ? (
                    <FileSpreadsheet className="w-4 h-4 text-green-600" />
                  ) : (
                    <Users className="w-4 h-4 text-green-600" />
                  )}
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{t('wizardGenerate.summaryDataSourceLabel')}</span>
                </div>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {dataSource === 'excel' ? t('wizardGenerate.summaryDataSourceExcel') : t('wizardGenerate.summaryDataSourceMember')}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {dataSource === 'excel'
                    ? t('wizardGenerate.summaryExcelCount').replace('{count}', String(excelData.length))
                    : t('wizardGenerate.summaryMemberCount').replace('{count}', String(selectedMembers.length))}
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">{t('wizardGenerate.summaryClickPreview')}</p>
              </div>
              
              {/* Date Format */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-blue-200 dark:border-blue-700">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-purple-600" />
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{t('wizardGenerate.summaryDateFormatLabel')}</span>
                </div>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {dateFormat}
                </p>
                {dateFormat === 'dd-indonesian-yyyy' && (
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {t('wizardGenerate.summaryDateFormatExample')}
                  </p>
                )}
              </div>
              
              {/* Template Fields Count */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-blue-200 dark:border-blue-700">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-orange-600" />
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{t('wizardGenerate.summaryTemplateFieldsLabel')}</span>
                </div>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {t('wizardGenerate.summaryTemplateFieldsCount').replace('{count}', String(getTemplateFields.length))}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {selectedTemplate?.is_dual_template ? t('wizardGenerate.summaryTemplateTypeDual') : t('wizardGenerate.summaryTemplateTypeSingle')}
                </p>
              </div>
            </div>
            
            {/* Date Details - Full Width */}
            <div className="mt-4 bg-white dark:bg-gray-800 rounded-lg p-3 border border-blue-200 dark:border-blue-700">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    {safeT('wizardGenerate.issueDateSummaryLabel', 'Issue date')}
                  </span>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {new Date(issueDate).toLocaleDateString('id-ID', { 
                      day: 'numeric', 
                      month: 'long', 
                      year: 'numeric' 
                    })}
                  </p>
                </div>
                
                <div>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    {safeT('wizardGenerate.expiredDateSummaryLabel', 'Expiry date')}
                  </span>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {new Date(expiredDate).toLocaleDateString('id-ID', { 
                      day: 'numeric', 
                      month: 'long', 
                      year: 'numeric' 
                    })}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Additional Info if exists - only for member data source */}
            {dataSource === 'member' && certificateData.certificate_no && (
              <div className="mt-4 bg-white dark:bg-gray-800 rounded-lg p-3 border border-blue-200 dark:border-blue-700">
                <div>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    {safeT('wizardGenerate.certificateNoSummaryLabel', 'Certificate number')}
                  </span>
                  <p className="text-sm text-gray-900 dark:text-gray-100">
                    {certificateData.certificate_no}
                  </p>
                </div>
              </div>
            )}
            
          </div>
        </div>
      </div>
    </div>
  );
}
