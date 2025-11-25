/**
 * Setup Profile Storage Bucket in Supabase
 * Creates the 'profile' storage bucket with proper policies for user profile pictures
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing required environment variables:');
  console.error('- NEXT_PUBLIC_SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function setupProfileStorage() {
  console.log('🚀 Setting up profile storage bucket...');

  try {
    // 1. Create the profile bucket
    console.log('📁 Creating profile bucket...');
    const { data: bucket, error: bucketError } = await supabase.storage.createBucket('profile', {
      public: true,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
      fileSizeLimit: 5242880 // 5MB in bytes
    });

    if (bucketError) {
      if (bucketError.message.includes('already exists')) {
        console.log('✅ Profile bucket already exists');
      } else {
        throw bucketError;
      }
    } else {
      console.log('✅ Profile bucket created successfully');
    }

    // 2. Set up storage policies
    console.log('🔒 Setting up storage policies...');

    // Policy to allow authenticated users to upload their own profile pictures
    const uploadPolicy = {
      name: 'Allow authenticated users to upload profile pictures',
      definition: `
        (bucket_id = 'profile') 
        AND (auth.role() = 'authenticated') 
        AND (auth.uid()::text = (storage.foldername(name))[1])
      `,
      check: `
        (bucket_id = 'profile') 
        AND (auth.role() = 'authenticated') 
        AND (auth.uid()::text = (storage.foldername(name))[1])
      `
    };

    // Policy to allow public read access to profile pictures
    const readPolicy = {
      name: 'Allow public read access to profile pictures',
      definition: `bucket_id = 'profile'`,
      check: `bucket_id = 'profile'`
    };

    // Policy to allow authenticated users to delete their own profile pictures
    const deletePolicy = {
      name: 'Allow users to delete their own profile pictures',
      definition: `
        (bucket_id = 'profile') 
        AND (auth.role() = 'authenticated') 
        AND (auth.uid()::text = (storage.foldername(name))[1])
      `,
      check: `
        (bucket_id = 'profile') 
        AND (auth.role() = 'authenticated') 
        AND (auth.uid()::text = (storage.foldername(name))[1])
      `
    };

    // Apply policies using SQL
    const policyQueries = [
      // Drop existing policies first (if any)
      `DROP POLICY IF EXISTS "Allow authenticated users to upload profile pictures" ON storage.objects;`,
      `DROP POLICY IF EXISTS "Allow public read access to profile pictures" ON storage.objects;`,
      `DROP POLICY IF EXISTS "Allow users to delete their own profile pictures" ON storage.objects;`,
      
      // Create new policies
      `CREATE POLICY "Allow authenticated users to upload profile pictures" ON storage.objects
       FOR INSERT WITH CHECK (${uploadPolicy.check});`,
      
      `CREATE POLICY "Allow public read access to profile pictures" ON storage.objects
       FOR SELECT USING (${readPolicy.check});`,
       
      `CREATE POLICY "Allow users to delete their own profile pictures" ON storage.objects
       FOR DELETE USING (${deletePolicy.check});`,

      `CREATE POLICY "Allow users to update their own profile pictures" ON storage.objects
       FOR UPDATE USING (${deletePolicy.definition});`
    ];

    for (const query of policyQueries) {
      const { error } = await supabase.rpc('exec_sql', { sql_query: query });
      if (error && !error.message.includes('does not exist')) {
        console.warn(`⚠️  Policy setup warning: ${error.message}`);
      }
    }

    console.log('✅ Storage policies configured');

    // 3. Test the setup
    console.log('🧪 Testing storage setup...');
    
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    if (listError) {
      throw listError;
    }

    const profileBucket = buckets.find(b => b.name === 'profile');
    if (!profileBucket) {
      throw new Error('Profile bucket not found after creation');
    }

    console.log('✅ Storage setup test passed');
    console.log('\n📋 Bucket Configuration:');
    console.log(`   Name: ${profileBucket.name}`);
    console.log(`   Public: ${profileBucket.public}`);
    console.log(`   File size limit: ${profileBucket.file_size_limit ? (profileBucket.file_size_limit / 1024 / 1024) + 'MB' : 'Not set'}`);
    console.log(`   Allowed MIME types: ${profileBucket.allowed_mime_types?.join(', ') || 'All types'}`);

    console.log('\n✅ Profile storage setup completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Run the database migration: npm run migrate');
    console.log('   2. Test profile page functionality');
    console.log('   3. Upload test profile image');

  } catch (error) {
    console.error('❌ Error setting up profile storage:', error);
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  setupProfileStorage();
}

module.exports = { setupProfileStorage };
