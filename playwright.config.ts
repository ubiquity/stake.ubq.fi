import { defineConfig, devices } from "@playwright/test";

const isCI = !!process.env.CI;
const e2eModeRaw = process.env.E2E_MODE ?? "preview";
const e2eMode = e2eModeRaw === "dev" || e2eModeRaw === "preview" ? e2eModeRaw : undefined;
if (!e2eMode) {
  throw new Error(`Invalid E2E_MODE: ${e2eModeRaw}. Expected "dev" or "preview".`);
}

const defaultHost = process.env.PLAYWRIGHT_BASE_HOST ?? "127.0.0.1";
const serverHost = process.env.PLAYWRIGHT_HOST ?? (isCI ? "0.0.0.0" : defaultHost);
const defaultPort = e2eMode === "dev" ? 5173 : 4173;
const port = Number(process.env.PLAYWRIGHT_PORT ?? defaultPort);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://${defaultHost}:${port}`;

const webServerCommand =
  e2eMode === "dev"
    ? `bun x --bun vite --mode dev --host ${serverHost} --port ${port} --strictPort`
    : `bun run build && bun x --bun vite preview --host ${serverHost} --port ${port} --strictPort`;

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
    command: webServerCommand,
    url: baseURL,
    reuseExistingServer: !isCI,
    timeout: 120000,
    env: {
      NODE_ENV: e2eMode === "dev" ? "development" : "production",
    },
  },
});
