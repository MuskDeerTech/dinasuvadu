import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Only lint these directories
    dirs: ["src"],
    // Skip linting during build (temporary workaround to isolate the issue)
    ignoreDuringBuilds: false,
  },
  experimental: {
    useCache: true, // Enables the 'use cache' directive
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
};

export default nextConfig;