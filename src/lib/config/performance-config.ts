/**
 * PERFORMANCE CONFIGURATION
 * Emergency controls to disable heavy optimizations
 */

export const PERFORMANCE_CONFIG = {
  // 🚨 EMERGENCY CONTROLS
  DISABLE_AGGRESSIVE_CACHE: true,
  DISABLE_IMAGE_COMPRESSION: true,
  DISABLE_INDEXEDDB_CACHE: true,
  DISABLE_BATCH_PRELOADING: true,
  DISABLE_PROFESSIONAL_PRELOADER: true,
  
  // ✅ SAFE OPTIMIZATIONS (keep enabled)
  ENABLE_LIGHTWEIGHT_CACHE: true,
  ENABLE_BASIC_LAZY_LOADING: true,
  ENABLE_BROWSER_CACHE: true,
  
  // 🔧 FALLBACK SETTINGS
  MAX_CONCURRENT_REQUESTS: 3,
  CACHE_TTL: 30 * 60 * 1000, // 30 minutes
  ENABLE_DEBUG_LOGS: true
};

/**
 * Check if feature should be enabled
 */
export function isFeatureEnabled(feature: keyof typeof PERFORMANCE_CONFIG): boolean {
  return PERFORMANCE_CONFIG[feature] === true;
}

/**
 * Emergency performance mode - disable all heavy optimizations
 */
export function enableEmergencyMode(): void {
  Object.keys(PERFORMANCE_CONFIG).forEach(key => {
    if (key.startsWith('DISABLE_')) {
      (PERFORMANCE_CONFIG as any)[key] = true;
    }
  });
  
  console.warn('🚨 EMERGENCY MODE ENABLED - Heavy optimizations disabled');
}

/**
 * Safe performance mode - only lightweight optimizations
 */
export function enableSafeMode(): void {
  Object.assign(PERFORMANCE_CONFIG, {
    DISABLE_AGGRESSIVE_CACHE: true,
    DISABLE_IMAGE_COMPRESSION: true,
    DISABLE_INDEXEDDB_CACHE: true,
    DISABLE_BATCH_PRELOADING: true,
    DISABLE_PROFESSIONAL_PRELOADER: true,
    ENABLE_LIGHTWEIGHT_CACHE: true,
    ENABLE_BASIC_LAZY_LOADING: true,
    ENABLE_BROWSER_CACHE: true
  });
  
  console.log('✅ SAFE MODE ENABLED - Only lightweight optimizations active');
}
