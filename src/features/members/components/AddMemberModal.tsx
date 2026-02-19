"use client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { X } from "lucide-react";

interface MemberForm {
  name: string; email: string; organization: string; phone: string;
  job: string; date_of_birth: string; address: string; city: string; notes: string;
}

interface AddMemberModalProps {
  addModalOpen: boolean;
  setAddModalOpen: (v: boolean) => void;
  form: MemberForm;
  setForm: React.Dispatch<React.SetStateAction<MemberForm>>;
  formErrors: Record<string, string>;
  setFormErrors: (e: Record<string, string>) => void;
  adding: boolean;
  language: string;
  onSubmit: (e: React.FormEvent) => void;
  t: (key: string) => string;
}

export function AddMemberModal({
  addModalOpen, setAddModalOpen, form, setForm, formErrors, setFormErrors, adding, language, onSubmit, t,
}: AddMemberModalProps) {
  if (!addModalOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/40 dark:bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in-0 duration-200" onClick={() => setAddModalOpen(false)}>
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 mx-4 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{language === "id" ? "Tambah Data" : "Add Data"}</h3>
          <Button variant="outline" onClick={() => setAddModalOpen(false)} size="icon" aria-label="Close"><X className="w-4 h-4" /></Button>
        </div>
        <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-sm text-gray-700 dark:text-gray-300 font-medium">{t("members.form.fullName")} <span className="text-red-500">*</span></label>
            <Input value={form.name} placeholder={t("members.form.fullNamePlaceholder")} onChange={(e) => { setForm({ ...form, name: e.target.value }); if (formErrors.name) setFormErrors({ ...formErrors, name: "" }); }} className={formErrors.name ? "border-red-500 focus:border-red-500" : ""} />
            {formErrors.name && <p className="text-xs text-red-500 mt-1">{formErrors.name}</p>}
          </div>
          <div className="space-y-2">
            <label className="text-sm text-gray-700 dark:text-gray-300 font-medium">{t("members.form.email")}</label>
            <Input type="email" value={form.email} placeholder="name@example.com" onChange={(e) => { setForm({ ...form, email: e.target.value }); if (formErrors.email) setFormErrors({ ...formErrors, email: "" }); }} className={formErrors.email ? "border-red-500 focus:border-red-500" : ""} />
            {formErrors.email && <p className="text-xs text-red-500 mt-1">{formErrors.email}</p>}
          </div>
          <div className="space-y-2">
            <label className="text-sm text-gray-700 dark:text-gray-300 font-medium">{t("members.form.organization")}</label>
            <Input value={form.organization} placeholder={t("members.form.optional")} onChange={(e) => { setForm({ ...form, organization: e.target.value }); if (formErrors.organization) setFormErrors({ ...formErrors, organization: "" }); }} className={formErrors.organization ? "border-red-500 focus:border-red-500" : ""} />
            {formErrors.organization && <p className="text-xs text-red-500 mt-1">{formErrors.organization}</p>}
          </div>
          <div className="space-y-2">
            <label className="text-sm text-gray-700 dark:text-gray-300 font-medium">{t("members.form.phone")}</label>
            <Input value={form.phone} placeholder={t("members.form.optional")} onChange={(e) => { setForm({ ...form, phone: e.target.value }); if (formErrors.phone) setFormErrors({ ...formErrors, phone: "" }); }} className={formErrors.phone ? "border-red-500 focus:border-red-500" : ""} />
            {formErrors.phone && <p className="text-xs text-red-500 mt-1">{formErrors.phone}</p>}
          </div>
          <div className="space-y-2"><label className="text-sm text-gray-700 dark:text-gray-300 font-medium">{t("members.form.job")}</label><Input value={form.job} placeholder={t("members.form.optional")} onChange={(e) => setForm({ ...form, job: e.target.value })} /></div>
          <div className="space-y-2"><label className="text-sm text-gray-700 dark:text-gray-300 font-medium">{t("members.form.dob")}</label><Input type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} /></div>
          <div className="space-y-2 md:col-span-2"><label className="text-sm text-gray-700 dark:text-gray-300 font-medium">{t("members.form.address")}</label><Input value={form.address} placeholder={t("members.form.optional")} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
          <div className="space-y-2"><label className="text-sm text-gray-700 dark:text-gray-300 font-medium">{t("members.form.city")}</label><Input value={form.city} placeholder={t("members.form.optional")} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
          <div className="flex items-end lg:col-span-3">
            <LoadingButton type="submit" isLoading={adding} loadingText={language === "id" ? "Menyimpan..." : "Saving..."} variant="primary" className="gradient-primary text-white">{t("common.save")}</LoadingButton>
          </div>
        </form>
      </div>
    </div>
  );
}
