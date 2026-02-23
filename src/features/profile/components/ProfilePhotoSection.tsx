"use client";

import Image from "next/image";
import { User, Camera, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RefObject } from "react";

interface ProfilePhotoSectionProps {
  t: (key: string) => string;
  avatarUrl: string;
  uploadingAvatar: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  handleFileSelect: (file: File) => void;
}

export function ProfilePhotoSection({
  t,
  avatarUrl,
  uploadingAvatar,
  fileInputRef,
  handleFileSelect,
}: ProfilePhotoSectionProps) {
  return (
    <div className="space-y-4 mb-6">
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{t("profile.profilePhoto")}</h3>
        <div className="flex items-center gap-6">
          <div className="relative w-20 h-20 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700">
            {avatarUrl
              ? <Image src={avatarUrl} alt={t("profile.profilePicture")} fill className="object-cover" />
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
  );
}
