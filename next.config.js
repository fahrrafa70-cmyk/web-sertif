/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true, // ⛔ Disable ESLint during build
  },
  typescript: {
    ignoreBuildErrors: true,  // ⛔ Ignore TypeScript errors during build
  },
  images: {
    remotePatterns: [
      { 
        protocol: "https", 
        hostname: "*.supabase.co", 
        pathname: "/storage/v1/object/public/**" 
      },
      { 
        protocol: "https", 
        hostname: "*.supabase.in", 
        pathname: "/storage/v1/object/public/**" 
      },
      { 
        protocol: "http", 
        hostname: "localhost", 
        port: "*", 
        pathname: "/**" 
      },
    ],
    formats: ['image/avif', 'image/webp'],
    unoptimized: process.env.NODE_ENV === 'development',
  },
  // Redirect /members to /data for backward compatibility
  async redirects() {
    return [
      {
        source: '/members',
        destination: '/data',
        permanent: true, // 301 redirect
      },
    ];
  },
};

module.exports = nextConfig;
