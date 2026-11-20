import { defineConfig } from "@playwright/test";
import "dotenv/config";
import { resolve } from "node:path";

process.env.PLAYWRIGHT_BROWSERS_PATH ||= resolve(".cache/playwright");

const baseURL = process.env.APP_ORIGIN || "http://localhost:3000";
if (!["localhost", "127.0.0.1"].includes(new URL(baseURL).hostname)) throw new Error("E2E solo permitido sobre origen local de desarrollo");
export default defineConfig({ testDir: "./tests/e2e", workers: 1, timeout: 60000, retries: 0, reporter: "list",
  use: { baseURL, viewport: { width: 1440, height: 1000 }, trace: "retain-on-failure" },
  webServer: { command: `node ../../node_modules/next/dist/bin/next dev --port ${new URL(baseURL).port || "3000"}`, cwd: resolve("apps/web"), url: `${baseURL}/api/v1/health`, reuseExistingServer: false, timeout: 120000 }
});
