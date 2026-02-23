import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, FileSpreadsheet, Calendar as CalendarIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ExcelUploadStep } from '../ExcelUploadStep';
import { DATE_FORMATS, DateFormat } from '@/types/certificate-generator';
import { QuickGenerateState } from './quick-types';

interface QuickStep1SetupProps {
  state: QuickGenerateState;
}

export function QuickStep1Setup({ state }: QuickStep1SetupProps) {
  const {
    t, templates, selectedTemplate, setSelectedTemplate, dataSource, setDataSource,
    members, selectedMembers, setSelectedMembers, dateFormat, setDateFormat,
    issueDate, setIssueDate, expiredDate, setExpiredDate,
    excelMainData, setExcelMainData, excelScoreData, setExcelScoreData,
    isDualTemplate, getAllFrontSideFields, getAllScoreFields
  } = state;

  return (
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
  );
}
