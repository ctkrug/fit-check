import { defineConfig } from "vite";

// Relative base so the built site works when served from any subpath
// (e.g. apps.charliekrug.com/fit-check), not just domain root.
export default defineConfig({
  base: "./",
  build: {
    outDir: "dist",
  },
  test: {
    environment: "node",
  },
});
