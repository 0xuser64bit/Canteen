import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname),
      // Next.js resolves this marker itself; outside Next it is a no-op.
      "server-only": path.resolve(import.meta.dirname, "test/server-only.ts"),
    },
  },
  test: {
    env: {
      BETTER_AUTH_SECRET: "test-only-canteen-secret-never-use-in-production",
    },
  },
});
