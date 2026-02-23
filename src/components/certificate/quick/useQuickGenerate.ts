import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Template } from '@/lib/supabase/templates';
import { Member } from '@/lib/supabase/members';
import { DateFormat } from '@/types/certificate-generator';
import { TextLayerConfig } from '@/types/template-layout';
import { extractVariablesFromLayer } from '@/lib/utils/variable-parser';
import { autoMapColumns, validateMapping, mergeExcelData } from '@/lib/utils/excel-mapping';
import { batchAutoPopulatePrestasi } from '@/lib/utils/score-predicates';
import { toast } from 'sonner';
import { QuickGenerateParams, QuickGenerateState } from './quick-types';

export function formatFieldLabel(layerId: string, field?: TextLayerConfig): string {
  if (layerId.includes('{') || layerId.includes('}')) return layerId;
  if (field?.defaultText) {
    const trimmed = field.defaultText.trim();
    if (trimmed === `{${layerId}}`) return `{${layerId}}`;
  }
  return layerId
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function extractVariablesFromLayers(layers: TextLayerConfig[]): string[] {
  const allVariables: string[] = [];
  for (const layer of layers) {
    const layerVars = extractVariablesFromLayer(layer);
    for (const varName of layerVars) {
      if (!allVariables.includes(varName)) allVariables.push(varName);
    }
  }
  return allVariables;
}

export function createVariableFields(variables: string[]): TextLayerConfig[] {
  return variables.map(varName => ({
    id: varName,
    x: 0, y: 0, xPercent: 0, yPercent: 0,
    defaultText: `{${varName}}`,
    useDefaultText: false,
    fontSize: 16, color: '#000000', fontWeight: '400', fontFamily: 'Arial',
  }));
}


interface UseQuickGenerateProps {
  open: boolean;
  onClose: () => void;
  templates: Template[];
  members: Member[];
  onGenerate: (params: QuickGenerateParams) => Promise<void>;
  t: (key: string) => string;
}

export function useQuickGenerate({
  open,
  onClose,
  templates,
  members,
  onGenerate,
  t
}: UseQuickGenerateProps): QuickGenerateState {
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [dataSource, setDataSource] = useState<'excel' | 'member'>('member');
  const [dateFormat, setDateFormat] = useState<DateFormat>('dd-mm-yyyy');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  
  const [currentStep, setCurrentStep] = useState(1);
  const [scoreDataMap, setScoreDataMap] = useState<Record<string, Record<string, string>>>({});
  
  const [excelMainData, setExcelMainData] = useState<Array<Record<string, unknown>>>([]);
  const [excelScoreData, setExcelScoreData] = useState<Array<Record<string, unknown>>>([]);
  const [excelMainMapping, setExcelMainMapping] = useState<Record<string, string>>({});
  const [excelScoreMapping, setExcelScoreMapping] = useState<Record<string, string>>({});
  
  const mainMappedRef = useRef(false);
  const scoreMappedRef = useRef(false);
  
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
  
  useEffect(() => {
    if (open) {
      setCurrentStep(1);
      setScoreDataMap({});
      setExcelMainData([]);
      setExcelScoreData([]);
      setExcelMainMapping({});
      setExcelScoreMapping({});
      mainMappedRef.current = false;
      scoreMappedRef.current = false;
    }
  }, [open, templates, members]);

  const getAllScoreFields = useCallback((): TextLayerConfig[] => {
    if (!selectedTemplate?.layout_config?.score?.textLayers) return [];
    const allLayers = selectedTemplate.layout_config.score.textLayers;
    const regularFields = allLayers.filter(layer => !layer.useDefaultText);
    const variables = extractVariablesFromLayers(allLayers);
    const variableFields = createVariableFields(variables);
    const regularFieldIds = new Set(regularFields.map(f => f.id));
    const uniqueVariableFields = variableFields.filter(v => !regularFieldIds.has(v.id));
    return [...regularFields, ...uniqueVariableFields];
  }, [selectedTemplate]);
  
  const getScoreTextLayers = useCallback((): TextLayerConfig[] => {
    if (!selectedTemplate?.layout_config?.score?.textLayers) return [];
    if (!Array.isArray(selectedTemplate.layout_config.score.textLayers)) return [];
    const allLayers = selectedTemplate.layout_config.score.textLayers;
    const regularFields = allLayers.filter((layer) => {
      if (layer.useDefaultText) return false;
      if (['issue_date', 'certificate_no', 'name'].includes(layer.id)) return false;
      return true;
    });
    const variables = extractVariablesFromLayers(allLayers);
    const variableFields = createVariableFields(variables);
    const regularFieldIds = new Set(regularFields.map(f => f.id));
    const uniqueVariableFields = variableFields.filter(v => !regularFieldIds.has(v.id));
    return [...regularFields, ...uniqueVariableFields];
  }, [selectedTemplate]);
  
  const getAllFrontSideFields = useCallback((): TextLayerConfig[] => {
    if (!selectedTemplate?.layout_config?.certificate?.textLayers) return [];
    const allLayers = selectedTemplate.layout_config.certificate.textLayers;
    const regularFields = allLayers.filter(layer => !layer.useDefaultText);
    const variables = extractVariablesFromLayers(allLayers);
    const variableFields = createVariableFields(variables);
    const regularFieldIds = new Set(regularFields.map(f => f.id));
    const uniqueVariableFields = variableFields.filter(v => !regularFieldIds.has(v.id));
    return [...regularFields, ...uniqueVariableFields];
  }, [selectedTemplate]);

  const getFrontSideTextLayers = useCallback((): TextLayerConfig[] => {
    if (!selectedTemplate?.layout_config?.certificate?.textLayers) return [];
    const allLayers = selectedTemplate.layout_config.certificate.textLayers;
    const regularFields = allLayers.filter((layer) => {
      if (layer.useDefaultText) return false;
      if (['certificate_no', 'issue_date', 'expired_date', 'name'].includes(layer.id)) return false;
      return true;
    });
    const variables = extractVariablesFromLayers(allLayers);
    const variableFields = createVariableFields(variables);
    const regularFieldIds = new Set(regularFields.map(f => f.id));
    const uniqueVariableFields = variableFields.filter(v => !regularFieldIds.has(v.id));
    return [...regularFields, ...uniqueVariableFields];
  }, [selectedTemplate]);
  
  const isDualTemplate = useMemo(() => {
    return !!(selectedTemplate?.score_image_url && getScoreTextLayers().length > 0);
  }, [selectedTemplate, getScoreTextLayers]);

  const hasMemberInputStep = useMemo(() => {
    if (!selectedTemplate) return false;
    const frontFields = getFrontSideTextLayers();
    const backFields = getScoreTextLayers();
    return frontFields.length > 0 || backFields.length > 0;
  }, [selectedTemplate, getFrontSideTextLayers, getScoreTextLayers]);
  
  const isAllScoreDataComplete = () => {
    if (currentStep !== 2) return true;
    const frontFields = getFrontSideTextLayers();
    const backFields = getScoreTextLayers();
    const allFields = [...frontFields, ...backFields];
    return selectedMembers.every(memberId => {
      const memberData = scoreDataMap[memberId];
      if (!memberData) return false;
      return allFields.every((field: TextLayerConfig) => memberData[field.id]?.trim());
    });
  };
  
  useEffect(() => {
    if (issueDate) {
      const issue = new Date(issueDate);
      const expiry = new Date(issue);
      expiry.setFullYear(expiry.getFullYear() + 3);
      setExpiredDate(expiry.toISOString().split('T')[0]);
    }
  }, [issueDate]);
  
  const getMainTextLayers = useCallback((): TextLayerConfig[] => {
    if (!selectedTemplate?.layout_config?.certificate?.textLayers) return [];
    if (Array.isArray(selectedTemplate.layout_config.certificate.textLayers)) {
      const allLayers = selectedTemplate.layout_config.certificate.textLayers;
      const variables = extractVariablesFromLayers(allLayers);
      const variableFields = createVariableFields(variables);
      const existingIds = new Set(allLayers.map(l => l.id));
      const uniqueVariableFields = variableFields.filter(v => !existingIds.has(v.id));
      return [...allLayers, ...uniqueVariableFields];
    }
    return [];
  }, [selectedTemplate]);
  
  useEffect(() => {
    if (excelMainData.length > 0 && !mainMappedRef.current) {
      const mainColumns = Object.keys(excelMainData[0] || {});
      const mainLayers = getMainTextLayers();
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
      toast.error(t('quickGenerate.selectTemplateError')); return;
    }
    if (dataSource === 'member' && selectedMembers.length === 0) {
      toast.error(t('quickGenerate.selectMemberError')); return;
    }
    if (dataSource === 'excel' && excelMainData.length === 0) {
      toast.error(t('quickGenerate.uploadExcelError')); return;
    }
    if (dataSource === 'excel' && isDualTemplate && excelScoreData.length === 0) {
      toast.error(t('quickGenerate.uploadScoreExcelRequired')); return;
    }

    try {
      setGenerating(true);
      if (dataSource === 'member') {
        const selectedMemberObjects = selectedMembers
          .map(id => members.find(m => m.id === id))
          .filter((m): m is Member => m !== undefined);

        const finalScoreDataMap = scoreDataMap && Object.keys(scoreDataMap).length > 0
          ? (isDualTemplate ? batchAutoPopulatePrestasi(scoreDataMap) : scoreDataMap)
          : undefined;

        const params: QuickGenerateParams = {
          template: selectedTemplate,
          dataSource: 'member',
          dateFormat,
          members: selectedMemberObjects,
          certificateData: { certificate_no: '', description: '', issue_date: issueDate, expired_date: expiredDate },
          scoreDataMap: finalScoreDataMap,
        };
        await onGenerate(params);
      } else {
        let finalExcelData: Array<Record<string, unknown>>;
        if (isDualTemplate && excelScoreData.length > 0) {
          finalExcelData = mergeExcelData(excelMainData, excelScoreData, excelMainMapping, excelScoreMapping);
        } else {
          finalExcelData = excelMainData.map(row => {
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
          excelScoreMapping: isDualTemplate ? excelScoreMapping : undefined
        };
        await onGenerate(params);
      }
      
      setSelectedTemplate(null);
      setSelectedMembers([]);
      setExcelMainData([]);
      setExcelScoreData([]);
      setExcelMainMapping({});
      setExcelScoreMapping({});
      setScoreDataMap({});
      setCurrentStep(1);
      mainMappedRef.current = false;
      scoreMappedRef.current = false;
      setIssueDate(() => { const now = new Date(); return now.toISOString().split('T')[0]; });
      setExpiredDate(() => { const now = new Date(); const expiry = new Date(now); expiry.setFullYear(expiry.getFullYear() + 3); return expiry.toISOString().split('T')[0]; });
      
      onClose();
    } catch (error) {
      console.error('Generate error:', error);
      toast.error(error instanceof Error ? error.message : t('quickGenerate.generateError'));
    } finally {
      setGenerating(false);
    }
  };

  return {
    currentStep, setCurrentStep, generating, selectedTemplate, setSelectedTemplate, dataSource, setDataSource,
    dateFormat, setDateFormat, selectedMembers, setSelectedMembers, scoreDataMap, setScoreDataMap,
    excelMainData, setExcelMainData, excelScoreData, setExcelScoreData, excelMainMapping, setExcelMainMapping,
    excelScoreMapping, setExcelScoreMapping, issueDate, setIssueDate, expiredDate, setExpiredDate,
    templates, members, onGenerate, onClose, open, t, isDualTemplate, hasMemberInputStep, getAllScoreFields,
    getScoreTextLayers, getAllFrontSideFields, getFrontSideTextLayers, getMainTextLayers, isAllScoreDataComplete,
    handleGenerate
  };
}
