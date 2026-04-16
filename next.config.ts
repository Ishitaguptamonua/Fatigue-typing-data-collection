import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Use external packages for native modules and Prisma
  serverExternalPackages: ['ws', '@prisma/client'],
  outputFileTracingIncludes: {
    '/api/**/*': ['./node_modules/.prisma/client/**/*'],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  reactStrictMode: true,
};

export default nextConfig;
