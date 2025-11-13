import type { NextConfig } from "next";
import withBundleAnalyzer from '@next/bundle-analyzer';

// Bundle analyzer configuration
const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  // ✅ PHASE 2: Enhanced image optimization configuration
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost", port: "*", pathname: "/**" },
      { protocol: "https", hostname: "localhost", port: "*", pathname: "/**" },
      { protocol: "http", hostname: "127.0.0.1", port: "*", pathname: "/**" },
      { protocol: "https", hostname: "127.0.0.1", port: "*", pathname: "/**" },
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
      { protocol: "https", hostname: "*.supabase.in", pathname: "/storage/v1/object/public/**" },
    ],
    // Prioritize modern formats for better compression
    formats: ['image/avif', 'image/webp'],
    // ✅ PERFORMANCE: Extended cache TTL for better browser caching
    minimumCacheTTL: 31536000, // 1 year for template images (they rarely change)
    // Optimized device sizes for template thumbnails and previews
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    // Template-specific image sizes for thumbnails
    imageSizes: [160, 240, 320, 480, 640], // Optimized for template card sizes
    // Enable SVG support for icons and simple graphics
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    // ✅ PERFORMANCE: Disable image optimization for local development speed
    unoptimized: process.env.NODE_ENV === 'development',
  },
  // Production optimizations
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  // Remove console.log in production (keep error and warn)
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'], // Keep errors and warnings for debugging
    } : false,
  },
  // Optimize bundle size
  experimental: {
    optimizePackageImports: [
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      '@radix-ui/react-avatar',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-label',
      '@radix-ui/react-separator',
      '@radix-ui/react-slot',
      '@radix-ui/react-tabs',
      '@radix-ui/react-toggle',
      '@radix-ui/react-toggle-group',
      '@radix-ui/react-tooltip',
      '@tabler/icons-react',
      'lucide-react',
      'framer-motion',
      'recharts',
    ],
  },
  // Prevent build manifest errors
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
  // Reduce file system issues on Windows
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
        ignored: /node_modules/,
      };
    }
    return config;
  },
};

export default bundleAnalyzer(nextConfig);
