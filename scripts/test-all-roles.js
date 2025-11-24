/**
 * Test All Possible Roles
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function testRoles() {
  console.log('\n🔍 Testing all possible role values...\n');

  const testEmail = 'test-role@example.com';
  const possibleRoles = [
    'admin', 'team', 'user', 'member', 'public',
    'Admin', 'Team', 'User', 'Member', 'Public',
    'ADMIN', 'TEAM', 'USER', 'MEMBER', 'PUBLIC'
  ];

  // Clean up first
  await supabase.from('email_whitelist').delete().eq('email', testEmail);

  const workingRoles = [];

  for (const role of possibleRoles) {
    const { error } = await supabase
      .from('email_whitelist')
      .insert([{ email: testEmail, role: role }]);

    if (!error) {
      console.log(`✅ "${role}" - WORKS`);
      workingRoles.push(role);
      // Clean up for next test
      await supabase.from('email_whitelist').delete().eq('email', testEmail);
    } else {
      console.log(`❌ "${role}" - FAILED`);
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('WORKING ROLES:');
  console.log('═══════════════════════════════════════════════════════════');
  workingRoles.forEach(role => {
    console.log(`  ✅ "${role}"`);
  });
  console.log('');
}

testRoles();
