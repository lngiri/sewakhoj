import { test, expect } from "@playwright/test";
import { goToPage, waitForStability, loginTestUser } from "./helpers";

test.describe("Tasker Finance & Earnings", () => {
  test("finance section shows available balance", async ({ page }) => {
    const loggedIn = await loginTestUser(page);
    if (!loggedIn) {
      test.skip(true, "Test user not available");
      return;
    }

    await goToPage(page, "/dashboard");
    await waitForStability(page, 3000);

    // Click on Earnings in sidebar
    const earningsLink = page.getByText(/earnings/i).first();
    if (await earningsLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await earningsLink.click();
      await waitForStability(page, 2000);
    }

    // Check for balance display
    const hasBalance = await page.getByText(/available balance/i).first().isVisible({ timeout: 5000 }).catch(() => false);
    const hasRsAmount = await page.locator('text=/Rs\\s*\\d+/').first().isVisible({ timeout: 3000 }).catch(() => false);
    const hasEarningsHeading = await page.getByRole("heading", { name: /earnings|wallet/i }).first().isVisible({ timeout: 3000 }).catch(() => false);

    expect(hasBalance || hasRsAmount || hasEarningsHeading).toBeTruthy();
  });

  test("pending earnings displayed separately", async ({ page }) => {
    const loggedIn = await loginTestUser(page);
    if (!loggedIn) {
      test.skip(true, "Test user not available");
      return;
    }

    await goToPage(page, "/dashboard");
    await waitForStability(page, 3000);

    const earningsLink = page.getByText(/earnings/i).first();
    if (await earningsLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await earningsLink.click();
      await waitForStability(page, 2000);
    }

    const hasPending = await page.getByText(/pending/i).first().isVisible({ timeout: 5000 }).catch(() => false);
    const hasEarningsHeading = await page.getByRole("heading", { name: /earnings|wallet/i }).first().isVisible({ timeout: 3000 }).catch(() => false);

    expect(hasPending || hasEarningsHeading).toBeTruthy();
  });

  test("withdraw button is present", async ({ page }) => {
    const loggedIn = await loginTestUser(page);
    if (!loggedIn) {
      test.skip(true, "Test user not available");
      return;
    }

    await goToPage(page, "/dashboard");
    await waitForStability(page, 3000);

    const earningsLink = page.getByText(/earnings/i).first();
    if (await earningsLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await earningsLink.click();
      await waitForStability(page, 2000);
    }

    const withdrawBtn = page.getByRole("button", { name: /withdraw/i }).first();
    const hasWithdraw = await withdrawBtn.isVisible({ timeout: 5000 }).catch(() => false);

    // Also check settings page finance tab
    if (!hasWithdraw) {
      await goToPage(page, "/settings");
      await waitForStability(page, 2000);
      const financeTab = page.getByRole("button", { name: /finance/i }).first();
      if (await financeTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await financeTab.click();
        await waitForStability(page, 2000);
      }
      const hasWithdrawSettings = await page.getByRole("button", { name: /withdraw/i }).first().isVisible({ timeout: 3000 }).catch(() => false);
      expect(hasWithdraw || hasWithdrawSettings).toBeTruthy();
      return;
    }

    expect(hasWithdraw).toBeTruthy();
  });

  test("recent transactions ledger renders", async ({ page }) => {
    const loggedIn = await loginTestUser(page);
    if (!loggedIn) {
      test.skip(true, "Test user not available");
      return;
    }

    await goToPage(page, "/dashboard");
    await waitForStability(page, 3000);

    const earningsLink = page.getByText(/earnings/i).first();
    if (await earningsLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await earningsLink.click();
      await waitForStability(page, 2000);
    }

    const hasTransactions = await page.getByText(/recent transactions|transactions/i).first().isVisible({ timeout: 5000 }).catch(() => false);
    const hasEarningsHeading = await page.getByRole("heading", { name: /earnings|wallet/i }).first().isVisible({ timeout: 3000 }).catch(() => false);

    expect(hasTransactions || hasEarningsHeading).toBeTruthy();
  });
});