import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@forsety/ui", "@forsety/sdk"],
};

export default nextConfig;
