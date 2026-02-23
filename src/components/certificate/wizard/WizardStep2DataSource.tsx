import React from 'react';
import { Label } from "@/components/ui/label";
import { FileSpreadsheet, Users, CheckCircle } from "lucide-react";
import { ExcelUploadWizard } from "../ExcelUploadWizard";
import { WizardGenerateState } from "./wizard-types";

interface WizardStep2DataSourceProps {
  state: WizardGenerateState;
}

export function WizardStep2DataSource({ state }: WizardStep2DataSourceProps) {
  const {
    dataSource, setDataSource,
    excelData, setExcelData,
    members, selectedMembers, setSelectedMembers,
    getTemplateFields,
    t
  } = state;

  return (
    <div className="space-y-4 px-1 sm:px-0">
      <div className="text-center">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          {t('wizardGenerate.step2Title')}
        </h3>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
        {/* Excel Option */}
        <div
          onClick={() => setDataSource('excel')}
          className={`border-2 rounded-lg p-3 sm:p-4 cursor-pointer transition-all hover:shadow-md flex items-center gap-3 min-w-[0] w-full sm:w-auto ${
            dataSource === 'excel'
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 shadow-md'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
          }`}
        >
          <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
            dataSource === 'excel' ? 'bg-blue-500' : 'bg-gray-100 dark:bg-gray-800'
          }`}>
            <FileSpreadsheet className={`w-5 h-5 sm:w-6 sm:h-6 ${
              dataSource === 'excel' ? 'text-white' : 'text-gray-500'
            }`} />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {t('wizardGenerate.excelOptionTitle')}
            </h4>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {t('wizardGenerate.excelOptionSubtitle')}
            </p>
            {dataSource === 'excel' && (
              <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400 mt-1">
                <CheckCircle className="w-3 h-3" />
                <span className="text-xs font-medium">{t('wizardGenerate.selected')}</span>
              </div>
            )}
          </div>
        </div>

        {/* Member Option */}
        <div
          onClick={() => setDataSource('member')}
          className={`border-2 rounded-lg p-3 sm:p-4 cursor-pointer transition-all hover:shadow-md flex items-center gap-3 min-w-[0] w-full sm:w-auto ${
            dataSource === 'member'
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 shadow-md'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
          }`}
        >
          <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
            dataSource === 'member' ? 'bg-blue-500' : 'bg-gray-100 dark:bg-gray-800'
          }`}>
            <Users className={`w-5 h-5 sm:w-6 sm:h-6 ${
              dataSource === 'member' ? 'text-white' : 'text-gray-500'
            }`} />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {t('wizardGenerate.memberOptionTitle')}
            </h4>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {t('wizardGenerate.memberOptionSubtitle')}
            </p>
            {dataSource === 'member' && (
              <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400 mt-1">
                <CheckCircle className="w-3 h-3" />
                <span className="text-xs font-medium">{t('wizardGenerate.selected')}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Data Source Content */}
      {dataSource === 'excel' && (
        <div className="space-y-4 border-t pt-6">
          <Label>{t('wizardGenerate.uploadExcelLabel')}</Label>
          <ExcelUploadWizard 
            onDataLoaded={setExcelData}
            dataCount={excelData.length}
            templateFields={getTemplateFields}
          />
        </div>
      )}

      {dataSource === 'member' && (
        <div className="space-y-3 border-t pt-4">
          <Label>{t('wizardGenerate.selectMembersLabel').replace('{count}', String(selectedMembers.length))}</Label>
          <div className="border border-gray-300 rounded-lg max-h-[150px] overflow-y-auto p-2 space-y-1">
            {members.length === 0 ? (
              <div className="p-2 text-sm text-gray-500 text-center">
                {t('wizardGenerate.noMembers')}
              </div>
            ) : (
              members.map((member) => (
                <label
                  key={member.id}
                  className="flex items-center gap-2 p-1.5 rounded hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedMembers.includes(member.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedMembers([...selectedMembers, member.id]);
                      } else {
                        setSelectedMembers(selectedMembers.filter((id) => id !== member.id));
                      }
                    }}
                    className="rounded"
                  />
                  <div>
                    <div className="font-medium text-xs">{member.name}</div>
                    <div className="text-xs text-gray-500">{member.organization || 'Tidak ada organisasi'}</div>
                  </div>
                </label>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
