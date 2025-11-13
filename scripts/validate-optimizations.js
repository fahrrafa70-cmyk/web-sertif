const fs = require('fs');
const path = require('path');

/**
 * Validation script to ensure all Priority 1 optimizations are properly implemented
 */

console.log('🔍 Validating Priority 1 Optimizations...\n');

const validations = [];

// Check if optimization files exist
const requiredFiles = [
  'src/components/lazy-components.tsx',
  'src/lib/utils/lazy-pdf.ts',
  'src/components/ui/enhanced-image.tsx',
  'src/lib/utils/performance-tracker.ts',
  'src/components/optimized-hero-section.tsx',
  'src/styles/critical.css',
  'scripts/analyze-bundle.js',
  'PRIORITY_1_IMPLEMENTATION_GUIDE.md'
];

console.log('📁 Checking Required Files:');
requiredFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  const exists = fs.existsSync(filePath);
  console.log(`${exists ? '✅' : '❌'} ${file}`);
  validations.push({ type: 'file', name: file, status: exists });
});

// Check package.json scripts
console.log('\n📦 Checking Package.json Scripts:');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const requiredScripts = [
  'analyze',
  'analyze:bundle',
  'perf:baseline',
  'perf:test'
];

requiredScripts.forEach(script => {
  const exists = packageJson.scripts && packageJson.scripts[script];
  console.log(`${exists ? '✅' : '❌'} ${script}`);
  validations.push({ type: 'script', name: script, status: !!exists });
});

// Check Next.js config
console.log('\n⚙️ Checking Next.js Configuration:');
const nextConfigPath = path.join(process.cwd(), 'next.config.ts');
if (fs.existsSync(nextConfigPath)) {
  const nextConfig = fs.readFileSync(nextConfigPath, 'utf8');
  const hasBundleAnalyzer = nextConfig.includes('withBundleAnalyzer');
  const hasOptimizePackageImports = nextConfig.includes('optimizePackageImports');
  
  console.log(`${hasBundleAnalyzer ? '✅' : '❌'} Bundle analyzer configured`);
  console.log(`${hasOptimizePackageImports ? '✅' : '❌'} Package imports optimization enabled`);
  
  validations.push({ type: 'config', name: 'bundleAnalyzer', status: hasBundleAnalyzer });
  validations.push({ type: 'config', name: 'optimizePackageImports', status: hasOptimizePackageImports });
} else {
  console.log('❌ next.config.ts not found');
  validations.push({ type: 'config', name: 'nextConfig', status: false });
}

// Check hooks optimization
console.log('\n🎣 Checking Hooks Optimization:');
const debounceHookPath = path.join(process.cwd(), 'src/hooks/use-debounce.ts');
if (fs.existsSync(debounceHookPath)) {
  const debounceHook = fs.readFileSync(debounceHookPath, 'utf8');
  const hasCallbackDebounce = debounceHook.includes('useDebouncedCallback');
  console.log(`${hasCallbackDebounce ? '✅' : '❌'} Debounced callback hook implemented`);
  validations.push({ type: 'hook', name: 'debouncedCallback', status: hasCallbackDebounce });
}

const deduplicationHookPath = path.join(process.cwd(), 'src/hooks/use-request-deduplication.ts');
if (fs.existsSync(deduplicationHookPath)) {
  console.log('✅ Request deduplication hook exists');
  validations.push({ type: 'hook', name: 'requestDeduplication', status: true });
} else {
  console.log('❌ Request deduplication hook missing');
  validations.push({ type: 'hook', name: 'requestDeduplication', status: false });
}

// Generate validation report
console.log('\n📊 Validation Summary:');
const totalValidations = validations.length;
const passedValidations = validations.filter(v => v.status).length;
const successRate = (passedValidations / totalValidations * 100).toFixed(1);

console.log(`Passed: ${passedValidations}/${totalValidations} (${successRate}%)`);

if (successRate >= 90) {
  console.log('🎉 Excellent! All critical optimizations are in place.');
} else if (successRate >= 75) {
  console.log('⚠️ Good progress, but some optimizations are missing.');
} else {
  console.log('❌ Several optimizations need to be implemented.');
}

// Check if build directory exists for bundle analysis
console.log('\n🏗️ Build Status:');
const buildExists = fs.existsSync(path.join(process.cwd(), '.next'));
if (buildExists) {
  console.log('✅ Build directory exists - ready for bundle analysis');
  console.log('💡 Run: npm run analyze:bundle');
} else {
  console.log('⚠️ No build found - run: npm run build');
}

// Performance testing recommendations
console.log('\n🚀 Next Steps:');
console.log('1. Run: npm run perf:baseline (to establish baseline)');
console.log('2. Implement optimizations following PRIORITY_1_IMPLEMENTATION_GUIDE.md');
console.log('3. Run: npm run perf:test (to measure improvements)');
console.log('4. Monitor performance with the performance tracker');

// Save validation results
const validationReport = {
  timestamp: new Date().toISOString(),
  totalValidations,
  passedValidations,
  successRate: parseFloat(successRate),
  validations,
  recommendations: [
    'Follow the implementation guide step by step',
    'Test each optimization individually',
    'Monitor bundle size changes',
    'Validate functionality after each change'
  ]
};

fs.writeFileSync('validation-report.json', JSON.stringify(validationReport, null, 2));
console.log('\n💾 Validation report saved to validation-report.json');
