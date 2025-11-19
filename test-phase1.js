/**
 * Quick test script for Phase 1
 * Run with: node test-phase1.js
 */

// Import test functions
import { runAllTests } from './src/lib/utils/test-percentage-conversion.ts';

console.log('Running Phase 1 Tests...\n');

try {
  const allPassed = runAllTests();
  
  if (allPassed) {
    console.log('\n✅ Phase 1 verification PASSED!');
    process.exit(0);
  } else {
    console.error('\n❌ Phase 1 verification FAILED!');
    process.exit(1);
  }
} catch (error) {
  console.error('\n❌ Error running tests:', error);
  process.exit(1);
}
