"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabaseClient } from "@/lib/supabase/client";
import { toast } from "sonner";

type TranslationFn = (key: string) => string;

export function useAvatarCrop(
  profileId: string | undefined,
  t: TranslationFn,
  onUploaded: (url: string) => void,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // crop modal state
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [tempImageUrl, setTempImageUrl] = useState("");
  const [tempImageFile, setTempImageFile] = useState<File | null>(null);
  const [imageScale, setImageScale] = useState(1);
  const [imageRotation, setImageRotation] = useState(0);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // upload state
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [pendingAvatarFile, setPendingAvatarFile] = useState<string | null>(null);

  // ── cleanup pending file on unmount ───────────────────────────────────────
  useEffect(() => {
    return () => {
      if (pendingAvatarFile) {
        supabaseClient.storage
          .from("profile")
          .remove([pendingAvatarFile])
          .catch((err) => console.error("Failed to cleanup avatar on unmount:", err));
      }
    };
  }, [pendingAvatarFile]);

  // ── handleFileSelect ──────────────────────────────────────────────────────
  const handleFileSelect = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) { toast.error(t("profile.messages.invalidFileType")); return; }
      if (file.size > 5 * 1024 * 1024) { toast.error("Image must be smaller than 5MB"); return; }
      const url = URL.createObjectURL(file);
      setTempImageUrl(url);
      setTempImageFile(file);
      setImageScale(1);
      setImageRotation(0);
      setImagePosition({ x: 0, y: 0 });
      setShowAvatarModal(true);
    },
    [t],
  );

  // ── handleAvatarCancel ────────────────────────────────────────────────────
  const handleAvatarCancel = useCallback(() => {
    setShowAvatarModal(false);
    URL.revokeObjectURL(tempImageUrl);
    setTempImageUrl("");
    setTempImageFile(null);
    setImageScale(1);
    setImageRotation(0);
    setImagePosition({ x: 0, y: 0 });
    setIsDragging(false);
  }, [tempImageUrl]);

  // ── handleAvatarConfirm ───────────────────────────────────────────────────
  const handleAvatarConfirm = useCallback(async () => {
    if (!profileId || !tempImageFile || !canvasRef.current) return;
    setUploadingAvatar(true);
    setShowAvatarModal(false);
    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context not available");

      const img = new window.Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = tempImageUrl;
      });

      const outputSize = 400;
      canvas.width = outputSize;
      canvas.height = outputSize;
      ctx.clearRect(0, 0, outputSize, outputSize);
      ctx.save();
      ctx.beginPath();
      ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2);
      ctx.clip();

      ctx.translate(outputSize / 2, outputSize / 2);
      ctx.translate(imagePosition.x * (outputSize / 256), imagePosition.y * (outputSize / 256));
      ctx.rotate((imageRotation * Math.PI) / 180);
      ctx.scale(imageScale, imageScale);

      const aspect = img.width / img.height;
      const coverSize = outputSize * 1.5;
      const drawWidth = aspect > 1 ? coverSize * aspect : coverSize;
      const drawHeight = aspect > 1 ? coverSize : coverSize / aspect;
      ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
      ctx.restore();

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Failed to create blob"))), "image/jpeg", 0.9);
      });

      const fileName = `avatar-${profileId}-${Date.now()}.jpg`;
      const { data: uploadData, error: uploadError } = await supabaseClient.storage
        .from("profile")
        .upload(fileName, blob, { cacheControl: "3600", upsert: true, contentType: "image/jpeg" });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabaseClient.storage.from("profile").getPublicUrl(uploadData.path);
      onUploaded(publicUrl);
      setPendingAvatarFile(uploadData.path);
      toast.success(t("profile.messages.photoUploaded"));
    } catch (err) {
      console.error("Avatar upload error:", err);
      toast.error(t("profile.messages.photoUploadFailed"));
    } finally {
      setUploadingAvatar(false);
      URL.revokeObjectURL(tempImageUrl);
      setTempImageUrl("");
      setTempImageFile(null);
    }
  }, [profileId, tempImageFile, tempImageUrl, imagePosition, imageRotation, imageScale, onUploaded, t]);

  // ── drag handlers ─────────────────────────────────────────────────────────
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      setIsDragging(true);
      const rect = e.currentTarget.getBoundingClientRect();
      setDragStart({
        x: e.clientX - rect.left - rect.width / 2 - imagePosition.x,
        y: e.clientY - rect.top - rect.height / 2 - imagePosition.y,
      });
    },
    [imagePosition],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isDragging) return;
      const rect = e.currentTarget.getBoundingClientRect();
      setImagePosition({
        x: e.clientX - rect.left - rect.width / 2 - dragStart.x,
        y: e.clientY - rect.top - rect.height / 2 - dragStart.y,
      });
    },
    [isDragging, dragStart],
  );

  const handleMouseUp = useCallback(() => setIsDragging(false), []);

  // ── clear pending (call after successful profile save) ────────────────────
  const clearPendingAvatar = useCallback(() => setPendingAvatarFile(null), []);

  return {
    canvasRef, fileInputRef,
    showAvatarModal, setShowAvatarModal,
    tempImageUrl, uploadingAvatar,
    imageScale, setImageScale,
    imageRotation, setImageRotation,
    imagePosition, setImagePosition,
    isDragging,
    handleFileSelect, handleAvatarConfirm, handleAvatarCancel,
    handleMouseDown, handleMouseMove, handleMouseUp,
    clearPendingAvatar,
  };
}
