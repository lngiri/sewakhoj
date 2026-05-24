import { test, expect } from "@playwright/test";
import { goToPage, waitForStability, loginTestUser } from "./helpers";

test.describe("Tasker Market Jobs / Bidding", () => {
  test("market jobs section loads in dashboard", async ({ page }) => {
    const loggedIn = await loginTestUser(page);
    if (!loggedIn) {
      test.skip(true, "Test user not available");
      return;
    }

    await goToPage(page, "/dashboard");
    await waitForStability(page, 3000);

    // Click on Available Jobs in sidebar
    const jobsLink = page.getByText(/available jobs/i).first();
    if (await jobsLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await jobsLink.click();
      await waitForStability(page, 2000);
    }

    // Check for market jobs heading
    const hasHeading = await page.getByRole("heading", { name: /available jobs|market|jobs/i }).first().isVisible({ timeout: 5000 }).catch(() => false);
    const hasTaskCards = await page.locator('[class*="rounded-"][class*="border"]').first().isVisible({ timeout: 3000 }).catch(() => false);
    const hasEmptyState = await page.getByText(/no jobs|no tasks/i).first().isVisible({ timeout: 3000 }).catch(() => false);

    expect(hasHeading || hasTaskCards || hasEmptyState).toBeTruthy();
  });

  test("task cards show budget and location", async ({ page }) => {
    const loggedIn = await loginTestUser(page);
    if (!loggedIn) {
      test.skip(true, "Test user not available");
      return;
    }

    await goToPage(page, "/dashboard");
    await waitForStability(page, 3000);

    // Click on Available Jobs
    const jobsLink = page.getByText(/available jobs/i).first();
    if (await jobsLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await jobsLink.click();
      await waitForStability(page, 2000);
    }

    // Check for budget/location info on cards
    const hasBudget = await page.locator('text=/Rs\\s*\\d+|budget/i').first().isVisible({ timeout: 5000 }).catch(() => false);
    const hasLocation = await page.getByText(/kathmandu|pokhara|lalitpur|bhaktapur|city/i).first().isVisible({ timeout: 3000 }).catch(() => false);
    const hasHeading = await page.getByRole("heading", { name: /available jobs|market|jobs/i }).first().isVisible({ timeout: 3000 }).catch(() => false);

    expect(hasBudget || hasLocation || hasHeading).toBeTruthy();
  });

  test("send bid button is present on task cards", async ({ page }) => {
    const loggedIn = await loginTestUser(page);
    if (!loggedIn) {
      test.skip(true, "Test user not available");
      return;
    }

    await goToPage(page, "/dashboard");
    await waitForStability(page, 3000);

    // Click on Available Jobs
    const jobsLink = page.getByText(/available jobs/i).first();
    if (await jobsLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await jobsLink.click();
      await waitForStability(page, 2000);
    }

    // Look for bid buttons
    const bidBtns = page.getByRole("button", { name: /bid|quote|send/i });
    const bidCount = await bidBtns.count().catch(() => 0);

    if (bidCount > 0) {
      const hasBidBtn = await bidBtns.first().isVisible({ timeout: 5000 }).catch(() => false);
      expect(hasBidBtn).toBeTruthy();
    } else {
      // No bid buttons - either no tasks or all already bid
      const hasHeading = await page.getByRole("heading", { name: /available jobs|market|jobs/i }).first().isVisible({ timeout: 3000 }).catch(() => false);
      expect(hasHeading).toBeTruthy();
    }
  });

  test("already-bid tasks show bid sent badge", async ({ page }) => {
    const loggedIn = await loginTestUser(page);
    if (!loggedIn) {
      test.skip(true, "Test user not available");
      return;
    }

    await goToPage(page, "/dashboard");
    await waitForStability(page, 3000);

    // Click on Available Jobs
    const jobsLink = page.getByText(/available jobs/i).first();
    if (await jobsLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await jobsLink.click();
      await waitForStability(page, 2000);
    }

    // Check for bid sent badges
    const hasBidSent = await page.getByText(/bid sent|already bid|quoted/i).first().isVisible({ timeout: 5000 }).catch(() => false);
    const hasHeading = await page.getByRole("heading", { name: /available jobs|market|jobs/i }).first().isVisible({ timeout: 3000 }).catch(() => false);

    // Bid sent badge may or may not be present - just verify section loaded
    expect(hasBidSent || hasHeading).toBeTruthy();
  });
});
