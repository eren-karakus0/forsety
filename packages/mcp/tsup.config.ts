import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  noExternal: ["@forsety/db"],
  banner: {
    js: "#!/usr/bin/env node",
  },
});
