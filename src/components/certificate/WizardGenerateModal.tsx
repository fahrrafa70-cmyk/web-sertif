/**
 * Wizard Generate Modal - 4 Step Certificate Generation
 * Step 1: Template Selection (Card Preview)
 * Step 2: Data Source Selection (Excel/Existing Data)
 * Step 3: Fill Data + Date Settings
 * Step 4: Preview & Generate
 */

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { ArrowLeft, ArrowRight, CheckCircle } from "lucide-react";
import { Template } from "@/lib/supabase/templates";
import { Member } from "@/lib/supabase/members";
import { QuickGenerateParams } from "./QuickGenerateModal";
import { useLanguage } from "@/contexts/language-context";

// Extracted parts
import { useWizardGenerate } from "./wizard/useWizardGenerate";
import { WizardStep1Template } from "./wizard/WizardStep1Template";
import { WizardStep2DataSource } from "./wizard/WizardStep2DataSource";
import { WizardStep3DataFill } from "./wizard/WizardStep3DataFill";
import { WizardStep4Summary } from "./wizard/WizardStep4Summary";

interface WizardGenerateModalProps {
  open: boolean;
  onClose: () => void;
  templates: Template[];
  members: Member[];
  onGenerate: (params: QuickGenerateParams) => Promise<void>;
}

export function WizardGenerateModal({ 
  open, 
  onClose, 
  templates, 
  members,
  onGenerate 
}: WizardGenerateModalProps) {
  const { t } = useLanguage();
  const safeT = (key: string, fallback: string) => {
    const value = t(key);
    if (!value || value === key) return fallback;
    return value;
  };

  const {
    state,
    handleNext,
    handleBack,
    canProceedFromStep,
    handleGenerate
  } = useWizardGenerate({ open, onClose, templates, members, onGenerate, t, safeT });

  const { currentStep, generating, dataSource, excelData, selectedMembers } = state;

  const renderStepIndicator = () => (
    <div className="hidden sm:flex items-center justify-center mb-8">
      {[1, 2, 3, 4].map((step) => (
        <React.Fragment key={step}>
          <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${
            step <= currentStep
              ? 'bg-blue-500 border-blue-500 text-white'
              : 'bg-gray-100 border-gray-300 text-gray-500'
          }`}>
            {step < currentStep ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <span className="text-sm font-semibold">{step}</span>
            )}
          </div>
          {step < 4 && (
            <div className={`w-16 h-0.5 mx-2 transition-all ${
              step < currentStep ? 'bg-blue-500' : 'bg-gray-300'
            }`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-[calc(100vw-1.5rem)] sm:max-w-5xl sm:w-[90vw] max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-2xl text-center">
            {t('quickGenerate.title')}
          </DialogTitle>
        </DialogHeader>

        <div className="py-6">
          {renderStepIndicator()}
          
          <div className="min-h-[300px]">
            {currentStep === 1 && <WizardStep1Template state={state} />}
            {currentStep === 2 && <WizardStep2DataSource state={state} />}
            {currentStep === 3 && <WizardStep3DataFill state={state} />}
            {currentStep === 4 && <WizardStep4Summary state={state} />}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-6 border-t">
          <Button 
            variant="outline" 
            onClick={handleBack}
            disabled={currentStep === 1 || generating}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {safeT('wizardGenerate.backButton', 'Previous')}
          </Button>
          
          {currentStep < 4 ? (
            <Button 
              onClick={handleNext}
              disabled={!canProceedFromStep(currentStep)}
              className="gradient-primary text-white"
            >
              {safeT('wizardGenerate.nextButton', 'Next')}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <LoadingButton
              onClick={handleGenerate}
              isLoading={generating}
              loadingText={safeT('wizardGenerate.generatingLoading', 'Generating...')}
              className="
                inline-flex items-center justify-center
                rounded-full px-6 py-2 text-sm font-semibold
                bg-blue-600 text-white
                hover:bg-blue-700
                dark:bg-blue-600 dark:hover:bg-blue-500
                shadow-sm hover:shadow-md
                hover:-translate-y-0.5
                transition-all duration-150
                disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-sm
              "
            >
              {safeT('wizardGenerate.generateButton', 'Generate')}
              {dataSource === 'excel' && excelData.length > 0 && ` (${excelData.length})`}
              {dataSource === 'member' && selectedMembers.length > 0 && ` (${selectedMembers.length})`}
            </LoadingButton>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
