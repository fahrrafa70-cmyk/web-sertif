import React from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileSpreadsheet, FileText, Calendar } from "lucide-react";
import { ColumnMappingStep } from "../ColumnMappingStep";
import { WizardGenerateState, DATE_FORMATS, DateFormat } from "./wizard-types";

interface WizardStep3DataFillProps {
  state: WizardGenerateState;
}

export function WizardStep3DataFill({ state }: WizardStep3DataFillProps) {
  const {
    dataSource, excelData, selectedTemplate, getTemplateFields, getMainTextLayers, getScoreTextLayers,
    excelMainMapping, setExcelMainMapping, excelScoreMapping, setExcelScoreMapping,
    certificateData, setCertificateData, dateFormat, setDateFormat,
    issueDate, setIssueDate, expiredDate, setExpiredDate,
    t, safeT
  } = state;

  const templateFields = getTemplateFields;
  const mainLayers = getMainTextLayers();
  const scoreLayers = getScoreTextLayers();
  const excelColumns = Object.keys(excelData[0] || {});
  const hasExcelMapping = dataSource === 'excel' && excelData.length > 0;
  
  const filteredTemplateFields = templateFields.filter((field) => field.id !== 'description');
  const hasFields = filteredTemplateFields.length > 0;
  
  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          {dataSource === 'excel'
            ? safeT('wizardGenerate.step3TitleExcel', 'Map data & settings')
            : safeT('wizardGenerate.step3Title', 'Fill data & settings')}
        </h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Column Mapping (for Excel) */}
        {hasExcelMapping && (
          <div className="lg:col-span-1">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-4">
                <FileSpreadsheet className="w-5 h-5 text-green-500" />
                Column Mapping
              </h4>
              
              <div className="max-h-[300px] overflow-y-auto">
                <ColumnMappingStep
                  isDualTemplate={selectedTemplate?.is_dual_template || false}
                  dataSource={dataSource}
                  mainColumns={excelColumns}
                  mainLayers={mainLayers}
                  mainMapping={excelMainMapping}
                  mainPreviewData={excelData[0] || {}}
                  onMainMappingChange={setExcelMainMapping}
                  scoreColumns={excelColumns}
                  scoreLayers={scoreLayers}
                  scoreMapping={excelScoreMapping}
                  _scorePreviewData={excelData[0] || {}}
                  onScoreMappingChange={setExcelScoreMapping}
                />
              </div>
            </div>
          </div>
        )}
        
        {/* Left Column - Template Fields (only for member data) */}
        {dataSource === 'member' && hasFields && (
          <div className="lg:col-span-1">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-blue-500" />
                {t('wizardGenerate.templateDataTitle').replace('{count}', String(templateFields.length))}
              </h4>
              
              <div className="grid grid-cols-1 gap-3 max-h-[250px] overflow-y-auto">
                {filteredTemplateFields.map((field) => {
                  const isVariableField = !!field.defaultText && field.defaultText.includes('{');
                  const labelText = isVariableField
                    ? field.defaultText
                    : field.id.replace(/_/g, ' ');

                  return (
                    <div key={field.id} className="space-y-1">
                      <Label className="text-xs font-medium capitalize">
                        {labelText}
                        {field.id.includes('nilai') || field.id.includes('score') ? ' *' : ''}
                      </Label>
                      <Input
                        value={certificateData[field.id as keyof typeof certificateData] || ''}
                        onChange={(e) => setCertificateData(prev => ({ 
                          ...prev, 
                          [field.id]: e.target.value 
                        }))}
                        placeholder={t('wizardGenerate.inputFieldPlaceholder').replace('{field}', field.id.replace(/_/g, ' '))}
                        className="h-8"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Right Column - Date Settings & Basic Data */}
        <div className={`${(hasExcelMapping || (dataSource === 'member' && hasFields)) ? 'lg:col-span-1' : 'lg:col-span-2'}`}>
          <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-blue-600" />
                {t('wizardGenerate.basicSettingsTitle')}
              </h4>
              
              <div className="space-y-3">
                {dataSource === 'member' && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-blue-900 dark:text-blue-100">{t('wizardGenerate.certificateNoLabel')}</Label>
                    <Input
                      value={certificateData.certificate_no}
                      onChange={(e) => setCertificateData(prev => ({ ...prev, certificate_no: e.target.value }))}
                      placeholder={t('wizardGenerate.certificateNoPlaceholder')}
                      className="h-9 bg-white dark:bg-gray-800"
                    />
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-blue-900 dark:text-blue-100">{t('wizardGenerate.dateFormatLabel')}</Label>
                  <Select value={dateFormat} onValueChange={(value) => setDateFormat(value as DateFormat)}>
                    <SelectTrigger className="h-9 bg-white dark:bg-gray-800">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DATE_FORMATS.map(format => (
                        <SelectItem key={format} value={format}>
                          {format} {format === 'dd-indonesian-yyyy' && t('wizardGenerate.dateFormatExampleSuffix')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      {t('wizardGenerate.issueDateLabel')}
                    </Label>
                    <Input 
                      type="date"
                      value={issueDate}
                      onChange={(e) => setIssueDate(e.target.value)}
                      className="h-9 bg-white dark:bg-gray-800"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      {t('wizardGenerate.expiredDateLabel')}
                    </Label>
                    <Input 
                      type="date"
                      value={expiredDate}
                      onChange={(e) => setExpiredDate(e.target.value)}
                      className="h-9 bg-white dark:bg-gray-800"
                    />
                  </div>
                </div>
                
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  {t('wizardGenerate.expiredDateHint')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
