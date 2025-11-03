/**
 * Script to migrate template images from local public/template folder to Supabase Storage
 * Usage: node scripts/migrate-templates-to-storage.js
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');

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

const TEMPLATE_FOLDER = path.join(process.cwd(), 'public', 'template');
const STORAGE_BUCKET = 'templates';

async function ensureBucketExists() {
  console.log(`\n🔍 Checking if bucket '${STORAGE_BUCKET}' exists...`);
  
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  
  if (listError) {
    console.error('❌ Error listing buckets:', listError);
    throw listError;
  }

  const bucketExists = buckets.some(bucket => bucket.name === STORAGE_BUCKET);
  
  if (!bucketExists) {
    console.log(`\n📦 Creating bucket '${STORAGE_BUCKET}'...`);
    const { error: createError } = await supabase.storage.createBucket(STORAGE_BUCKET, {
      public: true,
      fileSizeLimit: 52428800, // 50MB
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']
    });

    if (createError) {
      console.error('❌ Error creating bucket:', createError);
      throw createError;
    }
    console.log('✅ Bucket created successfully!');
  } else {
    console.log('✅ Bucket already exists!');
  }
}

async function getLocalTemplateFiles() {
  try {
    const files = await fs.readdir(TEMPLATE_FOLDER);
    const imageFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.png', '.jpg', '.jpeg', '.webp', '.gif'].includes(ext);
    });
    
    console.log(`\n📁 Found ${imageFiles.length} template image files in local folder`);
    return imageFiles;
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('📁 Template folder not found, skipping local files');
      return [];
    }
    throw error;
  }
}

async function getAllTemplates() {
  console.log('\n🔍 Fetching all templates from database...');
  
  const { data, error } = await supabase
    .from('templates')
    .select('id, name, image_path, certificate_image_url, score_image_url, preview_image_path')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error fetching templates:', error);
    throw error;
  }

  console.log(`✅ Found ${data.length} templates in database`);
  return data || [];
}

function extractFileName(imagePath) {
  if (!imagePath) return null;
  
  // Handle different path formats:
  // - /template/filename.png
  // - template/filename.png
  // - filename.png
  const parts = imagePath.split('/');
  return parts[parts.length - 1];
}

function isLocalPath(path) {
  if (!path) return false;
  // Check if it's a local path (starts with /template/ or template/)
  return path.startsWith('/template/') || path.startsWith('template/') || !path.startsWith('http');
}

async function uploadFileToStorage(filePath, fileName) {
  try {
    console.log(`  📤 Uploading ${fileName}...`);
    
    const fileBuffer = await fs.readFile(filePath);
    const fileExt = path.extname(fileName).toLowerCase().substring(1);
    const mimeType = {
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'webp': 'image/webp',
      'gif': 'image/gif'
    }[fileExt] || 'image/png';

    // Upload to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(fileName, fileBuffer, {
        contentType: mimeType,
        cacheControl: '3600',
        upsert: true // Overwrite if exists
      });

    if (uploadError) {
      console.error(`  ❌ Upload failed for ${fileName}:`, uploadError.message);
      return null;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(fileName);

    if (!urlData?.publicUrl) {
      console.error(`  ❌ Failed to get public URL for ${fileName}`);
      return null;
    }

    console.log(`  ✅ Uploaded: ${urlData.publicUrl}`);
    return urlData.publicUrl;
  } catch (error) {
    console.error(`  ❌ Error uploading ${fileName}:`, error.message);
    return null;
  }
}

async function migrateTemplates() {
  try {
    console.log('🚀 Starting template migration to Supabase Storage...\n');
    
    // Ensure bucket exists
    await ensureBucketExists();
    
    // Get all templates from database
    const templates = await getAllTemplates();
    
    // Get local files
    const localFiles = await getLocalTemplateFiles();
    
    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const migrationReport = [];

    console.log('\n📋 Processing templates...\n');

    for (const template of templates) {
      console.log(`\n📄 Template: ${template.name} (ID: ${template.id})`);
      const templateUpdates = {};
      let needsUpdate = false;

      // Process image_path (legacy single template)
      if (template.image_path && isLocalPath(template.image_path)) {
        const fileName = extractFileName(template.image_path);
        if (fileName) {
          const localFilePath = path.join(TEMPLATE_FOLDER, fileName);
          try {
            await fs.access(localFilePath);
            const storageUrl = await uploadFileToStorage(localFilePath, fileName);
            if (storageUrl) {
              templateUpdates.image_path = storageUrl;
              needsUpdate = true;
              console.log(`  ✅ Migrated image_path: ${template.image_path} → ${storageUrl}`);
            } else {
              errorCount++;
            }
          } catch (error) {
            console.log(`  ⚠️  Local file not found: ${fileName}, skipping...`);
            skippedCount++;
          }
        }
      }

      // Process certificate_image_url (dual template)
      if (template.certificate_image_url && isLocalPath(template.certificate_image_url)) {
        const fileName = extractFileName(template.certificate_image_url);
        if (fileName) {
          const localFilePath = path.join(TEMPLATE_FOLDER, fileName);
          try {
            await fs.access(localFilePath);
            const storageUrl = await uploadFileToStorage(localFilePath, fileName);
            if (storageUrl) {
              templateUpdates.certificate_image_url = storageUrl;
              needsUpdate = true;
              console.log(`  ✅ Migrated certificate_image_url: ${template.certificate_image_url} → ${storageUrl}`);
            } else {
              errorCount++;
            }
          } catch (error) {
            console.log(`  ⚠️  Local file not found: ${fileName}, skipping...`);
            skippedCount++;
          }
        }
      }

      // Process score_image_url (dual template)
      if (template.score_image_url && isLocalPath(template.score_image_url)) {
        const fileName = extractFileName(template.score_image_url);
        if (fileName) {
          const localFilePath = path.join(TEMPLATE_FOLDER, fileName);
          try {
            await fs.access(localFilePath);
            const storageUrl = await uploadFileToStorage(localFilePath, fileName);
            if (storageUrl) {
              templateUpdates.score_image_url = storageUrl;
              needsUpdate = true;
              console.log(`  ✅ Migrated score_image_url: ${template.score_image_url} → ${storageUrl}`);
            } else {
              errorCount++;
            }
          } catch (error) {
            console.log(`  ⚠️  Local file not found: ${fileName}, skipping...`);
            skippedCount++;
          }
        }
      }

      // Process preview_image_path
      if (template.preview_image_path && isLocalPath(template.preview_image_path)) {
        const fileName = extractFileName(template.preview_image_path);
        if (fileName) {
          const localFilePath = path.join(TEMPLATE_FOLDER, fileName);
          try {
            await fs.access(localFilePath);
            const storageUrl = await uploadFileToStorage(localFilePath, fileName);
            if (storageUrl) {
              templateUpdates.preview_image_path = storageUrl;
              needsUpdate = true;
              console.log(`  ✅ Migrated preview_image_path: ${template.preview_image_path} → ${storageUrl}`);
            } else {
              errorCount++;
            }
          } catch (error) {
            console.log(`  ⚠️  Local file not found: ${fileName}, skipping...`);
            skippedCount++;
          }
        }
      }

      // Update template in database
      if (needsUpdate) {
        const { error: updateError } = await supabase
          .from('templates')
          .update(templateUpdates)
          .eq('id', template.id);

        if (updateError) {
          console.error(`  ❌ Failed to update template ${template.id}:`, updateError.message);
          errorCount++;
          migrationReport.push({
            template: template.name,
            status: 'error',
            error: updateError.message
          });
        } else {
          migratedCount++;
          console.log(`  ✅ Template updated in database`);
          migrationReport.push({
            template: template.name,
            status: 'success',
            updates: Object.keys(templateUpdates)
          });
        }
      } else {
        console.log(`  ⏭️  No local images to migrate (already using Storage or no images)`);
        skippedCount++;
        migrationReport.push({
          template: template.name,
          status: 'skipped',
          reason: 'Already using Storage or no local images'
        });
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Successfully migrated: ${migratedCount} templates`);
    console.log(`⏭️  Skipped: ${skippedCount} templates`);
    console.log(`❌ Errors: ${errorCount} templates`);
    console.log('\n📄 Detailed Report:');
    migrationReport.forEach((report, index) => {
      console.log(`\n${index + 1}. ${report.template}`);
      console.log(`   Status: ${report.status}`);
      if (report.updates) {
        console.log(`   Updated fields: ${report.updates.join(', ')}`);
      }
      if (report.error) {
        console.log(`   Error: ${report.error}`);
      }
      if (report.reason) {
        console.log(`   Reason: ${report.reason}`);
      }
    });

    console.log('\n✅ Migration completed!');
    console.log('\n⚠️  NOTE: Local template files are still in public/template/');
    console.log('   You can safely delete them after verifying everything works correctly.');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

migrateTemplates();

