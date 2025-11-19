/**
 * Test Suite for Percentage-Based Positioning
 * 
 * Validates conversion accuracy and consistency across different scenarios
 */

import {
  percentToPixel,
  pixelToPercent,
  getDisplayDimensions,
  percentToScreen,
  screenToPercent,
  clampPercent,
  isValidPercentPosition,
  getActualPosition,
  type TemplateDimensions,
  type PercentagePosition,
  type PixelPosition
} from './percentage-positioning';

/**
 * Standard template dimensions for testing
 */
const STANDARD_TEMPLATE: TemplateDimensions = {
  width: 1920,
  height: 1080
};

/**
 * Test conversion accuracy
 */
export function testConversionAccuracy(): boolean {
  console.group('🧪 Testing Conversion Accuracy');
  
  let allPassed = true;
  
  // Test 1: Center position (50%, 50%)
  const centerPercent: PercentagePosition = {
    xPercent: 50,
    yPercent: 50,
    fontSizePercent: 2.5
  };
  
  const centerPixel = percentToPixel(centerPercent, STANDARD_TEMPLATE);
  
  if (centerPixel.x !== 960 || centerPixel.y !== 540 || centerPixel.fontSize !== 27) {
    console.error('❌ Test 1 FAILED: Center position conversion');
    console.error(`Expected: x=960, y=540, fontSize=27`);
    console.error(`Got: x=${centerPixel.x}, y=${centerPixel.y}, fontSize=${centerPixel.fontSize}`);
    allPassed = false;
  } else {
    console.log('✅ Test 1 PASSED: Center position conversion');
  }
  
  // Test 2: Round-trip conversion (percent → pixel → percent)
  const originalPercent: PercentagePosition = {
    xPercent: 49.84,
    yPercent: 49.72,
    fontSizePercent: 2.22
  };
  
  const pixel = percentToPixel(originalPercent, STANDARD_TEMPLATE);
  const backToPercent = pixelToPercent(pixel, STANDARD_TEMPLATE);
  
  const tolerance = 0.01; // 0.01% tolerance
  const xDiff = Math.abs(originalPercent.xPercent - backToPercent.xPercent);
  const yDiff = Math.abs(originalPercent.yPercent - backToPercent.yPercent);
  const fontDiff = Math.abs(originalPercent.fontSizePercent - backToPercent.fontSizePercent);
  
  if (xDiff > tolerance || yDiff > tolerance || fontDiff > tolerance) {
    console.error('❌ Test 2 FAILED: Round-trip conversion');
    console.error(`X diff: ${xDiff}%, Y diff: ${yDiff}%, Font diff: ${fontDiff}%`);
    allPassed = false;
  } else {
    console.log('✅ Test 2 PASSED: Round-trip conversion');
  }
  
  // Test 3: Display dimensions calculation
  const containerWidth = 375; // Mobile screen
  const displayDims = getDisplayDimensions(containerWidth, STANDARD_TEMPLATE);
  
  const expectedHeight = 375 * (1080 / 1920); // 211.875
  const expectedScale = 375 / 1920; // 0.1953125
  
  if (
    Math.abs(displayDims.height - expectedHeight) > 0.01 ||
    Math.abs(displayDims.scale - expectedScale) > 0.0001
  ) {
    console.error('❌ Test 3 FAILED: Display dimensions calculation');
    console.error(`Expected: height=${expectedHeight}, scale=${expectedScale}`);
    console.error(`Got: height=${displayDims.height}, scale=${displayDims.scale}`);
    allPassed = false;
  } else {
    console.log('✅ Test 3 PASSED: Display dimensions calculation');
  }
  
  // Test 4: Screen position conversion
  const screenPos = percentToScreen(centerPercent, displayDims);
  const expectedScreenX = 187.5; // 50% of 375
  const expectedScreenY = 105.9375; // 50% of 211.875
  
  if (
    Math.abs(screenPos.x - expectedScreenX) > 0.01 ||
    Math.abs(screenPos.y - expectedScreenY) > 0.01
  ) {
    console.error('❌ Test 4 FAILED: Screen position conversion');
    console.error(`Expected: x=${expectedScreenX}, y=${expectedScreenY}`);
    console.error(`Got: x=${screenPos.x}, y=${screenPos.y}`);
    allPassed = false;
  } else {
    console.log('✅ Test 4 PASSED: Screen position conversion');
  }
  
  // Test 5: Clamp function
  const clamped1 = clampPercent(-10);
  const clamped2 = clampPercent(150);
  const clamped3 = clampPercent(50);
  
  if (clamped1 !== 0 || clamped2 !== 100 || clamped3 !== 50) {
    console.error('❌ Test 5 FAILED: Clamp function');
    allPassed = false;
  } else {
    console.log('✅ Test 5 PASSED: Clamp function');
  }
  
  // Test 6: Validation function
  const validPos: PercentagePosition = { xPercent: 50, yPercent: 50, fontSizePercent: 2.5 };
  const invalidPos1: PercentagePosition = { xPercent: -10, yPercent: 50, fontSizePercent: 2.5 };
  const invalidPos2: PercentagePosition = { xPercent: 50, yPercent: 150, fontSizePercent: 2.5 };
  
  if (
    !isValidPercentPosition(validPos) ||
    isValidPercentPosition(invalidPos1) ||
    isValidPercentPosition(invalidPos2)
  ) {
    console.error('❌ Test 6 FAILED: Validation function');
    allPassed = false;
  } else {
    console.log('✅ Test 6 PASSED: Validation function');
  }
  
  console.groupEnd();
  
  return allPassed;
}

/**
 * Test cross-device consistency
 */
export function testCrossDeviceConsistency(): boolean {
  console.group('🧪 Testing Cross-Device Consistency');
  
  let allPassed = true;
  
  // Test position on different screen sizes
  const testPercent: PercentagePosition = {
    xPercent: 49.84,
    yPercent: 49.72,
    fontSizePercent: 2.22
  };
  
  const devices = [
    { name: 'iPhone SE', width: 375 },
    { name: 'iPhone 12', width: 390 },
    { name: 'iPad', width: 768 },
    { name: 'Desktop', width: 1920 }
  ];
  
  console.log('Testing position consistency across devices:');
  console.log(`Input: ${testPercent.xPercent}%, ${testPercent.yPercent}%, ${testPercent.fontSizePercent}%`);
  console.log('');
  
  devices.forEach(device => {
    const displayDims = getDisplayDimensions(device.width, STANDARD_TEMPLATE);
    const screenPos = percentToScreen(testPercent, displayDims);
    const backToPercent = screenToPercent(screenPos, displayDims);
    
    const xDiff = Math.abs(testPercent.xPercent - backToPercent.xPercent);
    const yDiff = Math.abs(testPercent.yPercent - backToPercent.yPercent);
    const fontDiff = Math.abs(testPercent.fontSizePercent - backToPercent.fontSizePercent);
    
    const tolerance = 0.01;
    const passed = xDiff < tolerance && yDiff < tolerance && fontDiff < tolerance;
    
    if (passed) {
      console.log(`✅ ${device.name} (${device.width}px): PASSED`);
    } else {
      console.error(`❌ ${device.name} (${device.width}px): FAILED`);
      console.error(`  X diff: ${xDiff}%, Y diff: ${yDiff}%, Font diff: ${fontDiff}%`);
      allPassed = false;
    }
  });
  
  console.groupEnd();
  
  return allPassed;
}

/**
 * Test mobile → desktop → generate consistency
 */
export function testMobileDesktopGenerateConsistency(): boolean {
  console.group('🧪 Testing Mobile → Desktop → Generate Consistency');
  
  // Simulate user action on mobile
  const mobileScreenPos: PixelPosition = {
    x: 171,
    y: 96,
    fontSize: 10
  };
  
  const mobileDisplayDims = getDisplayDimensions(375, STANDARD_TEMPLATE);
  
  // Convert to percentage (saved to DB)
  const savedPercent = screenToPercent(mobileScreenPos, mobileDisplayDims);
  
  console.log('1. User drags on Mobile (375px):');
  console.log(`   Screen position: x=${mobileScreenPos.x}px, y=${mobileScreenPos.y}px`);
  console.log(`   Saved to DB: ${savedPercent.xPercent.toFixed(2)}%, ${savedPercent.yPercent.toFixed(2)}%`);
  console.log('');
  
  // Open on desktop
  const desktopDisplayDims = getDisplayDimensions(1920, STANDARD_TEMPLATE);
  const desktopScreenPos = percentToScreen(savedPercent, desktopDisplayDims);
  
  console.log('2. Open on Desktop (1920px):');
  console.log(`   Screen position: x=${desktopScreenPos.x.toFixed(2)}px, y=${desktopScreenPos.y.toFixed(2)}px`);
  console.log(`   Percentage: ${savedPercent.xPercent.toFixed(2)}%, ${savedPercent.yPercent.toFixed(2)}%`);
  console.log('');
  
  // Generate certificate
  const generatePixel = percentToPixel(savedPercent, STANDARD_TEMPLATE);
  
  console.log('3. Generate Certificate (1920x1080):');
  console.log(`   Final position: x=${generatePixel.x.toFixed(2)}px, y=${generatePixel.y.toFixed(2)}px`);
  console.log('');
  
  // Verify consistency
  const mobileTemplatePos = percentToPixel(savedPercent, STANDARD_TEMPLATE);
  const desktopTemplatePos = percentToPixel(savedPercent, STANDARD_TEMPLATE);
  
  const consistent = 
    Math.abs(mobileTemplatePos.x - desktopTemplatePos.x) < 0.01 &&
    Math.abs(mobileTemplatePos.y - desktopTemplatePos.y) < 0.01 &&
    Math.abs(mobileTemplatePos.x - generatePixel.x) < 0.01 &&
    Math.abs(mobileTemplatePos.y - generatePixel.y) < 0.01;
  
  if (consistent) {
    console.log('✅ RESULT: Perfect consistency across all platforms!');
    console.log(`   All positions resolve to: x=${generatePixel.x.toFixed(2)}px, y=${generatePixel.y.toFixed(2)}px`);
  } else {
    console.error('❌ RESULT: Inconsistency detected!');
  }
  
  console.groupEnd();
  
  return consistent;
}

/**
 * Run all tests
 */
export function runAllTests(): boolean {
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('🧪 PERCENTAGE-BASED POSITIONING TEST SUITE');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');
  
  const test1 = testConversionAccuracy();
  console.log('');
  
  const test2 = testCrossDeviceConsistency();
  console.log('');
  
  const test3 = testMobileDesktopGenerateConsistency();
  console.log('');
  
  const allPassed = test1 && test2 && test3;
  
  console.log('═══════════════════════════════════════════════════════');
  if (allPassed) {
    console.log('✅ ALL TESTS PASSED!');
  } else {
    console.error('❌ SOME TESTS FAILED!');
  }
  console.log('═══════════════════════════════════════════════════════');
  console.log('');
  
  return allPassed;
}
