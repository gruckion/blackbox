import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    globals: true,
    testTimeout: 30_000,
  },
  resolve: {
    alias: {
      "@blackbox/shared": resolve(__dirname, "packages/shared/dist/index.js"),
      "@blackbox/capture": resolve(__dirname, "packages/capture/dist/index.js"),
      "@blackbox/replay": resolve(__dirname, "packages/replay/dist/index.js"),
      "@blackbox/evaluate": resolve(__dirname, "packages/evaluate/dist/index.js"),
      "@blackbox/improve": resolve(__dirname, "packages/improve/dist/index.js"),
      "@blackbox/pr-generator": resolve(__dirname, "packages/pr-generator/dist/index.js"),
    },
  },
});
