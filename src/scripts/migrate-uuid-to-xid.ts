/**
 * Migration Script: Add XID to Old Certificates
 * 
 * This script adds XID (eXternal ID) to certificates that only have UUID.
 * - Safe: Keeps existing UUID for backward compatibility
 * - Non-breaking: Old URLs (/c/{uuid}) still work
 * - Gradual: Can be run multiple times safely
 */

import { createClient } from '@supabase/supabase-js';
import { generateXID } from '@/lib/utils/generate-xid';

// Environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface MigrationStats {
  total: number;
  success: number;
  failed: number;
  skipped: number;
}

async function migrateUUIDToXID() {
  console.log('🚀 Starting UUID to XID Migration...\n');

  const stats: MigrationStats = {
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
        console.error(`   Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
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
    console.log(`Total certificates:  ${stats.total}`);
    console.log(`✅ Successfully migrated: ${stats.success}`);
    console.log(`❌ Failed: ${stats.failed}`);
    console.log(`⏭️  Skipped: ${stats.skipped}`);
    console.log('='.repeat(60));

    if (stats.failed > 0) {
      console.log('\n⚠️  Some certificates failed to migrate. Please check the errors above.');
      process.exit(1);
    } else {
      console.log('\n🎉 Migration completed successfully!');
      console.log('\n📝 Next steps:');
      console.log('   1. Verify migration in database');
      console.log('   2. Test old URLs (/c/{uuid}) still work');
      console.log('   3. Test new URLs (/c/{xid}) work correctly');
      console.log('   4. Update share links to use XID (optional)');
    }

  } catch (error) {
    console.error('\n❌ Migration failed with error:');
    console.error(error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

// Verification function to check migration results
async function verifyMigration() {
  console.log('\n🔍 Verifying migration...\n');

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

    console.log('📊 Verification Results:');
    console.log(`   Certificates with XID:    ${withXID || 0}`);
    console.log(`   Certificates without XID: ${withoutXID || 0}`);

    if (withoutXID === 0) {
      console.log('\n✅ All certificates have XID!');
    } else {
      console.log(`\n⚠️  ${withoutXID} certificates still need XID`);
    }

  } catch (error) {
    console.error('❌ Verification failed:');
    console.error(error instanceof Error ? error.message : 'Unknown error');
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === 'verify') {
    await verifyMigration();
  } else if (command === 'migrate') {
    await migrateUUIDToXID();
    await verifyMigration();
  } else {
    console.log('Usage:');
    console.log('  npm run migrate:xid migrate  - Run migration');
    console.log('  npm run migrate:xid verify   - Verify migration results');
  }
}

main();
