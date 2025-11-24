/**
 * Sync Auth Users to Whitelist
 * 
 * This script syncs all users from auth.users to email_whitelist table.
 * Users not in whitelist will be added with default 'user' role.
 * Users already in whitelist will keep their existing role.
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

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

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * Get all users from auth.users
 */
async function getAuthUsers() {
  try {
    const { data, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      throw new Error(`Failed to fetch auth users: ${error.message}`);
    }

    return data.users || [];
  } catch (error) {
    console.error('Error fetching auth users:', error);
    throw error;
  }
}

/**
 * Get all emails from whitelist
 */
async function getWhitelistEmails() {
  try {
    const { data, error } = await supabase
      .from('email_whitelist')
      .select('email, role');

    if (error) {
      throw new Error(`Failed to fetch whitelist: ${error.message}`);
    }

    // Create a map for quick lookup
    const emailMap = new Map();
    (data || []).forEach(item => {
      emailMap.set(item.email.toLowerCase(), item.role);
    });

    return emailMap;
  } catch (error) {
    console.error('Error fetching whitelist:', error);
    throw error;
  }
}

/**
 * Sync auth users to whitelist
 */
async function syncAuthToWhitelist(dryRun = false) {
  try {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║         Sync Auth Users to Whitelist                      ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    if (dryRun) {
      console.log('🔍 DRY RUN MODE - No changes will be made\n');
    }

    // Step 1: Get all auth users
    console.log('📋 Step 1: Fetching auth users...');
    const authUsers = await getAuthUsers();
    console.log(`✅ Found ${authUsers.length} users in auth.users\n`);

    if (authUsers.length === 0) {
      console.log('📭 No users found in auth.users\n');
      return;
    }

    // Step 2: Get whitelist
    console.log('📋 Step 2: Fetching whitelist...');
    const whitelistMap = await getWhitelistEmails();
    console.log(`✅ Found ${whitelistMap.size} emails in whitelist\n`);

    // Step 3: Find users not in whitelist
    console.log('📋 Step 3: Analyzing differences...\n');
    
    const usersToAdd = [];
    const usersAlreadyInWhitelist = [];

    authUsers.forEach(user => {
      if (!user.email) return;
      
      const normalizedEmail = user.email.toLowerCase().trim();
      
      if (whitelistMap.has(normalizedEmail)) {
        usersAlreadyInWhitelist.push({
          email: normalizedEmail,
          role: whitelistMap.get(normalizedEmail)
        });
      } else {
        usersToAdd.push({
          email: normalizedEmail,
          role: 'member' // Default role (database constraint: admin, team, member)
        });
      }
    });

    // Display results
    console.log('═══════════════════════════════════════════════════════════');
    console.log('ANALYSIS RESULTS');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log(`📊 Total auth users: ${authUsers.length}`);
    console.log(`✅ Already in whitelist: ${usersAlreadyInWhitelist.length}`);
    console.log(`➕ Need to add: ${usersToAdd.length}\n`);

    if (usersAlreadyInWhitelist.length > 0) {
      console.log('✅ ALREADY IN WHITELIST:');
      console.log('─────────────────────────────────────────────────────────');
      usersAlreadyInWhitelist.forEach((user, i) => {
        console.log(`   ${i + 1}. ${user.email} (${user.role})`);
      });
      console.log('');
    }

    if (usersToAdd.length > 0) {
      console.log('➕ WILL BE ADDED TO WHITELIST (with role: member):');
      console.log('─────────────────────────────────────────────────────────');
      usersToAdd.forEach((user, i) => {
        console.log(`   ${i + 1}. ${user.email} (role: member)`);
      });
      console.log('');
    } else {
      console.log('✅ All auth users are already in whitelist!\n');
      return;
    }

    // Step 4: Add to whitelist (if not dry run)
    if (!dryRun) {
      console.log('═══════════════════════════════════════════════════════════');
      console.log('ADDING TO WHITELIST');
      console.log('═══════════════════════════════════════════════════════════\n');

      let successCount = 0;
      let errorCount = 0;

      for (const user of usersToAdd) {
        try {
          const { error } = await supabase
            .from('email_whitelist')
            .insert([{ email: user.email, role: user.role }]);

          if (error) {
            console.error(`❌ Failed to add ${user.email}: ${error.message}`);
            errorCount++;
          } else {
            console.log(`✅ Added ${user.email} with role '${user.role}'`);
            successCount++;
          }
        } catch (err) {
          console.error(`❌ Error adding ${user.email}:`, err);
          errorCount++;
        }
      }

      console.log('\n═══════════════════════════════════════════════════════════');
      console.log('SYNC COMPLETE');
      console.log('═══════════════════════════════════════════════════════════\n');
      console.log(`✅ Successfully added: ${successCount}`);
      console.log(`❌ Failed: ${errorCount}`);
      console.log(`📊 Total processed: ${usersToAdd.length}\n`);

    } else {
      console.log('═══════════════════════════════════════════════════════════');
      console.log('DRY RUN COMPLETE - No changes made');
      console.log('═══════════════════════════════════════════════════════════\n');
      console.log('💡 Run without --dry-run flag to apply changes:\n');
      console.log('   npm run sync:auth-whitelist\n');
    }

  } catch (error) {
    console.error('\n❌ Error during sync:', error.message);
    process.exit(1);
  }
}

/**
 * Verify sync status
 */
async function verifySync() {
  try {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║         Verify Auth-Whitelist Sync Status                 ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    const authUsers = await getAuthUsers();
    const whitelistMap = await getWhitelistEmails();

    const missing = [];
    authUsers.forEach(user => {
      if (!user.email) return;
      const normalizedEmail = user.email.toLowerCase().trim();
      if (!whitelistMap.has(normalizedEmail)) {
        missing.push(normalizedEmail);
      }
    });

    console.log('═══════════════════════════════════════════════════════════');
    console.log('VERIFICATION RESULTS');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log(`📊 Total auth users: ${authUsers.length}`);
    console.log(`📊 Total whitelist entries: ${whitelistMap.size}`);
    console.log(`❌ Missing from whitelist: ${missing.length}\n`);

    if (missing.length > 0) {
      console.log('❌ USERS NOT IN WHITELIST:');
      console.log('─────────────────────────────────────────────────────────');
      missing.forEach((email, i) => {
        console.log(`   ${i + 1}. ${email}`);
      });
      console.log('\n💡 Run sync to add them:');
      console.log('   npm run sync:auth-whitelist\n');
    } else {
      console.log('✅ ALL AUTH USERS ARE IN WHITELIST!\n');
    }

  } catch (error) {
    console.error('\n❌ Error during verification:', error.message);
    process.exit(1);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const isDryRun = args.includes('--dry-run');

  if (command === 'verify') {
    await verifySync();
  } else if (command === 'sync' || !command) {
    await syncAuthToWhitelist(isDryRun);
  } else {
    console.log('\nUsage:');
    console.log('  npm run sync:auth-whitelist              - Sync auth users to whitelist');
    console.log('  npm run sync:auth-whitelist:dry          - Dry run (no changes)');
    console.log('  npm run sync:auth-whitelist:verify       - Verify sync status');
    console.log('\nExamples:');
    console.log('  npm run sync:auth-whitelist              # Add missing users');
    console.log('  npm run sync:auth-whitelist:dry          # Preview changes');
    console.log('  npm run sync:auth-whitelist:verify       # Check status');
    console.log('');
  }
}

main();
