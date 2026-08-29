import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['pdf-parse'],
  turbopack: {
    resolveAlias: {
      canvas: './empty-module.ts',
    },
  },
};

export default nextConfig;
