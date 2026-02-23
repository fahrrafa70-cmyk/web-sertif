import { Template } from "@/lib/supabase/templates";
import { Member } from "@/lib/supabase/members";
import type { TemplateLayoutConfig, TextLayerConfig } from "@/types/template-layout";

export type DateFormat = 'dd-mm-yyyy' | 'mm-dd-yyyy' | 'yyyy-mm-dd' | 'dd-indonesian-yyyy';

export const DATE_FORMATS: DateFormat[] = [
  'dd-mm-yyyy',
  'mm-dd-yyyy', 
  'yyyy-mm-dd',
  'dd-indonesian-yyyy'
];

export interface WizardGenerateState {
  currentStep: number;
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
  generating: boolean;
  
  selectedTemplate: Template | null;
  setSelectedTemplate: React.Dispatch<React.SetStateAction<Template | null>>;
  layoutConfig: TemplateLayoutConfig | null;
  loadingLayout: boolean;
  
  dataSource: 'excel' | 'member';
  setDataSource: React.Dispatch<React.SetStateAction<'excel' | 'member'>>;
  excelData: Array<Record<string, unknown>>;
  setExcelData: React.Dispatch<React.SetStateAction<Array<Record<string, unknown>>>>;
  selectedMembers: string[];
  setSelectedMembers: React.Dispatch<React.SetStateAction<string[]>>;
  
  excelMainMapping: Record<string, string>;
  setExcelMainMapping: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  excelScoreMapping: Record<string, string>;
  setExcelScoreMapping: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  
  dateFormat: DateFormat;
  setDateFormat: React.Dispatch<React.SetStateAction<DateFormat>>;
  issueDate: string;
  setIssueDate: React.Dispatch<React.SetStateAction<string>>;
  expiredDate: string;
  setExpiredDate: React.Dispatch<React.SetStateAction<string>>;
  certificateData: Record<string, string>;
  setCertificateData: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  
  getMainTextLayers: () => TextLayerConfig[];
  getScoreTextLayers: () => TextLayerConfig[];
  getTemplateFields: TextLayerConfig[];
  
  templates: Template[];
  members: Member[];
  t: (key: string) => string;
  safeT: (key: string, fallback: string) => string;
}
