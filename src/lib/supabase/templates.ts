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
}

export interface CreateTemplateData {
  name: string;
  category: string;
  orientation: string;
  image_file?: File;
}

export interface UpdateTemplateData {
  name?: string;
  category?: string;
  orientation?: string;
  image_file?: File;
}

// Upload image to local public folder
export async function uploadTemplateImage(file: File): Promise<void> {
  console.log('📤 Starting local image upload...', { fileName: file.name, fileSize: file.size });
  
  try {
    // Validate file
    if (!file || file.size === 0) {
      throw new Error('Invalid file provided');
    }

    const fileExt = file.name.split('.').pop()?.toLowerCase();
    if (!fileExt || !['jpg', 'jpeg', 'png'].includes(fileExt)) {
      throw new Error('Invalid file type. Only JPG and PNG are allowed.');
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

  } catch (error) {
    console.error('💥 Local image upload process failed:', error);
    throw error;
  }
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
    
    // Upload image if provided
    if (templateData.image_file) {
      console.log('📤 Image file provided, starting upload...');
      try {
        await uploadTemplateImage(templateData.image_file);
        console.log('✅ Image upload completed');
      } catch (uploadError) {
        console.error('❌ Image upload failed:', uploadError);
        throw new Error(`Image upload failed: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`);
      }
    } else {
      console.log('ℹ️ No image file provided');
    }

    const insertData = {
      name: templateData.name.trim(),
      category: templateData.category.trim(),
      orientation: templateData.orientation.trim()
    };

    console.log('💾 Inserting template data to database:', insertData);

    // Insert data into templates table
    const { data, error } = await supabaseClient
      .from('templates')
      .insert([insertData]) // Wrap in array for proper insert
      .select()
      .single();

    if (error) {
      console.error('❌ Database insert error:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      throw new Error(`Failed to create template: ${error.message}`);
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

  // Handle image update
  if (templateData.image_file) {
    // Upload new image (old image will be overwritten by filename)
    await uploadTemplateImage(templateData.image_file);
  }

  const updateData: Partial<Template> = {
    name: templateData.name,
    category: templateData.category,
    orientation: templateData.orientation
  };

  const { data, error } = await supabaseClient
    .from('templates')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update template: ${error.message}`);
  }

  return data;
}

// Delete template
export async function deleteTemplate(id: string): Promise<void> {
  // Get template to check for image
  const template = await getTemplate(id);
  if (!template) {
    throw new Error('Template not found');
  }

  // Note: Image files are stored locally and will be cleaned up separately

  const { error } = await supabaseClient
    .from('templates')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to delete template: ${error.message}`);
  }
}

