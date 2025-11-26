"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
import { toast } from "sonner";
import { supabaseClient } from "@/lib/supabase/client";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const { } = useLanguage();
  const { isAuthenticated, email } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const {
    profile,
    loading,
    error,
    updating,
    checkingUsername,
    fetchProfile,
    updateProfile,
    checkUsernameAvailability,
    clearError
  } = useProfile();

  const [formData, setFormData] = useState({
    full_name: '',
    username: '',
    gender: '' as 'male' | 'female' | '',
    avatar_url: ''
  });

  const [validation, setValidation] = useState({
    username: { isValid: true, isAvailable: true, message: '' },
    full_name: { isValid: true, message: '' }
  });

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [usernameCheckTimeout, setUsernameCheckTimeout] = useState<NodeJS.Timeout | null>(null);
  
  // Avatar crop modal state
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [tempImageUrl, setTempImageUrl] = useState<string>('');
  const [tempImageFile, setTempImageFile] = useState<File | null>(null);
  const [imageScale, setImageScale] = useState(1);
  const [imageRotation, setImageRotation] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Set document title
  useEffect(() => {
    const setTitle = () => {
      if (typeof document !== 'undefined') {
        document.title = "Profile | Certify - Certificate Platform";
      }
    };
    
    setTitle();
    const timeouts = [
      setTimeout(setTitle, 50),
      setTimeout(setTitle, 200),
      setTimeout(setTitle, 500)
    ];
    
    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, []);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/');
      return;
    }

    // Fetch profile when component mounts
    fetchProfile();
  }, [isAuthenticated, router, fetchProfile]);

  // Update form data when profile loads
  useEffect(() => {
    if (profile) {
      // Only keep male/female for gender selection
      const profileGender = profile.gender === 'male' || profile.gender === 'female' 
        ? profile.gender 
        : '';
        
      setFormData({
        full_name: profile.full_name || '',
        username: profile.username || '',
        gender: profileGender,
        avatar_url: profile.avatar_url || ''
      });
      
      // Validate initial data
      setValidation(prev => ({
        ...prev,
        full_name: { isValid: !!profile.full_name?.trim(), message: '' },
        username: { isValid: !!profile.username?.trim(), isAvailable: true, message: '' }
      }));
    }
  }, [profile]);

  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (usernameCheckTimeout) {
        clearTimeout(usernameCheckTimeout);
      }
    };
  }, [usernameCheckTimeout]);

  const validateFullName = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return { isValid: false, message: 'Nama lengkap wajib diisi' };
    }
    if (trimmed.length < 2) {
      return { isValid: false, message: 'Nama minimal 2 karakter' };
    }
    return { isValid: true, message: '' };
  };

  const validateUsername = useCallback(async (value: string) => {
    const trimmed = value.trim();
    const normalized = trimmed.toLowerCase(); // Normalize to lowercase like backend
    
    if (!trimmed) {
      return { isValid: false, isAvailable: false, message: 'Username wajib diisi' };
    }
    
    if (trimmed.length < 3) {
      return { isValid: false, isAvailable: false, message: 'Username minimal 3 karakter' };
    }
    
    if (trimmed.length > 50) {
      return { isValid: false, isAvailable: false, message: 'Username maksimal 50 karakter' };
    }
    
    // Enhanced regex to match backend validation (lowercase only)
    const usernameRegex = /^[a-z0-9_]+$/;
    if (!usernameRegex.test(normalized)) {
      return { isValid: false, isAvailable: false, message: 'Username hanya boleh berisi huruf kecil, angka, dan underscore' };
    }
    
    // If it's the same as current username, it's valid
    if (normalized === (profile?.username || '').toLowerCase()) {
      return { isValid: true, isAvailable: true, message: '' };
    }
    
    // Check availability for different username (send normalized version)
    try {
      console.log(`🔍 Frontend: Validating username "${normalized}"`);
      const isAvailable = await checkUsernameAvailability(normalized);
      console.log(`✅ Frontend: Username "${normalized}" available:`, isAvailable);
      
      if (!isAvailable) {
        return { isValid: false, isAvailable: false, message: 'Username sudah digunakan' };
      }
      return { isValid: true, isAvailable: true, message: '' };
    } catch (error) {
      console.error('Username validation error:', error);
      return { isValid: false, isAvailable: false, message: 'Gagal memeriksa ketersediaan username' };
    }
  }, [profile?.username, checkUsernameAvailability]);

  const handleInputChange = useCallback((field: string, value: string) => {
    // Auto-normalize username to lowercase for better UX
    const normalizedValue = field === 'username' ? value.toLowerCase() : value;
    
    setFormData(prev => ({ ...prev, [field]: normalizedValue }));
    
    if (field === 'full_name') {
      const validation = validateFullName(normalizedValue);
      setValidation(prev => ({
        ...prev,
        full_name: validation
      }));
    } else if (field === 'username') {
      // Clear existing timeout
      if (usernameCheckTimeout) {
        clearTimeout(usernameCheckTimeout);
      }
      
      // Set initial state to show it's checking
      setValidation(prev => ({
        ...prev,
        username: { isValid: false, isAvailable: false, message: 'Checking availability...' }
      }));
      
      // Debounce username validation
      const timeout = setTimeout(async () => {
        const validation = await validateUsername(normalizedValue);
        setValidation(prev => ({
          ...prev,
          username: validation
        }));
      }, 500); // 500ms debounce
      
      setUsernameCheckTimeout(timeout);
    }
  }, [usernameCheckTimeout, validateUsername]);

  // Open avatar modal when file is selected
  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be smaller than 5MB');
      return;
    }

    // Create preview URL
    const url = URL.createObjectURL(file);
    setTempImageUrl(url);
    setTempImageFile(file);
    setImageScale(1);
    setImageRotation(0);
    setShowAvatarModal(true);
  };

  // Apply crop and upload
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

      // Set canvas size (square for avatar)
      const size = 256;
      canvas.width = size;
      canvas.height = size;

      // Clear and fill with white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);

      // Apply transformations
      ctx.save();
      ctx.translate(size / 2, size / 2);
      ctx.rotate((imageRotation * Math.PI) / 180);
      ctx.scale(imageScale, imageScale);

      // Draw image centered
      const aspectRatio = img.width / img.height;
      let drawWidth, drawHeight;
      if (aspectRatio > 1) {
        drawHeight = size;
        drawWidth = size * aspectRatio;
      } else {
        drawWidth = size;
        drawHeight = size / aspectRatio;
      }
      ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
      ctx.restore();

      // Convert to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => b ? resolve(b) : reject(new Error('Failed to create blob')), 'image/jpeg', 0.9);
      });

      // Upload to Supabase Storage
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

      setFormData(prev => ({ ...prev, avatar_url: publicUrl }));
      toast.success('Foto profil berhasil diunggah');

    } catch (err) {
      console.error('Avatar upload error:', err);
      toast.error('Gagal mengunggah foto profil');
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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Final validation
    const fullNameValidation = validateFullName(formData.full_name);
    const usernameValidation = await validateUsername(formData.username);

    if (!fullNameValidation.isValid || !usernameValidation.isValid) {
      toast.error('Mohon perbaiki kesalahan validasi');
      return;
    }

    const updates = {
      full_name: formData.full_name.trim(),
      username: formData.username.trim().toLowerCase(), // Ensure lowercase
      gender: formData.gender || undefined,
      avatar_url: formData.avatar_url || undefined
    };

    const success = await updateProfile(updates);
    
    if (success) {
      toast.success('Profil berhasil disimpan!');
    } else {
      toast.error('Gagal menyimpan profil. Silakan coba lagi.');
    }
  };

  const handleCancel = useCallback(() => {
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
      
      // Reset validation
      setValidation({
        full_name: { isValid: !!profile.full_name?.trim(), message: '' },
        username: { isValid: !!profile.username?.trim(), isAvailable: true, message: '' }
      });
      
      // Clear any timeouts
      if (usernameCheckTimeout) {
        clearTimeout(usernameCheckTimeout);
        setUsernameCheckTimeout(null);
      }
    }
    
    // Navigate back to homepage
    router.push('/');
    toast.info('Changes cancelled');
  }, [profile, router, usernameCheckTimeout]);

  if (!isAuthenticated) {
    return null; // Will redirect in useEffect
  }

  if (loading) {
    return (
      <ModernLayout hideSidebar>
        <div className="max-w-4xl mx-auto p-4 space-y-4">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </div>
      </ModernLayout>
    );
  }

  return (
    <ModernLayout hideSidebar>
      <div className="max-w-4xl mx-auto p-4 space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header */}
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
              <User className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Edit Profil
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Kelola informasi profil Anda
              </p>
            </div>
          </div>


          {/* Main Form */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              
              {/* Avatar Section */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Foto Profil</Label>
                <div className="flex items-center gap-6">
                  <div className="relative w-20 h-20 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700">
                    {formData.avatar_url ? (
                      <Image
                        src={formData.avatar_url}
                        alt="Profile picture"
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
                      Ubah Foto
                    </Button>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      JPG, PNG maksimal 5MB
                    </p>
                  </div>
                </div>
              </div>

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
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Email tidak dapat diubah
                </p>
              </div>

              {/* Full Name */}
              <div className="space-y-2">
                <Label htmlFor="full_name" className="text-base font-medium">
                  Nama Lengkap *
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
                    placeholder="Masukkan nama lengkap Anda"
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
                  Username *
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
                    placeholder="Masukkan username Anda"
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
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Username hanya boleh berisi huruf kecil, angka, dan underscore
                </p>
              </div>

              {/* Gender */}
              <div className="space-y-2">
                <Label htmlFor="gender" className="text-base font-medium">Jenis Kelamin</Label>
                <Select
                  value={formData.gender}
                  onValueChange={(value) => handleInputChange('gender', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih jenis kelamin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Laki-laki</SelectItem>
                    <SelectItem value="female">Perempuan</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Informasi ini opsional
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <Button
                    type="submit"
                    disabled={updating}
                    className="w-full sm:w-auto transition-all bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-400 disabled:cursor-not-allowed disabled:text-gray-600"
                  >
                    {updating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Menyimpan...
                      </>
                    ) : (
                      'Simpan'
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


        </motion.div>
      </div>

      {/* Avatar Crop Modal */}
      <Dialog open={showAvatarModal} onOpenChange={setShowAvatarModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Atur Foto Profil</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Preview */}
            <div className="flex justify-center">
              <div className="relative w-48 h-48 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700 border-2 border-dashed border-gray-300">
                {tempImageUrl && (
                  <div 
                    className="w-full h-full flex items-center justify-center"
                    style={{
                      transform: `scale(${imageScale}) rotate(${imageRotation}deg)`,
                      transition: 'transform 0.1s ease-out'
                    }}
                  >
                    <Image
                      src={tempImageUrl}
                      alt="Preview"
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Zoom Control */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Perbesar</Label>
                <span className="text-sm text-gray-500">{Math.round(imageScale * 100)}%</span>
              </div>
              <div className="flex items-center gap-3">
                <ZoomOut className="h-4 w-4 text-gray-400" />
                <Slider
                  value={[imageScale]}
                  onValueChange={(values: number[]) => setImageScale(values[0])}
                  min={0.5}
                  max={2}
                  step={0.1}
                  className="flex-1"
                />
                <ZoomIn className="h-4 w-4 text-gray-400" />
              </div>
            </div>

            {/* Rotate Button */}
            <div className="flex justify-center">
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
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleAvatarCancel}>
              Batal
            </Button>
            <Button onClick={handleAvatarConfirm} disabled={uploadingAvatar}>
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
