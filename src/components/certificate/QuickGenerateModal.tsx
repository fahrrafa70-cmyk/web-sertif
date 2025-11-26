"use client";

import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Template } from '@/lib/supabase/templates';
import { Member } from '@/lib/supabase/members';
import { Users, FileSpreadsheet, Calendar as CalendarIcon, ArrowLeft, ArrowRight } from 'lucide-react';
import { DateFormat, DATE_FORMATS } from '@/types/certificate-generator';
import { TextLayerConfig } from '@/types/template-layout';
import { useLanguage } from '@/contexts/language-context';
import { toast } from 'sonner';
import { LoadingButton } from '@/components/ui/loading-button';
import { ExcelUploadStep } from './ExcelUploadStep';
import { ColumnMappingStep } from './ColumnMappingStep';
import { 
  extractVariablesFromLayer
} from '@/lib/utils/variable-parser';
import { 
  autoMapColumns, 
  validateMapping, 
  mergeExcelData 
} from '@/lib/utils/excel-mapping';
import { batchAutoPopulatePrestasi } from '@/lib/utils/score-predicates';

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

/**
 * Format layer ID to readable label
 * For pure dynamic variables (extracted variables), show with brackets
 * For regular text layers (even if they contain variables), show as title case
 */
function formatFieldLabel(layerId: string, field?: TextLayerConfig): string {
  // Already has brackets, keep as-is
  if (layerId.includes('{') || layerId.includes('}')) {
    return layerId;
  }
  
  // Check if this is a PURE dynamic variable field (created by createVariableFields)
  // Pure variable: defaultText is exactly "{varName}" (nothing else)
  // NOT pure variable: defaultText contains text with variables like "Siswa dari {perusahaan}"
  if (field?.defaultText) {
    const trimmed = field.defaultText.trim();
    // Check if defaultText is EXACTLY "{layerId}" - this is a pure variable field
    if (trimmed === `{${layerId}}`) {
      return `{${layerId}}`;
    }
  }
  
  // Convert to title case for regular text layers
  return layerId
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Extract all unique variables from text layers
 * Scans both defaultText and richText for {variable} patterns
 */
function extractVariablesFromLayers(layers: TextLayerConfig[]): string[] {
  const allVariables: string[] = [];
  
  for (const layer of layers) {
    const layerVars = extractVariablesFromLayer(layer);
    for (const varName of layerVars) {
      if (!allVariables.includes(varName)) {
        allVariables.push(varName);
      }
    }
  }
  
  return allVariables;
}

/**
 * Create virtual field configs for dynamic variables
 * These represent {variable} placeholders found in text layers
 * Note: ID uses varName without brackets for data mapping compatibility
 */
function createVariableFields(variables: string[]): TextLayerConfig[] {
  return variables.map(varName => {
    const field: TextLayerConfig = {
      id: varName, // Use plain varName for data mapping
      x: 0,
      y: 0,
      xPercent: 0,
      yPercent: 0,
      defaultText: `{${varName}}`, // Store bracket format in defaultText for UI display hint
      useDefaultText: false,
      fontSize: 16,
      color: '#000000',
      fontWeight: '400',
      fontFamily: 'Arial',
    };
    return field;
  });
}

// Input Score Step Component
interface InputScoreStepProps {
  members: Member[];
  frontFields: TextLayerConfig[]; // Front side text layers that need user input
  backFields: TextLayerConfig[]; // Back side text layers that need user input
  scoreDataMap: Record<string, Record<string, string>>;
  setScoreDataMap: React.Dispatch<React.SetStateAction<Record<string, Record<string, string>>>>;
}

function InputScoreStep({ members, frontFields, backFields, scoreDataMap, setScoreDataMap }: InputScoreStepProps) {
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
  
  // Check if member has completed all fields (both front and back)
  const isMemberComplete = (memberId: string) => {
    const memberData = scoreDataMap[memberId];
    if (!memberData) return false;
    // Check if all front and back fields have values
    const allFields = [...frontFields, ...backFields];
    return allFields.every(field => memberData[field.id]?.trim());
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
      
      {/* Front Side Input Fields */}
      {frontFields.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-px bg-gradient-to-r from-blue-500 to-blue-300 flex-1"></div>
            <h3 className="text-sm font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide px-2">{t('quickGenerate.frontSide')}</h3>
            <div className="h-px bg-gradient-to-l from-blue-500 to-blue-300 flex-1"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {frontFields.map(field => {
              const displayLabel = formatFieldLabel(field.id, field);
              
              return (
                <div key={field.id} className="space-y-2">
                  <Label htmlFor={`front-${field.id}`} className="text-sm font-medium">
                    {displayLabel}
                    <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Input
                    id={`front-${field.id}`}
                    type="text"
                    value={currentScoreData[field.id] || ''}
                    onChange={(e) => handleFieldChange(field.id, e.target.value)}
                    onFocus={(e) => e.target.select()}
                    placeholder={`Masukkan ${displayLabel}`}
                    className="w-full"
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Back Side Input Fields */}
      {backFields.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-px bg-gradient-to-r from-purple-500 to-purple-300 flex-1"></div>
            <h3 className="text-sm font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wide px-2">{t('quickGenerate.backSide')}</h3>
            <div className="h-px bg-gradient-to-l from-purple-500 to-purple-300 flex-1"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {backFields.map(field => {
              const displayLabel = formatFieldLabel(field.id, field);
              
              return (
                <div key={field.id} className="space-y-2">
                  <Label htmlFor={`back-${field.id}`} className="text-sm font-medium">
                    {displayLabel}
                    <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Input
                    id={`back-${field.id}`}
                    type="text"
                    value={currentScoreData[field.id] || ''}
                    onChange={(e) => handleFieldChange(field.id, e.target.value)}
                    onFocus={(e) => e.target.select()}
                    placeholder={t('quickGenerate.enterScore').replace('{field}', displayLabel)}
                    className="w-full"
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
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
  
  // Get ALL back side fields for Excel mapping (includes all fields)
  const getAllScoreFields = React.useCallback((): TextLayerConfig[] => {
    if (!selectedTemplate?.layout_config?.score?.textLayers) return [];
    
    const scoreConfig = selectedTemplate.layout_config.score;
    if (!scoreConfig?.textLayers) return [];
    
    const allLayers = scoreConfig.textLayers;
    
    // 1. Get ALL regular fields (don't skip any for Excel)
    const regularFields = allLayers.filter((layer) => {
      // Skip ONLY layers with useDefaultText flag
      if (layer.useDefaultText) return false;
      return true;
    });
    
    // 2. Extract dynamic variables from ALL back side layers
    const variables = extractVariablesFromLayers(allLayers);
    const variableFields = createVariableFields(variables);
    
    // 3. Combine and deduplicate
    const regularFieldIds = new Set(regularFields.map(f => f.id));
    const uniqueVariableFields = variableFields.filter(v => !regularFieldIds.has(v.id));
    
    return [...regularFields, ...uniqueVariableFields];
  }, [selectedTemplate]);
  
  // Get back side fields for manual input (excludes front side fields)
  const getScoreTextLayers = React.useCallback((): TextLayerConfig[] => {
    if (!selectedTemplate?.layout_config) return [];
    
    const config = selectedTemplate.layout_config;
    if (!config.score) return [];
    
    const scoreConfig = config.score;
    if (!Array.isArray(scoreConfig.textLayers)) return [];
    
    const allLayers = scoreConfig.textLayers;
    
    // 1. Get regular fields that need user input
    const regularFields = allLayers.filter((layer) => {
      // Skip layers with useDefaultText flag
      if (layer.useDefaultText) return false;
      // Skip default front side layers that shouldn't need input in back side mode
      if (layer.id === 'issue_date' || layer.id === 'certificate_no' || layer.id === 'name') return false;
      return true;
    });
    
    // 2. Extract dynamic variables from ALL back side layers
    const variables = extractVariablesFromLayers(allLayers);
    const variableFields = createVariableFields(variables);
    
    // 3. Combine regular fields + variable fields
    // Filter out variables that already exist as regular field IDs
    const regularFieldIds = new Set(regularFields.map(f => f.id));
    const uniqueVariableFields = variableFields.filter(v => !regularFieldIds.has(v.id));
    
    return [...regularFields, ...uniqueVariableFields];
  }, [selectedTemplate]);
  
  // Get front side (certificate) text layers that need user input
  // Get all required fields for Excel mapping (includes auto-generated fields)
  const getAllFrontSideFields = React.useCallback((): TextLayerConfig[] => {
    if (!selectedTemplate?.layout_config) return [];
    
    const config = selectedTemplate.layout_config;
    if (!config.certificate?.textLayers) return [];
    
    const allLayers = config.certificate.textLayers;
    
    // 1. Get ALL regular fields (don't skip auto-generated ones for Excel)
    const regularFields = allLayers.filter((layer) => {
      // Skip ONLY layers with useDefaultText flag
      if (layer.useDefaultText) return false;
      return true;
    });
    
    // 2. Extract dynamic variables from ALL layers
    const variables = extractVariablesFromLayers(allLayers);
    const variableFields = createVariableFields(variables);
    
    // 3. Combine and deduplicate
    const regularFieldIds = new Set(regularFields.map(f => f.id));
    const uniqueVariableFields = variableFields.filter(v => !regularFieldIds.has(v.id));
    
    return [...regularFields, ...uniqueVariableFields];
  }, [selectedTemplate]);

  // Get fields for manual input (excludes auto-generated fields)
  const getFrontSideTextLayers = React.useCallback((): TextLayerConfig[] => {
    if (!selectedTemplate?.layout_config) return [];
    
    const config = selectedTemplate.layout_config;
    if (!config.certificate?.textLayers) return [];
    
    const allLayers = config.certificate.textLayers;
    
    // 1. Get regular fields that need MANUAL input
    const regularFields = allLayers.filter((layer) => {
      // Skip layers with useDefaultText flag
      if (layer.useDefaultText) return false;
      // Skip auto-generated fields (for manual input only)
      if (layer.id === 'certificate_no' || layer.id === 'issue_date' || layer.id === 'expired_date' || layer.id === 'name') return false;
      return true;
    });
    
    // 2. Extract dynamic variables from ALL layers
    const variables = extractVariablesFromLayers(allLayers);
    const variableFields = createVariableFields(variables);
    
    // 3. Combine and deduplicate
    const regularFieldIds = new Set(regularFields.map(f => f.id));
    const uniqueVariableFields = variableFields.filter(v => !regularFieldIds.has(v.id));
    
    return [...regularFields, ...uniqueVariableFields];
  }, [selectedTemplate]);
  
  const isDualTemplate = React.useMemo(() => {
    return !!(selectedTemplate?.score_image_url && getScoreTextLayers().length > 0);
  }, [selectedTemplate, getScoreTextLayers]);

  // Separate flag for whether we need a manual input step (front and/or back),
  // independent of whether there are score/back fields.
  const hasMemberInputStep = React.useMemo(() => {
    if (!selectedTemplate) return false;
    const frontFields = getFrontSideTextLayers();
    const backFields = getScoreTextLayers();
    return frontFields.length > 0 || backFields.length > 0;
  }, [selectedTemplate, getFrontSideTextLayers, getScoreTextLayers]);
  
  // Check if all members have completed score data (for step 2 validation)
  const isAllScoreDataComplete = () => {
    if (currentStep !== 2) return true; // Only validate on step 2
    const frontFields = getFrontSideTextLayers();
    const backFields = getScoreTextLayers();
    const allFields = [...frontFields, ...backFields];
    return selectedMembers.every(memberId => {
      const memberData = scoreDataMap[memberId];
      if (!memberData) return false;
      return allFields.every((field: TextLayerConfig) => memberData[field.id]?.trim());
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
  
  // Get text layers from template that need mapping (including dynamic variables)
  const getMainTextLayers = React.useCallback((): TextLayerConfig[] => {
    if (!selectedTemplate?.layout_config) return [];
    const config = selectedTemplate.layout_config;
    
    // config.certificate.textLayers (standard template structure)
    if (config.certificate?.textLayers && Array.isArray(config.certificate.textLayers)) {
      const allLayers = config.certificate.textLayers;
      
      // Extract dynamic variables from ALL layers
      const variables = extractVariablesFromLayers(allLayers);
      const variableFields = createVariableFields(variables);
      
      // Combine original layers + variable fields for complete mapping
      const existingIds = new Set(allLayers.map(l => l.id));
      const uniqueVariableFields = variableFields.filter(v => !existingIds.has(v.id));
      
      return [...allLayers, ...uniqueVariableFields];
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

        // Auto-populate prestasi based on nilai untuk semua member (jika dual template)
        const finalScoreDataMap = scoreDataMap && Object.keys(scoreDataMap).length > 0
          ? (isDualTemplate ? batchAutoPopulatePrestasi(scoreDataMap) : scoreDataMap)
          : undefined;

        console.log('🔍 DEBUG QuickGenerateModal - Before Generate:', {
          isDualTemplate,
          hasScoreDataMap: !!scoreDataMap,
          scoreDataMapKeys: scoreDataMap ? Object.keys(scoreDataMap) : [],
          finalScoreDataMapKeys: finalScoreDataMap ? Object.keys(finalScoreDataMap) : [],
          selectedMemberIds: selectedMembers,
        });

        const params: QuickGenerateParams = {
          template: selectedTemplate,
          dataSource: 'member',
          dateFormat,
          members: selectedMemberObjects,
          certificateData: {
            certificate_no: '',
            description: '',
            issue_date: issueDate,
            expired_date: expiredDate,
          },
          // Selalu kirim map hasil isian user (dengan auto-prestasi jika dual)
          scoreDataMap: finalScoreDataMap,
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
      <DialogContent 
        className="max-w-3xl min-h-[600px] max-h-[90vh] overflow-y-auto"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && !generating) {
            // Only trigger on Enter if not in textarea and not already generating
            if (!(e.target instanceof HTMLTextAreaElement)) {
              e.preventDefault();
              handleGenerate();
            }
          } else if (e.key === 'Escape') {
            e.preventDefault();
            onClose();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            {t('quickGenerate.title')} {isDualTemplate && currentStep === 2 && `- ${t('quickGenerate.inputScoreData')}`}
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
                  <div className="p-2 text-sm text-gray-500 text-center">
                    Belum ada template yang dibuat untuk tenant ini
                  </div>
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
              <TabsList className="grid w-full grid-cols-2 dark:bg-gray-800 p-1 rounded-lg">
                <TabsTrigger 
                  value="member" 
                  className="flex items-center gap-2 rounded-md
                    data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-sm
                    dark:data-[state=active]:bg-blue-500 dark:data-[state=active]:text-white
                    data-[state=inactive]:text-gray-600 data-[state=inactive]:bg-transparent
                    dark:data-[state=inactive]:text-gray-400 dark:data-[state=inactive]:bg-transparent
                    hover:bg-gray-200 dark:hover:bg-gray-700/50
                    transition-all"
                >
                  <Users className="w-4 h-4" />
                  {t('quickGenerate.selectMember')}
                </TabsTrigger>
                <TabsTrigger 
                  value="excel" 
                  className="flex items-center gap-2 rounded-md
                    data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-sm
                    dark:data-[state=active]:bg-blue-500 dark:data-[state=active]:text-white
                    data-[state=inactive]:text-gray-600 data-[state=inactive]:bg-transparent
                    dark:data-[state=inactive]:text-gray-400 dark:data-[state=inactive]:bg-transparent
                    hover:bg-gray-200 dark:hover:bg-gray-700/50
                    transition-all"
                >
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
                      <div className="p-2 text-sm text-gray-500 text-center">
                        Belum ada data anggota untuk tenant ini
                      </div>
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
                    <CalendarIcon className="w-4 h-4" />
                    {t('quickGenerate.dateFormat')}
                  </Label>
                  <Select value={dateFormat} onValueChange={(value) => setDateFormat(value as DateFormat)}>
                    <SelectTrigger>
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4 text-gray-500" />
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
                {/* Date Format Selection for Excel */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4" />
                    Date Format
                  </Label>
                  <Select value={dateFormat} onValueChange={(value) => setDateFormat(value as DateFormat)}>
                    <SelectTrigger>
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4 text-gray-500" />
                        <SelectValue />
                      </div>
                    </SelectTrigger>
                    <SelectContent position="popper" className="z-[9999] max-h-[300px]" sideOffset={5}>
                      {DATE_FORMATS.map(format => (
                        <SelectItem key={format} value={format}>
                          {format}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <ExcelUploadStep
                  isDualTemplate={isDualTemplate}
                  mainData={excelMainData}
                  scoreData={excelScoreData}
                  onMainUpload={setExcelMainData}
                  onScoreUpload={setExcelScoreData}
                  mainFields={getAllFrontSideFields()}
                  scoreFields={getAllScoreFields()}
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
              _scorePreviewData={excelScoreData[0] || {}}
              onScoreMappingChange={setExcelScoreMapping}
            />
          </div>
        )}

        {/* Step 2/3: Input Data Front Side & Back Side (Member only) */}
        {currentStep >= 2 && dataSource === 'member' && hasMemberInputStep && (
          <div className="space-y-6 py-4">
            <InputScoreStep
              members={members.filter(m => selectedMembers.includes(m.id))}
              frontFields={getFrontSideTextLayers()}
              backFields={getScoreTextLayers()}
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
              {t('quickGenerate.back')}
            </Button>
          ) : (
            <div></div>
          )}
          
          <LoadingButton 
            onClick={() => {
              // Determine next action based on current step and data source
              if (currentStep === 1) {
                // Step 1: Move to step 2 for Excel mapping or member manual input
                if (dataSource === 'excel' && (excelMainData.length > 0)) {
                  setCurrentStep(2); // Go to mapping step
                } else if (dataSource === 'member' && hasMemberInputStep) {
                  setCurrentStep(2); // Go to input step (front and/or back)
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
              (dataSource === 'member' && hasMemberInputStep)
            ) ? (
              <>
                {t('quickGenerate.next')}
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

