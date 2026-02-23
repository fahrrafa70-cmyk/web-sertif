import React, { useState } from 'react';
import { Member } from '@/lib/supabase/members';
import { TextLayerConfig } from '@/types/template-layout';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/contexts/language-context';
import { formatFieldLabel } from './useQuickGenerate';

interface InputScoreStepProps {
  members: Member[];
  frontFields: TextLayerConfig[]; 
  backFields: TextLayerConfig[]; 
  scoreDataMap: Record<string, Record<string, string>>;
  setScoreDataMap: React.Dispatch<React.SetStateAction<Record<string, Record<string, string>>>>;
}

export function InputScoreStep({ members, frontFields, backFields, scoreDataMap, setScoreDataMap }: InputScoreStepProps) {
  const { t } = useLanguage();
  const [selectedMemberId, setSelectedMemberId] = useState(members[0]?.id || '');
  
  const currentScoreData = scoreDataMap[selectedMemberId] || {};
  
  const handleFieldChange = (fieldId: string, value: string) => {
    setScoreDataMap(prev => ({
      ...prev,
      [selectedMemberId]: {
        ...prev[selectedMemberId],
        [fieldId]: value
      }
    }));
  };
  
  const isMemberComplete = (memberId: string) => {
    const memberData = scoreDataMap[memberId];
    if (!memberData) return false;
    const allFields = [...frontFields, ...backFields];
    return allFields.every(field => memberData[field.id]?.trim());
  };
  
  const completedCount = members.filter(m => isMemberComplete(m.id)).length;
  
  return (
    <div className="space-y-6">
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
