"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import ModernLayout from "@/components/modern-layout";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useProfile } from "@/hooks/use-profile";
import { useLanguage } from "@/contexts/language-context";
import { useProfileForm } from "@/features/auth/hooks/useProfileForm";
import { useAvatarCrop } from "@/features/auth/hooks/useAvatarCrop";
import { ProfilePhotoSection } from "@/features/profile/components/ProfilePhotoSection";
import { ProfileForm } from "@/features/profile/components/ProfileForm";
import { AvatarCropModal } from "@/features/profile/components/AvatarCropModal";

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

              <ProfilePhotoSection
                t={t}
                avatarUrl={formData.avatar_url || ""}
                uploadingAvatar={uploadingAvatar}
                fileInputRef={fileInputRef}
                handleFileSelect={handleFileSelect}
              />

              <ProfileForm
                t={t}
                email={email}
                formData={formData}
                validation={validation}
                updating={updating}
                checkingUsername={checkingUsername}
                hasChanges={hasChanges}
                handleInputChange={handleInputChange}
                handleSubmit={handleSubmit}
                handleCancel={handleCancel}
              />
            </div>
          </div>
        </motion.div>
      </div>

      <AvatarCropModal
        t={t}
        showAvatarModal={showAvatarModal}
        setShowAvatarModal={setShowAvatarModal}
        tempImageUrl={tempImageUrl}
        uploadingAvatar={uploadingAvatar}
        imageScale={imageScale}
        setImageScale={setImageScale}
        imageRotation={imageRotation}
        setImageRotation={setImageRotation}
        imagePosition={imagePosition}
        setImagePosition={setImagePosition}
        isDragging={isDragging}
        handleAvatarConfirm={handleAvatarConfirm}
        handleAvatarCancel={handleAvatarCancel}
        handleMouseDown={handleMouseDown}
        handleMouseMove={handleMouseMove}
        handleMouseUp={handleMouseUp}
      />

      {/* Hidden canvas for image processing */}
      <canvas ref={canvasRef} className="hidden" />
    </ModernLayout>
  );
}
