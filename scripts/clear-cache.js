#!/usr/bin/env node

/**
 * Clear Next.js cache and build artifacts
 * Usage: node scripts/clear-cache.js
 */

const fs = require('fs');
const path = require('path');

const pathsToClean = [
  '.next',
  '.turbo',
  'node_modules/.cache',
  '.next/static/development',
];

function removePath(dirPath) {
  if (fs.existsSync(dirPath)) {
    try {
      fs.rmSync(dirPath, { recursive: true, force: true });
      console.log(`✓ Removed: ${dirPath}`);
      return true;
    } catch (error) {
      console.error(`✗ Failed to remove ${dirPath}:`, error.message);
      return false;
    }
  } else {
    console.log(`⊘ Not found: ${dirPath}`);
    return true;
  }
}

console.log('🧹 Clearing Next.js cache...\n');

let allSuccess = true;
pathsToClean.forEach(pathToClean => {
  const fullPath = path.join(process.cwd(), pathToClean);
  if (!removePath(fullPath)) {
    allSuccess = false;
  }
});

console.log('\n' + (allSuccess ? '✅ Cache cleared successfully!' : '⚠️  Some paths could not be cleared.'));
console.log('\n💡 Tip: If errors persist, try:');
console.log('   1. Stop the dev server');
console.log('   2. Run: npm run clean:win (Windows) or npm run clean:unix (Mac/Linux)');
console.log('   3. Restart the dev server\n');

process.exit(allSuccess ? 0 : 1);

