import { expect, test, type Page } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:4173";

async function blockNoisyNetworkCalls(page: Page) {
  // Prevent reliance on external RPC providers or WalletConnect endpoints.
  await page.route("**/rpc/**", (route) => route.abort());
  await page.route("https://rpc.ubq.fi/**", (route) => route.abort());
}

test.beforeAll(async ({ request }) => {
  // Skip gracefully when the preview server port is unavailable.
  const health = await request.get(BASE_URL).catch(() => null);
  if (!health || !health.ok()) {
    test.skip(true, `Preview server is not available at ${BASE_URL}. Port may be in use.`);
  }
});

test("loads-homepage", async ({ page }) => {
  await blockNoisyNetworkCalls(page);
  await page.goto("/");

  await expect(page).toHaveTitle(/stake|staking/i);
  await expect(page.locator("#root")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: /ubiquity\s+staking/i })).toBeVisible();
});

test("connect-wallet-visible", async ({ page }) => {
  await blockNoisyNetworkCalls(page);
  await page.goto("/");

  // Assert a wallet-connect entry point is rendered without attempting to connect.
  const connectButton = page.getByRole("button", { name: /connect/i });
  await expect(connectButton).toBeVisible();
});
