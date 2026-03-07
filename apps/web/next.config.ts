import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@forsety/ui", "@forsety/db", "@forsety/auth"],
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

    // Suppress wallet-stack module warnings (MetaMask SDK has React Native deps,
    // pino optionally requires pino-pretty which is not installed)
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      { module: /@react-native-async-storage/ },
      { module: /@metamask\/sdk/ },
      { module: /pino/ },
    ];

    return config;
  },
};

export default nextConfig;
