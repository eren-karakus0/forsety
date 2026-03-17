import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
      // next/server uses edge runtime APIs — mock in test
      "server-only": resolve(__dirname, "test/__mocks__/server-only.ts"),
    },
  },
  test: {
    include: ["test/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.d.ts",
        "src/**/types.ts",
        "src/app/layout.tsx",
        "src/app/page.tsx",
        "src/app/**/page.tsx",
      ],
      thresholds: {
        statements: 80,
        branches: 75,
      },
    },
  },
});
