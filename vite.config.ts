import { defineConfig } from "vitest/config";

// Relative base so the built site works when served from any subpath
// (e.g. apps.charliekrug.com/fit-check), not just domain root.
export default defineConfig({
  base: "./",
  build: {
    // Emit the self-contained servable site (app + below-fold SEO copy).
    outDir: "site",
    emptyOutDir: true,
  },
  test: {
    environment: "node",
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/main.ts"],
      reporter: ["text", "html"],
      // Guard the QA bar: fail the run if coverage regresses below these.
      // Set with margin under the current numbers so they catch real drops.
      thresholds: {
        lines: 92,
        statements: 92,
        branches: 85,
        functions: 85,
      },
    },
  },
});
