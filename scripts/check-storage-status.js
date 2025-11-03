/**
 * Script untuk cek status penyimpanan certificate (Storage vs Data URL)
 * 
 * Usage:
 *   node scripts/check-storage-status.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function checkStorageStatus() {
  // Check environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Error: Supabase credentials not found.');
    process.exit(1);
  }

  // Create Supabase client
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  console.log('\n🔍 Checking certificate storage status...\n');

  try {
    // Fetch all certificates
    const { data: certificates, error } = await supabase
      .from('certificates')
      .select('certificate_no, certificate_image_url, score_image_url')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching certificates:', error);
      process.exit(1);
    }

    if (!certificates || certificates.length === 0) {
      console.log('No certificates found.');
      return;
    }

    let storageCount = 0;
    let dataUrlCount = 0;
    let localFileCount = 0;
    let nullCount = 0;
    let scoreStorageCount = 0;
    let scoreDataUrlCount = 0;

    const storageUrls = [];
    const dataUrls = [];

    certificates.forEach(cert => {
      // Check certificate_image_url
      if (cert.certificate_image_url) {
        if (cert.certificate_image_url.startsWith('data:image')) {
          dataUrlCount++;
          dataUrls.push({
            cert_no: cert.certificate_no,
            type: 'certificate',
            url: cert.certificate_image_url.substring(0, 60) + '...'
          });
        } else if (cert.certificate_image_url.includes('supabase.co/storage')) {
          storageCount++;
          storageUrls.push({
            cert_no: cert.certificate_no,
            type: 'certificate',
            url: cert.certificate_image_url
          });
        } else if (cert.certificate_image_url.startsWith('/generate/')) {
          localFileCount++;
        } else {
          nullCount++;
        }
      }

      // Check score_image_url
      if (cert.score_image_url) {
        if (cert.score_image_url.startsWith('data:image')) {
          scoreDataUrlCount++;
          dataUrls.push({
            cert_no: cert.certificate_no,
            type: 'score',
            url: cert.score_image_url.substring(0, 60) + '...'
          });
        } else if (cert.score_image_url.includes('supabase.co/storage')) {
          scoreStorageCount++;
          storageUrls.push({
            cert_no: cert.certificate_no,
            type: 'score',
            url: cert.score_image_url
          });
        } else if (cert.score_image_url.startsWith('/generate/')) {
          localFileCount++;
        }
      }
    });

    // Summary
    console.log('='.repeat(70));
    console.log('📊 STORAGE STATUS SUMMARY');
    console.log('='.repeat(70));
    console.log(`\nTotal Certificates: ${certificates.length}\n`);
    
    console.log('Certificate Image URLs:');
    console.log(`  ✅ Supabase Storage: ${storageCount}`);
    console.log(`  📦 Data URL (Base64): ${dataUrlCount}`);
    console.log(`  📁 Local File (/generate/): ${localFileCount}`);
    console.log(`  ❌ Null/Empty: ${nullCount}`);
    
    if (scoreStorageCount > 0 || scoreDataUrlCount > 0) {
      console.log('\nScore Image URLs:');
      console.log(`  ✅ Supabase Storage: ${scoreStorageCount}`);
      console.log(`  📦 Data URL (Base64): ${scoreDataUrlCount}`);
    }

    const totalStorage = storageCount + scoreStorageCount;
    const totalDataUrl = dataUrlCount + scoreDataUrlCount;
    const totalImages = totalStorage + totalDataUrl + localFileCount;

    console.log('\n' + '='.repeat(70));
    console.log('OVERALL STATUS:');
    console.log('='.repeat(70));
    console.log(`  Total Images in Storage: ${totalStorage}`);
    console.log(`  Total Images as Data URL: ${totalDataUrl}`);
    console.log(`  Total Images as Local File: ${localFileCount}`);
    console.log(`  Total Images: ${totalImages}`);
    console.log('='.repeat(70));

    // Show samples
    if (storageUrls.length > 0) {
      console.log('\n✅ Sample Storage URLs (first 5):');
      storageUrls.slice(0, 5).forEach(item => {
        console.log(`  [${item.cert_no}] ${item.type}: ${item.url}`);
      });
    }

    if (dataUrls.length > 0) {
      console.log('\n📦 Sample Data URLs (first 5):');
      dataUrls.slice(0, 5).forEach(item => {
        console.log(`  [${item.cert_no}] ${item.type}: ${item.url}`);
      });
      console.log('\n💡 Tip: Run migration script to move Data URLs to Storage:');
      console.log('   npm run migrate:storage:dry  (test first)');
      console.log('   npm run migrate:storage      (migrate 10)');
      console.log('   npm run migrate:storage:all  (migrate all)');
    }

    // Check bucket status
    console.log('\n🔍 Checking Storage Bucket...');
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    
    if (bucketError) {
      console.log('  ⚠️  Could not check buckets (may need admin access)');
    } else {
      const certBucket = buckets.find(b => b.name === 'certificates');
      if (certBucket) {
        console.log('  ✅ Bucket "certificates" exists');
        
        // Try to list files
        const { data: files, error: listError } = await supabase.storage
          .from('certificates')
          .list('', { limit: 5 });
        
        if (listError) {
          console.log('  ⚠️  Could not list files:', listError.message);
        } else {
          console.log(`  📁 Files in bucket: ${files?.length || 0} (showing first 5)`);
          if (files && files.length > 0) {
            files.slice(0, 5).forEach(file => {
              console.log(`     - ${file.name} (${(file.metadata?.size / 1024).toFixed(2)} KB)`);
            });
          }
        }
      } else {
        console.log('  ❌ Bucket "certificates" NOT FOUND');
        console.log('  💡 Please create bucket in Supabase Dashboard');
        console.log('     See: SETUP_SUPABASE_STORAGE.md');
      }
    }

    console.log('\n');

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

// Run the script
checkStorageStatus();

