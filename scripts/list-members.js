/**
 * Script to list all members from Supabase database
 * Usage: node scripts/list-members.js
 */

/* eslint-disable @typescript-eslint/no-require-imports */
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function listMembers() {
  try {
    console.log('🔍 Fetching members from database...\n');
    
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Error fetching members:', error.message);
      process.exit(1);
    }
    
    if (!data || data.length === 0) {
      console.log('📭 No members found in database.');
      return;
    }
    
    console.log(`✅ Found ${data.length} member(s)\n`);
    console.log('='.repeat(100));
    console.log('LIST OF MEMBERS');
    console.log('='.repeat(100));
    console.log();
    
    data.forEach((member, index) => {
      console.log(`${index + 1}. ${member.name || '(No name)'}`);
      if (member.email) console.log(`   📧 Email: ${member.email}`);
      if (member.phone) console.log(`   📱 Phone: ${member.phone}`);
      if (member.organization) console.log(`   🏢 Organization: ${member.organization}`);
      if (member.job) console.log(`   💼 Job: ${member.job}`);
      if (member.city) console.log(`   📍 City: ${member.city}`);
      if (member.date_of_birth) console.log(`   🎂 Date of Birth: ${member.date_of_birth}`);
      if (member.address) console.log(`   🏠 Address: ${member.address}`);
      console.log(`   🆔 ID: ${member.id}`);
      if (member.created_at) {
        const createdDate = new Date(member.created_at).toLocaleDateString('id-ID', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        console.log(`   📅 Created: ${createdDate}`);
      }
      console.log();
    });
    
    console.log('='.repeat(100));
    console.log(`Total: ${data.length} member(s)`);
    console.log('='.repeat(100));
    
    // Also output as JSON for easy export
    console.log('\n📄 JSON Format:');
    console.log(JSON.stringify(data, null, 2));
    
  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
    process.exit(1);
  }
}

listMembers();

