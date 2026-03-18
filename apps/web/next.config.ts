import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

// CSP is now set dynamically in middleware.ts with per-request nonce
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

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
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: "knkchn",
  project: "javascript-nextjs",
  silent: !process.env.CI,
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
  tunnelRoute: "/monitoring",
});
