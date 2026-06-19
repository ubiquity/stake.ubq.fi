import { defineConfig, devices } from "@playwright/test";

const isCI = !!process.env.CI;
const e2eMode = process.env.E2E_MODE ?? "preview";

if (e2eMode !== "dev" && e2eMode !== "preview") {
  throw new Error("E2E_MODE must be either 'dev' or 'preview'.");
}

const defaultHost = process.env.PLAYWRIGHT_BASE_HOST ?? "127.0.0.1";
const serverHost = process.env.PLAYWRIGHT_HOST ?? (isCI ? "0.0.0.0" : defaultHost);
const port = Number(process.env.PLAYWRIGHT_PORT ?? (e2eMode === "dev" ? 5173 : 4173));
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://${defaultHost}:${port}`;
const viteCommand = "node ./node_modules/vite/bin/vite.js";
const previewCommand = `${viteCommand} build --mode prod && ${viteCommand} preview --host ${serverHost} --port ${port} --strictPort`;
const devCommand = `${viteCommand} --mode dev --host ${serverHost} --port ${port} --strictPort`;

export default defineConfig({
  testDir: "e2e",
  testMatch: "**/*.e2e.ts",
  fullyParallel: false,
  retries: isCI ? 1 : 0,
  reporter: isCI ? [["github"], ["line"]] : "list",
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        baseURL,
        trace: "retain-on-failure",
      },
    },
  ],
  webServer: {
    command: e2eMode === "dev" ? devCommand : previewCommand,
    url: baseURL,
    reuseExistingServer: !isCI,
    timeout: 120000,
    env: e2eMode === "preview" ? { NODE_ENV: "production" } : undefined,
  },
});
