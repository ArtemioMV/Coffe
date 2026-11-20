import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

// Integración: servicios reales contra un PostgreSQL embebido y efímero (sin Docker ni datos de desarrollo).
export default defineConfig({
  resolve: { alias: { "@": resolve("apps/web/src") } },
  test: {
    include: ["tests/integration/**/*.test.ts"],
    environment: "node",
    globalSetup: ["tests/integration/global-setup.ts"],
    setupFiles: ["tests/integration/setup-env.ts"],
    pool: "forks",
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 180_000
  }
});
