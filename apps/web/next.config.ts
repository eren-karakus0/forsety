import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@forsety/ui", "@forsety/db"],
  serverExternalPackages: [
    "@huggingface/transformers",
    "onnxruntime-node",
  ],
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      if (Array.isArray(config.externals)) {
        config.externals.push(
          "onnxruntime-node",
          "@huggingface/transformers"
        );
      }
    }
    return config;
  },
};

export default nextConfig;
