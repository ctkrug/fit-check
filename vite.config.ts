import { defineConfig } from "vitest/config";

// Relative base so the built site works when served from any subpath
// (e.g. apps.charliekrug.com/fit-check), not just domain root.
export default defineConfig({
  base: "./",
  build: {
    outDir: "dist",
  },
  test: {
    environment: "node",
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/main.ts"],
      reporter: ["text", "html"],
    },
  },
});
