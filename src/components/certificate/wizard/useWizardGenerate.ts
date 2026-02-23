import { useState, useEffect, useCallback, useMemo } from 'react';
import { Template, getTemplateLayout } from "@/lib/supabase/templates";
import { Member } from "@/lib/supabase/members";
import type { TemplateLayoutConfig, TextLayerConfig } from "@/types/template-layout";
import { autoMapColumns, validateMapping, mergeExcelData } from "@/lib/utils/excel-mapping";
import { extractVariablesFromLayer } from "@/lib/utils/variable-parser";
import { QuickGenerateParams } from "../QuickGenerateModal";
import { toast } from "sonner";
import { DateFormat, WizardGenerateState } from "./wizard-types";

interface UseWizardGenerateProps {
  open: boolean;
  onClose: () => void;
  templates: Template[];
  members: Member[];
  onGenerate: (params: QuickGenerateParams) => Promise<void>;
  t: (key: string) => string;
  safeT: (key: string, fallback: string) => string;
}

export function useWizardGenerate({
  open,
  onClose,
  templates,
  members,
  onGenerate,
  t,
  safeT
}: UseWizardGenerateProps) {
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
  
  // Excel column mapping state
  const [excelMainMapping, setExcelMainMapping] = useState<Record<string, string>>({});
  const [excelScoreMapping, setExcelScoreMapping] = useState<Record<string, string>>({});
  
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
  const [certificateData, setCertificateData] = useState<Record<string, string>>({
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
      setExcelMainMapping({});
      setExcelScoreMapping({});
    }
  }, [open]);

  // Load layout config
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

  // Auto-update expired date
  useEffect(() => {
    if (issueDate) {
      const issue = new Date(issueDate);
      const expiry = new Date(issue);
      expiry.setFullYear(expiry.getFullYear() + 3);
      setExpiredDate(expiry.toISOString().split('T')[0]);
    }
  }, [issueDate]);

  // Get main text layers
  const getMainTextLayers = useCallback((): TextLayerConfig[] => {
    if (!layoutConfig?.certificate?.textLayers) return [];
    
    const directLayers = layoutConfig.certificate.textLayers.filter(layer => {
      if (layer.useDefaultText) return false;
      if (dataSource === 'member' && ['certificate_no', 'issue_date', 'expired_date'].includes(layer.id)) return false;
      if (dataSource === 'excel' && ['issue_date', 'expired_date'].includes(layer.id)) return false;
      return true;
    });
    
    if (dataSource === 'excel') {
      const variableNames: string[] = [];
      const certificateLayers = layoutConfig.certificate.textLayers || [];
      
      for (const layer of certificateLayers) {
        const vars = extractVariablesFromLayer(layer);
        for (const v of vars) if (!variableNames.includes(v)) variableNames.push(v);
      }
      
      const variableFields = variableNames.map((varName) => ({
        id: varName,
        x: 0, y: 0, xPercent: 0, yPercent: 0,
        defaultText: `{${varName}}`,
        useDefaultText: false,
        fontSize: 16, color: '#000000', fontWeight: '400' as const, fontFamily: 'Arial',
      }));
      
      const existingIds = new Set(directLayers.map(l => l.id));
      const uniqueVariableFields = variableFields.filter(field => !existingIds.has(field.id));
      return [...directLayers, ...uniqueVariableFields];
    }
    return directLayers;
  }, [layoutConfig, dataSource]);

  // Get score text layers
  const getScoreTextLayers = useCallback((): TextLayerConfig[] => {
    if (!layoutConfig?.score?.textLayers) return [];
    
    const directLayers = layoutConfig.score.textLayers.filter(layer => {
      if (layer.useDefaultText) return false;
      if (dataSource === 'member' && ['certificate_no', 'issue_date', 'expired_date', 'score_date', 'name'].includes(layer.id)) return false;
      if (dataSource === 'excel' && ['issue_date', 'expired_date', 'score_date', 'name'].includes(layer.id)) return false;
      return true;
    });
    
    if (dataSource === 'excel') {
      const variableNames: string[] = [];
      const scoreLayers = layoutConfig.score.textLayers || [];
      
      for (const layer of scoreLayers) {
        const vars = extractVariablesFromLayer(layer);
        for (const v of vars) if (!variableNames.includes(v)) variableNames.push(v);
      }
      
      const variableFields = variableNames.map((varName) => ({
        id: varName,
        x: 0, y: 0, xPercent: 0, yPercent: 0,
        defaultText: `{${varName}}`,
        useDefaultText: false,
        fontSize: 16, color: '#000000', fontWeight: '400' as const, fontFamily: 'Arial',
      }));
      
      const existingIds = new Set(directLayers.map(l => l.id));
      const uniqueVariableFields = variableFields.filter(field => !existingIds.has(field.id));
      return [...directLayers, ...uniqueVariableFields];
    }
    return directLayers;
  }, [layoutConfig, dataSource]);

  // Auto-mapping
  useEffect(() => {
    if (excelData.length > 0 && layoutConfig) {
      const mainColumns = Object.keys(excelData[0] || {});
      const mainLayers = getMainTextLayers();
      
      if (mainLayers.length > 0 && mainColumns.length > 0) {
        const autoMapping = autoMapColumns(mainColumns, mainLayers);
        setExcelMainMapping(autoMapping);
      }
      
      if (selectedTemplate?.is_dual_template) {
        const scoreLayers = getScoreTextLayers();
        if (scoreLayers.length > 0 && mainColumns.length > 0) {
          const scoreAutoMapping = autoMapColumns(mainColumns, scoreLayers);
          setExcelScoreMapping(scoreAutoMapping);
        }
      }
    }
  }, [excelData, layoutConfig, selectedTemplate, getMainTextLayers, getScoreTextLayers]);

  // Get template fields for manual input
  const getTemplateFields = useMemo(() => {
    if (!layoutConfig) return [];
    const config = layoutConfig;
    const allFields: TextLayerConfig[] = [];

    const certificateLayers = config.certificate?.textLayers || [];
    if (certificateLayers.length > 0) {
      const frontFields = certificateLayers.filter((layer) => {
        const shouldSkip =
          layer.id === 'issue_date' ||
          layer.id === 'expired_date' ||
          layer.id === 'description' ||
          layer.useDefaultText === true ||
          (dataSource === 'member' && layer.id === 'name') ||
          (dataSource === 'member' && layer.id === 'certificate_no');
        return !shouldSkip;
      });
      allFields.push(...frontFields);
    }

    const scoreLayers = selectedTemplate?.is_dual_template && config.score?.textLayers
      ? config.score.textLayers
      : [];
    if (scoreLayers.length > 0) {
      const backFields = scoreLayers.filter((layer) => {
        const isAutoField =
          layer.id === 'issue_date' ||
          layer.id === 'expired_date' ||
          layer.id === 'score_date' ||
          layer.id === 'name' ||
          (dataSource === 'member' && layer.id === 'certificate_no');
        const shouldSkip = isAutoField || layer.useDefaultText === true;
        return !shouldSkip;
      });
      allFields.push(...backFields);
    }

    const variableNames: string[] = [];
    const pushVarsFromLayers = (layers: TextLayerConfig[]) => {
      for (const layer of layers) {
        const vars = extractVariablesFromLayer(layer);
        for (const v of vars) if (!variableNames.includes(v)) variableNames.push(v);
      }
    };

    pushVarsFromLayers(certificateLayers);
    pushVarsFromLayers(scoreLayers as TextLayerConfig[]);

    const createVariableFields = (variables: string[]): TextLayerConfig[] => {
      return variables.map((varName) => ({
        id: varName,
        x: 0, y: 0, xPercent: 0, yPercent: 0,
        defaultText: `{${varName}}`,
        useDefaultText: false,
        fontSize: 16, color: '#000000', fontWeight: '400', fontFamily: 'Arial',
      }));
    };

    const existingIds = new Set(allFields.map((f) => f.id));
    const variableFields = createVariableFields(variableNames).filter(field => !existingIds.has(field.id));
    allFields.push(...variableFields);

    return allFields;
  }, [selectedTemplate, layoutConfig, dataSource]);

  const handleNext = () => { if (currentStep < 4) setCurrentStep(currentStep + 1); };
  const handleBack = () => { if (currentStep > 1) setCurrentStep(currentStep - 1); };

  const canProceedFromStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!selectedTemplate && !loadingLayout;
      case 2:
        return dataSource === 'excel' ? excelData.length > 0 : selectedMembers.length > 0;
      case 3:
        if (!issueDate) return false;
        if (dataSource === 'member') {
          const templateFields = getTemplateFields.filter(field => field.id !== 'description');
          const hasEmptyRequiredField = templateFields.some((field) => {
            const rawValue = certificateData[field.id as keyof typeof certificateData];
            const value = rawValue === undefined || rawValue === null ? '' : String(rawValue).trim();
            return value.length === 0;
          });
          if (hasEmptyRequiredField) return false;
        }
        if (dataSource === 'excel') {
          const mainLayers = getMainTextLayers();
          const validation = validateMapping(excelMainMapping, mainLayers);
          if (!validation.valid) return false;
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
          certificateData: {
            certificate_no: certificateData.certificate_no || '',
            description: certificateData.description || '',
            issue_date: issueDate,
            expired_date: expiredDate,
            ...certificateData,
          },
        };
        await onGenerate(params);
      } else {
        let finalExcelData: Array<Record<string, unknown>>;
        if (selectedTemplate?.is_dual_template) {
          finalExcelData = mergeExcelData(excelData, excelData, excelMainMapping, excelScoreMapping);
        } else {
          finalExcelData = excelData.map(row => {
            const transformed: Record<string, unknown> = {};
            for (const [layerId, excelCol] of Object.entries(excelMainMapping)) {
              transformed[layerId] = row[excelCol];
            }
            return { ...row, ...transformed };
          });
        }
        const params: QuickGenerateParams = {
          template: selectedTemplate,
          dataSource: 'excel',
          dateFormat,
          excelData: finalExcelData,
          excelMainMapping,
          excelScoreMapping: selectedTemplate?.is_dual_template ? excelScoreMapping : undefined,
          certificateData: {
            certificate_no: certificateData.certificate_no || '',
            description: certificateData.description || '',
            issue_date: issueDate,
            expired_date: expiredDate,
          }
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

  const state: WizardGenerateState = {
    currentStep, setCurrentStep, generating,
    selectedTemplate, setSelectedTemplate, layoutConfig, loadingLayout,
    dataSource, setDataSource, excelData, setExcelData,
    selectedMembers, setSelectedMembers, excelMainMapping, setExcelMainMapping,
    excelScoreMapping, setExcelScoreMapping, dateFormat, setDateFormat,
    issueDate, setIssueDate, expiredDate, setExpiredDate,
    certificateData, setCertificateData, getMainTextLayers, getScoreTextLayers,
    getTemplateFields, templates, members, t, safeT
  };

  return { state, handleNext, handleBack, canProceedFromStep, handleGenerate };
}
