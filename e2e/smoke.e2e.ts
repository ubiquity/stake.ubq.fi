import { expect, test } from "@playwright/test";

test("loads-homepage", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/stake|ubiquity/i);
  await expect(page.getByRole("heading", { name: /ubiquity\s+staking/i })).toBeVisible();
});

test("connect-wallet-visible", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("button", { name: /connect wallet/i })).toBeVisible();
});
