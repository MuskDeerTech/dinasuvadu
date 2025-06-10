import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Only lint these directories
    dirs: ["src"],
    // Skip linting during build (temporary workaround to isolate the issue)
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;