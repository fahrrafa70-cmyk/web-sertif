"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useProfile } from "@/hooks/use-profile";
import { toast } from "sonner";

type TranslationFn = (key: string) => string;

type ValidationField = { isValid: boolean; message: string };
type UsernameValidation = ValidationField & { isAvailable: boolean };

type FormData = {
  full_name: string;
  username: string;
  gender: string;
  avatar_url: string;
};

export function useProfileForm(t: TranslationFn) {
  const router = useRouter();
  const { profile, updateProfile } = useProfile();

  const [formData, setFormData] = useState<FormData>({
    full_name: "",
    username: "",
    gender: "",
    avatar_url: "",
  });
  const [validation, setValidation] = useState<{
    full_name: ValidationField;
    username: UsernameValidation;
  }>({
    full_name: { isValid: false, message: "" },
    username: { isValid: false, isAvailable: false, message: "" },
  });
  const [updating, setUpdating] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameCheckTimeout, setUsernameCheckTimeout] = useState<NodeJS.Timeout | null>(null);

  // ── validators ────────────────────────────────────────────────────────────
  const validateFullName = useCallback(
    (value: string): ValidationField => {
      const trimmed = value.trim();
      if (!trimmed) return { isValid: false, message: t("profile.validation.nameRequired") };
      if (trimmed.length < 2) return { isValid: false, message: t("profile.validation.nameMinLength") };
      return { isValid: true, message: "" };
    },
    [t],
  );

  const validateUsername = useCallback(
    async (value: string): Promise<UsernameValidation> => {
      const trimmed = value.trim();
      const normalized = trimmed.toLowerCase();
      if (!trimmed) return { isValid: false, isAvailable: false, message: t("profile.validation.usernameRequired") };
      if (trimmed.length < 3) return { isValid: false, isAvailable: false, message: t("profile.validation.usernameMinLength") };
      if (trimmed.length > 50) return { isValid: false, isAvailable: false, message: t("profile.validation.usernameMaxLength") };
      if (!/^[a-z0-9_]+$/.test(normalized)) return { isValid: false, isAvailable: false, message: t("profile.validation.usernameFormat") };
      if (normalized === (profile?.username || "").toLowerCase()) return { isValid: true, isAvailable: true, message: "" };
      try {
        const res = await fetch(`/api/check-username?username=${encodeURIComponent(normalized)}`);
        const { available } = await res.json();
        if (!available) return { isValid: false, isAvailable: false, message: t("profile.validation.usernameTaken") };
        return { isValid: true, isAvailable: true, message: "" };
      } catch (err) {
        console.error("Username validation error:", err);
        return { isValid: false, isAvailable: false, message: t("profile.validation.usernameCheckFailed") };
      }
    },
    [profile?.username, t],
  );

  // ── initialize from profile ───────────────────────────────────────────────
  useEffect(() => {
    if (!profile) return;
    const gender = profile.gender === "male" || profile.gender === "female" ? profile.gender : "";
    setFormData({
      full_name: profile.full_name || "",
      username: profile.username || "",
      gender,
      avatar_url: profile.avatar_url || "",
    });
    if (profile.full_name) setValidation((p) => ({ ...p, full_name: validateFullName(profile.full_name!) }));
    if (profile.username) setValidation((p) => ({ ...p, username: { isValid: true, isAvailable: true, message: "" } }));
  }, [profile, validateFullName]);

  // ── cleanup timeout ───────────────────────────────────────────────────────
  useEffect(() => {
    return () => { if (usernameCheckTimeout) clearTimeout(usernameCheckTimeout); };
  }, [usernameCheckTimeout]);

  // ── handleInputChange ─────────────────────────────────────────────────────
  const handleInputChange = useCallback(
    (field: string, value: string) => {
      const normalized = field === "username" ? value.toLowerCase() : value;
      setFormData((p) => ({ ...p, [field]: normalized }));
      if (field === "full_name") {
        setValidation((p) => ({ ...p, full_name: validateFullName(normalized) }));
      } else if (field === "username") {
        if (usernameCheckTimeout) clearTimeout(usernameCheckTimeout);
        setCheckingUsername(true);
        setValidation((p) => ({ ...p, username: { isValid: false, isAvailable: false, message: "Checking availability..." } }));
        const timeout = setTimeout(async () => {
          const v = await validateUsername(normalized);
          setValidation((p) => ({ ...p, username: v }));
          setCheckingUsername(false);
        }, 500);
        setUsernameCheckTimeout(timeout);
      }
    },
    [usernameCheckTimeout, validateUsername, validateFullName],
  );

  // ── setAvatarUrl – called by useAvatarCrop after upload ──────────────────
  const setAvatarUrl = useCallback((url: string) => {
    setFormData((p) => ({ ...p, avatar_url: url }));
  }, []);

  // ── submit ────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const fnv = validateFullName(formData.full_name);
      const unv = await validateUsername(formData.username);
      if (!fnv.isValid || !unv.isValid) { toast.error("Mohon perbaiki kesalahan validasi"); return; }
      setUpdating(true);
      try {
        const success = await updateProfile({
          full_name: formData.full_name.trim(),
          username: formData.username.trim().toLowerCase(),
          gender: (formData.gender === "male" || formData.gender === "female") ? formData.gender : undefined,
          avatar_url: formData.avatar_url || undefined,
        });
        if (success) {
          toast.success(t("profile.messages.profileUpdated"));
          setTimeout(() => router.push("/"), 1000);
        } else {
          toast.error(t("profile.messages.profileUpdateFailed"));
        }
      } finally {
        setUpdating(false);
      }
    },
    [formData, validateFullName, validateUsername, updateProfile, t, router],
  );

  // ── cancel ────────────────────────────────────────────────────────────────
  const handleCancel = useCallback(() => {
    if (profile) {
      const gender = profile.gender === "male" || profile.gender === "female" ? profile.gender : "";
      setFormData({ full_name: profile.full_name || "", username: profile.username || "", gender, avatar_url: profile.avatar_url || "" });
    }
    router.push("/");
  }, [profile, router]);

  // ── hasChanges ────────────────────────────────────────────────────────────
  const hasChanges = useMemo(() => {
    if (!profile) return false;
    const gender = profile.gender === "male" || profile.gender === "female" ? profile.gender : "";
    return (
      formData.full_name !== (profile.full_name || "") ||
      formData.username !== (profile.username || "") ||
      formData.gender !== gender ||
      formData.avatar_url !== (profile.avatar_url || "")
    );
  }, [formData, profile]);

  return {
    formData, validation,
    updating, checkingUsername,
    handleInputChange, handleSubmit, handleCancel, hasChanges,
    setAvatarUrl,
  };
}
