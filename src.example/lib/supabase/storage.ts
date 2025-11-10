import { supabaseClient } from './client';

/**
 * Upload image to Supabase Storage
 * @param imageDataUrl - Base64 data URL (data:image/png;base64,...)
 * @param fileName - Name of the file to save
 * @param bucketName - Name of the storage bucket (default: 'certificates')
 * @returns Public URL of the uploaded file
 */
export async function uploadImageToStorage(
  imageDataUrl: string,
  fileName: string,
  bucketName: string = 'certificates'
): Promise<string> {
  try {
    console.log('📤 Starting Supabase Storage upload...', { fileName, bucketName });

    // Convert data URL to blob
    const base64Data = imageDataUrl.replace(/^data:image\/png;base64,/, '');
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'image/png' });

    // Create File object from blob
    const file = new File([blob], fileName, { type: 'image/png' });

    console.log('📁 File prepared:', { name: file.name, size: file.size, type: file.type });

    // Upload to Supabase Storage
    const { data, error } = await supabaseClient.storage
      .from(bucketName)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true, // Overwrite if file exists
        contentType: 'image/png',
      });

    if (error) {
      console.error('❌ Supabase Storage upload error:', error);
      throw new Error(`Failed to upload to storage: ${error.message}`);
    }

    console.log('✅ File uploaded to storage:', data);

    // Get public URL
    const { data: urlData } = supabaseClient.storage
      .from(bucketName)
      .getPublicUrl(fileName);

    if (!urlData?.publicUrl) {
      throw new Error('Failed to get public URL');
    }

    console.log('🔗 Public URL generated:', urlData.publicUrl);
    return urlData.publicUrl;

  } catch (error) {
    console.error('💥 Supabase Storage upload process failed:', error);
    throw error;
  }
}

/**
 * Delete image from Supabase Storage
 * @param fileName - Name of the file to delete
 * @param bucketName - Name of the storage bucket (default: 'certificates')
 */
export async function deleteImageFromStorage(
  fileName: string,
  bucketName: string = 'certificates'
): Promise<void> {
  try {
    console.log('🗑️ Deleting file from storage...', { fileName, bucketName });

    const { error } = await supabaseClient.storage
      .from(bucketName)
      .remove([fileName]);

    if (error) {
      console.error('❌ Supabase Storage delete error:', error);
      throw new Error(`Failed to delete from storage: ${error.message}`);
    }

    console.log('✅ File deleted from storage:', fileName);
  } catch (error) {
    console.error('💥 Supabase Storage delete process failed:', error);
    throw error;
  }
}

