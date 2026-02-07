import { expect, test, type Page } from "@playwright/test";

async function blockNoisyNetworkCalls(page: Page) {
  // E2E smoke shouldn't depend on RPC providers or WalletConnect endpoints.
  await page.route("**/rpc/**", (route) => route.abort());
  await page.route("https://rpc.ubq.fi/**", (route) => route.abort());
}

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

  // Do not attempt to connect; just assert a visible entry point exists.
  await expect(page.getByRole("button", { name: /connect/i })).toBeVisible();
});
