import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";

// Local test credentials for the demo login (next dev reads the same file).
if (existsSync(".env.development.local")) process.loadEnvFile(".env.development.local");

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  use: { baseURL: process.env.E2E_BASE_URL ?? "http://localhost:5181", trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : { command: "npm run dev -- --port 5181", port: 5181, reuseExistingServer: true, timeout: 120_000 },
});
