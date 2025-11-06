#!/usr/bin/env node

/**
 * Fix Next.js build errors by cleaning cache and ensuring proper directory structure
 * Usage: node scripts/fix-build-errors.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing Next.js build errors...\n');

// Step 1: Clean cache
console.log('Step 1: Cleaning cache...');
const pathsToClean = ['.next', '.turbo'];
pathsToClean.forEach(dir => {
  const fullPath = path.join(process.cwd(), dir);
  if (fs.existsSync(fullPath)) {
    try {
      fs.rmSync(fullPath, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
      console.log(`✓ Removed: ${dir}`);
    } catch (error) {
      console.error(`✗ Failed to remove ${dir}:`, error.message);
    }
  }
});

// Step 2: Clean temporary manifest files
console.log('\nStep 2: Cleaning temporary manifest files...');
const staticDevPath = path.join(process.cwd(), '.next', 'static', 'development');
if (fs.existsSync(staticDevPath)) {
  try {
    const files = fs.readdirSync(staticDevPath);
    files.forEach(file => {
      if (file.includes('_buildManifest.js.tmp.') || file.endsWith('.tmp')) {
        try {
          fs.unlinkSync(path.join(staticDevPath, file));
          console.log(`✓ Removed temp file: ${file}`);
        } catch (error) {
          // Ignore errors for temp files
        }
      }
    });
  } catch (error) {
    // Directory might not exist, that's okay
  }
}

// Step 3: Ensure .next directory structure exists
console.log('\nStep 3: Ensuring directory structure...');
const requiredDirs = [
  '.next',
  '.next/static',
  '.next/static/development',
  '.next/server',
];

requiredDirs.forEach(dir => {
  const fullPath = path.join(process.cwd(), dir);
  if (!fs.existsSync(fullPath)) {
    try {
      fs.mkdirSync(fullPath, { recursive: true });
      console.log(`✓ Created: ${dir}`);
    } catch (error) {
      console.error(`✗ Failed to create ${dir}:`, error.message);
    }
  }
});

console.log('\n✅ Build error fix completed!');
console.log('\n💡 Next steps:');
console.log('   1. Stop your dev server if it\'s running');
console.log('   2. Run: npm run dev');
console.log('   3. If errors persist, try: npm run dev (without turbopack)');
console.log('');
