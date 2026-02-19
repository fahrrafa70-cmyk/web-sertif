"use client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { X } from "lucide-react";

interface EditMemberForm {
  name: string; email: string; organization: string; phone: string;
  job: string; date_of_birth: string; address: string; city: string; notes: string;
}

interface EditMemberModalProps {
  editOpen: boolean;
  setEditOpen: (v: boolean) => void;
  editForm: EditMemberForm;
  setEditForm: React.Dispatch<React.SetStateAction<EditMemberForm>>;
  editFormErrors: Record<string, string>;
  setEditFormErrors: (e: Record<string, string>) => void;
  editSaving: boolean;
  language: string;
  submitEdit: (e: React.FormEvent) => void;
  t: (key: string) => string;
}

export function EditMemberModal({
  editOpen, setEditOpen, editForm, setEditForm, editFormErrors, setEditFormErrors, editSaving, language, submitEdit, t,
}: EditMemberModalProps) {
  if (!editOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/40 dark:bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in-0 duration-200" onClick={() => setEditOpen(false)}>
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 mx-4 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{language === "id" ? "Edit Data" : "Edit Data"}</h3>
          <Button variant="outline" onClick={() => setEditOpen(false)} size="icon" aria-label="Close"><X className="w-4 h-4" /></Button>
        </div>
        <form onSubmit={submitEdit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-sm text-gray-700 dark:text-gray-300 font-medium">{t("members.form.fullName")} <span className="text-red-500">*</span></label>
            <Input value={editForm.name} onChange={(e) => { setEditForm({ ...editForm, name: e.target.value }); if (editFormErrors.name) setEditFormErrors({ ...editFormErrors, name: "" }); }} className={editFormErrors.name ? "border-red-500 focus:border-red-500" : ""} />
            {editFormErrors.name && <p className="text-xs text-red-500 mt-1">{editFormErrors.name}</p>}
          </div>
          <div className="space-y-2">
            <label className="text-sm text-gray-700 dark:text-gray-300 font-medium">{t("members.form.email")}</label>
            <Input type="email" value={editForm.email} onChange={(e) => { setEditForm({ ...editForm, email: e.target.value }); if (editFormErrors.email) setEditFormErrors({ ...editFormErrors, email: "" }); }} className={editFormErrors.email ? "border-red-500 focus:border-red-500" : ""} />
            {editFormErrors.email && <p className="text-xs text-red-500 mt-1">{editFormErrors.email}</p>}
          </div>
          <div className="space-y-2">
            <label className="text-sm text-gray-700 dark:text-gray-300 font-medium">{t("members.form.organization")}</label>
            <Input value={editForm.organization} onChange={(e) => { setEditForm({ ...editForm, organization: e.target.value }); if (editFormErrors.organization) setEditFormErrors({ ...editFormErrors, organization: "" }); }} className={editFormErrors.organization ? "border-red-500 focus:border-red-500" : ""} />
            {editFormErrors.organization && <p className="text-xs text-red-500 mt-1">{editFormErrors.organization}</p>}
          </div>
          <div className="space-y-2">
            <label className="text-sm text-gray-700 dark:text-gray-300 font-medium">{t("members.form.phone")}</label>
            <Input value={editForm.phone} onChange={(e) => { setEditForm({ ...editForm, phone: e.target.value }); if (editFormErrors.phone) setEditFormErrors({ ...editFormErrors, phone: "" }); }} className={editFormErrors.phone ? "border-red-500 focus:border-red-500" : ""} />
            {editFormErrors.phone && <p className="text-xs text-red-500 mt-1">{editFormErrors.phone}</p>}
          </div>
          <div className="space-y-2"><label className="text-sm text-gray-700 dark:text-gray-300 font-medium">{t("members.form.job")}</label><Input value={editForm.job} onChange={(e) => setEditForm({ ...editForm, job: e.target.value })} /></div>
          <div className="space-y-2"><label className="text-sm text-gray-700 dark:text-gray-300 font-medium">{t("members.form.dob")}</label><Input type="date" value={editForm.date_of_birth} onChange={(e) => setEditForm({ ...editForm, date_of_birth: e.target.value })} /></div>
          <div className="space-y-2 md:col-span-2"><label className="text-sm text-gray-700 dark:text-gray-300 font-medium">{t("members.form.address")}</label><Input value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} /></div>
          <div className="space-y-2"><label className="text-sm text-gray-700 dark:text-gray-300 font-medium">{t("members.form.city")}</label><Input value={editForm.city} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} /></div>
          <div className="flex items-end">
            <LoadingButton type="submit" isLoading={editSaving} loadingText={language === "id" ? "Menyimpan..." : "Saving..."} variant="primary" className="gradient-primary text-white">{language === "id" ? "Simpan" : "Save"}</LoadingButton>
          </div>
        </form>
      </div>
    </div>
  );
}
