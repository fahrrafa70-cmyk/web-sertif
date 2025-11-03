/**
 * Script to check if all templates are using Storage URLs
 * Usage: node scripts/check-template-storage-status.js
 */

/* eslint-disable @typescript-eslint/no-require-imports */
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkTemplateStorageStatus() {
  try {
    console.log('🔍 Checking template storage status...\n');
    
    const { data: templates, error } = await supabase
      .from('templates')
      .select('id, name, image_path, certificate_image_url, score_image_url, preview_image_path')
      .order('name');

    if (error) {
      console.error('❌ Error fetching templates:', error);
      process.exit(1);
    }

    if (!templates || templates.length === 0) {
      console.log('📭 No templates found in database.');
      return;
    }

    console.log(`📋 Found ${templates.length} template(s):\n`);
    
    let allUsingStorage = true;
    const localPathTemplates = [];

    templates.forEach((template, index) => {
      console.log(`${index + 1}. ${template.name}`);
      
      const paths = [
        { field: 'image_path', value: template.image_path },
        { field: 'certificate_image_url', value: template.certificate_image_url },
        { field: 'score_image_url', value: template.score_image_url },
        { field: 'preview_image_path', value: template.preview_image_path }
      ];

      paths.forEach(({ field, value }) => {
        if (value) {
          const isStorageUrl = value.startsWith('http') && value.includes('supabase');
          const isLocalPath = !value.startsWith('http');
          
          if (isStorageUrl) {
            console.log(`   ✅ ${field}: ${value.substring(0, 60)}...`);
          } else if (isLocalPath) {
            console.log(`   ⚠️  ${field}: ${value} (LOCAL PATH)`);
            allUsingStorage = false;
            if (!localPathTemplates.find(t => t.name === template.name)) {
              localPathTemplates.push(template);
            }
          } else {
            console.log(`   ✅ ${field}: ${value}`);
          }
        }
      });
      console.log();
    });

    console.log('='.repeat(60));
    
    if (allUsingStorage) {
      console.log('✅ All templates are using Supabase Storage URLs!');
      console.log('\n🗑️  You can safely delete files in public/template/ folder.');
      console.log('   The files are now stored in Supabase Storage.');
    } else {
      console.log('⚠️  WARNING: Some templates are still using local paths:');
      localPathTemplates.forEach(t => {
        console.log(`   - ${t.name}`);
      });
      console.log('\n⚠️  Please run migration script first:');
      console.log('   node scripts/migrate-templates-to-storage.js');
    }
    
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkTemplateStorageStatus();

