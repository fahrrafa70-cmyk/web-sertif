"use client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileSpreadsheet, Info } from "lucide-react";

interface ExcelInfoDialogProps {
  showExcelInfoModal: boolean;
  setShowExcelInfoModal: (v: boolean) => void;
  excelInputRef: React.RefObject<HTMLInputElement | null>;
  t: (key: string) => string;
}

export function ExcelInfoDialog({ showExcelInfoModal, setShowExcelInfoModal, excelInputRef, t }: ExcelInfoDialogProps) {
  return (
    <Dialog open={showExcelInfoModal} onOpenChange={setShowExcelInfoModal}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg md:max-w-xl max-h-[90vh] overflow-y-auto overflow-x-hidden p-4 sm:p-6">
        <DialogHeader className="pb-3 sm:pb-4">
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl text-gray-900 dark:text-gray-100">
            <Info className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 flex-shrink-0" />
            {t("members.excel.title")}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 sm:space-y-4">
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 sm:p-4 bg-gray-50 dark:bg-gray-800/50">
            <h3 className="font-semibold text-xs sm:text-sm mb-2 sm:mb-3 text-gray-900 dark:text-gray-100">{t("members.excel.optionalColumns")}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm text-gray-700 dark:text-gray-300">
              <div className="flex items-start gap-1.5"><span className="text-red-500 font-bold">*</span><span className="font-medium">Name</span></div>
              <div>• <span className="font-medium">Email</span></div>
              <div>• <span className="font-medium">Organization</span></div>
              <div>• <span className="font-medium">Phone</span></div>
              <div>• <span className="font-medium">Job</span></div>
              <div>• <span className="font-medium">Date of Birth</span></div>
              <div>• <span className="font-medium">Address</span></div>
              <div>• <span className="font-medium">City</span></div>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 sm:mt-3"><span className="text-red-500">*</span> Required field</p>
          </div>
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 sm:p-4 bg-white dark:bg-gray-900">
            <h3 className="font-semibold text-xs sm:text-sm mb-2 sm:mb-3 text-gray-900 dark:text-gray-100">{t("members.excel.exampleFormat")}</h3>
            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-0 text-[10px] sm:text-xs border-collapse">
                <thead><tr className="bg-gray-100 dark:bg-gray-800">
                  <th className="border border-gray-300 dark:border-gray-600 p-1.5 sm:p-2 text-left text-gray-900 dark:text-gray-100">Name*</th>
                  <th className="border border-gray-300 dark:border-gray-600 p-1.5 sm:p-2 text-left text-gray-900 dark:text-gray-100">Email</th>
                  <th className="border border-gray-300 dark:border-gray-600 p-1.5 sm:p-2 text-left text-gray-900 dark:text-gray-100 hidden sm:table-cell">Organization</th>
                  <th className="border border-gray-300 dark:border-gray-600 p-1.5 sm:p-2 text-left text-gray-900 dark:text-gray-100">Phone</th>
                </tr></thead>
                <tbody>
                  <tr><td className="border border-gray-300 dark:border-gray-600 p-1.5 sm:p-2 text-gray-900 dark:text-gray-100">John Doe</td><td className="border border-gray-300 dark:border-gray-600 p-1.5 sm:p-2 text-gray-900 dark:text-gray-100 break-words">john@example.com</td><td className="border border-gray-300 dark:border-gray-600 p-1.5 sm:p-2 text-gray-900 dark:text-gray-100 hidden sm:table-cell">ABC Corp</td><td className="border border-gray-300 dark:border-gray-600 p-1.5 sm:p-2 text-gray-900 dark:text-gray-100">08123456789</td></tr>
                  <tr><td className="border border-gray-300 dark:border-gray-600 p-1.5 sm:p-2 text-gray-900 dark:text-gray-100">Jane Smith</td><td className="border border-gray-300 dark:border-gray-600 p-1.5 sm:p-2 text-gray-900 dark:text-gray-100 break-words">jane@example.com</td><td className="border border-gray-300 dark:border-gray-600 p-1.5 sm:p-2 text-gray-900 dark:text-gray-100 hidden sm:table-cell">XYZ Inc</td><td className="border border-gray-300 dark:border-gray-600 p-1.5 sm:p-2 text-gray-900 dark:text-gray-100">08198765432</td></tr>
                </tbody>
              </table>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:justify-end pt-2 sm:pt-3 border-t border-gray-200 dark:border-gray-700">
            <Button variant="outline" onClick={() => setShowExcelInfoModal(false)} className="w-full sm:w-auto text-sm">{t("members.excel.cancel")}</Button>
            <Button onClick={() => { setShowExcelInfoModal(false); excelInputRef.current?.click(); }}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white w-full sm:w-auto text-sm">
              <FileSpreadsheet className="w-4 h-4 mr-2" />{t("members.excel.chooseFile")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
