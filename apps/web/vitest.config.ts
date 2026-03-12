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
  },
});
