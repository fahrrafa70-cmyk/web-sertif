"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import ModernLayout from "@/components/modern-layout";
import { motion } from "framer-motion";
import { User, Camera, Check, X, Loader2, ZoomIn, ZoomOut, RotateCw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/auth-context";
import { useProfile } from "@/hooks/use-profile";
import { useLanguage } from "@/contexts/language-context";
import { supabaseClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function ProfilePage() {
  const router = useRouter();
  const { email, loading: authLoading, isAuthenticated } = useAuth();
  const { profile, loading: profileLoading, updateProfile } = useProfile();
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [formData, setFormData] = useState({
    full_name: '',
    username: '',
    gender: '',
    avatar_url: ''
  });

  // Validation state
  const [validation, setValidation] = useState({
    full_name: { isValid: false, message: '' },
    username: { isValid: false, isAvailable: false, message: '' }
  });

  // UI state
  const [updating, setUpdating] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameCheckTimeout, setUsernameCheckTimeout] = useState<NodeJS.Timeout | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Avatar crop modal state
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [tempImageUrl, setTempImageUrl] = useState('');
  const [tempImageFile, setTempImageFile] = useState<File | null>(null);
  const [imageScale, setImageScale] = useState(1);
  const [imageRotation, setImageRotation] = useState(0);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [pendingAvatarFile, setPendingAvatarFile] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const loading = authLoading || profileLoading;

  // Set document title
  useEffect(() => {
    const setTitle = () => {
      if (typeof document !== 'undefined') {
        document.title = t("profile.pageTitle");
      }
    };
    
    setTitle();
    const timeouts = [
      setTimeout(setTitle, 50),
      setTimeout(setTitle, 200),
      setTimeout(setTitle, 500)
    ];
    
    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout));
    };
  }, [t]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, authLoading, router]);

  // Validation functions
  const validateFullName = useCallback((value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return { isValid: false, message: t('profile.validation.nameRequired') };
    }
    if (trimmed.length < 2) {
      return { isValid: false, message: t('profile.validation.nameMinLength') };
    }
    return { isValid: true, message: '' };
  }, [t]);

  // Initialize form data when profile loads
  useEffect(() => {
    if (profile) {
      const profileGender = profile.gender === 'male' || profile.gender === 'female' 
        ? profile.gender 
        : '';
      
      setFormData({
        full_name: profile.full_name || '',
        username: profile.username || '',
        gender: profileGender,
        avatar_url: profile.avatar_url || ''
      });

      // Initialize validation for existing data
      if (profile.full_name) {
        const validation = validateFullName(profile.full_name);
        setValidation(prev => ({ ...prev, full_name: validation }));
      }
      
      if (profile.username) {
        setValidation(prev => ({ 
          ...prev, 
          username: { isValid: true, isAvailable: true, message: '' }
        }));
      }
    }
  }, [profile, validateFullName]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (usernameCheckTimeout) {
        clearTimeout(usernameCheckTimeout);
      }
    };
  }, [usernameCheckTimeout]);

  // Cleanup pending avatar file on unmount
  useEffect(() => {
    return () => {
      if (pendingAvatarFile) {
        supabaseClient.storage
          .from('profile')
          .remove([pendingAvatarFile])
          .catch(error => console.error('Failed to cleanup avatar on unmount:', error));
      }
    };
  }, [pendingAvatarFile]);

  const validateUsername = useCallback(async (value: string) => {
    const trimmed = value.trim();
    const normalized = trimmed.toLowerCase();
    
    if (!trimmed) {
      return { isValid: false, isAvailable: false, message: t('profile.validation.usernameRequired') };
    }
    
    if (trimmed.length < 3) {
      return { isValid: false, isAvailable: false, message: t('profile.validation.usernameMinLength') };
    }
    
    if (trimmed.length > 50) {
      return { isValid: false, isAvailable: false, message: t('profile.validation.usernameMaxLength') };
    }
    
    const usernameRegex = /^[a-z0-9_]+$/;
    if (!usernameRegex.test(normalized)) {
      return { isValid: false, isAvailable: false, message: t('profile.validation.usernameFormat') };
    }
    
    if (normalized === (profile?.username || '').toLowerCase()) {
      return { isValid: true, isAvailable: true, message: '' };
    }
    
    try {
      const response = await fetch(`/api/check-username?username=${encodeURIComponent(normalized)}`);
      const { available } = await response.json();
      
      if (!available) {
        return { isValid: false, isAvailable: false, message: t('profile.validation.usernameTaken') };
      }
      return { isValid: true, isAvailable: true, message: '' };
    } catch (error) {
      console.error('Username validation error:', error);
      return { isValid: false, isAvailable: false, message: t('profile.validation.usernameCheckFailed') };
    }
  }, [profile?.username, t]);

  const handleInputChange = useCallback((field: string, value: string) => {
    const normalizedValue = field === 'username' ? value.toLowerCase() : value;
    
    setFormData(prev => ({ ...prev, [field]: normalizedValue }));
    
    if (field === 'full_name') {
      const validation = validateFullName(normalizedValue);
      setValidation(prev => ({
        ...prev,
        full_name: validation
      }));
    } else if (field === 'username') {
      if (usernameCheckTimeout) {
        clearTimeout(usernameCheckTimeout);
      }
      
      setCheckingUsername(true);
      setValidation(prev => ({
        ...prev,
        username: { isValid: false, isAvailable: false, message: 'Checking availability...' }
      }));
      
      const timeout = setTimeout(async () => {
        const validation = await validateUsername(normalizedValue);
        setValidation(prev => ({
          ...prev,
          username: validation
        }));
        setCheckingUsername(false);
      }, 500);
      
      setUsernameCheckTimeout(timeout);
    }
  }, [usernameCheckTimeout, validateUsername, validateFullName]);

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error(t('profile.messages.invalidFileType'));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be smaller than 5MB');
      return;
    }

    const url = URL.createObjectURL(file);
    setTempImageUrl(url);
    setTempImageFile(file);
    setImageScale(1);
    setImageRotation(0);
    setShowAvatarModal(true);
  };

  const handleAvatarConfirm = async () => {
    if (!profile || !tempImageFile || !canvasRef.current) return;

    setUploadingAvatar(true);
    setShowAvatarModal(false);

    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context not available');

      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      
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

      const centerX = outputSize / 2;
      const centerY = outputSize / 2;
      
      // Apply transformations in the same order as preview
      ctx.translate(centerX, centerY);
      ctx.translate(imagePosition.x * (outputSize / 256), imagePosition.y * (outputSize / 256));
      ctx.rotate((imageRotation * Math.PI) / 180);
      ctx.scale(imageScale, imageScale);

      // Calculate image size to fill the preview area properly
      const imageAspectRatio = img.width / img.height;
      let drawWidth, drawHeight;
      
      // Make image large enough to cover the entire circle
      const coverSize = outputSize * 1.5;
      
      if (imageAspectRatio > 1) {
        drawHeight = coverSize;
        drawWidth = coverSize * imageAspectRatio;
      } else {
        drawWidth = coverSize;
        drawHeight = coverSize / imageAspectRatio;
      }

      ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
      ctx.restore();

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => b ? resolve(b) : reject(new Error('Failed to create blob')), 'image/jpeg', 0.9);
      });

      const fileName = `avatar-${profile.id}-${Date.now()}.jpg`;
      const { data: uploadData, error: uploadError } = await supabaseClient.storage
        .from('profile')
        .upload(fileName, blob, {
          cacheControl: '3600',
          upsert: true,
          contentType: 'image/jpeg'
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabaseClient.storage
        .from('profile')
        .getPublicUrl(uploadData.path);

      // Only update form data, don't save to profile yet
      setFormData(prev => ({ ...prev, avatar_url: publicUrl }));
      
      // Track the uploaded file for potential cleanup
      setPendingAvatarFile(uploadData.path);
      
      toast.success(t('profile.messages.photoUploaded'));

    } catch (err) {
      console.error('Avatar upload error:', err);
      toast.error(t('profile.messages.photoUploadFailed'));
    } finally {
      setUploadingAvatar(false);
      URL.revokeObjectURL(tempImageUrl);
      setTempImageUrl('');
      setTempImageFile(null);
    }
  };

  const handleAvatarCancel = () => {
    setShowAvatarModal(false);
    URL.revokeObjectURL(tempImageUrl);
    setTempImageUrl('');
    setTempImageFile(null);
    setImageScale(1);
    setImageRotation(0);
    setImagePosition({ x: 0, y: 0 });
    setIsDragging(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const fullNameValidation = validateFullName(formData.full_name);
    const usernameValidation = await validateUsername(formData.username);

    if (!fullNameValidation.isValid || !usernameValidation.isValid) {
      toast.error('Mohon perbaiki kesalahan validasi');
      return;
    }

    setUpdating(true);

    try {
      const updates = {
        full_name: formData.full_name.trim(),
        username: formData.username.trim().toLowerCase(),
        gender: (formData.gender === 'male' || formData.gender === 'female') ? formData.gender as 'male' | 'female' : undefined,
        avatar_url: formData.avatar_url || undefined
      };

      const success = await updateProfile(updates);
      
      if (success) {
        // Clear pending avatar file since profile was saved successfully
        setPendingAvatarFile(null);
        toast.success(t('profile.messages.profileUpdated'));
        setTimeout(() => {
          router.push('/');
        }, 1000);
      } else {
        toast.error(t('profile.messages.profileUpdateFailed'));
      }
    } finally {
      setUpdating(false);
    }
  };

  const handleCancel = async () => {
    // Clean up pending avatar file if exists
    if (pendingAvatarFile) {
      try {
        await supabaseClient.storage
          .from('profile')
          .remove([pendingAvatarFile]);
        setPendingAvatarFile(null);
      } catch (error) {
        console.error('Failed to cleanup pending avatar file:', error);
      }
    }

    // Reset form data to original profile data
    if (profile) {
      const profileGender = profile.gender === 'male' || profile.gender === 'female' 
        ? profile.gender 
        : '';
      
      setFormData({
        full_name: profile.full_name || '',
        username: profile.username || '',
        gender: profileGender,
        avatar_url: profile.avatar_url || ''
      });
    }
    router.push('/');
  };

  const hasChanges = useMemo(() => {
    if (!profile) return false;
    
    const profileGender = profile.gender === 'male' || profile.gender === 'female' 
      ? profile.gender 
      : '';
    
    return (
      formData.full_name !== (profile.full_name || '') ||
      formData.username !== (profile.username || '') ||
      formData.gender !== profileGender ||
      formData.avatar_url !== (profile.avatar_url || '')
    );
  }, [formData, profile]);

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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8"
        >
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-6 sm:px-8">
              <div className="mb-4">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  Profile
                </h1>
              </div>

              {/* Profile Photo Section */}
              <div className="space-y-4 mb-6">
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('profile.profilePhoto')}</h3>
                  <div className="flex items-center gap-6">
                    <div className="relative w-20 h-20 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700">
                      {formData.avatar_url ? (
                        <Image
                          src={formData.avatar_url}
                          alt={t('profile.profilePicture')}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <User className="h-8 w-8 text-gray-400" />
                        </div>
                      )}
                      
                      {uploadingAvatar && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <Loader2 className="h-6 w-6 text-white animate-spin" />
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingAvatar}
                        className="flex items-center gap-2"
                      >
                        {uploadingAvatar ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Camera className="h-4 w-4" />
                        )}
                        {t('profile.changePhoto')}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Profile Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email (Read-only) */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-base font-medium">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email || ''}
                    disabled
                    className="bg-gray-50 dark:bg-gray-900 cursor-not-allowed"
                  />
                </div>

                {/* Full Name */}
                <div className="space-y-2">
                  <Label htmlFor="full_name" className="text-base font-medium">
                    {t('profile.fullName')} *
                  </Label>
                  <div className="relative">
                    <Input
                      id="full_name"
                      type="text"
                      value={formData.full_name}
                      onChange={(e) => handleInputChange('full_name', e.target.value)}
                      className={`pr-10 ${
                        validation.full_name.isValid
                          ? 'border-green-300 focus:border-green-500'
                          : formData.full_name && !validation.full_name.isValid
                          ? 'border-red-300 focus:border-red-500'
                          : ''
                      }`}
                      placeholder={t('profile.fullNamePlaceholder')}
                    />
                    {formData.full_name && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {validation.full_name.isValid ? (
                          <Check className="h-5 w-5 text-green-500" />
                        ) : (
                          <X className="h-5 w-5 text-red-500" />
                        )}
                      </div>
                    )}
                  </div>
                  {validation.full_name.message && (
                    <p className={`text-sm ${
                      validation.full_name.isValid ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {validation.full_name.message}
                    </p>
                  )}
                </div>

                {/* Username */}
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-base font-medium">
                    {t('profile.username')} *
                  </Label>
                  <div className="relative">
                    <Input
                      id="username"
                      type="text"
                      value={formData.username}
                      onChange={(e) => handleInputChange('username', e.target.value)}
                      className={`pr-10 ${
                        validation.username.isValid
                          ? 'border-green-300 focus:border-green-500'
                          : formData.username && !validation.username.isValid
                          ? 'border-red-300 focus:border-red-500'
                          : ''
                      }`}
                      placeholder={t('profile.usernamePlaceholder')}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {checkingUsername ? (
                        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                      ) : formData.username ? (
                        validation.username.isValid ? (
                          <Check className="h-5 w-5 text-green-500" />
                        ) : (
                          <X className="h-5 w-5 text-red-500" />
                        )
                      ) : null}
                    </div>
                  </div>
                  {validation.username.message && (
                    <p className={`text-sm ${
                      validation.username.isValid ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {validation.username.message}
                    </p>
                  )}
                </div>

                {/* Gender */}
                <div className="space-y-2">
                  <Label htmlFor="gender" className="text-base font-medium">{t('profile.gender')}</Label>
                  <Select
                    value={formData.gender}
                    onValueChange={(value) => handleInputChange('gender', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('profile.selectGender')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">{t('profile.male')}</SelectItem>
                      <SelectItem value="female">{t('profile.female')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Action Buttons */}
                <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <Button
                      type="submit"
                      disabled={!hasChanges || !validation.full_name.isValid || !validation.username.isValid || updating}
                      className={`w-full sm:w-auto transition-all ${
                        (!hasChanges || !validation.full_name.isValid || !validation.username.isValid)
                          ? 'bg-gray-400 hover:bg-gray-400 cursor-not-allowed text-gray-600'  
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      {updating ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          {t('profile.uploading')}
                        </>
                      ) : (
                        t('profile.updateProfile')
                      )}
                    </Button>
                    
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancel}
                      disabled={updating}
                      className="w-full sm:w-auto border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                    >
                      Batal
                    </Button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Avatar Crop Modal */}
      <Dialog open={showAvatarModal} onOpenChange={setShowAvatarModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('profile.setupPhoto')}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Preview */}
            <div className="flex justify-center">
              <div className="relative w-64 h-64 overflow-hidden bg-gray-100 dark:bg-gray-700 border-2 border-dashed border-gray-300 rounded-full">
                {tempImageUrl && (
                  <div 
                    className="absolute inset-0 cursor-move select-none flex items-center justify-center"
                    onMouseDown={(e) => {
                      setIsDragging(true);
                      const rect = e.currentTarget.getBoundingClientRect();
                      const centerX = rect.width / 2;
                      const centerY = rect.height / 2;
                      setDragStart({ 
                        x: e.clientX - rect.left - centerX - imagePosition.x, 
                        y: e.clientY - rect.top - centerY - imagePosition.y 
                      });
                    }}
                    onMouseMove={(e) => {
                      if (isDragging) {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const centerX = rect.width / 2;
                        const centerY = rect.height / 2;
                        setImagePosition({
                          x: e.clientX - rect.left - centerX - dragStart.x,
                          y: e.clientY - rect.top - centerY - dragStart.y
                        });
                      }
                    }}
                    onMouseUp={() => setIsDragging(false)}
                    onMouseLeave={() => setIsDragging(false)}
                  >
                    <div
                      className="relative"
                      style={{
                        transform: `translate(${imagePosition.x}px, ${imagePosition.y}px) scale(${imageScale}) rotate(${imageRotation}deg)`,
                        transition: isDragging ? 'none' : 'transform 0.1s ease-out'
                      }}
                    >
                      <Image
                        src={tempImageUrl}
                        alt="Preview"
                        width={400}
                        height={400}
                        className="pointer-events-none object-cover"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Controls */}
            <div className="space-y-4">
              {/* Zoom Control */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Zoom</Label>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setImageScale(prev => Math.max(0.5, prev - 0.1))}
                    className="flex items-center gap-2"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <Slider
                    value={[imageScale]}
                    onValueChange={([value]) => setImageScale(value)}
                    min={0.5}
                    max={3}
                    step={0.1}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setImageScale(prev => Math.min(3, prev + 0.1))}
                    className="flex items-center gap-2"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Rotation and Reset */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setImageRotation((prev) => (prev + 90) % 360)}
                  className="flex items-center gap-2"
                >
                  <RotateCw className="h-4 w-4" />
                  Putar 90°
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setImageScale(1);
                    setImageRotation(0);
                    setImagePosition({ x: 0, y: 0 });
                  }}
                  className="flex items-center gap-2"
                >
                  Reset
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleAvatarCancel}
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleAvatarConfirm}
              disabled={uploadingAvatar}
            >
              {uploadingAvatar ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Mengunggah...
                </>
              ) : (
                'Terapkan'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hidden canvas for image processing */}
      <canvas ref={canvasRef} className="hidden" />
    </ModernLayout>
  );
}
