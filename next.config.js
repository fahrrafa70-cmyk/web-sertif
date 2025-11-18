/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true, // ⛔ Disable ESLint during build
  },
  typescript: {
    ignoreBuildErrors: true,  // ⛔ Ignore TypeScript errors during build
  },
};

module.exports = nextConfig;
