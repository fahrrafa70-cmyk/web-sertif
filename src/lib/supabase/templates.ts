import { supabaseClient } from './client';

// Test Supabase connection
export async function testSupabaseConnection(): Promise<boolean> {
  try {
    console.log('Testing Supabase connection...');
    
    // Test database connection
    const { error } = await supabaseClient
      .from('templates')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('Database connection failed:', error);
      return false;
    }
    
    console.log('Database connection successful');
    console.log('✅ Using local file storage (public/template) instead of Supabase Storage');
    return true;
    
  } catch (error) {
    console.error('Connection test failed:', error);
    return false;
  }
}

export interface Template {
  id: string;
  name: string;
  category: string;
  orientation: string;
  created_at: string;
  image_path?: string; // Add image path field
  preview_image_path?: string; // Optional preview (thumbnail) image
}

export interface CreateTemplateData {
  name: string;
  category: string;
  orientation: string;
  image_file?: File;
  preview_image_file?: File;
}

export interface UpdateTemplateData {
  name?: string;
  category?: string;
  orientation?: string;
  image_file?: File;
  preview_image_file?: File;
}

// Upload image to local public folder
export async function uploadTemplateImage(file: File): Promise<string> {
  console.log('📤 Starting local image upload...', { fileName: file.name, fileSize: file.size });
  
  try {
    // Validate file
    if (!file || file.size === 0) {
      throw new Error('Invalid file provided');
    }

    const fileExt = file.name.split('.').pop()?.toLowerCase();
    if (!fileExt || !['jpg', 'jpeg', 'png'].includes(fileExt)) {
      throw new Error('Invalid file type. Only JPG, JPEG, and PNG are allowed.');
    }

    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    
    console.log('📁 Creating FormData for local upload...');

    // Create FormData for file upload
    const formData = new FormData();
    formData.append('file', file);
    formData.append('fileName', fileName);

    console.log('📤 Uploading to local server...');

    // Upload to local API endpoint
    const response = await fetch('/api/upload-template', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload failed: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(`Upload failed: ${result.error}`);
    }

    console.log('✅ Local upload successful:', result);
    console.log('🔗 Local URL generated:', result.url);

    return result.url; // Return the URL for database storage

  } catch (error) {
    console.error('💥 Local image upload process failed:', error);
    throw error;
  }
}

// Helper function to get template image URL with cache busting
export function getTemplateImageUrl(template: Template): string | null {
  if (!template.image_path) {
    return null;
  }
  
  // Add cache busting parameter to ensure fresh images
  // Use template ID and timestamp for better cache busting
  const cacheBuster = `?v=${template.id}&t=${Date.now()}`;
  return `${template.image_path}${cacheBuster}`;
}

// Helper function to get template image URL without cache busting (for previews)
export function getTemplateImageUrlStatic(template: Template): string | null {
  return template.image_path || null;
}

// Helper function: get preview image URL (preferred), fallback to template image
export function getTemplatePreviewUrl(template: Template): string | null {
  const src = template.preview_image_path || template.image_path;
  if (!src) return null;
  const cacheBuster = `?v=${template.id}&t=${Date.now()}`;
  return `${src}${cacheBuster}`;
}

// Note: Image deletion is handled by the file system cleanup process

// Get all templates
export async function getTemplates(): Promise<Template[]> {
  const { data, error } = await supabaseClient
    .from('templates')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch templates: ${error.message}`);
  }

  return data || [];
}

// Get template by ID
export async function getTemplate(id: string): Promise<Template | null> {
  const { data, error } = await supabaseClient
    .from('templates')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Template not found
    }
    throw new Error(`Failed to fetch template: ${error.message}`);
  }

  return data;
}

// Create new template
export async function createTemplate(templateData: CreateTemplateData): Promise<Template> {
  console.log('🚀 Starting template creation process...', templateData);
  
  try {
    // Validate required fields
    if (!templateData.name?.trim() || !templateData.category?.trim() || !templateData.orientation?.trim()) {
      throw new Error('Missing required fields: name, category, and orientation are required');
    }

    // Check authentication status
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    console.log('👤 Current user:', user);
    if (authError) {
      console.error('❌ Auth error:', authError);
    }
    
    let imagePath: string | undefined;
    let previewImagePath: string | undefined;
    
    // Upload image if provided
    if (templateData.image_file) {
      console.log('📤 Image file provided, starting upload...');
      try {
        imagePath = await uploadTemplateImage(templateData.image_file);
        console.log('✅ Image upload completed, path:', imagePath);
      } catch (uploadError) {
        console.error('❌ Image upload failed:', uploadError);
        throw new Error(`Image upload failed: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`);
      }
    } else {
      console.log('ℹ️ No image file provided');
    }

    // Upload preview image if provided
    if (templateData.preview_image_file) {
      try {
        previewImagePath = await uploadTemplateImage(templateData.preview_image_file);
        console.log('✅ Preview image upload completed, path:', previewImagePath);
      } catch (uploadError) {
        console.error('❌ Preview image upload failed:', uploadError);
        // Do not block creation if preview upload fails
      }
    }

    const insertData: Record<string, any> = {
      name: templateData.name.trim(),
      category: templateData.category.trim(),
      orientation: templateData.orientation.trim(),
      image_path: imagePath // Store the image path
    };

    // Only include preview_image_path if we actually have it
    if (previewImagePath) {
      insertData.preview_image_path = previewImagePath;
    }

    console.log('💾 Inserting template data to database:', insertData);

    // Insert data into templates table
    let { data, error } = await supabaseClient
      .from('templates')
      .insert([insertData]) // Wrap in array for proper insert
      .select()
      .single();

    if (error) {
      // Backward compatibility: retry without preview_image_path if column doesn't exist
      const columnMissing = typeof error.message === 'string' && error.message.includes('preview_image_path');
      if (columnMissing && previewImagePath) {
        console.warn('⚠️ preview_image_path column missing. Retrying insert without it.');
        delete insertData.preview_image_path;
        ({ data, error } = await supabaseClient
          .from('templates')
          .insert([insertData])
          .select()
          .single());
      }
      if (error) {
        console.error('❌ Database insert error:', error);
        console.error('Error details:', {
          code: (error as any).code,
          message: error.message,
          details: (error as any).details,
          hint: (error as any).hint
        });
        throw new Error(`Failed to create template: ${error.message}`);
      }
    }

    console.log('✅ Template created successfully in database:', data);
    
    // Verify the data was actually saved
    if (!data || !data.id) {
      throw new Error('Template was not created - no data returned from database');
    }

    // Double-check by fetching the created template
    console.log('🔍 Verifying template was saved by fetching it...');
    const { data: verifyData, error: verifyError } = await supabaseClient
      .from('templates')
      .select('*')
      .eq('id', data.id)
      .single();

    if (verifyError) {
      console.error('❌ Verification failed:', verifyError);
      throw new Error('Template was created but could not be verified');
    }

    console.log('✅ Template verification successful:', verifyData);
    return data;

  } catch (error) {
    console.error('💥 Template creation process failed:', error);
    throw error;
  }
}

// Update template
export async function updateTemplate(id: string, templateData: UpdateTemplateData): Promise<Template> {
  // Get current template to check for existing image
  const currentTemplate = await getTemplate(id);
  if (!currentTemplate) {
    throw new Error('Template not found');
  }

  let imagePath: string | undefined = currentTemplate.image_path;
  let previewImagePath: string | undefined = currentTemplate.preview_image_path;

  // Handle image update
  if (templateData.image_file) {
    // Upload new image
    imagePath = await uploadTemplateImage(templateData.image_file);
  }

  // Handle preview image update
  if (templateData.preview_image_file) {
    try {
      previewImagePath = await uploadTemplateImage(templateData.preview_image_file);
    } catch (e) {
      console.warn('⚠️ Preview image upload failed:', e);
    }
  }

  const updateData: Record<string, any> = {
    name: templateData.name,
    category: templateData.category,
    orientation: templateData.orientation,
    image_path: imagePath
  };

  if (typeof previewImagePath !== 'undefined') {
    updateData.preview_image_path = previewImagePath;
  }

  let { data, error } = await supabaseClient
    .from('templates')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    const columnMissing = typeof error.message === 'string' && error.message.includes('preview_image_path');
    if (columnMissing && 'preview_image_path' in updateData) {
      console.warn('⚠️ preview_image_path column missing. Retrying update without it.');
      delete updateData.preview_image_path;
      ({ data, error } = await supabaseClient
        .from('templates')
        .update(updateData)
        .eq('id', id)
        .select()
        .single());
    }
    if (error) {
      throw new Error(`Failed to update template: ${error.message}`);
    }
  }

  return data;
}

// Delete template
export async function deleteTemplate(id: string): Promise<void> {
  console.log('🗑️ Starting template deletion process...', { templateId: id });
  
  try {
    // Get template to check for image
    const template = await getTemplate(id);
    if (!template) {
      throw new Error('Template not found');
    }

    console.log('📋 Template found:', { name: template.name, imagePath: template.image_path });

    // Delete image file if it exists
    if (template.image_path) {
      try {
        console.log('🖼️ Deleting associated image file...', template.image_path);
        
        // Extract filename from path - handle both relative and absolute paths
        let fileName = template.image_path.split('/').pop();
        
        // If the path contains 'template/' directory, extract just the filename
        if (template.image_path.includes('template/')) {
          fileName = template.image_path.split('template/').pop();
        }
        
        if (fileName) {
          console.log('📁 Extracted filename for deletion:', fileName);
          
          const response = await fetch('/api/delete-template', {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ fileName }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            console.warn('⚠️ Failed to delete image file:', errorData.error);
            // Don't throw error here, continue with template deletion
          } else {
            const result = await response.json();
            console.log('✅ Image file deleted successfully:', result.message);
          }
        } else {
          console.warn('⚠️ Could not extract filename from image path:', template.image_path);
        }
      } catch (imageError) {
        console.warn('⚠️ Error deleting image file:', imageError);
        // Don't throw error here, continue with template deletion
      }
    } else {
      console.log('ℹ️ No image file associated with this template');
    }

    // Delete template from database
    console.log('🗃️ Deleting template from database...');
    const { error } = await supabaseClient
      .from('templates')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('❌ Database deletion error:', error);
      throw new Error(`Failed to delete template: ${error.message}`);
    }

    console.log('✅ Template deleted successfully from database');
    
  } catch (error) {
    console.error('💥 Template deletion process failed:', error);
    throw error;
  }
}

