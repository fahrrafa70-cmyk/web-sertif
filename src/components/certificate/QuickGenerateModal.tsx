"use client";

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { LoadingButton } from '@/components/ui/loading-button';
import { Template } from '@/lib/supabase/templates';
import { Member } from '@/lib/supabase/members';
import { useLanguage } from '@/contexts/language-context';
import { ColumnMappingStep } from './ColumnMappingStep';
import { validateMapping } from '@/lib/utils/excel-mapping';

import { useQuickGenerate } from './quick/useQuickGenerate';
import { InputScoreStep } from './quick/InputScoreStep';
import { QuickStep1Setup } from './quick/QuickStep1Setup';
import { QuickGenerateParams } from './quick/quick-types';

export type { QuickGenerateParams };

interface QuickGenerateModalProps {
  open: boolean;
  onClose: () => void;
  templates: Template[];
  members: Member[];
  onGenerate: (params: QuickGenerateParams) => Promise<void>;
}

export function QuickGenerateModal({ open, onClose, templates, members, onGenerate }: QuickGenerateModalProps) {
  const { t } = useLanguage();
  
  const state = useQuickGenerate({ open, onClose, templates, members, onGenerate, t });
  
  return (
    <Dialog open={state.open} onOpenChange={state.onClose}>
      <DialogContent 
        className="max-w-3xl min-h-[600px] max-h-[90vh] overflow-y-auto"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && !state.generating) {
            if (!(e.target instanceof HTMLTextAreaElement)) {
              e.preventDefault();
              state.handleGenerate();
            }
          } else if (e.key === 'Escape') {
            e.preventDefault();
            state.onClose();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            {t('quickGenerate.title')} {state.isDualTemplate && state.currentStep === 2 && `- ${t('quickGenerate.inputScoreData')}`}
          </DialogTitle>
        </DialogHeader>

        {state.currentStep === 1 && <QuickStep1Setup state={state} />}

        {state.currentStep === 2 && state.dataSource === 'excel' && (
          <div className="space-y-6 py-4">
            <ColumnMappingStep
              isDualTemplate={state.isDualTemplate}
              dataSource={state.dataSource}
              mainColumns={Object.keys(state.excelMainData[0] || {})}
              mainLayers={state.getMainTextLayers()}
              mainMapping={state.excelMainMapping}
              mainPreviewData={state.excelMainData[0] || {}}
              onMainMappingChange={state.setExcelMainMapping}
              scoreColumns={Object.keys(state.excelScoreData[0] || {})}
              scoreLayers={state.getScoreTextLayers()}
              scoreMapping={state.excelScoreMapping}
              _scorePreviewData={state.excelScoreData[0] || {}}
              onScoreMappingChange={state.setExcelScoreMapping}
            />
          </div>
        )}

        {state.currentStep >= 2 && state.dataSource === 'member' && state.hasMemberInputStep && (
          <div className="space-y-6 py-4">
            <InputScoreStep
              members={state.members.filter(m => state.selectedMembers.includes(m.id))}
              frontFields={state.getFrontSideTextLayers()}
              backFields={state.getScoreTextLayers()}
              scoreDataMap={state.scoreDataMap}
              setScoreDataMap={state.setScoreDataMap}
            />
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          {state.currentStep > 1 ? (
            <Button variant="outline" onClick={() => state.setCurrentStep(state.currentStep - 1)} disabled={state.generating}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('quickGenerate.back')}
            </Button>
          ) : (
            <div></div>
          )}
          
          <LoadingButton 
            onClick={() => {
              if (state.currentStep === 1) {
                if (state.dataSource === 'excel' && (state.excelMainData.length > 0)) {
                  state.setCurrentStep(2);
                } else if (state.dataSource === 'member' && state.hasMemberInputStep) {
                  state.setCurrentStep(2);
                } else {
                  state.handleGenerate();
                }
              } else {
                state.handleGenerate();
              }
            }}
            disabled={
              !state.selectedTemplate || 
              (state.dataSource === 'member' && state.selectedMembers.length === 0) || 
              (state.dataSource === 'excel' && state.currentStep === 1 && state.excelMainData.length === 0) ||
              (state.dataSource === 'excel' && state.currentStep === 1 && state.isDualTemplate && state.excelScoreData.length === 0) ||
              (state.currentStep === 2 && state.dataSource === 'member' && !state.isAllScoreDataComplete()) ||
              (state.currentStep === 2 && state.dataSource === 'excel' && !validateMapping(state.excelMainMapping, state.getMainTextLayers()).valid)
            }
            isLoading={state.generating}
            loadingText={t('quickGenerate.generating')}
            variant="primary"
            className="gradient-primary text-white"
          >
            {state.currentStep === 1 && (
              (state.dataSource === 'excel' && state.excelMainData.length > 0) || 
              (state.dataSource === 'member' && state.hasMemberInputStep)
            ) ? (
              <>
                {t('quickGenerate.next')}
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            ) : (
              <>
                {t('quickGenerate.generate')} {
                  state.dataSource === 'excel' && state.excelMainData.length > 0 
                    ? `(${state.excelMainData.length})`
                    : state.dataSource === 'member' && state.selectedMembers.length > 0
                    ? `(${state.selectedMembers.length})`
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
