import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optimize images
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost", port: "*", pathname: "/**" },
      { protocol: "https", hostname: "localhost", port: "*", pathname: "/**" },
      { protocol: "http", hostname: "127.0.0.1", port: "*", pathname: "/**" },
      { protocol: "https", hostname: "127.0.0.1", port: "*", pathname: "/**" },
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
      { protocol: "https", hostname: "*.supabase.in", pathname: "/storage/v1/object/public/**" },
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Enable image optimization
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
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
    // Enable SWC minification for better performance
    swcMinify: true,
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

export default nextConfig;
