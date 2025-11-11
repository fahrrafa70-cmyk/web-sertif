import { supabaseClient } from './client';

const BUCKET_NAME = 'templates';
const FOLDER_PREFIX = 'photo_layers';

export interface UploadPhotoResult {
  url: string;
  path: string;
}

/**
 * Upload photo to Supabase Storage
 * @param file - Image file to upload
 * @param templateId - Template ID for organizing files
 * @returns Public URL and storage path
 */
export async function uploadTemplatePhoto(
  file: File,
  templateId: string
): Promise<UploadPhotoResult> {
  // Validate file type
  if (!file.type.startsWith('image/')) {
    throw new Error('File must be an image');
  }

  // Validate file size
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error('Image size must be less than 5MB');
  }

  // Generate unique filename with timestamp
  const timestamp = Date.now();
  const fileExt = file.name.split('.').pop();
  const fileName = `photo_${timestamp}.${fileExt}`;
  // Path: photo_layers/{templateId}/{filename}
  const filePath = `${FOLDER_PREFIX}/${templateId}/${fileName}`;

  // Upload to Supabase Storage
  const { data, error } = await supabaseClient.storage
    .from(BUCKET_NAME)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    console.error('Upload error:', error);
    throw new Error(`Failed to upload image: ${error.message}`);
  }

  // Get public URL
  const { data: { publicUrl } } = supabaseClient.storage
    .from(BUCKET_NAME)
    .getPublicUrl(data.path);

  return {
    url: publicUrl,
    path: data.path
  };
}

/**
 * Delete photo from Supabase Storage
 * @param path - Storage path to delete
 */
export async function deleteTemplatePhoto(path: string): Promise<void> {
  const { error } = await supabaseClient.storage
    .from(BUCKET_NAME)
    .remove([path]);

  if (error) {
    console.error('Delete error:', error);
    throw new Error(`Failed to delete image: ${error.message}`);
  }
}

/**
 * Validate image dimensions and aspect ratio
 * @param file - Image file to validate
 * @returns Promise with image dimensions
 */
export async function validateImageFile(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}
