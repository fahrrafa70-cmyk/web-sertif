/**
 * Migration Script: Migrate Data URL to Supabase Storage
 * 
 * Usage:
 *   node scripts/migrate-to-storage.js --dry-run
 *   node scripts/migrate-to-storage.js --limit 10
 *   node scripts/migrate-to-storage.js --all
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function uploadDataUrlToStorage(dataUrl, fileName, bucketName, supabase) {
  // Extract base64 data
  const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');

  console.log(`  📤 Uploading ${fileName} to storage... (${(buffer.length / 1024).toFixed(2)} KB)`);

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(fileName, buffer, {
      cacheControl: '3600',
      upsert: true,
      contentType: 'image/png',
    });

  if (error) {
    if (error.message.includes('Bucket not found') || error.message.includes('not found')) {
      throw new Error(`Storage bucket '${bucketName}' not found. Please create it in Supabase Dashboard.`);
    }
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(bucketName)
    .getPublicUrl(fileName);

  if (!urlData?.publicUrl) {
    throw new Error('Failed to get public URL');
  }

  console.log(`  ✅ Uploaded: ${urlData.publicUrl}`);
  return urlData.publicUrl;
}

async function migrateCertificates(supabase, dryRun, limit) {
  console.log('\n🔄 Starting migration to Supabase Storage...');
  console.log(`   Mode: ${dryRun ? 'DRY RUN (no changes will be made)' : 'LIVE (will update database)'}`);
  console.log(`   Limit: ${limit === null ? 'All certificates' : limit}\n`);

  let offset = 0;
  const batchSize = 50;
  let totalMigrated = 0;
  let totalFailed = 0;
  let totalProcessed = 0;

  while (true) {
    // Fetch certificates
    const query = supabase
      .from('certificates')
      .select('id, certificate_no, certificate_image_url, score_image_url')
      .range(offset, offset + batchSize - 1);

    const { data: allCertificates, error: fetchError } = await query;

    if (fetchError) {
      console.error('❌ Error fetching certificates:', fetchError);
      break;
    }

    if (!allCertificates || allCertificates.length === 0) {
      console.log('\n✅ No more certificates to process.');
      break;
    }

    // Filter certificates with Data URLs
    const certificates = allCertificates.filter(
      cert =>
        (cert.certificate_image_url?.startsWith('data:image')) ||
        (cert.score_image_url?.startsWith('data:image'))
    );

    if (certificates.length === 0) {
      console.log(`\n📊 Processed ${offset + allCertificates.length} certificates, no Data URLs found in this batch.`);
      offset += batchSize;
      
      // If we've reached the limit or processed all, break
      if (limit !== null && offset >= limit) {
        break;
      }
      continue;
    }

    console.log(`\n📦 Batch ${Math.floor(offset / batchSize) + 1}: Found ${certificates.length} certificate(s) with Data URLs`);

    // Process each certificate
    for (const cert of certificates) {
      if (limit !== null && totalProcessed >= limit) {
        console.log('\n⏸️  Reached limit, stopping migration.');
        break;
      }

      totalProcessed++;
      console.log(`\n  📄 Processing: ${cert.certificate_no} (${cert.id})`);

      // Migrate certificate_image_url
      if (cert.certificate_image_url?.startsWith('data:image')) {
        try {
          const fileName = `${cert.certificate_no.replace(/[^a-zA-Z0-9-_]/g, '_')}.png`;

          if (!dryRun) {
            const storageUrl = await uploadDataUrlToStorage(
              cert.certificate_image_url,
              fileName,
              'certificates',
              supabase
            );

            // Update database
            const { error: updateError } = await supabase
              .from('certificates')
              .update({ certificate_image_url: storageUrl })
              .eq('id', cert.id);

            if (updateError) {
              throw new Error(`Database update failed: ${updateError.message}`);
            }

            totalMigrated++;
            console.log(`  ✅ Certificate image migrated successfully`);
          } else {
            console.log(`  🔍 [DRY RUN] Would migrate certificate image to: certificates/${fileName}`);
          }
        } catch (error) {
          totalFailed++;
          console.error(`  ❌ Failed to migrate certificate image:`, error.message);
        }
      }

      // Migrate score_image_url
      if (cert.score_image_url?.startsWith('data:image')) {
        try {
          const fileName = `${cert.certificate_no.replace(/[^a-zA-Z0-9-_]/g, '_')}_score.png`;

          if (!dryRun) {
            const storageUrl = await uploadDataUrlToStorage(
              cert.score_image_url,
              fileName,
              'certificates',
              supabase
            );

            // Update database
            const { error: updateError } = await supabase
              .from('certificates')
              .update({ score_image_url: storageUrl })
              .eq('id', cert.id);

            if (updateError) {
              throw new Error(`Database update failed: ${updateError.message}`);
            }

            totalMigrated++;
            console.log(`  ✅ Score image migrated successfully`);
          } else {
            console.log(`  🔍 [DRY RUN] Would migrate score image to: certificates/${fileName}`);
          }
        } catch (error) {
          totalFailed++;
          console.error(`  ❌ Failed to migrate score image:`, error.message);
        }
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // If we've processed the limit, break
    if (limit !== null && totalProcessed >= limit) {
      break;
    }

    // Move to next batch
    offset += batchSize;
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 MIGRATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`   Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`   Total Processed: ${totalProcessed}`);
  console.log(`   Successfully Migrated: ${totalMigrated}`);
  console.log(`   Failed: ${totalFailed}`);
  console.log('='.repeat(60));

  if (dryRun) {
    console.log('\n💡 This was a DRY RUN. No changes were made.');
    console.log('   Run without --dry-run to perform actual migration.');
  } else {
    console.log('\n✅ Migration completed!');
  }
}

async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run') || args.includes('-d');
  const all = args.includes('--all') || args.includes('-a');
  const limitArg = args.find(arg => arg.startsWith('--limit='))?.split('=')[1] ||
                   args.find(arg => arg.startsWith('-l='))?.split('=')[1] ||
                   args[args.indexOf('--limit') + 1] ||
                   args[args.indexOf('-l') + 1];
  const limit = all ? null : (limitArg ? parseInt(limitArg, 10) : 10);

  // Check environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Error: Supabase credentials not found.');
    console.error('   Please ensure .env.local contains:');
    console.error('   - NEXT_PUBLIC_SUPABASE_URL');
    console.error('   - SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)');
    process.exit(1);
  }

  // Create Supabase client
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    await migrateCertificates(supabase, dryRun, limit);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the script
main();

