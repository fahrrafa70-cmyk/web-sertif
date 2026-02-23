import { useState, useCallback } from "react";
import { toast } from "sonner";
import { createMember, updateMember, type Member } from "@/lib/supabase/members";

const EMPTY_FORM = {
  name: "", email: "", organization: "", phone: "",
  job: "", date_of_birth: "", address: "", city: "", notes: "",
};

function validateMemberForm(form: typeof EMPTY_FORM, language: string): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!form.name.trim()) {
    errors.name = language === "id" ? "Nama harus diisi" : "Name is required";
  } else if (form.name.trim().length < 3) {
    errors.name = language === "id" ? "Nama minimal 3 karakter" : "Name must be at least 3 characters";
  }
  if (form.email?.trim()) {
    if (!form.email.includes("@")) {
      errors.email = language === "id" ? "Email harus mengandung @" : "Email must contain @";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errors.email = language === "id" ? "Format email tidak valid" : "Invalid email format";
    }
  }
  if (form.phone?.trim()) {
    if (!/^[0-9+\-\s()]+$/.test(form.phone.trim())) {
      errors.phone = language === "id" ? "Nomor telepon tidak valid" : "Invalid phone number";
    } else if (form.phone.replace(/[^0-9]/g, "").length < 8) {
      errors.phone = language === "id" ? "Nomor telepon minimal 8 digit" : "Phone must be at least 8 digits";
    }
  }
  if (form.organization?.trim() && form.organization.trim().length < 2) {
    errors.organization = language === "id" ? "Organisasi minimal 2 karakter" : "Organization must be at least 2 characters";
  }
  return errors;
}

export function useMembersForm(
  membersData: Member[],
  setMembersData: React.Dispatch<React.SetStateAction<Member[]>>,
  selectedTenantId: string,
  language: string,
  t: (key: string) => string
) {
  // Add Form
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [adding, setAdding] = useState(false);

  // Edit Form
  const [editOpen, setEditOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [editForm, setEditForm] = useState({ ...EMPTY_FORM });
  const [editFormErrors, setEditFormErrors] = useState<Record<string, string>>({});
  const [editSaving, setEditSaving] = useState(false);

  // Detail Modal
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailMember, setDetailMember] = useState<Member | null>(null);

  const onSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenantId) {
      toast.error(language === "id" ? "Pilih tenant terlebih dahulu" : "Please select a tenant"); return;
    }
    setFormErrors({});
    const errors = validateMemberForm(form, language);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error(Object.values(errors)[0]);
      return;
    }
    try {
      setAdding(true);
      const added = await createMember({
        name: form.name, tenant_id: selectedTenantId,
        email: form.email || undefined, organization: form.organization || undefined,
        phone: form.phone || undefined, job: form.job || undefined,
        date_of_birth: form.date_of_birth || undefined, address: form.address || undefined,
        city: form.city || undefined, notes: form.notes || undefined,
      });
      toast.success(t("members.addSuccess"));
      setAddModalOpen(false);
      setForm({ ...EMPTY_FORM });
      setMembersData((prev) => [added, ...prev]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("members.addFailed"));
    } finally {
      setAdding(false);
    }
  }, [form, selectedTenantId, language, t, setMembersData]);

  const openEdit = useCallback((member: Member) => {
    setEditingMember(member);
    setEditForm({
      name: member.name || "", email: member.email || "",
      organization: member.organization || "", phone: member.phone || "",
      job: member.job || "", date_of_birth: member.date_of_birth || "",
      address: member.address || "", city: member.city || "",
      notes: member.notes || "",
    });
    setEditOpen(true);
  }, []);

  const submitEdit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;
    setEditFormErrors({});
    const errors = validateMemberForm(editForm, language);
    if (Object.keys(errors).length > 0) {
      setEditFormErrors(errors);
      toast.error(Object.values(errors)[0]);
      return;
    }
    try {
      setEditSaving(true);
      const updated = await updateMember(editingMember.id, {
        name: editForm.name, email: editForm.email || undefined,
        organization: editForm.organization || undefined, phone: editForm.phone || undefined,
        job: editForm.job || undefined, date_of_birth: editForm.date_of_birth || undefined,
        address: editForm.address || undefined, city: editForm.city || undefined,
        notes: editForm.notes || undefined,
      });
      setMembersData((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      toast.success(t("members.updateSuccess"));
      setEditOpen(false);
      setEditingMember(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("members.updateFailed"));
    } finally {
      setEditSaving(false);
    }
  }, [editingMember, editForm, language, t, setMembersData]);

  const openDetailModal = useCallback((member: Member) => {
    setDetailMember(member);
    setDetailModalOpen(true);
  }, []);

  return {
    addModalOpen, setAddModalOpen, form, setForm, formErrors, setFormErrors, adding, onSubmit,
    editOpen, setEditOpen, editingMember, editForm, setEditForm, editFormErrors, setEditFormErrors, editSaving, openEdit, submitEdit,
    detailModalOpen, setDetailModalOpen, detailMember, openDetailModal,
  };
}
