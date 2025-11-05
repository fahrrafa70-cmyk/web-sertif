"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { FileSpreadsheet, Users, Calendar, Zap, ArrowRight, ArrowLeft } from "lucide-react";
import { Template } from "@/lib/supabase/templates";
import { Member } from "@/lib/supabase/members";
import { DateFormat, DATE_FORMATS } from "@/types/certificate-generator";
import { TextLayerConfig } from "@/types/template-layout";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/language-context";

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
          <Label className="text-base font-semibold">Pilih Member</Label>
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
              placeholder={`Masukkan ${formatFieldLabel(field.id)}`}
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
  const [excelData, setExcelData] = useState<Array<Record<string, unknown>>>([]);
  const [generating, setGenerating] = useState(false);
  
  // Multi-step flow for dual template
  const [currentStep, setCurrentStep] = useState<1 | 2>(1); // Step 1: select, Step 2: input scores
  const [scoreDataMap, setScoreDataMap] = useState<Record<string, Record<string, string>>>({});
  
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
    }
  }, [open, templates, members]);
  
  // Detect if template is dual (has score layout)
  // Filter out layers that have useDefaultText=true (like score_date) or are default certificate layers (like issue_date)
  const getScoreTextLayers = (): TextLayerConfig[] => {
    if (!selectedTemplate?.layout_config) return [];
    
    const config = selectedTemplate.layout_config as Record<string, unknown>;
    if (!config.score || typeof config.score !== 'object') return [];
    
    const scoreConfig = config.score as Record<string, unknown>;
    if (!Array.isArray(scoreConfig.textLayers)) return [];
    
    const allLayers = scoreConfig.textLayers as TextLayerConfig[];
    
    // Only return layers that need user input
    // Exclude: layers with useDefaultText=true OR default certificate layers (issue_date, certificate_no, name)
    return allLayers.filter((layer: TextLayerConfig) => {
      // Skip layers with useDefaultText flag
      if (layer.useDefaultText) return false;
      // Skip default certificate layers that shouldn't need input in score mode
      if (layer.id === 'issue_date' || layer.id === 'certificate_no' || layer.id === 'name') return false;
      return true;
    });
  };
  const isDualTemplate = !!(selectedTemplate?.score_image_url && getScoreTextLayers().length > 0);
  
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
  
  const excelInputRef = useRef<HTMLInputElement>(null);

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(worksheet, { defval: "" }) as Array<Record<string, unknown>>;
      
      setExcelData(data);
      toast.success(`${t('quickGenerate.loadedRows')} ${data.length} ${t('quickGenerate.rowsFromExcel')}`);
    } catch (error) {
      console.error('Excel parse error:', error);
      toast.error(t('quickGenerate.parseExcelError'));
    }
  };

  const handleGenerate = async () => {
    if (!selectedTemplate) {
      toast.error(t('quickGenerate.selectTemplateError'));
      return;
    }

    if (dataSource === 'member' && selectedMembers.length === 0) {
      toast.error(t('quickGenerate.selectMemberError'));
      return;
    }

    if (dataSource === 'excel' && excelData.length === 0) {
      toast.error(t('quickGenerate.uploadExcelError'));
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
        // Excel source - single call
        const params: QuickGenerateParams = {
          template: selectedTemplate,
          dataSource: 'excel',
          dateFormat,
          excelData
        };
        await onGenerate(params);
      }
      
      // Reset form
      setSelectedTemplate(null);
      setSelectedMembers([]);
      setExcelData([]);
      setScoreDataMap({});
      setCurrentStep(1);
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Zap className="w-6 h-6 text-yellow-500" />
            {t('quickGenerate.title')} {isDualTemplate && currentStep === 2 && '- Input Data Nilai'}
          </DialogTitle>
          <DialogDescription>
            {currentStep === 1 ? t('quickGenerate.description') : 'Isi data nilai untuk setiap member yang dipilih'}
          </DialogDescription>
        </DialogHeader>

        {currentStep === 1 ? (
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
                      <SelectValue />
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
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <FileSpreadsheet className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <input
                    ref={excelInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleExcelUpload}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    onClick={() => excelInputRef.current?.click()}
                    className="mb-2"
                  >
                    {t('quickGenerate.chooseExcelFile')}
                  </Button>
                  <p className="text-sm text-gray-500">
                    {excelData.length > 0 
                      ? `${excelData.length} ${t('quickGenerate.rowsLoaded')}` 
                      : t('quickGenerate.uploadExcelHint')}
                  </p>
                </div>

                {excelData.length > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm text-green-800">
                      ✓ {t('quickGenerate.loadedRows')} {excelData.length} {t('quickGenerate.rowsFromExcel')}
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      {t('quickGenerate.willGenerate')} {excelData.length} {t('quickGenerate.certificatesAtOnce')}
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Step 2: Input Score Data */}
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
          {currentStep === 2 ? (
            <Button variant="outline" onClick={() => setCurrentStep(1)} disabled={generating}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Kembali
            </Button>
          ) : (
            <div></div>
          )}
          <Button 
            onClick={currentStep === 1 && isDualTemplate && dataSource === 'member' ? () => setCurrentStep(2) : handleGenerate}
            disabled={
              generating || 
              !selectedTemplate || 
              (dataSource === 'member' && selectedMembers.length === 0) || 
              (dataSource === 'excel' && excelData.length === 0) ||
              (currentStep === 2 && !isAllScoreDataComplete())
            }
            className="gradient-primary text-white"
          >
            {generating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {t('quickGenerate.generating')}
              </>
            ) : currentStep === 1 && isDualTemplate && dataSource === 'member' ? (
              <>
                Selanjutnya
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                {t('quickGenerate.generate')} {
                  dataSource === 'excel' && excelData.length > 0 
                    ? `(${excelData.length})`
                    : dataSource === 'member' && selectedMembers.length > 0
                    ? `(${selectedMembers.length})`
                    : ''
                }
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

