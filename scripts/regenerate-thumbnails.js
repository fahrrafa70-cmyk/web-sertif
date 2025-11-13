/**
 * Script to regenerate thumbnails for existing templates
 * Run this after implementing thumbnail optimization to process existing templates
 */

const fetch = require('node-fetch');

async function regenerateThumbnails() {
  console.log('🚀 Starting thumbnail regeneration for existing templates...');
  
  try {
    const response = await fetch('http://localhost:3000/api/regenerate-thumbnails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Thumbnail regeneration completed successfully!');
      console.log(`📊 Results:`);
      console.log(`   - Total templates: ${result.total}`);
      console.log(`   - Successfully processed: ${result.processed}`);
      console.log(`   - Errors: ${result.errors}`);
      
      if (result.results && result.results.length > 0) {
        console.log('\n📋 Detailed results:');
        result.results.forEach(template => {
          if (template.success) {
            console.log(`   ✅ ${template.name}: Created ${template.thumbnails_created.join(', ')}`);
          } else {
            console.log(`   ❌ ${template.name}: ${template.error || 'Failed'}`);
          }
        });
      }
    } else {
      console.error('❌ Thumbnail regeneration failed:', result.error);
      process.exit(1);
    }
  } catch (error) {
    console.error('💥 Error running thumbnail regeneration:', error.message);
    process.exit(1);
  }
}

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch('http://localhost:3000/api/health', { 
      method: 'GET',
      timeout: 5000 
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function main() {
  console.log('🔍 Checking if development server is running...');
  
  const serverRunning = await checkServer();
  if (!serverRunning) {
    console.error('❌ Development server is not running!');
    console.log('💡 Please start the server first:');
    console.log('   npm run dev');
    console.log('   Then run this script again.');
    process.exit(1);
  }
  
  console.log('✅ Server is running, proceeding with thumbnail regeneration...');
  await regenerateThumbnails();
}

main().catch(console.error);
