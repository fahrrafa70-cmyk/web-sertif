"use client";

import { Check, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { FormEvent } from "react";

interface ProfileFormProps {
  t: (key: string) => string;
  email: string | null | undefined;
  formData: { full_name: string; username: string; gender: string };
  validation: {
    full_name: { isValid: boolean; message: string };
    username: { isValid: boolean; message: string };
  };
  updating: boolean;
  checkingUsername: boolean;
  hasChanges: boolean;
  handleInputChange: (field: string, value: string) => void;
  handleSubmit: (e: FormEvent<HTMLFormElement>) => void;
  handleCancel: () => void;
}

export function ProfileForm({
  t,
  email,
  formData,
  validation,
  updating,
  checkingUsername,
  hasChanges,
  handleInputChange,
  handleSubmit,
  handleCancel,
}: ProfileFormProps) {
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Email (read-only) */}
      <div className="space-y-2">
        <Label htmlFor="email" className="text-base font-medium">Email</Label>
        <Input id="email" type="email" value={email || ""} disabled className="bg-gray-50 dark:bg-gray-900 cursor-not-allowed" />
      </div>

      {/* Full Name */}
      <div className="space-y-2">
        <Label htmlFor="full_name" className="text-base font-medium">{t("profile.fullName")} *</Label>
        <div className="relative">
          <Input id="full_name" type="text" value={formData.full_name}
            onChange={(e) => handleInputChange("full_name", e.target.value)}
            className={`pr-10 ${validation.full_name.isValid ? "border-green-300 focus:border-green-500" : formData.full_name && !validation.full_name.isValid ? "border-red-300 focus:border-red-500" : ""}`}
            placeholder={t("profile.fullNamePlaceholder")} />
          {formData.full_name && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {validation.full_name.isValid ? <Check className="h-5 w-5 text-green-500" /> : <X className="h-5 w-5 text-red-500" />}
            </div>
          )}
        </div>
        {validation.full_name.message && (
          <p className={`text-sm ${validation.full_name.isValid ? "text-green-600" : "text-red-600"}`}>{validation.full_name.message}</p>
        )}
      </div>

      {/* Username */}
      <div className="space-y-2">
        <Label htmlFor="username" className="text-base font-medium">{t("profile.username")} *</Label>
        <div className="relative">
          <Input id="username" type="text" value={formData.username}
            onChange={(e) => handleInputChange("username", e.target.value)}
            className={`pr-10 ${validation.username.isValid ? "border-green-300 focus:border-green-500" : formData.username && !validation.username.isValid ? "border-red-300 focus:border-red-500" : ""}`}
            placeholder={t("profile.usernamePlaceholder")} />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {checkingUsername ? <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
              : formData.username ? (validation.username.isValid ? <Check className="h-5 w-5 text-green-500" /> : <X className="h-5 w-5 text-red-500" />) : null}
          </div>
        </div>
        {validation.username.message && (
          <p className={`text-sm ${validation.username.isValid ? "text-green-600" : "text-red-600"}`}>{validation.username.message}</p>
        )}
      </div>

      {/* Gender */}
      <div className="space-y-2">
        <Label htmlFor="gender" className="text-base font-medium">{t("profile.gender")}</Label>
        <Select value={formData.gender} onValueChange={(v) => handleInputChange("gender", v)}>
          <SelectTrigger><SelectValue placeholder={t("profile.selectGender")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="male">{t("profile.male")}</SelectItem>
            <SelectItem value="female">{t("profile.female")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Actions */}
      <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <Button type="submit"
            disabled={!hasChanges || !validation.full_name.isValid || !validation.username.isValid || updating}
            className={`w-full sm:w-auto transition-all ${(!hasChanges || !validation.full_name.isValid || !validation.username.isValid) ? "bg-gray-400 hover:bg-gray-400 cursor-not-allowed text-gray-600" : "bg-blue-600 hover:bg-blue-700 text-white"}`}>
            {updating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t("profile.uploading")}</> : t("profile.updateProfile")}
          </Button>
          <Button type="button" variant="outline" onClick={handleCancel} disabled={updating}
            className="w-full sm:w-auto border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800">
            Batal
          </Button>
        </div>
      </div>
    </form>
  );
}
