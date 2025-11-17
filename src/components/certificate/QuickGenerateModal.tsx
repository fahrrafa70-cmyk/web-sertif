"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { FileSpreadsheet, Users, Calendar, ArrowRight, ArrowLeft } from "lucide-react";
import { Template } from "@/lib/supabase/templates";
import { Member } from "@/lib/supabase/members";
import { DateFormat, DATE_FORMATS } from "@/types/certificate-generator";
import { TextLayerConfig } from "@/types/template-layout";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/language-context";
import { ExcelUploadStep } from "./ExcelUploadStep";
import { ColumnMappingStep } from "./ColumnMappingStep";
import { autoMapColumns, validateMapping, mergeExcelData } from "@/lib/utils/excel-mapping";

interface QuickGenerateModalProps {
  open: boolean;
  onClose: () => void;
  templates: Template[];
  members: Member[];
  onGenerate: (params: QuickGenerateParams) => Promise<void>;
}

export interface QuickGenerateParams {
  template: Template;
  dataSource: 'excel' | 'member';
  dateFormat: DateFormat;
  // For Excel
  excelData?: Array<Record<string, unknown>>;
  // For Member (can be single or multiple - handled in modal)
  member?: Member;
  members?: Member[]; // Array of members for bulk generation
  certificateData?: {
    certificate_no: string;
    description: string;
    issue_date: string;
    expired_date: string;
  };
  // For Dual Template Score Data
  scoreDataMap?: Record<string, Record<string, string>>; // member_id -> { field_id -> value }
  // For Excel with column mapping
  excelMainMapping?: Record<string, string>; // layerId -> excelColumn
  excelScoreMapping?: Record<string, string>; // layerId -> excelColumn (for dual template)
}

// Helper function to format layer ID to readable label
function formatFieldLabel(layerId: string): string {
  // nilai_teori → Nilai Teori
  // total_score → Total Score
  // grade_akhir → Grade Akhir
  return layerId
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Input Score Step Component
interface InputScoreStepProps {
  members: Member[];
  scoreFields: TextLayerConfig[]; // TextLayerConfig from layout_config.score.textLayers
  scoreDataMap: Record<string, Record<string, string>>;
  setScoreDataMap: React.Dispatch<React.SetStateAction<Record<string, Record<string, string>>>>;
}

function InputScoreStep({ members, scoreFields, scoreDataMap, setScoreDataMap }: InputScoreStepProps) {
  const { t } = useLanguage();
  const [selectedMemberId, setSelectedMemberId] = useState(members[0]?.id || '');
  
  // Get current member's score data
  const currentScoreData = scoreDataMap[selectedMemberId] || {};
  
  // Handle field value change
  const handleFieldChange = (fieldId: string, value: string) => {
    setScoreDataMap(prev => ({
      ...prev,
      [selectedMemberId]: {
        ...prev[selectedMemberId],
        [fieldId]: value
      }
    }));
  };
  
  // Check if member has completed all fields
  const isMemberComplete = (memberId: string) => {
    const memberData = scoreDataMap[memberId];
    if (!memberData) return false;
    // Check if all score fields have values
    return scoreFields.every(field => memberData[field.id]?.trim());
  };
  
  // Count completed members
  const completedCount = members.filter(m => isMemberComplete(m.id)).length;
  
  return (
    <div className="space-y-6">
      {/* Member Name Display */}
      {members.length === 1 ? (
        <div className="space-y-2">
          <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
            {members[0].name}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <Label className="text-base font-semibold">{t('quickGenerate.selectMember')}</Label>
          <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
            <SelectTrigger className="w-full">
              <div className="flex items-center justify-between w-full">
                <SelectValue />
                <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                  {completedCount}/{members.length}
                </span>
              </div>
            </SelectTrigger>
            <SelectContent position="popper" className="z-[9999]">
              {members.map(member => (
                <SelectItem key={member.id} value={member.id}>
                  <div className="flex items-center gap-2">
                    {isMemberComplete(member.id) ? '✅' : '⏳'}
                    <span>{member.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      
      {/* Score Input Fields (Auto-generated from scoreFields) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {scoreFields.map(field => (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id} className="text-sm font-medium">
              {formatFieldLabel(field.id)}
              <span className="text-red-500 ml-1">*</span>
            </Label>
            <Input
              id={field.id}
              type="text"
              value={currentScoreData[field.id] || ''}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              placeholder={t('quickGenerate.enterScore').replace('{field}', formatFieldLabel(field.id))}
              className="w-full"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function QuickGenerateModal({ 
  open, 
  onClose, 
  templates, 
  members,
  onGenerate 
}: QuickGenerateModalProps) {
  const { t } = useLanguage();
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [dataSource, setDataSource] = useState<'excel' | 'member'>('member');
  const [dateFormat, setDateFormat] = useState<DateFormat>('dd-mm-yyyy');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]); // Multiple members
  const [generating, setGenerating] = useState(false);
  
  // Multi-step flow
  const [currentStep, setCurrentStep] = useState(1); // Progressive steps
  const [scoreDataMap, setScoreDataMap] = useState<Record<string, Record<string, string>>>({});
  
  // Excel state for progressive upload and mapping
  const [excelMainData, setExcelMainData] = useState<Array<Record<string, unknown>>>([]);
  const [excelScoreData, setExcelScoreData] = useState<Array<Record<string, unknown>>>([]);
  const [excelMainMapping, setExcelMainMapping] = useState<Record<string, string>>({});
  const [excelScoreMapping, setExcelScoreMapping] = useState<Record<string, string>>({});
  
  // Refs to prevent auto-mapping from running multiple times
  const mainMappedRef = useRef(false);
  const scoreMappedRef = useRef(false);
  
  // Certificate data for member source - Initialize with default values
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
  
  // Reset state when modal opens
  React.useEffect(() => {
    if (open) {
      console.log('📊 Quick Generate Modal Data:', {
        templatesCount: templates.length,
        membersCount: members.length,
        templates: templates.slice(0, 3).map(t => ({ id: t.id, name: t.name })),
        members: members.slice(0, 3).map(m => ({ id: m.id, name: m.name }))
      });
      // Reset to step 1 when opening
      setCurrentStep(1);
      setScoreDataMap({});
      setExcelMainData([]);
      setExcelScoreData([]);
      setExcelMainMapping({});
      setExcelScoreMapping({});
      // Reset refs
      mainMappedRef.current = false;
      scoreMappedRef.current = false;
    }
  }, [open, templates, members]);
  
  // Detect if template is dual (has score layout)
  // Filter out layers that have useDefaultText=true (like score_date) or are default certificate layers (like issue_date)
  const getScoreTextLayers = React.useCallback((): TextLayerConfig[] => {
    if (!selectedTemplate?.layout_config) return [];
    
    const config = selectedTemplate.layout_config;
    if (!config.score) return [];
    
    const scoreConfig = config.score;
    if (!Array.isArray(scoreConfig.textLayers)) return [];
    
    const allLayers = scoreConfig.textLayers;
    
    // Only return layers that need user input
    // Exclude: layers with useDefaultText=true OR default certificate layers (issue_date, certificate_no, name)
    return allLayers.filter((layer) => {
      // Skip layers with useDefaultText flag
      if (layer.useDefaultText) return false;
      // Skip default certificate layers that shouldn't need input in score mode
      if (layer.id === 'issue_date' || layer.id === 'certificate_no' || layer.id === 'name') return false;
      return true;
    });
  }, [selectedTemplate]);
  
  const isDualTemplate = React.useMemo(() => {
    return !!(selectedTemplate?.score_image_url && getScoreTextLayers().length > 0);
  }, [selectedTemplate, getScoreTextLayers]);
  
  // Check if all members have completed score data (for step 2 validation)
  const isAllScoreDataComplete = () => {
    if (currentStep !== 2) return true; // Only validate on step 2
    const scoreFields = getScoreTextLayers();
    return selectedMembers.every(memberId => {
      const memberData = scoreDataMap[memberId];
      if (!memberData) return false;
      return scoreFields.every((field: TextLayerConfig) => memberData[field.id]?.trim());
    });
  };
  
  
  // Auto-update expired date when issue date changes (3 years from issue date)
  useEffect(() => {
    if (issueDate) {
      const issue = new Date(issueDate);
      const expiry = new Date(issue);
      expiry.setFullYear(expiry.getFullYear() + 3);
      setExpiredDate(expiry.toISOString().split('T')[0]);
    }
  }, [issueDate]);
  
  // Get text layers from template that need mapping
  const getMainTextLayers = React.useCallback((): TextLayerConfig[] => {
    if (!selectedTemplate?.layout_config) return [];
    const config = selectedTemplate.layout_config;
    
    // config.certificate.textLayers (standard template structure)
    if (config.certificate?.textLayers && Array.isArray(config.certificate.textLayers)) {
      return config.certificate.textLayers;
    }
    
    return [];
  }, [selectedTemplate]);
  
  // Auto-map when Excel data is uploaded (only once per upload)
  useEffect(() => {
    if (excelMainData.length > 0 && !mainMappedRef.current) {
      const mainColumns = Object.keys(excelMainData[0] || {});
      const mainLayers = getMainTextLayers();
      // Override useDefaultText to false for Excel mode to allow mapping
      const layersForMapping = mainLayers.map(layer => ({ ...layer, useDefaultText: false }));
      const autoMapping = autoMapColumns(mainColumns, layersForMapping);
      setExcelMainMapping(autoMapping);
      mainMappedRef.current = true;
    }
  }, [excelMainData, getMainTextLayers]);
  
  useEffect(() => {
    if (excelScoreData.length > 0 && isDualTemplate && !scoreMappedRef.current) {
      const scoreColumns = Object.keys(excelScoreData[0] || {});
      const scoreLayers = getScoreTextLayers();
      const autoMapping = autoMapColumns(scoreColumns, scoreLayers);
      setExcelScoreMapping(autoMapping);
      scoreMappedRef.current = true;
    }
  }, [excelScoreData, isDualTemplate, getScoreTextLayers]);

  const handleGenerate = async () => {
    if (!selectedTemplate) {
      toast.error(t('quickGenerate.selectTemplateError'));
      return;
    }

    if (dataSource === 'member' && selectedMembers.length === 0) {
      toast.error(t('quickGenerate.selectMemberError'));
      return;
    }

    if (dataSource === 'excel' && excelMainData.length === 0) {
      toast.error(t('quickGenerate.uploadExcelError'));
      return;
    }
    
    if (dataSource === 'excel' && isDualTemplate && excelScoreData.length === 0) {
      toast.error('Harap upload Excel data nilai untuk dual template');
      return;
    }

    try {
      setGenerating(true);
      
      // For multiple members, pass all at once for progress tracking
      if (dataSource === 'member') {
        const selectedMemberObjects = selectedMembers
          .map(id => members.find(m => m.id === id))
          .filter((m): m is Member => m !== undefined);

        const params: QuickGenerateParams = {
          template: selectedTemplate,
          dataSource: 'member',
          dateFormat,
          members: selectedMemberObjects, // Pass array of members
          certificateData: {
            certificate_no: '', // Will be auto-generated
            description: '',
            issue_date: issueDate,
            expired_date: expiredDate
          },
          scoreDataMap: isDualTemplate ? scoreDataMap : undefined // Pass score data for dual templates
        };

        await onGenerate(params);
      } else {
        // Excel source - merge and transform data
        let finalExcelData: Array<Record<string, unknown>>;
        
        if (isDualTemplate && excelScoreData.length > 0) {
          // Merge main and score data
          finalExcelData = mergeExcelData(
            excelMainData,
            excelScoreData,
            excelMainMapping,
            excelScoreMapping
          );
        } else {
          // Transform main data only using mapping
          finalExcelData = excelMainData.map(row => {
            const transformed: Record<string, unknown> = {};
            for (const [layerId, excelCol] of Object.entries(excelMainMapping)) {
              transformed[layerId] = row[excelCol];
            }
            // Keep original columns for reference
            return { ...row, ...transformed };
          });
        }
        
        const params: QuickGenerateParams = {
          template: selectedTemplate,
          dataSource: 'excel',
          dateFormat,
          excelData: finalExcelData,
          excelMainMapping,
          excelScoreMapping: isDualTemplate ? excelScoreMapping : undefined
        };
        await onGenerate(params);
      }
      
      // Reset form
      setSelectedTemplate(null);
      setSelectedMembers([]);
      setExcelMainData([]);
      setExcelScoreData([]);
      setExcelMainMapping({});
      setExcelScoreMapping({});
      setScoreDataMap({});
      setCurrentStep(1);
      // Reset refs
      mainMappedRef.current = false;
      scoreMappedRef.current = false;
      setIssueDate(() => {
        const now = new Date();
        return now.toISOString().split('T')[0];
      });
      setExpiredDate(() => {
        const now = new Date();
        const expiry = new Date(now);
        expiry.setFullYear(expiry.getFullYear() + 3);
        return expiry.toISOString().split('T')[0];
      });
      
      // Toast success is handled in parent component (handleQuickGenerate)
      onClose();
    } catch (error) {
      console.error('Generate error:', error);
      toast.error(error instanceof Error ? error.message : t('quickGenerate.generateError'));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl min-h-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            {t('quickGenerate.title')} {isDualTemplate && currentStep === 2 && '- Input Data Nilai'}
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: Select Template & Data Source */}
        {currentStep === 1 && (
        <div className="space-y-6 py-4">
          {/* Step 1: Select Template */}
          <div className="space-y-3">
            <Label className="text-base font-semibold flex items-center gap-2">
              <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">1</span>
              {t('quickGenerate.selectTemplate')}
            </Label>
            <Select value={selectedTemplate?.id || ''} onValueChange={(id) => {
              const template = templates.find(t => t.id === id);
              setSelectedTemplate(template || null);
              console.log('✅ Template selected:', template?.name);
            }}>
              <SelectTrigger>
                <SelectValue placeholder={t('quickGenerate.chooseTemplate')} />
              </SelectTrigger>
              <SelectContent position="popper" className="z-[9999] max-h-[300px]" sideOffset={5}>
                {templates.length === 0 ? (
                  <div className="p-2 text-sm text-gray-500">{t('quickGenerate.loadingTemplates')}</div>
                ) : (
                  templates.map(template => (
                    <SelectItem 
                      key={template.id} 
                      value={template.id}
                      disabled={!template.is_layout_configured}
                    >
                      <div className="flex items-center justify-between w-full gap-2">
                        <span>
                          {template.name} {template.is_dual_template}
                        </span>
                        {!template.is_layout_configured && (
                          <Badge variant="secondary" className="bg-yellow-500 text-white text-xs">
                            {t('quickGenerate.notConfigured')}
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Step 2: Data Source */}
          <div className="space-y-3">
            <Label className="text-base font-semibold flex items-center gap-2">
              <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">2</span>
              {t('quickGenerate.dataSource')}
            </Label>
            
            <Tabs value={dataSource} onValueChange={(value) => setDataSource(value as 'excel' | 'member')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="member" className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  {t('quickGenerate.selectMember')}
                </TabsTrigger>
                <TabsTrigger value="excel" className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4" />
                  {t('quickGenerate.uploadExcel')}
                </TabsTrigger>
              </TabsList>

              {/* Member Tab */}
              <TabsContent value="member" className="space-y-4">
                <div className="space-y-3">
                  <Label>{t('quickGenerate.selectMembers')}</Label>
                  <div className="border border-gray-300 rounded-lg max-h-[200px] overflow-y-auto p-2 space-y-2">
                    {members.length === 0 ? (
                      <div className="p-2 text-sm text-gray-500 text-center">{t('quickGenerate.loadingMembers')}</div>
                    ) : (
                      members.map(member => (
                        <label 
                          key={member.id}
                          className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedMembers.includes(member.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedMembers([...selectedMembers, member.id]);
                              } else {
                                setSelectedMembers(selectedMembers.filter(id => id !== member.id));
                              }
                            }}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="flex-1 text-sm">
                            {member.name} - {member.organization || t('quickGenerate.noOrganization')}
                          </span>
                        </label>
                      ))
                    )}
                  </div>
                  {selectedMembers.length > 0 && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {selectedMembers.length} {t('quickGenerate.membersSelected')}.
                    </p>
                  )}
                </div>

                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {t('quickGenerate.dateFormat')}
                  </Label>
                  <Select value={dateFormat} onValueChange={(value) => setDateFormat(value as DateFormat)}>
                    <SelectTrigger>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <SelectValue />
                      </div>
                    </SelectTrigger>
                    <SelectContent position="popper" className="z-[9999] max-h-[300px]" sideOffset={5}>
                      {DATE_FORMATS.map(format => (
                        <SelectItem key={format} value={format}>
                          {format} {format === 'dd-indonesian-yyyy' && '(e.g., 29 Oktober 2025)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('quickGenerate.issueDate')} *</Label>
                    <Input 
                      type="date"
                      value={issueDate}
                      onChange={(e) => setIssueDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('quickGenerate.expiredDate')}</Label>
                    <Input 
                      type="date"
                      value={expiredDate}
                      onChange={(e) => setExpiredDate(e.target.value)}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Excel Tab */}
              <TabsContent value="excel" className="space-y-4">
                <ExcelUploadStep
                  isDualTemplate={isDualTemplate}
                  mainData={excelMainData}
                  scoreData={excelScoreData}
                  onMainUpload={setExcelMainData}
                  onScoreUpload={setExcelScoreData}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
        )}

        {/* Step 2: Column Mapping (Excel only) */}
        {currentStep === 2 && dataSource === 'excel' && (
          <div className="space-y-6 py-4">
            <ColumnMappingStep
              isDualTemplate={isDualTemplate}
              dataSource={dataSource}
              mainColumns={Object.keys(excelMainData[0] || {})}
              mainLayers={getMainTextLayers()}
              mainMapping={excelMainMapping}
              mainPreviewData={excelMainData[0] || {}}
              onMainMappingChange={setExcelMainMapping}
              scoreColumns={Object.keys(excelScoreData[0] || {})}
              scoreLayers={getScoreTextLayers()}
              scoreMapping={excelScoreMapping}
              scorePreviewData={excelScoreData[0] || {}}
              onScoreMappingChange={setExcelScoreMapping}
            />
          </div>
        )}

        {/* Step 2/3: Input Score Data (Member only, dual template) */}
        {currentStep >= 2 && dataSource === 'member' && isDualTemplate && (
          <div className="space-y-6 py-4">
            <InputScoreStep
              members={members.filter(m => selectedMembers.includes(m.id))}
              scoreFields={getScoreTextLayers()}
              scoreDataMap={scoreDataMap}
              setScoreDataMap={setScoreDataMap}
            />
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          {currentStep > 1 ? (
            <Button variant="outline" onClick={() => setCurrentStep(currentStep - 1)} disabled={generating}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Kembali
            </Button>
          ) : (
            <div></div>
          )}
          
          <LoadingButton 
            onClick={() => {
              // Determine next action based on current step and data source
              if (currentStep === 1) {
                // Step 1: Move to step 2 for Excel mapping or member score input
                if (dataSource === 'excel' && (excelMainData.length > 0)) {
                  setCurrentStep(2); // Go to mapping step
                } else if (dataSource === 'member' && isDualTemplate) {
                  setCurrentStep(2); // Go to score input
                } else {
                  // No intermediate step needed, generate directly
                  handleGenerate();
                }
              } else {
                // Step 2+: Generate
                handleGenerate();
              }
            }}
            disabled={
              !selectedTemplate || 
              (dataSource === 'member' && selectedMembers.length === 0) || 
              (dataSource === 'excel' && currentStep === 1 && excelMainData.length === 0) ||
              (dataSource === 'excel' && currentStep === 1 && isDualTemplate && excelScoreData.length === 0) ||
              (currentStep === 2 && dataSource === 'member' && !isAllScoreDataComplete()) ||
              (currentStep === 2 && dataSource === 'excel' && !validateMapping(excelMainMapping, getMainTextLayers()).valid)
            }
            isLoading={generating}
            loadingText={t('quickGenerate.generating')}
            variant="primary"
            className="gradient-primary text-white"
          >
            {currentStep === 1 && (
              (dataSource === 'excel' && excelMainData.length > 0) || 
              (dataSource === 'member' && isDualTemplate)
            ) ? (
              <>
                Selanjutnya
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            ) : (
              <>
                {t('quickGenerate.generate')} {
                  dataSource === 'excel' && excelMainData.length > 0 
                    ? `(${excelMainData.length})`
                    : dataSource === 'member' && selectedMembers.length > 0
                    ? `(${selectedMembers.length})`
                    : ''
                }
              </>
            )}
          </LoadingButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}

