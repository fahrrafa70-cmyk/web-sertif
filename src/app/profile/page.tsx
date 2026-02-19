"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import ModernLayout from "@/components/modern-layout";
import { motion } from "framer-motion";
import { User, Camera, Check, X, Loader2, ZoomIn, ZoomOut, RotateCw } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/auth-context";
import { useProfile } from "@/hooks/use-profile";
import { useLanguage } from "@/contexts/language-context";
import Image from "next/image";
import { useProfileForm } from "@/features/auth/hooks/useProfileForm";
import { useAvatarCrop } from "@/features/auth/hooks/useAvatarCrop";

export default function ProfilePage() {
  const router = useRouter();
  const { email, loading: authLoading, isAuthenticated } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const { t } = useLanguage();
  const loading = authLoading || profileLoading;

  // ── redirect if not authenticated ─────────────────────────────────────────
  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push("/");
  }, [isAuthenticated, authLoading, router]);

  // ── hooks ─────────────────────────────────────────────────────────────────
  const {
    formData, validation, updating, checkingUsername,
    handleInputChange, handleSubmit, handleCancel, hasChanges,
    setAvatarUrl,
  } = useProfileForm(t);

  const {
    canvasRef, fileInputRef,
    showAvatarModal, setShowAvatarModal,
    tempImageUrl, uploadingAvatar,
    imageScale, setImageScale,
    imageRotation, setImageRotation,
    imagePosition, setImagePosition,
    isDragging,
    handleFileSelect, handleAvatarConfirm, handleAvatarCancel,
    handleMouseDown, handleMouseMove, handleMouseUp,
  } = useAvatarCrop(profile?.id, t, setAvatarUrl);

  // ── loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <ModernLayout hideSidebar>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </ModernLayout>
    );
  }

  return (
    <ModernLayout hideSidebar>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-6 sm:px-8">
              <div className="mb-4">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Profile</h1>
              </div>

              {/* ── Profile Photo ── */}
              <div className="space-y-4 mb-6">
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{t("profile.profilePhoto")}</h3>
                  <div className="flex items-center gap-6">
                    <div className="relative w-20 h-20 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700">
                      {formData.avatar_url
                        ? <Image src={formData.avatar_url} alt={t("profile.profilePicture")} fill className="object-cover" />
                        : <div className="w-full h-full flex items-center justify-center"><User className="h-8 w-8 text-gray-400" /></div>}
                      {uploadingAvatar && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <Loader2 className="h-6 w-6 text-white animate-spin" />
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <input ref={fileInputRef} type="file" accept="image/*"
                        onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                        className="hidden" />
                      <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingAvatar} className="flex items-center gap-2">
                        {uploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                        {t("profile.changePhoto")}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Profile Form ── */}
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
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── Avatar Crop Modal ── */}
      <Dialog open={showAvatarModal} onOpenChange={setShowAvatarModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{t("profile.setupPhoto")}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {/* Preview circle */}
            <div className="flex justify-center">
              <div className="relative w-64 h-64 overflow-hidden bg-gray-100 dark:bg-gray-700 border-2 border-dashed border-gray-300 rounded-full">
                {tempImageUrl && (
                  <div className="absolute inset-0 cursor-move select-none flex items-center justify-center"
                    onMouseDown={handleMouseDown} onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
                    <div className="relative"
                      style={{ transform: `translate(${imagePosition.x}px, ${imagePosition.y}px) scale(${imageScale}) rotate(${imageRotation}deg)`, transition: isDragging ? "none" : "transform 0.1s ease-out" }}>
                      <Image src={tempImageUrl} alt="Preview" width={400} height={400} className="pointer-events-none object-cover" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Controls */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Zoom</Label>
                <div className="flex items-center gap-3">
                  <Button type="button" variant="outline" size="sm" onClick={() => setImageScale((p) => Math.max(0.5, p - 0.1))}><ZoomOut className="h-4 w-4" /></Button>
                  <Slider value={[imageScale]} onValueChange={([v]) => setImageScale(v)} min={0.5} max={3} step={0.1} className="flex-1" />
                  <Button type="button" variant="outline" size="sm" onClick={() => setImageScale((p) => Math.min(3, p + 0.1))}><ZoomIn className="h-4 w-4" /></Button>
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setImageRotation((p) => (p + 90) % 360)} className="flex items-center gap-2">
                  <RotateCw className="h-4 w-4" />Putar 90°
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => { setImageScale(1); setImageRotation(0); setImagePosition({ x: 0, y: 0 }); }}>
                  Reset
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleAvatarCancel}>Batal</Button>
            <Button type="button" onClick={handleAvatarConfirm} disabled={uploadingAvatar}>
              {uploadingAvatar ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Mengunggah...</> : "Terapkan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hidden canvas for image processing */}
      <canvas ref={canvasRef} className="hidden" />
    </ModernLayout>
  );
}
