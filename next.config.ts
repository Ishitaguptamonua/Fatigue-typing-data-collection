import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fix for Prisma engines being pruned during Vercel builds
  outputFileTracingIncludes: {
    '/api/**/*': ['./node_modules/.prisma/client/**/*'],
  },
  // Suppress experimental version warnings if any persist
  reactStrictMode: true,
};

export default nextConfig;
