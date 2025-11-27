/**
 * Wizard Generate Modal - 4 Step Certificate Generation
 * Step 1: Template Selection (Card Preview)
 * Step 2: Data Source Selection (Excel/Existing Data)
 * Step 3: Fill Data + Date Settings
 * Step 4: Preview & Generate
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingButton } from "@/components/ui/loading-button";
import { 
  ArrowLeft, 
  ArrowRight, 
  FileSpreadsheet, 
  Users, 
  Calendar,
  CheckCircle,
  Eye,
  FileText,
  Image as ImageIcon
} from "lucide-react";
import { Template, getTemplatePreviewUrl, getTemplateLayout } from "@/lib/supabase/templates";
import { Member } from "@/lib/supabase/members";
import { QuickGenerateParams } from "./QuickGenerateModal";
import { ExcelUploadWizard } from "./ExcelUploadWizard";
import { useLanguage } from "@/contexts/language-context";
import { toast } from "sonner";
import Image from "next/image";
import type { TemplateLayoutConfig, TextLayerConfig } from "@/types/template-layout";
import { extractVariablesFromLayer } from "@/lib/utils/variable-parser";

interface WizardGenerateModalProps {
  open: boolean;
  onClose: () => void;
  templates: Template[];
  members: Member[];
  onGenerate: (params: QuickGenerateParams) => Promise<void>;
}

type DateFormat = 'dd-mm-yyyy' | 'mm-dd-yyyy' | 'yyyy-mm-dd' | 'dd-indonesian-yyyy';

const DATE_FORMATS: DateFormat[] = [
  'dd-mm-yyyy',
  'mm-dd-yyyy', 
  'yyyy-mm-dd',
  'dd-indonesian-yyyy'
];

export function WizardGenerateModal({ 
  open, 
  onClose, 
  templates, 
  members,
  onGenerate 
}: WizardGenerateModalProps) {
  const { t } = useLanguage();
  
  // Wizard Steps
  const [currentStep, setCurrentStep] = useState(1);
  const [generating, setGenerating] = useState(false);
  
  // Step 1: Template Selection
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [layoutConfig, setLayoutConfig] = useState<TemplateLayoutConfig | null>(null);
  const [loadingLayout, setLoadingLayout] = useState(false);
  
  // Step 2: Data Source
  const [dataSource, setDataSource] = useState<'excel' | 'member'>('member');
  const [excelData, setExcelData] = useState<Array<Record<string, unknown>>>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  
  // Step 3: Fill Data & Dates
  const [dateFormat, setDateFormat] = useState<DateFormat>('dd-mm-yyyy');
  const [issueDate, setIssueDate] = useState(() => {
    const now = new Date();
    return now.toISOString().split('T')[0];
  });
  const [expiredDate, setExpiredDate] = useState(() => {
    const now = new Date();
    const expiry = new Date(now);
    expiry.setFullYear(expiry.getFullYear() + 3);
    return expiry.toISOString().split('T')[0];
  });
  const [certificateData, setCertificateData] = useState<Record<string, any>>({
    certificate_no: ''
  });

  // Reset when modal opens
  useEffect(() => {
    if (open) {
      setCurrentStep(1);
      setSelectedTemplate(null);
      setLayoutConfig(null);
      setDataSource('member');
      setExcelData([]);
      setSelectedMembers([]);
      setCertificateData({ certificate_no: '', description: '' });
    }
  }, [open]);

  // Load layout config for selected template so Wizard uses the same layout
  // source as the renderer (generateSingleCertificate)
  useEffect(() => {
    const loadLayout = async () => {
      if (!selectedTemplate) {
        setLayoutConfig(null);
        return;
      }

      try {
        setLoadingLayout(true);
        const layout = await getTemplateLayout(selectedTemplate.id);
        if (layout && (layout as TemplateLayoutConfig).certificate) {
          setLayoutConfig(layout as TemplateLayoutConfig);
        } else {
          setLayoutConfig(null);
        }
      } catch (error) {
        console.error('Failed to load template layout for wizard:', error);
        setLayoutConfig(null);
      } finally {
        setLoadingLayout(false);
      }
    };

    void loadLayout();
  }, [selectedTemplate]);

  // Auto-update expired date when issue date changes
  useEffect(() => {
    if (issueDate) {
      const issue = new Date(issueDate);
      const expiry = new Date(issue);
      expiry.setFullYear(expiry.getFullYear() + 3);
      setExpiredDate(expiry.toISOString().split('T')[0]);
    }
  }, [issueDate]);

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceedFromStep = (step: number): boolean => {
    switch (step) {
      case 1:
        // Only allow next if template selected AND its layout has been loaded,
        // so that Step 3 fields always reflect the same layout as renderer.
        return !!selectedTemplate && !loadingLayout;
      case 2:
        return dataSource === 'excel' ? excelData.length > 0 : selectedMembers.length > 0;
      case 3:
        // Step 3: ensure date and required manual fields are filled
        if (!issueDate) return false;

        // When using member data, all template fields that appear in the manual fill section
        // must have a non-empty value in certificateData
        if (dataSource === 'member') {
          // Selaraskan dengan renderStep3: abaikan field "description" yang tidak ditampilkan
          const templateFields = getTemplateFields.filter(
            (field) => field.id !== 'description',
          );

          const hasEmptyRequiredField = templateFields.some((field) => {
            const rawValue = certificateData[field.id as keyof typeof certificateData];
            const value = rawValue === undefined || rawValue === null ? '' : String(rawValue).trim();
            return value.length === 0;
          });

          if (hasEmptyRequiredField) return false;
        }

        return true;
      default:
        return true;
    }
  };

  const handleGenerate = async () => {
    if (!selectedTemplate) return;

    try {
      setGenerating(true);
      
      if (dataSource === 'member') {
        const selectedMemberObjects = selectedMembers
          .map(id => members.find(m => m.id === id))
          .filter((m): m is Member => m !== undefined);

        const params: QuickGenerateParams = {
          template: selectedTemplate,
          dataSource: 'member',
          dateFormat,
          members: selectedMemberObjects,
          // Pass ALL manual fill fields (template fields + basic data)
          // while satisfying the required certificateData shape
          certificateData: {
            certificate_no: certificateData.certificate_no || '',
            description: certificateData.description || '',
            issue_date: issueDate,
            expired_date: expiredDate,
            // extra fields keyed by text layer id (sekolah, tempat/tgl_lahir, dll)
            ...certificateData,
          },
        };

        await onGenerate(params);
      } else {
        const params: QuickGenerateParams = {
          template: selectedTemplate,
          dataSource: 'excel',
          dateFormat,
          excelData
        };
        
        await onGenerate(params);
      }
      
      onClose();
    } catch (error) {
      console.error('Generate error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate certificates');
    } finally {
      setGenerating(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="hidden sm:flex items-center justify-center mb-8">
      {[1, 2, 3, 4].map((step) => (
        <React.Fragment key={step}>
          <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${
            step <= currentStep
              ? 'bg-blue-500 border-blue-500 text-white'
              : 'bg-gray-100 border-gray-300 text-gray-500'
          }`}>
            {step < currentStep ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <span className="text-sm font-semibold">{step}</span>
            )}
          </div>
          {step < 4 && (
            <div className={`w-16 h-0.5 mx-2 transition-all ${
              step < currentStep ? 'bg-blue-500' : 'bg-gray-300'
            }`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  const renderStep1 = () => (
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
                        <div className="text-xs text-gray-500">No Image</div>
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

  const renderStep2 = () => (
    <div className="space-y-4 px-1 sm:px-0">
      <div className="text-center">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          {t('wizardGenerate.step2Title')}
        </h3>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
        {/* Excel Option */}
        <div
          onClick={() => setDataSource('excel')}
          className={`border-2 rounded-lg p-3 sm:p-4 cursor-pointer transition-all hover:shadow-md flex items-center gap-3 min-w-[0] w-full sm:w-auto ${
            dataSource === 'excel'
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 shadow-md'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
          }`}
        >
          <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
            dataSource === 'excel' ? 'bg-blue-500' : 'bg-gray-100 dark:bg-gray-800'
          }`}>
            <FileSpreadsheet className={`w-5 h-5 sm:w-6 sm:h-6 ${
              dataSource === 'excel' ? 'text-white' : 'text-gray-500'
            }`} />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {t('wizardGenerate.excelOptionTitle')}
            </h4>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {t('wizardGenerate.excelOptionSubtitle')}
            </p>
            {dataSource === 'excel' && (
              <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400 mt-1">
                <CheckCircle className="w-3 h-3" />
                <span className="text-xs font-medium">{t('wizardGenerate.selected')}</span>
              </div>
            )}
          </div>
        </div>

        {/* Member Option */}
        <div
          onClick={() => setDataSource('member')}
          className={`border-2 rounded-lg p-3 sm:p-4 cursor-pointer transition-all hover:shadow-md flex items-center gap-3 min-w-[0] w-full sm:w-auto ${
            dataSource === 'member'
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 shadow-md'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
          }`}
        >
          <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
            dataSource === 'member' ? 'bg-blue-500' : 'bg-gray-100 dark:bg-gray-800'
          }`}>
            <Users className={`w-5 h-5 sm:w-6 sm:h-6 ${
              dataSource === 'member' ? 'text-white' : 'text-gray-500'
            }`} />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {t('wizardGenerate.memberOptionTitle')}
            </h4>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {t('wizardGenerate.memberOptionSubtitle')}
            </p>
            {dataSource === 'member' && (
              <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400 mt-1">
                <CheckCircle className="w-3 h-3" />
                <span className="text-xs font-medium">{t('wizardGenerate.selected')}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Data Source Content */}
      {dataSource === 'excel' && (
        <div className="space-y-4 border-t pt-6">
          <Label>{t('wizardGenerate.uploadExcelLabel')}</Label>
          <ExcelUploadWizard 
            onDataLoaded={setExcelData}
            dataCount={excelData.length}
            templateFields={getTemplateFields}
          />
        </div>
      )}

      {dataSource === 'member' && (
        <div className="space-y-3 border-t pt-4">
          <Label>{t('wizardGenerate.selectMembersLabel').replace('{count}', String(selectedMembers.length))}</Label>
          <div className="border border-gray-300 rounded-lg max-h-[150px] overflow-y-auto p-2 space-y-1">
            {members.length === 0 ? (
              <div className="p-2 text-sm text-gray-500 text-center">
                {t('wizardGenerate.noMembers')}
              </div>
            ) : (
              members.map((member) => (
                <label
                  key={member.id}
                  className="flex items-center gap-2 p-1.5 rounded hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedMembers.includes(member.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedMembers([...selectedMembers, member.id]);
                      } else {
                        setSelectedMembers(selectedMembers.filter((id) => id !== member.id));
                      }
                    }}
                    className="rounded"
                  />
                  <div>
                    <div className="font-medium text-xs">{member.name}</div>
                    <div className="text-xs text-gray-500">{member.organization || 'Tidak ada organisasi'}</div>
                  </div>
                </label>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );

  // Get template fields for manual input
  const getTemplateFields = React.useMemo(() => {
    // Use fetched layoutConfig (same source as renderer). If missing, no fields.
    if (!layoutConfig) return [];
    const config = layoutConfig;
    const allFields: TextLayerConfig[] = [];

    // Front-side text layers (direct fields)
    const certificateLayers = config.certificate?.textLayers || [];
    if (certificateLayers.length > 0) {
      const frontFields = certificateLayers.filter((layer) => {
        const shouldSkip =
          layer.id === 'certificate_no' ||
          layer.id === 'issue_date' ||
          layer.id === 'expired_date' ||
          layer.id === 'description' || // description text stays in template only
          layer.useDefaultText === true || // respect "Use default text" toggle
          (dataSource === 'member' && layer.id === 'name');
        return !shouldSkip;
      });
      allFields.push(...frontFields);
    }

    // Back/score text layers (direct fields for dual templates)
    const scoreLayers = selectedTemplate?.is_dual_template && config.score?.textLayers
      ? config.score.textLayers
      : [];
    if (scoreLayers.length > 0) {
      const backFields = scoreLayers.filter((layer) => {
        const isAutoField =
          layer.id === 'certificate_no' ||
          layer.id === 'issue_date' ||
          layer.id === 'expired_date' ||
          layer.id === 'score_date' ||
          layer.id === 'name';
        const shouldSkip = isAutoField || layer.useDefaultText === true;
        return !shouldSkip;
      });
      allFields.push(...backFields);
    }

    // Dynamic variable fields from any {variable} in defaultText / richText (front + back).
    // Di sini kita BOLEHKAN variable yang berasal dari layer "description" (mis. {juara}, {nilai}),
    // sehingga user tetap bisa mengisi bagian dinamisnya, sementara layer description-nya sendiri
    // tidak muncul sebagai input terpisah.
    const variableNames: string[] = [];
    const pushVarsFromLayers = (layers: TextLayerConfig[]) => {
      for (const layer of layers) {
        const vars = extractVariablesFromLayer(layer);
        for (const v of vars) {
          if (!variableNames.includes(v)) {
            variableNames.push(v);
          }
        }
      }
    };

    pushVarsFromLayers(certificateLayers);
    pushVarsFromLayers(scoreLayers as TextLayerConfig[]);

    const createVariableFields = (variables: string[]): TextLayerConfig[] => {
      return variables.map((varName) => ({
        id: varName,
        x: 0,
        y: 0,
        xPercent: 0,
        yPercent: 0,
        defaultText: `{${varName}}`,
        useDefaultText: false,
        fontSize: 16,
        color: '#000000',
        fontWeight: '400',
        fontFamily: 'Arial',
      }));
    };

    const existingIds = new Set(allFields.map((f) => f.id));
    const variableFields = createVariableFields(variableNames).filter(
      (field) => !existingIds.has(field.id),
    );
    allFields.push(...variableFields);

    return allFields;
  }, [selectedTemplate, layoutConfig, dataSource]);

  const renderStep3 = () => {
    const templateFields = getTemplateFields;
    // Pastikan field "description" (paragraf penuh) tidak pernah muncul sebagai input wizard,
    // tapi BIARKAN field dinamis seperti {nilai}, {juara}, dll tetap muncul.
    const filteredTemplateFields = templateFields.filter(
      (field) => field.id !== 'description',
    );
    const hasFields = filteredTemplateFields.length > 0;
    
    return (
      <div className="space-y-4">
        <div className="text-center">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {t('wizardGenerate.step3Title')}
          </h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
          <div className={`${dataSource === 'member' && hasFields ? 'lg:col-span-1' : 'lg:col-span-2'}`}>
            <div className="space-y-4">
              {/* Basic Certificate Data */}
              <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                <h4 className="font-semibold text-blue-900 dark:text-blue-100 flex items-center gap-2 mb-4">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  {t('wizardGenerate.basicSettingsTitle')}
                </h4>
                
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-blue-900 dark:text-blue-100">{t('wizardGenerate.certificateNoLabel')}</Label>
                    <Input
                      value={certificateData.certificate_no}
                      onChange={(e) => setCertificateData(prev => ({ ...prev, certificate_no: e.target.value }))}
                      placeholder={t('wizardGenerate.certificateNoPlaceholder')}
                      className="h-9 bg-white dark:bg-gray-800"
                    />
                  </div>
                  
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
  };

  const renderStep4 = () => (
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
                {/* Template Image - show full certificate without vertical padding */}
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
                
                {/* Template Info - Compact */}
                <div className="space-y-1">
                  <h5 className="font-medium text-sm text-gray-900 dark:text-gray-100">{selectedTemplate.name}</h5>
                  <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                    <Badge variant={selectedTemplate.is_dual_template ? "default" : "secondary"} className="text-xs px-2 py-0.5">
                      {selectedTemplate.is_dual_template ? "Dual" : "Single"}
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
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Tanggal Terbit</span>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {new Date(issueDate).toLocaleDateString('id-ID', { 
                      day: 'numeric', 
                      month: 'long', 
                      year: 'numeric' 
                    })}
                  </p>
                </div>
                
                <div>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Tanggal Kadaluarsa</span>
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
            
            {/* Additional Info if exists */}
            {certificateData.certificate_no && (
              <div className="mt-4 bg-white dark:bg-gray-800 rounded-lg p-3 border border-blue-200 dark:border-blue-700">
                <div>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Nomor Sertifikat</span>
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-[calc(100vw-1.5rem)] sm:max-w-5xl sm:w-[90vw] max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-2xl text-center">
            {t('quickGenerate.title')}
          </DialogTitle>
        </DialogHeader>

        <div className="py-6">
          {renderStepIndicator()}
          
          <div className="min-h-[300px]">
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}
            {currentStep === 4 && renderStep4()}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-6 border-t">
          <Button 
            variant="outline" 
            onClick={handleBack}
            disabled={currentStep === 1 || generating}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>
          
          {currentStep < 4 ? (
            <Button 
              onClick={handleNext}
              disabled={!canProceedFromStep(currentStep)}
              className="gradient-primary text-white"
            >
              Lanjut
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <LoadingButton
              onClick={handleGenerate}
              isLoading={generating}
              loadingText="Generating..."
              className="
                inline-flex items-center justify-center
                rounded-full px-6 py-2 text-sm font-semibold
                bg-blue-600 text-white
                hover:bg-blue-700
                dark:bg-blue-600 dark:hover:bg-blue-500
                shadow-sm hover:shadow-md
                hover:-translate-y-0.5
                transition-all duration-150
                disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-sm
              "
            >
              Generate Sertifikat
              {dataSource === 'excel' && excelData.length > 0 && ` (${excelData.length})`}
              {dataSource === 'member' && selectedMembers.length > 0 && ` (${selectedMembers.length})`}
            </LoadingButton>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
