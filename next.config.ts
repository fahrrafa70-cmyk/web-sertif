import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost", port: "3000", pathname: "/**" },
      { protocol: "https", hostname: "localhost", port: "3000", pathname: "/**" },
      { protocol: "http", hostname: "127.0.0.1", port: "*", pathname: "/**" },
      { protocol: "https", hostname: "127.0.0.1", port: "*", pathname: "/**" },
    ],
  },
};

export default nextConfig;
