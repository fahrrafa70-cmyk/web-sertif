const fs = require('fs');
const path = require('path');

/**
 * PWA Validation Script
 * Checks if all PWA requirements are met
 */

console.log('🔍 Validating PWA Implementation...\n');

const validations = [];
let allValid = true;

// Check required files
const requiredFiles = [
  'public/manifest.json',
  'public/sw.js',
  'src/lib/pwa/service-worker.ts',
  'src/components/pwa-install-prompt.tsx',
  'src/components/pwa-layout-integration.tsx'
];

console.log('📁 Checking Required Files:');
requiredFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  const exists = fs.existsSync(filePath);
  console.log(`${exists ? '✅' : '❌'} ${file}`);
  validations.push({ type: 'file', name: file, status: exists });
  if (!exists) allValid = false;
});

// Check manifest.json content
console.log('\n📋 Checking Manifest Content:');
const manifestPath = path.join(process.cwd(), 'public/manifest.json');
if (fs.existsSync(manifestPath)) {
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    
    const requiredFields = ['name', 'short_name', 'start_url', 'display', 'icons'];
    requiredFields.forEach(field => {
      const exists = manifest[field] !== undefined;
      console.log(`${exists ? '✅' : '❌'} ${field}`);
      if (!exists) allValid = false;
    });

    // Check icons
    if (manifest.icons && manifest.icons.length > 0) {
      console.log(`✅ Icons defined: ${manifest.icons.length} icons`);
      
      // Check for required icon sizes
      const requiredSizes = ['192x192', '512x512'];
      requiredSizes.forEach(size => {
        const hasSize = manifest.icons.some(icon => icon.sizes === size);
        console.log(`${hasSize ? '✅' : '⚠️'} Icon ${size}: ${hasSize ? 'Found' : 'Missing (recommended)'}`);
      });
    } else {
      console.log('❌ No icons defined');
      allValid = false;
    }
  } catch (error) {
    console.log('❌ Invalid JSON in manifest.json');
    allValid = false;
  }
} else {
  console.log('❌ manifest.json not found');
  allValid = false;
}

// Check icon files
console.log('\n🖼️ Checking Icon Files:');
const iconSizes = ['72x72', '96x96', '128x128', '144x144', '152x152', '192x192', '384x384', '512x512'];
let iconCount = 0;

iconSizes.forEach(size => {
  const iconPath = path.join(process.cwd(), `public/icon-${size}.png`);
  const exists = fs.existsSync(iconPath);
  console.log(`${exists ? '✅' : '⚠️'} icon-${size}.png`);
  if (exists) iconCount++;
});

console.log(`📊 Icon Summary: ${iconCount}/${iconSizes.length} icons found`);
if (iconCount < 2) {
  console.log('⚠️ At least 192x192 and 512x512 icons are required');
}

// Check service worker
console.log('\n🔧 Checking Service Worker:');
const swPath = path.join(process.cwd(), 'public/sw.js');
if (fs.existsSync(swPath)) {
  const swContent = fs.readFileSync(swPath, 'utf8');
  
  const swFeatures = [
    { name: 'Cache strategies', check: swContent.includes('Cache') },
    { name: 'Fetch event listener', check: swContent.includes('fetch') },
    { name: 'Install event listener', check: swContent.includes('install') },
    { name: 'Activate event listener', check: swContent.includes('activate') }
  ];

  swFeatures.forEach(feature => {
    console.log(`${feature.check ? '✅' : '❌'} ${feature.name}`);
    if (!feature.check) allValid = false;
  });
} else {
  console.log('❌ Service Worker not found');
  allValid = false;
}

// PWA Requirements Summary
console.log('\n📊 PWA Requirements Summary:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const requirements = [
  { name: 'HTTPS (Production)', status: 'manual', note: 'Deploy to HTTPS domain' },
  { name: 'Manifest.json', status: fs.existsSync(manifestPath) },
  { name: 'Service Worker', status: fs.existsSync(swPath) },
  { name: 'Icons (192x192, 512x512)', status: iconCount >= 2 },
  { name: 'PWA Components', status: fs.existsSync(path.join(process.cwd(), 'src/components/pwa-install-prompt.tsx')) }
];

requirements.forEach(req => {
  let icon = '✅';
  if (req.status === 'manual') icon = '🔧';
  else if (!req.status) icon = '❌';
  
  console.log(`${icon} ${req.name}${req.note ? ` (${req.note})` : ''}`);
});

// Final status
console.log('\n🎯 PWA Status:');
if (allValid && iconCount >= 2) {
  console.log('🎉 PWA implementation is ready!');
  console.log('📝 Next steps:');
  console.log('   1. Add PWA meta tags to layout.tsx');
  console.log('   2. Add PWAIntegration component to layout');
  console.log('   3. Create icon files (if missing)');
  console.log('   4. Deploy to HTTPS domain');
  console.log('   5. Test install prompt in browser');
} else {
  console.log('⚠️ PWA implementation needs attention');
  console.log('📝 Fix the ❌ items above before deployment');
}

// Generate implementation checklist
const checklist = {
  timestamp: new Date().toISOString(),
  allValid,
  iconCount,
  requiredIcons: iconSizes,
  missingIcons: iconSizes.filter(size => 
    !fs.existsSync(path.join(process.cwd(), `public/icon-${size}.png`))
  ),
  nextSteps: [
    'Update src/app/layout.tsx with PWA meta tags',
    'Add <PWAIntegration /> component to layout',
    'Create missing icon files',
    'Deploy to HTTPS domain',
    'Test PWA install in browser'
  ]
};

fs.writeFileSync('pwa-validation-report.json', JSON.stringify(checklist, null, 2));
console.log('\n💾 Validation report saved to pwa-validation-report.json');

process.exit(allValid ? 0 : 1);
