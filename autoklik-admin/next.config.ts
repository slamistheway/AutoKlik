import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.ADMIN_BUILD_DIR ?? '.next',
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
};

export default nextConfig;
