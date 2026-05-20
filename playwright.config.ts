import { defineConfig, devices } from "@playwright/test";

const isCI = !!process.env.CI;
const e2eMode = process.env.E2E_MODE === "dev" ? "dev" : "preview";
const defaultHost = process.env.PLAYWRIGHT_BASE_HOST ?? "127.0.0.1";
const serverHost = process.env.PLAYWRIGHT_HOST ?? (isCI ? "0.0.0.0" : defaultHost);
const port = Number(process.env.PLAYWRIGHT_PORT ?? (e2eMode === "dev" ? 5173 : 4173));
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://${defaultHost}:${port}`;
const webServerCommand =
  e2eMode === "dev"
    ? `bun run dev -- --host ${serverHost} --port ${port} --strictPort`
    : `bun run build && bun x vite preview --host ${serverHost} --port ${port} --strictPort`;

export default defineConfig({
  testDir: "tests/e2e",
  testMatch: "**/*.spec.ts",
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
    command: webServerCommand,
    url: baseURL,
    reuseExistingServer: !isCI,
    timeout: 120000,
    env: {
      NODE_ENV: "production",
    },
  },
});
