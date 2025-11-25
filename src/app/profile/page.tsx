"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import ModernLayout from "@/components/modern-layout";
import { motion } from "framer-motion";
import { User, Camera, Check, X, Loader2 } from "lucide-react";
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
    username: { isValid: false, isAvailable: false, message: '' },
    full_name: { isValid: false, message: '' }
  });

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [usernameCheckTimeout, setUsernameCheckTimeout] = useState<NodeJS.Timeout | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [cropSettings, setCropSettings] = useState({
    scale: 1,
    x: 0,
    y: 0
  });

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

    fetchProfile();
  }, [isAuthenticated, router, fetchProfile]);

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
      
      // Validate initial data
      setValidation(prev => ({
        ...prev,
        full_name: { isValid: !!profile.full_name?.trim(), message: '' },
        username: { isValid: !!profile.username?.trim(), isAvailable: true, message: '' }
      }));
    }
  }, [profile]);

  // Check for changes
  useEffect(() => {
    if (!profile) return;
    
    const hasFieldChanges = (
      formData.full_name !== (profile.full_name || '') ||
      formData.username !== (profile.username || '') ||
      formData.gender !== (profile.gender || '') ||
      formData.avatar_url !== (profile.avatar_url || '')
    );
    
    setHasChanges(hasFieldChanges);
  }, [formData, profile]);
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (usernameCheckTimeout) {
        clearTimeout(usernameCheckTimeout);
      }
    };
  }, [usernameCheckTimeout]);

  // Auto-clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        clearError();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  const validateFullName = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return { isValid: false, message: 'Full name is required' };
    }
    if (trimmed.length < 2) {
      return { isValid: false, message: 'Name must be at least 2 characters' };
    }
    return { isValid: true, message: '' };
  };

  const validateUsername = useCallback(async (value: string) => {
    const trimmed = value.trim();
    
    if (!trimmed) {
      return { isValid: false, isAvailable: false, message: 'Username is required' };
    }
    
    if (trimmed.length < 3) {
      return { isValid: false, isAvailable: false, message: 'Username must be at least 3 characters' };
    }
    
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(trimmed)) {
      return { isValid: false, isAvailable: false, message: 'Username can only contain letters, numbers, and underscores' };
    }
    
    // If it's the same as current username, it's valid
    const currentUsername = (profile?.username || '').toLowerCase();
    const inputUsername = trimmed.toLowerCase();
    
    if (inputUsername === currentUsername) {
      return { isValid: true, isAvailable: true, message: '' };
    }
    
    // Check availability for different username
    try {
      const isAvailable = await checkUsernameAvailability(trimmed);
      
      if (!isAvailable) {
        return { isValid: false, isAvailable: false, message: 'Username is already taken' };
      }
      return { isValid: true, isAvailable: true, message: '' };
    } catch (error) {
      console.error('Username validation error:', error);
      return { isValid: false, isAvailable: false, message: 'Error checking username availability' };
    }
  }, [profile?.username, checkUsernameAvailability]);

  const handleInputChange = useCallback((field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (field === 'full_name') {
      const validation = validateFullName(value);
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
        const validation = await validateUsername(value);
        setValidation(prev => ({
          ...prev,
          username: validation
        }));
      }, 500); // 500ms debounce
      
      setUsernameCheckTimeout(timeout);
    }
  }, [usernameCheckTimeout, validateUsername]);

  const handleFileSelect = (file: File) => {
    // Validate file
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB
      toast.error('Image must be smaller than 5MB');
      return;
    }

    // Create preview URL
    const url = URL.createObjectURL(file);
    setSelectedImage(file);
    setPreviewUrl(url);
    setCropSettings({ scale: 1, x: 0, y: 0 }); // Reset crop settings for new image
    setShowCropModal(true);
  };

  const handleAvatarUpload = async (croppedFile: File) => {
    if (!profile) return;

    setUploadingAvatar(true);

    try {
      // Create unique filename
      const fileExt = croppedFile.name.split('.').pop() || 'jpg';
      const fileName = `avatar-${profile.id}-${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabaseClient.storage
        .from('profile')
        .upload(fileName, croppedFile, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabaseClient.storage
        .from('profile')
        .getPublicUrl(uploadData.path);

      // Update form data
      setFormData(prev => ({ ...prev, avatar_url: publicUrl }));
      toast.success('Avatar uploaded successfully');

      // Clean up
      setShowCropModal(false);
      setSelectedImage(null);
      setCropSettings({ scale: 1, x: 0, y: 0 });
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }

    } catch (err) {
      console.error('Avatar upload error:', err);
      toast.error('Failed to upload avatar');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const cancelCrop = () => {
    setShowCropModal(false);
    setSelectedImage(null);
    setCropSettings({ scale: 1, x: 0, y: 0 });
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log('🚀 Starting profile update...');
    console.log('📋 Form data:', formData);

    // Final validation
    const fullNameValidation = validateFullName(formData.full_name);
    const usernameValidation = await validateUsername(formData.username);

    console.log('✅ Full name validation:', fullNameValidation);
    console.log('✅ Username validation:', usernameValidation);

    if (!fullNameValidation.isValid || !usernameValidation.isValid) {
      toast.error('Please fix validation errors');
      return;
    }

    const updates = {
      full_name: formData.full_name.trim(),
      username: formData.username.trim(),
      gender: formData.gender || undefined,
      avatar_url: formData.avatar_url || undefined
    };

    console.log('📤 Sending updates:', updates);
    const success = await updateProfile(updates);
    console.log('📥 Update result:', success);
    
    if (success) {
      toast.success('Profile updated successfully');
    } else {
      toast.error('Failed to update profile');
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
        <div className="max-w-4xl mx-auto p-4">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </div>
      </ModernLayout>
    );
  }

  return (
    <ModernLayout hideSidebar>
      <div className="max-w-4xl mx-auto px-4 pt-2 pb-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-3"
        >
          {/* Header - Compact */}
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
              <User className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Edit Profile
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Customize your profile information
              </p>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4"
            >
              <div className="flex items-center gap-3">
                <X className="h-5 w-5 text-red-500" />
                <p className="text-red-700 dark:text-red-400">{error}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearError}
                  className="ml-auto text-red-600 hover:text-red-800"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Main Form */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <form onSubmit={handleSubmit} className="p-3 space-y-3">
              
              {/* Avatar Section */}
              <div className="space-y-2">
                <Label className="text-base font-medium">Profile Picture</Label>
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
                      Change Picture
                    </Button>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      JPG, PNG up to 5MB
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
                  Email cannot be changed
                </p>
              </div>

              {/* Full Name */}
              <div className="space-y-2">
                <Label htmlFor="full_name" className="text-base font-medium">
                  Full Name *
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
                    placeholder="Enter your full name"
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
                    placeholder="Enter your username"
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
                  Username can only contain letters, numbers, and underscores
                </p>
              </div>

              {/* Gender */}
              <div className="space-y-2">
                <Label htmlFor="gender" className="text-base font-medium">Gender</Label>
                <Select
                  value={formData.gender}
                  onValueChange={(value) => handleInputChange('gender', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select your gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  This information is optional
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <Button
                    type="submit"
                    disabled={
                      !validation.full_name.isValid || 
                      !validation.username.isValid || 
                      updating ||
                      checkingUsername
                    }
                    className={`w-full sm:w-auto transition-all ${
                      (!validation.full_name.isValid || !validation.username.isValid || updating || checkingUsername)
                        ? 'bg-gray-400 hover:bg-gray-400 cursor-not-allowed text-gray-600'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {updating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save'
                    )}
                  </Button>
                  
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    disabled={updating}
                    className="w-full sm:w-auto border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </form>
          </div>

          {/* Crop Modal */}
          {showCropModal && previewUrl && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-lg w-full"
              >
                <h3 className="text-lg font-semibold mb-4">Adjust Profile Picture</h3>
                
                <div className="space-y-6">
                  {/* Preview Area */}
                  <div className="flex justify-center">
                    <div className="relative w-64 h-64 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700 border-4 border-blue-500">
                      <div 
                        className="absolute inset-0 cursor-move"
                        style={{
                          transform: `translate(${cropSettings.x}px, ${cropSettings.y}px) scale(${cropSettings.scale})`,
                          transition: 'transform 0.1s ease'
                        }}
                        onMouseDown={(e) => {
                          const startX = e.clientX - cropSettings.x;
                          const startY = e.clientY - cropSettings.y;
                          
                          const handleMouseMove = (e: MouseEvent) => {
                            setCropSettings(prev => ({
                              ...prev,
                              x: e.clientX - startX,
                              y: e.clientY - startY
                            }));
                          };
                          
                          const handleMouseUp = () => {
                            document.removeEventListener('mousemove', handleMouseMove);
                            document.removeEventListener('mouseup', handleMouseUp);
                          };
                          
                          document.addEventListener('mousemove', handleMouseMove);
                          document.addEventListener('mouseup', handleMouseUp);
                        }}
                      >
                        <Image
                          src={previewUrl}
                          alt="Preview"
                          fill
                          className="object-cover select-none pointer-events-none"
                          draggable={false}
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Controls */}
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Zoom</Label>
                      <input
                        type="range"
                        min="0.5"
                        max="3"
                        step="0.1"
                        value={cropSettings.scale}
                        onChange={(e) => setCropSettings(prev => ({ ...prev, scale: parseFloat(e.target.value) }))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>50%</span>
                        <span>300%</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={() => setCropSettings({ scale: 1, x: 0, y: 0 })}
                        className="text-sm"
                        disabled={uploadingAvatar}
                      >
                        Reset
                      </Button>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                    Drag to reposition • Use slider to zoom
                  </p>
                  
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={cancelCrop}
                      className="flex-1"
                      disabled={uploadingAvatar}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => selectedImage && handleAvatarUpload(selectedImage)}
                      className="flex-1"
                      disabled={uploadingAvatar}
                    >
                      {uploadingAvatar ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        'Use Photo'
                      )}
                    </Button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </motion.div>
      </div>
    </ModernLayout>
  );
}
