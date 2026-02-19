"use client";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface SendEmailDialogProps {
  sendModalOpen: boolean;
  setSendModalOpen: (open: boolean) => void;
  isSendingEmail: boolean;
  sendFormErrors: { email?: string; subject?: string; message?: string };
  setSendFormErrors: (fn: (prev: { email?: string; subject?: string; message?: string }) => { email?: string; subject?: string; message?: string }) => void;
  sendForm: { email: string; subject: string; message: string };
  setSendForm: (fn: (prev: { email: string; subject: string; message: string }) => { email: string; subject: string; message: string }) => void;
  sendPreviewSrcs: { cert: string | null; score: string | null };
  confirmSendEmail: () => Promise<void>;
  t: (key: string) => string;
}

export function SendEmailDialog({
  sendModalOpen, setSendModalOpen, isSendingEmail,
  sendFormErrors, setSendFormErrors, sendForm, setSendForm,
  sendPreviewSrcs, confirmSendEmail, t,
}: SendEmailDialogProps) {
  return (
    <Dialog open={sendModalOpen} onOpenChange={setSendModalOpen}>
      <DialogContent
        className="max-w-xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col p-4 sm:p-6"
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && e.target instanceof HTMLInputElement) {
            e.preventDefault();
            void confirmSendEmail();
          } else if (e.key === "Escape") {
            e.preventDefault();
            setSendModalOpen(false);
          }
        }}
      >
        <DialogHeader className="flex-shrink-0 pb-2 sm:pb-4">
          <DialogTitle className="text-xl sm:text-2xl font-bold">{t("hero.sendEmailTitle")}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto space-y-3 sm:space-y-4 pr-1 -mr-1">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-white">{t("hero.recipientEmail")}</label>
            <Input
              value={sendForm.email}
              onChange={(e) => { setSendForm((f) => ({ ...f, email: e.target.value })); if (sendFormErrors.email) setSendFormErrors((err) => ({ ...err, email: undefined })); }}
              onFocus={(e) => e.target.select()}
              disabled={isSendingEmail}
              className={sendFormErrors.email ? "border-red-500" : ""}
              onKeyDown={(e) => { if (e.key === "Enter" && !isSendingEmail) { e.preventDefault(); void confirmSendEmail(); } }}
            />
            {sendFormErrors.email && <p className="text-xs text-red-500 mt-1">{sendFormErrors.email}</p>}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-white">{t("hero.subject")}</label>
            <Input
              value={sendForm.subject}
              onChange={(e) => { setSendForm((f) => ({ ...f, subject: e.target.value })); if (sendFormErrors.subject) setSendFormErrors((err) => ({ ...err, subject: undefined })); }}
              onFocus={(e) => e.target.select()}
              placeholder={t("hero.emailSubjectPlaceholder")}
              disabled={isSendingEmail}
              className={sendFormErrors.subject ? "border-red-500" : ""}
              onKeyDown={(e) => { if (e.key === "Enter" && !isSendingEmail) { e.preventDefault(); void confirmSendEmail(); } }}
            />
            {sendFormErrors.subject && <p className="text-xs text-red-500 mt-1">{sendFormErrors.subject}</p>}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-white">{t("hero.message")}</label>
            <textarea
              value={sendForm.message}
              onChange={(e) => { setSendForm((f) => ({ ...f, message: e.target.value })); if (sendFormErrors.message) setSendFormErrors((err) => ({ ...err, message: undefined })); }}
              onFocus={(e) => e.target.select()}
              rows={4}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 ${sendFormErrors.message ? "border-red-500" : "border-gray-300 dark:border-gray-600"}`}
              placeholder={t("hero.emailMessagePlaceholder")}
              disabled={isSendingEmail}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !isSendingEmail) { e.preventDefault(); void confirmSendEmail(); } }}
            />
            {sendFormErrors.message && <p className="text-xs text-red-500 mt-1">{sendFormErrors.message}</p>}
          </div>
          {(sendPreviewSrcs.cert || sendPreviewSrcs.score) && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-white">{t("hero.attachmentPreview")}</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="relative w-full h-48 sm:h-64">
                  {sendPreviewSrcs.cert && (
                    <Image src={sendPreviewSrcs.cert} alt="Certificate preview" fill className="object-contain rounded-md border border-gray-200" unoptimized />
                  )}
                </div>
                <div className="relative w-full h-48 sm:h-64">
                  {sendPreviewSrcs.score && (
                    <Image src={sendPreviewSrcs.score} alt="Score preview" fill className="object-contain rounded-md border border-gray-200" unoptimized />
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4 border-t flex-shrink-0">
          <Button variant="outline" className="border-gray-300 w-full sm:w-auto" onClick={() => setSendModalOpen(false)} disabled={isSendingEmail}>
            {t("hero.cancel")}
          </Button>
          <LoadingButton
            className="gradient-primary text-white shadow-lg hover:shadow-xl transition-all duration-300 w-full sm:w-auto"
            onClick={() => void confirmSendEmail()}
            isLoading={isSendingEmail}
            loadingText={t("hero.sending")}
            variant="primary"
          >
            {t("hero.sendEmail")}
          </LoadingButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
