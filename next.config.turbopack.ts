import type { NextConfig } from "next";

// Alternative config for Turbopack (if you want to use it)
// This config has optimizations to reduce ENOENT errors
const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost", port: "*", pathname: "/**" },
      { protocol: "https", hostname: "localhost", port: "*", pathname: "/**" },
      { protocol: "http", hostname: "127.0.0.1", port: "*", pathname: "/**" },
      { protocol: "https", hostname: "127.0.0.1", port: "*", pathname: "/**" },
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
  },
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: [
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      '@tabler/icons-react',
      'lucide-react',
      'framer-motion',
    ],
    // Turbopack specific optimizations
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
};

export default nextConfig;

