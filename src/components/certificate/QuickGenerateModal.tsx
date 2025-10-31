"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { FileSpreadsheet, Users, Calendar, Zap } from "lucide-react";
import { Template } from "@/lib/supabase/templates";
import { Member } from "@/lib/supabase/members";
import { DateFormat, DATE_FORMATS } from "@/types/certificate-generator";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { generateCertificateNumber } from "@/lib/supabase/certificates";

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
  // For Member
  member?: Member;
  certificateData?: {
    certificate_no: string;
    description: string;
    issue_date: string;
    expired_date: string;
  };
}

export function QuickGenerateModal({ 
  open, 
  onClose, 
  templates, 
  members,
  onGenerate 
}: QuickGenerateModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [dataSource, setDataSource] = useState<'excel' | 'member'>('member');
  const [dateFormat, setDateFormat] = useState<DateFormat>('dd-mm-yyyy');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [excelData, setExcelData] = useState<Array<Record<string, unknown>>>([]);
  const [generating, setGenerating] = useState(false);
  
  // Certificate data for member source - Initialize with default values
  const [certificateNo, setCertificateNo] = useState('');
  const [description, setDescription] = useState('');
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
  
  // Debug: Log data availability
  React.useEffect(() => {
    if (open) {
      console.log('📊 Quick Generate Modal Data:', {
        templatesCount: templates.length,
        membersCount: members.length,
        templates: templates.slice(0, 3).map(t => ({ id: t.id, name: t.name })),
        members: members.slice(0, 3).map(m => ({ id: m.id, name: m.name }))
      });
    }
  }, [open, templates, members]);
  
  // Auto-generate certificate number when modal opens or issue date changes
  useEffect(() => {
    const autoGenerateCertNo = async () => {
      if (open && issueDate && !certificateNo) {
        try {
          const issueDateTime = new Date(issueDate);
          const newCertNo = await generateCertificateNumber(issueDateTime);
          setCertificateNo(newCertNo);
          console.log('✨ Auto-generated certificate number:', newCertNo);
        } catch (error) {
          console.error('Failed to auto-generate certificate number:', error);
        }
      }
    };
    
    autoGenerateCertNo();
  }, [open, issueDate, certificateNo]);
  
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
      toast.success(`Loaded ${data.length} rows from Excel`);
    } catch (error) {
      console.error('Excel parse error:', error);
      toast.error('Failed to parse Excel file');
    }
  };

  const handleGenerate = async () => {
    if (!selectedTemplate) {
      toast.error('Please select a template');
      return;
    }

    if (dataSource === 'member' && !selectedMember) {
      toast.error('Please select a member');
      return;
    }

    if (dataSource === 'member' && !certificateNo) {
      toast.error('Please enter certificate number');
      return;
    }

    if (dataSource === 'excel' && excelData.length === 0) {
      toast.error('Please upload Excel file');
      return;
    }

    try {
      setGenerating(true);
      
      const params: QuickGenerateParams = {
        template: selectedTemplate,
        dataSource,
        dateFormat,
        ...(dataSource === 'excel' ? {
          excelData
        } : {
          member: selectedMember!,
          certificateData: {
            certificate_no: certificateNo,
            description,
            issue_date: issueDate,
            expired_date: expiredDate
          }
        })
      };

      await onGenerate(params);
      
      // Reset form
      setSelectedTemplate(null);
      setSelectedMember(null);
      setExcelData([]);
      setCertificateNo('');
      setDescription('');
      setIssueDate('');
      setExpiredDate('');
      
      // Toast success is handled in parent component (handleQuickGenerate)
      onClose();
    } catch (error) {
      console.error('Generate error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate certificate');
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
            Generate Certificate
          </DialogTitle>
          <DialogDescription>
            Generate certificates by selecting a template and data source
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Step 1: Select Template */}
          <div className="space-y-3">
            <Label className="text-base font-semibold flex items-center gap-2">
              <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">1</span>
              Select Template
            </Label>
            <Select value={selectedTemplate?.id || ''} onValueChange={(id) => {
              const template = templates.find(t => t.id === id);
              setSelectedTemplate(template || null);
              console.log('✅ Template selected:', template?.name);
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a template..." />
              </SelectTrigger>
              <SelectContent position="popper" className="z-[9999] max-h-[300px]" sideOffset={5}>
                {templates.length === 0 ? (
                  <div className="p-2 text-sm text-gray-500">Loading templates...</div>
                ) : (
                  templates.map(template => (
                    <SelectItem 
                      key={template.id} 
                      value={template.id}
                      disabled={!template.is_layout_configured}
                    >
                      <div className="flex items-center justify-between w-full gap-2">
                        <span>
                          {template.name} {template.is_dual_template && '(Certificate + Score)'}
                        </span>
                        {!template.is_layout_configured && (
                          <Badge variant="secondary" className="bg-yellow-500 text-white text-xs">
                            Not Configured
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {selectedTemplate && (
              <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                <strong>Selected:</strong> {selectedTemplate.name} - {selectedTemplate.orientation}
              </div>
            )}
          </div>

          {/* Step 2: Date Format */}
          <div className="space-y-3">
            <Label className="text-base font-semibold flex items-center gap-2">
              <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">2</span>
              <Calendar className="w-4 h-4" />
              Date Format
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

          {/* Step 3: Data Source */}
          <div className="space-y-3">
            <Label className="text-base font-semibold flex items-center gap-2">
              <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">3</span>
              Data Source
            </Label>
            
            <Tabs value={dataSource} onValueChange={(value) => setDataSource(value as 'excel' | 'member')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="member" className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Select Member
                </TabsTrigger>
                <TabsTrigger value="excel" className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4" />
                  Upload Excel
                </TabsTrigger>
              </TabsList>

              {/* Member Tab */}
              <TabsContent value="member" className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Member</Label>
                  <Select value={selectedMember?.id || ''} onValueChange={(id) => {
                    const member = members.find(m => m.id === id);
                    setSelectedMember(member || null);
                    console.log('✅ Member selected:', member?.name);
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a member..." />
                    </SelectTrigger>
                    <SelectContent position="popper" className="z-[9999] max-h-[300px]" sideOffset={5}>
                      {members.length === 0 ? (
                        <div className="p-2 text-sm text-gray-500">Loading members...</div>
                      ) : (
                        members.map(member => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.name} - {member.organization || 'No Organization'}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Certificate Number *</Label>
                    <Input 
                      value={certificateNo}
                      onChange={(e) => setCertificateNo(e.target.value)}
                      placeholder="CERT-001"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input 
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Certificate of Achievement"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Issue Date *</Label>
                    <Input 
                      type="date"
                      value={issueDate}
                      onChange={(e) => setIssueDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Expired Date</Label>
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
                    Choose Excel File
                  </Button>
                  <p className="text-sm text-gray-500">
                    {excelData.length > 0 
                      ? `${excelData.length} rows loaded` 
                      : 'Upload .xlsx or .xls file'}
                  </p>
                </div>

                {excelData.length > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm text-green-800">
                      ✓ Excel file loaded successfully with {excelData.length} row(s)
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      This will generate {excelData.length} certificate(s) at once
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={generating}>
            Cancel
          </Button>
          <Button 
            onClick={handleGenerate}
            disabled={generating || !selectedTemplate}
            className="gradient-primary text-white"
          >
            {generating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Generating...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                Generate {dataSource === 'excel' && excelData.length > 0 && `(${excelData.length})`}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

