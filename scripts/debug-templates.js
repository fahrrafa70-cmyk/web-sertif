const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'your-supabase-url';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-supabase-key';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugTemplates() {
  console.log('🔍 Debugging template thumbnails...\n');
  
  try {
    // Fetch all templates
    const { data: templates, error } = await supabase
      .from('templates')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Error fetching templates:', error);
      return;
    }
    
    if (!templates || templates.length === 0) {
      console.log('📭 No templates found in database');
      return;
    }
    
    console.log(`📊 Found ${templates.length} templates:\n`);
    
    templates.forEach((template, index) => {
      console.log(`${index + 1}. Template: ${template.name}`);
      console.log(`   ID: ${template.id}`);
      console.log(`   Category: ${template.category}`);
      console.log(`   Created: ${template.created_at}`);
      console.log(`   Image Path: ${template.image_path || 'NULL'}`);
      console.log(`   Preview Image Path: ${template.preview_image_path || 'NULL'}`);
      console.log(`   Certificate Image URL: ${template.certificate_image_url || 'NULL'}`);
      console.log(`   Score Image URL: ${template.score_image_url || 'NULL'}`);
      console.log(`   Is Dual Template: ${template.is_dual_template || false}`);
      
      // Check which URL would be used by getTemplatePreviewUrl
      const previewUrl = template.preview_image_path || 
                        template.image_path ||
                        template.certificate_image_url || 
                        null;
      
      console.log(`   🖼️  Preview URL (used by app): ${previewUrl || 'NULL'}`);
      console.log('   ---');
    });
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

debugTemplates();
