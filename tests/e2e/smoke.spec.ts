import { expect, test } from "@playwright/test";

test("loads-homepage", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/Stake|Ubiquity/i);
  await expect(page.getByRole("heading", { name: /Ubiquity Staking/i })).toBeVisible();
  await expect(page.locator("#root")).toBeVisible();
});

test("connect-wallet-visible", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("button", { name: /Connect Wallet/i })).toBeVisible();
});
