"use client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Certificate } from "@/lib/supabase/certificates";

interface EditCertificateDialogProps {
  isEditOpen: string | null;
  draft: Certificate | null;
  setDraft: (d: Certificate | null) => void;
  setIsEditOpen: (id: string | null) => void;
  submitEdit: () => void;
  t: (key: string) => string;
}

export function EditCertificateDialog({
  isEditOpen, draft, setDraft, setIsEditOpen, submitEdit, t,
}: EditCertificateDialogProps) {
  return (
    <Dialog
      open={!!isEditOpen}
      onOpenChange={(open) => { if (!open) { setIsEditOpen(null); setDraft(null); } }}
    >
      <DialogContent className="max-w-lg w-full">
        <DialogHeader>
          <DialogTitle>{t("certificates.editCertificate")}</DialogTitle>
        </DialogHeader>
        {draft && (
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("certificates.certificateNo")}</label>
              <Input value={draft.certificate_no} onChange={(e) => setDraft({ ...draft, certificate_no: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("certificates.recipientName")}</label>
              <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("certificates.description")}</label>
              <Input value={draft.description || ""} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("certificates.issueDate")}</label>
                <Input type="date" value={draft.issue_date} onChange={(e) => setDraft({ ...draft, issue_date: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("certificates.expiredDate")}</label>
                <Input type="date" value={draft.expired_date || ""} onChange={(e) => setDraft({ ...draft, expired_date: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("certificates.category")}</label>
              <Input value={draft.category || ""} onChange={(e) => setDraft({ ...draft, category: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setIsEditOpen(null); setDraft(null); }}>{t("common.cancel")}</Button>
              <Button onClick={() => submitEdit()} className="gradient-primary text-white">{t("common.save")}</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
