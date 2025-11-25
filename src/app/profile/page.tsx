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
    const normalized = trimmed.toLowerCase(); // Normalize to lowercase like backend
    
    if (!trimmed) {
      return { isValid: false, isAvailable: false, message: 'Username is required' };
    }
    
    if (trimmed.length < 3) {
      return { isValid: false, isAvailable: false, message: 'Username must be at least 3 characters' };
    }
    
    if (trimmed.length > 50) {
      return { isValid: false, isAvailable: false, message: 'Username must be less than 50 characters' };
    }
    
    // Enhanced regex to match backend validation (lowercase only)
    const usernameRegex = /^[a-z0-9_]+$/;
    if (!usernameRegex.test(normalized)) {
      return { isValid: false, isAvailable: false, message: 'Username can only contain lowercase letters, numbers, and underscores' };
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
        return { isValid: false, isAvailable: false, message: 'Username is already taken' };
      }
      return { isValid: true, isAvailable: true, message: '' };
    } catch (error) {
      console.error('Username validation error:', error);
      return { isValid: false, isAvailable: false, message: 'Error checking username availability' };
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

  const handleAvatarUpload = async (file: File) => {
    if (!profile) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB
      toast.error('Image must be smaller than 5MB');
      return;
    }

    setUploadingAvatar(true);

    try {
      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `avatar-${profile.id}-${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabaseClient.storage
        .from('profile')
        .upload(fileName, file, {
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

    } catch (err) {
      console.error('Avatar upload error:', err);
      toast.error('Failed to upload avatar');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Final validation
    const fullNameValidation = validateFullName(formData.full_name);
    const usernameValidation = await validateUsername(formData.username);

    if (!fullNameValidation.isValid || !usernameValidation.isValid) {
      toast.error('Please fix validation errors');
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
      toast.success('Profile updated successfully');
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
                Edit Profile
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Customize your profile information
              </p>
            </div>
          </div>


          {/* Main Form */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              
              {/* Avatar Section */}
              <div className="space-y-3">
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
                      onChange={(e) => e.target.files?.[0] && handleAvatarUpload(e.target.files[0])}
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
              <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <Button
                    type="submit"
                    disabled={
                      !hasChanges || 
                      !validation.full_name.isValid || 
                      !validation.username.isValid || 
                      updating ||
                      checkingUsername
                    }
                    className={`w-full sm:w-auto transition-all ${
                      (!hasChanges || !validation.full_name.isValid || !validation.username.isValid || updating || checkingUsername)
                        ? 'bg-gray-400 hover:bg-gray-400 cursor-not-allowed text-gray-600'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {updating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      'Update Profile'
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


        </motion.div>
      </div>
    </ModernLayout>
  );
}
