/**
 * Migration Script: Add XID to Old Certificates
 * 
 * This script adds XID (eXternal ID) to certificates that only have UUID.
 * - Safe: Keeps existing UUID for backward compatibility
 * - Non-breaking: Old URLs (/c/{uuid}) still work
 * - Gradual: Can be run multiple times safely
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// XID Generator (copied from generate-xid.ts)
function generateXID() {
  const timestamp = Date.now();
  const timestampBase36 = timestamp.toString(36);
  const randomSuffix = Math.random().toString(36).substring(2, 10);
  return `${timestampBase36}${randomSuffix}`;
}

// Environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  console.error('\n💡 Make sure .env.local file exists with these variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function migrateUUIDToXID() {
  console.log('🚀 Starting UUID to XID Migration...\n');

  const stats = {
    total: 0,
    success: 0,
    failed: 0,
    skipped: 0
  };

  try {
    // Step 1: Get all certificates without XID
    console.log('📊 Fetching certificates without XID...');
    const { data: certificates, error: fetchError } = await supabase
      .from('certificates')
      .select('id, public_id, certificate_no, xid')
      .or('xid.is.null,xid.eq.')
      .order('created_at', { ascending: true });

    if (fetchError) {
      throw new Error(`Failed to fetch certificates: ${fetchError.message}`);
    }

    if (!certificates || certificates.length === 0) {
      console.log('✅ All certificates already have XID. Nothing to migrate.');
      return;
    }

    stats.total = certificates.length;
    console.log(`📋 Found ${stats.total} certificates to migrate\n`);

    // Step 2: Migrate each certificate
    console.log('🔄 Starting migration...\n');
    
    for (let i = 0; i < certificates.length; i++) {
      const cert = certificates[i];
      const progress = `[${i + 1}/${stats.total}]`;

      try {
        // Generate new XID
        const newXID = generateXID();

        // Update certificate with XID
        const { error: updateError } = await supabase
          .from('certificates')
          .update({ xid: newXID })
          .eq('id', cert.id);

        if (updateError) {
          throw updateError;
        }

        stats.success++;
        console.log(`✅ ${progress} ${cert.certificate_no || 'N/A'}`);
        console.log(`   UUID: ${cert.public_id}`);
        console.log(`   XID:  ${newXID}\n`);

      } catch (error) {
        stats.failed++;
        console.error(`❌ ${progress} Failed to migrate ${cert.certificate_no || 'N/A'}`);
        console.error(`   Error: ${error.message}\n`);
      }

      // Add small delay to avoid rate limiting
      if (i < certificates.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Step 3: Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total certificates:       ${stats.total}`);
    console.log(`✅ Successfully migrated: ${stats.success}`);
    console.log(`❌ Failed:                ${stats.failed}`);
    console.log(`⏭️  Skipped:              ${stats.skipped}`);
    console.log('='.repeat(60));

    if (stats.failed > 0) {
      console.log('\n⚠️  Some certificates failed to migrate. Please check the errors above.');
      process.exit(1);
    } else {
      console.log('\n🎉 Migration completed successfully!');
      console.log('\n📝 Next steps:');
      console.log('   1. Verify migration: npm run migrate:xid:verify');
      console.log('   2. Test old URLs (/c/{uuid}) still work');
      console.log('   3. Test new URLs (/c/{xid}) work correctly');
      console.log('   4. Update share links to use XID (optional)');
    }

  } catch (error) {
    console.error('\n❌ Migration failed with error:');
    console.error(error.message);
    process.exit(1);
  }
}

// Verification function to check migration results
async function verifyMigration() {
  console.log('🔍 Verifying migration...\n');

  try {
    // Count certificates with XID
    const { count: withXID, error: countXIDError } = await supabase
      .from('certificates')
      .select('*', { count: 'exact', head: true })
      .not('xid', 'is', null);

    if (countXIDError) throw countXIDError;

    // Count certificates without XID
    const { count: withoutXID, error: countNoXIDError } = await supabase
      .from('certificates')
      .select('*', { count: 'exact', head: true })
      .or('xid.is.null,xid.eq.');

    if (countNoXIDError) throw countNoXIDError;

    // Get total count
    const { count: total, error: countTotalError } = await supabase
      .from('certificates')
      .select('*', { count: 'exact', head: true });

    if (countTotalError) throw countTotalError;

    console.log('📊 Verification Results:');
    console.log('='.repeat(60));
    console.log(`Total certificates:       ${total || 0}`);
    console.log(`Certificates with XID:    ${withXID || 0}`);
    console.log(`Certificates without XID: ${withoutXID || 0}`);
    console.log('='.repeat(60));

    if (withoutXID === 0) {
      console.log('\n✅ All certificates have XID!');
      console.log('   Migration is complete.');
    } else {
      console.log(`\n⚠️  ${withoutXID} certificates still need XID`);
      console.log('   Run: npm run migrate:xid');
    }

    // Show sample XID
    if (withXID > 0) {
      const { data: sample } = await supabase
        .from('certificates')
        .select('certificate_no, public_id, xid')
        .not('xid', 'is', null)
        .limit(3);

      if (sample && sample.length > 0) {
        console.log('\n📋 Sample migrated certificates:');
        sample.forEach((cert, i) => {
          console.log(`   ${i + 1}. ${cert.certificate_no || 'N/A'}`);
          console.log(`      UUID: ${cert.public_id}`);
          console.log(`      XID:  ${cert.xid}`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Verification failed:');
    console.error(error.message);
  }
}

// Main execution
async function main() {
  const command = process.argv[2];

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         UUID to XID Migration Tool                         ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  if (command === 'verify') {
    await verifyMigration();
  } else if (command === 'migrate') {
    await migrateUUIDToXID();
    console.log('\n');
    await verifyMigration();
  } else {
    console.log('Usage:');
    console.log('  npm run migrate:xid          - Run migration');
    console.log('  npm run migrate:xid:verify   - Verify migration results');
    console.log('\nDescription:');
    console.log('  This script adds XID (short identifier) to certificates');
    console.log('  that currently only have UUID (long identifier).');
    console.log('\nSafety:');
    console.log('  ✅ Non-breaking: Old UUID URLs still work');
    console.log('  ✅ Backward compatible: UUID is preserved');
    console.log('  ✅ Idempotent: Can be run multiple times safely');
  }
}

main();
