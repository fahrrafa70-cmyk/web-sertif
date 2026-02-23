import { Template } from '@/lib/supabase/templates';
import { Member } from '@/lib/supabase/members';
import { DateFormat } from '@/types/certificate-generator';
import { TextLayerConfig } from '@/types/template-layout';

export interface QuickGenerateParams {
  template: Template;
  dataSource: 'excel' | 'member';
  dateFormat: DateFormat;
  excelData?: Array<Record<string, unknown>>;
  member?: Member;
  members?: Member[];
  certificateData?: {
    certificate_no: string;
    description: string;
    issue_date: string;
    expired_date: string;
  };
  scoreDataMap?: Record<string, Record<string, string>>;
  excelMainMapping?: Record<string, string>;
  excelScoreMapping?: Record<string, string>;
}

export interface QuickGenerateState {
  currentStep: number;
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
  generating: boolean;
  
  selectedTemplate: Template | null;
  setSelectedTemplate: React.Dispatch<React.SetStateAction<Template | null>>;
  
  dataSource: 'excel' | 'member';
  setDataSource: React.Dispatch<React.SetStateAction<'excel' | 'member'>>;
  
  dateFormat: DateFormat;
  setDateFormat: React.Dispatch<React.SetStateAction<DateFormat>>;
  
  selectedMembers: string[];
  setSelectedMembers: React.Dispatch<React.SetStateAction<string[]>>;
  
  scoreDataMap: Record<string, Record<string, string>>;
  setScoreDataMap: React.Dispatch<React.SetStateAction<Record<string, Record<string, string>>>>;
  
  excelMainData: Array<Record<string, unknown>>;
  setExcelMainData: React.Dispatch<React.SetStateAction<Array<Record<string, unknown>>>>;
  
  excelScoreData: Array<Record<string, unknown>>;
  setExcelScoreData: React.Dispatch<React.SetStateAction<Array<Record<string, unknown>>>>;
  
  excelMainMapping: Record<string, string>;
  setExcelMainMapping: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  
  excelScoreMapping: Record<string, string>;
  setExcelScoreMapping: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  
  issueDate: string;
  setIssueDate: React.Dispatch<React.SetStateAction<string>>;
  
  expiredDate: string;
  setExpiredDate: React.Dispatch<React.SetStateAction<string>>;
  
  templates: Template[];
  members: Member[];
  onGenerate: (params: QuickGenerateParams) => Promise<void>;
  onClose: () => void;
  open: boolean;
  
  t: (key: string) => string;
  
  isDualTemplate: boolean;
  hasMemberInputStep: boolean;
  
  getAllScoreFields: () => TextLayerConfig[];
  getScoreTextLayers: () => TextLayerConfig[];
  getAllFrontSideFields: () => TextLayerConfig[];
  getFrontSideTextLayers: () => TextLayerConfig[];
  getMainTextLayers: () => TextLayerConfig[];
  
  isAllScoreDataComplete: () => boolean;
  handleGenerate: () => Promise<void>;
}
