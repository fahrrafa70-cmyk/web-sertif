/**
 * Add Email to Admin Whitelist
 * 
 * This script adds an email to the email_whitelist table with admin role.
 * Admin users have full access to the application.
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

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * Add email to whitelist with specified role
 */
async function addToWhitelist(email, role = 'admin') {
  try {
    const normalizedEmail = email.toLowerCase().trim();
    
    if (!normalizedEmail) {
      throw new Error('Email is required');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      throw new Error('Invalid email format');
    }

    // Validate role
    const validRoles = ['admin', 'team', 'member'];
    const normalizedRole = role.toLowerCase();
    if (!validRoles.includes(normalizedRole)) {
      throw new Error(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
    }

    console.log(`\n🔍 Checking if ${normalizedEmail} already exists...`);

    // Check if email already exists in whitelist
    const { data: existing, error: checkError } = await supabase
      .from('email_whitelist')
      .select('email, role')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      throw new Error(`Error checking whitelist: ${checkError.message}`);
    }

    if (existing) {
      console.log(`\n⚠️  Email already exists in whitelist:`);
      console.log(`   Email: ${existing.email}`);
      console.log(`   Current Role: ${existing.role}`);
      
      if (existing.role.toLowerCase() === normalizedRole) {
        console.log(`\n✅ Email already has role "${normalizedRole}". No changes needed.`);
        return;
      }

      // Update role
      console.log(`\n🔄 Updating role from "${existing.role}" to "${normalizedRole}"...`);
      const { error: updateError } = await supabase
        .from('email_whitelist')
        .update({ role: normalizedRole })
        .eq('email', normalizedEmail);

      if (updateError) {
        throw new Error(`Failed to update role: ${updateError.message}`);
      }

      console.log(`\n✅ Successfully updated role!`);
      console.log(`   Email: ${normalizedEmail}`);
      console.log(`   New Role: ${normalizedRole}`);
      
    } else {
      // Insert new entry
      console.log(`\n➕ Adding new email to whitelist...`);
      const { error: insertError } = await supabase
        .from('email_whitelist')
        .insert([{ email: normalizedEmail, role: normalizedRole }]);

      if (insertError) {
        throw new Error(`Failed to add to whitelist: ${insertError.message}`);
      }

      console.log(`\n✅ Successfully added to whitelist!`);
      console.log(`   Email: ${normalizedEmail}`);
      console.log(`   Role: ${normalizedRole}`);
    }

    // Check if user exists in users table
    console.log(`\n🔍 Checking if user exists in users table...`);
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, role, full_name')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (userError && userError.code !== 'PGRST116') {
      console.warn(`⚠️  Warning: Could not check users table: ${userError.message}`);
    }

    if (user) {
      console.log(`\n✅ User found in users table:`);
      console.log(`   Name: ${user.full_name || 'N/A'}`);
      console.log(`   Current Role: ${user.role}`);
      
      if (user.role.toLowerCase() !== normalizedRole) {
        console.log(`\n🔄 Updating user role in users table...`);
        const { error: updateUserError } = await supabase
          .from('users')
          .update({ role: normalizedRole })
          .eq('email', normalizedEmail);

        if (updateUserError) {
          console.warn(`⚠️  Warning: Could not update users table: ${updateUserError.message}`);
        } else {
          console.log(`✅ User role updated successfully!`);
        }
      } else {
        console.log(`✅ User already has correct role in users table.`);
      }
    } else {
      console.log(`\n📝 User not found in users table yet.`);
      console.log(`   Role will be assigned automatically when user signs in.`);
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`📝 NEXT STEPS:`);
    console.log(`${'='.repeat(60)}`);
    console.log(`1. User should sign in to the application`);
    console.log(`2. Role will be automatically assigned based on whitelist`);
    console.log(`3. User will have ${normalizedRole} access immediately`);
    console.log(`${'='.repeat(60)}\n`);

  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    process.exit(1);
  }
}

/**
 * List all whitelisted emails
 */
async function listWhitelist() {
  try {
    console.log('\n📋 Fetching whitelist...\n');

    const { data, error } = await supabase
      .from('email_whitelist')
      .select('email, role, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch whitelist: ${error.message}`);
    }

    if (!data || data.length === 0) {
      console.log('📭 Whitelist is empty.\n');
      return;
    }

    console.log(`${'='.repeat(60)}`);
    console.log(`WHITELISTED EMAILS (${data.length})`);
    console.log(`${'='.repeat(60)}`);

    // Group by role
    const byRole = {
      admin: data.filter(d => d.role.toLowerCase() === 'admin'),
      team: data.filter(d => d.role.toLowerCase() === 'team'),
      member: data.filter(d => d.role.toLowerCase() === 'member'),
      user: data.filter(d => d.role.toLowerCase() === 'user')
    };

    if (byRole.admin.length > 0) {
      console.log(`\n👑 ADMIN (${byRole.admin.length}):`);
      byRole.admin.forEach((item, i) => {
        console.log(`   ${i + 1}. ${item.email}`);
      });
    }

    if (byRole.team.length > 0) {
      console.log(`\n👥 TEAM (${byRole.team.length}):`);
      byRole.team.forEach((item, i) => {
        console.log(`   ${i + 1}. ${item.email}`);
      });
    }

    if (byRole.member.length > 0) {
      console.log(`\n👤 MEMBER (${byRole.member.length}):`);
      byRole.member.forEach((item, i) => {
        console.log(`   ${i + 1}. ${item.email}`);
      });
    }

    if (byRole.user.length > 0) {
      console.log(`\n👤 USER (${byRole.user.length}):`);
      byRole.user.forEach((item, i) => {
        console.log(`   ${i + 1}. ${item.email}`);
      });
    }

    console.log(`\n${'='.repeat(60)}\n`);

  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Remove email from whitelist
 */
async function removeFromWhitelist(email) {
  try {
    const normalizedEmail = email.toLowerCase().trim();

    console.log(`\n🔍 Checking if ${normalizedEmail} exists...`);

    const { data: existing, error: checkError } = await supabase
      .from('email_whitelist')
      .select('email, role')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      throw new Error(`Error checking whitelist: ${checkError.message}`);
    }

    if (!existing) {
      console.log(`\n⚠️  Email not found in whitelist: ${normalizedEmail}\n`);
      return;
    }

    console.log(`\n🗑️  Removing ${normalizedEmail} (${existing.role}) from whitelist...`);

    const { error: deleteError } = await supabase
      .from('email_whitelist')
      .delete()
      .eq('email', normalizedEmail);

    if (deleteError) {
      throw new Error(`Failed to remove from whitelist: ${deleteError.message}`);
    }

    console.log(`\n✅ Successfully removed from whitelist!`);
    console.log(`   Email: ${normalizedEmail}\n`);

  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    process.exit(1);
  }
}

// Main execution
async function main() {
  const command = process.argv[2];
  const email = process.argv[3];
  const role = process.argv[4] || 'admin';

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         Email Whitelist Management Tool                   ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  if (command === 'add' && email) {
    await addToWhitelist(email, role);
  } else if (command === 'list') {
    await listWhitelist();
  } else if (command === 'remove' && email) {
    await removeFromWhitelist(email);
  } else {
    console.log('\nUsage:');
    console.log('  npm run whitelist:add <email> [role]  - Add email to whitelist');
    console.log('  npm run whitelist:list                - List all whitelisted emails');
    console.log('  npm run whitelist:remove <email>      - Remove email from whitelist');
    console.log('\nExamples:');
    console.log('  npm run whitelist:add admin@example.com admin');
    console.log('  npm run whitelist:add user@example.com team');
    console.log('  npm run whitelist:list');
    console.log('  npm run whitelist:remove user@example.com');
    console.log('\nRoles:');
    console.log('  admin - Full access to all features');
    console.log('  team  - Access to team features');
    console.log('  user  - Basic user access');
    console.log('');
  }
}

main();
