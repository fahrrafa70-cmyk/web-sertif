/**
 * Check Email Whitelist Constraint
 * 
 * This script checks the database constraint for email_whitelist table
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkConstraint() {
  console.log('\n🔍 Testing different role formats...\n');

  const testEmail = 'test-constraint@example.com';
  const testRoles = ['user', 'USER', 'User', 'admin', 'ADMIN', 'Admin', 'team', 'TEAM', 'Team'];

  // First, delete test email if exists
  await supabase.from('email_whitelist').delete().eq('email', testEmail);

  for (const role of testRoles) {
    try {
      const { data, error } = await supabase
        .from('email_whitelist')
        .insert([{ email: testEmail, role: role }])
        .select();

      if (error) {
        console.log(`❌ Role "${role}" - FAILED: ${error.message}`);
      } else {
        console.log(`✅ Role "${role}" - SUCCESS`);
        // Delete for next test
        await supabase.from('email_whitelist').delete().eq('email', testEmail);
        
        // If this works, we found the correct format
        console.log(`\n✅ FOUND WORKING FORMAT: "${role}"\n`);
        break;
      }
    } catch (err) {
      console.log(`❌ Role "${role}" - ERROR: ${err.message}`);
    }
  }

  // Check existing entries to see their format
  console.log('\n📋 Checking existing whitelist entries...\n');
  const { data: existing } = await supabase
    .from('email_whitelist')
    .select('email, role')
    .limit(5);

  if (existing && existing.length > 0) {
    console.log('Existing entries:');
    existing.forEach(entry => {
      console.log(`  ${entry.email} → role: "${entry.role}" (type: ${typeof entry.role})`);
    });
  }
}

checkConstraint();
