import { supabaseClient } from './client';
import type { TemplateLayoutConfig, LayoutValidationResult } from '@/types/template-layout';

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
  // Dual template support
  certificate_image_url?: string; // URL for certificate image (front)
  score_image_url?: string; // URL for score image (back)
  is_dual_template?: boolean; // Whether this is a dual template
  // Layout configuration (NEW)
  layout_config?: Record<string, unknown> | null; // JSONB layout configuration
  layout_config_updated_at?: string | null; // When layout was last updated
  layout_config_updated_by?: string | null; // Who updated the layout
  is_layout_configured?: boolean; // Whether layout is ready for Quick Generate
}

export interface CreateTemplateData {
  name: string;
  category: string;
  orientation: string;
  image_file?: File;
  preview_image_file?: File;
  // Dual template support
  certificate_image_file?: File;
  score_image_file?: File;
  is_dual_template?: boolean;
}

export interface UpdateTemplateData {
  name?: string;
  category?: string;
  orientation?: string;
  image_file?: File;
  preview_image_file?: File;
  // Dual template support
  certificate_image_file?: File;
  score_image_file?: File;
  is_dual_template?: boolean;
}

// Upload image to Supabase Storage (with fallback to local)
export async function uploadTemplateImage(file: File): Promise<string> {
  console.log('📤 Starting template image upload...', { fileName: file.name, fileSize: file.size });
  
  try {
    // Validate file
    if (!file || file.size === 0) {
      throw new Error('Invalid file provided');
    }

    const fileExt = file.name.split('.').pop()?.toLowerCase();
    if (!fileExt || !['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(fileExt)) {
      throw new Error('Invalid file type. Only JPG, JPEG, PNG, WebP, and GIF are allowed.');
    }

    const fileName = `template-${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    
    // Try Supabase Storage first
    try {
      console.log('☁️ Attempting upload to Supabase Storage...');
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileName', fileName);
      formData.append('bucketName', 'templates');

      const response = await fetch('/api/upload-to-storage', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.url) {
          console.log('✅ Storage upload successful:', result.url);
          return result.url;
        }
      }
      
      console.warn('⚠️ Storage upload failed, falling back to local...');
    } catch (storageError) {
      console.warn('⚠️ Storage upload error, falling back to local:', storageError);
    }

    // Fallback to local storage
    console.log('📁 Falling back to local upload...');
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('fileName', fileName);

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
    console.error('💥 Image upload process failed:', error);
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

// Get all templates with optional caching
export async function getTemplates(useCache: boolean = true): Promise<Template[]> {
  // Check cache first
  if (useCache && typeof window !== 'undefined') {
    try {
      const { dataCache, CACHE_KEYS } = await import('../cache/data-cache');
      const cached = dataCache.get<Template[]>(CACHE_KEYS.TEMPLATES);
      if (cached) {
        console.log("✅ Using cached templates");
        return cached;
      }
    } catch {
      // Cache module not available, continue with fetch
    }
  }

  const { data, error } = await supabaseClient
    .from('templates')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch templates: ${error.message}`);
  }

  const templates = data || [];

  // Cache the result (10 minutes - templates don't change often)
  if (useCache && typeof window !== 'undefined') {
    try {
      const { dataCache, CACHE_KEYS } = await import('../cache/data-cache');
      dataCache.set(CACHE_KEYS.TEMPLATES, templates, 10 * 60 * 1000);
    } catch {
      // Cache module not available, ignore
    }
  }

  return templates;
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
    let certificateImagePath: string | undefined;
    let scoreImagePath: string | undefined;
    
    // Handle dual template uploads
    if (templateData.is_dual_template) {
      console.log('📤 Dual template mode - uploading certificate and score images...');
      
      // Upload certificate image (required for dual template)
      if (templateData.certificate_image_file) {
        try {
          certificateImagePath = await uploadTemplateImage(templateData.certificate_image_file);
          console.log('✅ Certificate image upload completed, path:', certificateImagePath);
        } catch (uploadError) {
          console.error('❌ Certificate image upload failed:', uploadError);
          throw new Error(`Certificate image upload failed: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`);
        }
      } else {
        throw new Error('Certificate image is required for dual templates');
      }
      
      // Upload score image (required for dual template)
      if (templateData.score_image_file) {
        try {
          scoreImagePath = await uploadTemplateImage(templateData.score_image_file);
          console.log('✅ Score image upload completed, path:', scoreImagePath);
        } catch (uploadError) {
          console.error('❌ Score image upload failed:', uploadError);
          throw new Error(`Score image upload failed: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`);
        }
      } else {
        throw new Error('Score image is required for dual templates');
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
    } else {
      // Single template mode - use existing logic
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
    }

    const insertData: Record<string, unknown> = {
      name: templateData.name.trim(),
      category: templateData.category.trim(),
      orientation: templateData.orientation.trim(),
      is_dual_template: templateData.is_dual_template || false
    };

    // Handle image paths based on template type
    if (templateData.is_dual_template) {
      // Dual template - use certificate and score image URLs
      if (certificateImagePath) {
        insertData.certificate_image_url = certificateImagePath;
      }
      if (scoreImagePath) {
        insertData.score_image_url = scoreImagePath;
      }
      // For backward compatibility, also set image_path to certificate image
      if (certificateImagePath) {
        insertData.image_path = certificateImagePath;
      }
    } else {
      // Single template - use existing image_path
      if (imagePath) {
        insertData.image_path = imagePath;
      }
    }

    // Only include preview_image_path if we actually have it
    if (previewImagePath) {
      insertData.preview_image_path = previewImagePath;
    }

    console.log('💾 Inserting template data via API:', insertData);

    // Insert data into templates table via API route (bypasses RLS)
    const response = await fetch('/api/templates/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(insertData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ API creation error:', errorData);
      throw new Error(errorData.error || errorData.details || 'Failed to create template');
    }

    const result = await response.json();
    
    if (!result.success || !result.data) {
      throw new Error('Template was not created - no data returned from API');
    }

    const data = result.data;
    console.log('✅ Template created successfully via API:', data);
    
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
  console.log('🔄 Starting template update process...', { id, templateData });
  
  try {
    // Get current template to check for existing image
    const currentTemplate = await getTemplate(id);
    if (!currentTemplate) {
      throw new Error('Template not found');
    }

    let imagePath: string | undefined = currentTemplate.image_path;
    let previewImagePath: string | undefined = currentTemplate.preview_image_path;

    // Handle image update
    if (templateData.image_file) {
      console.log('📤 New image file provided, starting upload...');
      try {
        imagePath = await uploadTemplateImage(templateData.image_file);
        console.log('✅ Image upload completed, path:', imagePath);
      } catch (uploadError) {
        console.error('❌ Image upload failed:', uploadError);
        throw new Error(`Image upload failed: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`);
      }
    }

    // Handle preview image update
    if (templateData.preview_image_file) {
      console.log('📤 New preview image file provided, starting upload...');
      try {
        previewImagePath = await uploadTemplateImage(templateData.preview_image_file);
        console.log('✅ Preview image upload completed, path:', previewImagePath);
      } catch (e) {
        console.warn('⚠️ Preview image upload failed:', e);
        // Do not block update if preview upload fails
      }
    }

    const updateData: Record<string, unknown> = {
      id: id,
      name: templateData.name,
      category: templateData.category,
      orientation: templateData.orientation,
      image_path: imagePath
    };

    if (typeof previewImagePath !== 'undefined') {
      updateData.preview_image_path = previewImagePath;
    }

    console.log('💾 Updating template data via API:', updateData);

    // Update data in templates table via API route (bypasses RLS)
    const response = await fetch('/api/templates/update', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ API update error:', errorData);
      throw new Error(errorData.error || errorData.details || 'Failed to update template');
    }

    const result = await response.json();
    
    if (!result.success || !result.data) {
      throw new Error('Template was not updated - no data returned from API');
    }

    const data = result.data;
    console.log('✅ Template updated successfully via API:', data);
    
    // Verify the update by fetching the template
    console.log('🔍 Verifying template was updated by fetching it...');
    const { data: verifyData, error: verifyError } = await supabaseClient
      .from('templates')
      .select('*')
      .eq('id', id)
      .single();

    if (verifyError) {
      console.error('❌ Verification failed:', verifyError);
      throw new Error('Template was updated but could not be verified');
    }

    console.log('✅ Template verification successful:', verifyData);
    return data;

  } catch (error) {
    console.error('💥 Template update process failed:', error);
    throw error;
  }
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

    // Delete template from database using API route (bypasses RLS)
    console.log('🗃️ Deleting template from database via API...');
    
    const response = await fetch('/api/templates/delete', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ templateId: id }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ API deletion error:', errorData);
      throw new Error(errorData.error || 'Failed to delete template from database');
    }

    const result = await response.json();
    console.log('✅ Template deleted successfully from database via API');
    console.log('Deleted data:', result.deletedData);
    
    // Verify deletion
    const { data: verifyData, error: verifyError } = await supabaseClient
      .from('templates')
      .select('id')
      .eq('id', id)
      .maybeSingle();
    
    if (verifyError) {
      console.warn('⚠️ Could not verify deletion:', verifyError);
    } else if (verifyData) {
      console.error('❌ Template still exists in database after delete!', verifyData);
      throw new Error('Template deletion failed - template still exists in database');
    } else {
      console.log('✅ Verified: Template no longer exists in database');
    }
    
  } catch (error) {
    console.error('💥 Template deletion process failed:', error);
    throw error;
  }
}

// ============================================================================
// LAYOUT CONFIGURATION MANAGEMENT
// ============================================================================

/**
 * Save layout configuration to template
 */
export async function saveTemplateLayout(
  templateId: string,
  layoutConfig: TemplateLayoutConfig,
  userId?: string
): Promise<void> {
  console.log('💾 Saving template layout configuration...', { templateId });
  
  try {
    const updateData: Record<string, unknown> = {
      layout_config: layoutConfig,
      layout_config_updated_at: new Date().toISOString(),
      is_layout_configured: true
    };
    
    if (userId) {
      updateData.layout_config_updated_by = userId;
    }
    
    const { error } = await supabaseClient
      .from('templates')
      .update(updateData)
      .eq('id', templateId);
    
    if (error) {
      throw new Error(`Failed to save layout configuration: ${error.message}`);
    }
    
    console.log('✅ Layout configuration saved successfully');
  } catch (error) {
    console.error('💥 Failed to save layout configuration:', error);
    throw error;
  }
}

/**
 * Get layout configuration from template
 */
export async function getTemplateLayout(
  templateId: string
): Promise<TemplateLayoutConfig | null> {
  try {
    const template = await getTemplate(templateId);
    
    if (!template || !template.layout_config) {
      return null;
    }
    
    return template.layout_config as unknown as TemplateLayoutConfig;
  } catch (error) {
    console.error('Failed to get template layout:', error);
    return null;
  }
}

/**
 * Validate layout configuration completeness
 */
export function validateLayoutConfig(
  config: TemplateLayoutConfig | null
): LayoutValidationResult {
  const result: LayoutValidationResult = {
    isValid: true,
    missingFields: [],
    errors: []
  };
  
  if (!config) {
    result.isValid = false;
    result.errors.push('Layout configuration is missing');
    return result;
  }
  
  // Check certificate mode (required)
  if (!config.certificate) {
    result.isValid = false;
    result.errors.push('Certificate mode configuration is missing');
    return result;
  }
  
  // Check required text layers
  const requiredFields = ['name', 'certificate_no', 'issue_date'];
  const existingLayerIds = config.certificate.textLayers?.map(l => l.id) || [];
  
  for (const field of requiredFields) {
    if (!existingLayerIds.includes(field)) {
      result.missingFields.push(field);
    }
  }
  
  if (result.missingFields.length > 0) {
    result.isValid = false;
    result.errors.push(`Missing required fields: ${result.missingFields.join(', ')}`);
  }
  
  // Check canvas configuration
  if (!config.canvas || !config.canvas.width || !config.canvas.height) {
    result.isValid = false;
    result.errors.push('Canvas configuration is missing or invalid');
  }
  
  return result;
}

/**
 * Check if template is ready for Quick Generate
 */
export async function isTemplateReadyForQuickGenerate(
  templateId: string
): Promise<{ ready: boolean; message?: string }> {
  try {
    const template = await getTemplate(templateId);
    
    if (!template) {
      return { ready: false, message: 'Template not found' };
    }
    
    if (!template.is_layout_configured) {
      return { 
        ready: false, 
        message: 'Template layout is not configured. Please configure it in Templates page first.' 
      };
    }
    
    const layoutConfig = template.layout_config as TemplateLayoutConfig | null;
    const validation = validateLayoutConfig(layoutConfig);
    
    if (!validation.isValid) {
      return {
        ready: false,
        message: validation.errors.join('; ')
      };
    }
    
    return { ready: true };
  } catch (error) {
    console.error('Error checking template readiness:', error);
    return { 
      ready: false, 
      message: 'Failed to check template configuration' 
    };
  }
}

/**
 * Clear layout configuration from template
 */
export async function clearTemplateLayout(templateId: string): Promise<void> {
  console.log('🗑️ Clearing template layout configuration...', { templateId });
  
  try {
    const { error } = await supabaseClient
      .from('templates')
      .update({
        layout_config: null,
        layout_config_updated_at: null,
        layout_config_updated_by: null,
        is_layout_configured: false
      })
      .eq('id', templateId);
    
    if (error) {
      throw new Error(`Failed to clear layout configuration: ${error.message}`);
    }
    
    console.log('✅ Layout configuration cleared successfully');
  } catch (error) {
    console.error('💥 Failed to clear layout configuration:', error);
    throw error;
  }
}

