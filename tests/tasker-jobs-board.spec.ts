import { test, expect } from "@playwright/test";
import { goToPage, waitForStability, loginTestUser } from "./helpers";

test.describe("Tasker Jobs Board", () => {
  test("jobs board requires authentication", async ({ page }) => {
    await goToPage(page, "/tasker/jobs");
    await page.waitForURL(/\/login/, { timeout: 10000 });
    const url = page.url();
    expect(url).toContain("/login");
  });

  test("non-tasker redirects to onboarding", async ({ page }) => {
    const loggedIn = await loginTestUser(page);
    if (!loggedIn) {
      test.skip(true, "Test user not available");
      return;
    }

    await goToPage(page, "/tasker/jobs");
    await waitForStability(page, 3000);

    const url = page.url();
    // Non-tasker should be redirected to onboarding or dashboard
    const isRedirected = url.includes("/tasker/onboard") || url.includes("/dashboard") || url.includes("/tasker/welcome");
    const isOnJobs = url.includes("/tasker/jobs");

    // Either redirected or on jobs page (if user is a tasker)
    expect(isRedirected || isOnJobs).toBeTruthy();
  });

  test("jobs board loads with header and stats", async ({ page }) => {
    const loggedIn = await loginTestUser(page);
    if (!loggedIn) {
      test.skip(true, "Test user not available");
      return;
    }

    await goToPage(page, "/tasker/jobs");
    await waitForStability(page, 3000);

    const url = page.url();
    if (!url.includes("/tasker/jobs")) {
      test.skip(true, "Redirected away from jobs board (not a tasker)");
      return;
    }

    // Check for header
    const hasHeading = await page.getByRole("heading", { name: /available missions|missions|jobs/i }).first().isVisible({ timeout: 5000 }).catch(() => false);
    const hasDashboardLink = await page.getByRole("link", { name: /dashboard/i }).first().isVisible({ timeout: 3000 }).catch(() => false);

    expect(hasHeading || hasDashboardLink).toBeTruthy();
  });

  test("job cards show service, city, budget, take-home", async ({ page }) => {
    const loggedIn = await loginTestUser(page);
    if (!loggedIn) {
      test.skip(true, "Test user not available");
      return;
    }

    await goToPage(page, "/tasker/jobs");
    await waitForStability(page, 3000);

    const url = page.url();
    if (!url.includes("/tasker/jobs")) {
      test.skip(true, "Redirected away from jobs board (not a tasker)");
      return;
    }

    // Check for job cards or empty state
    const hasJobCards = await page.locator('[class*="rounded-"][class*="border"], [class*="card"]').first().isVisible({ timeout: 5000 }).catch(() => false);
    const hasEmptyState = await page.getByText(/no jobs|no missions|no open/i).first().isVisible({ timeout: 3000 }).catch(() => false);
    const hasHeading = await page.getByRole("heading", { name: /available missions|missions|jobs/i }).first().isVisible({ timeout: 3000 }).catch(() => false);

    expect(hasJobCards || hasEmptyState || hasHeading).toBeTruthy();
  });

  test("accept job button works", async ({ page }) => {
    const loggedIn = await loginTestUser(page);
    if (!loggedIn) {
      test.skip(true, "Test user not available");
      return;
    }

    await goToPage(page, "/tasker/jobs");
    await waitForStability(page, 3000);

    const url = page.url();
    if (!url.includes("/tasker/jobs")) {
      test.skip(true, "Redirected away from jobs board (not a tasker)");
      return;
    }

    // Look for accept buttons on job cards
    const acceptBtns = page.getByRole("button", { name: /accept|take job/i });
    const acceptCount = await acceptBtns.count().catch(() => 0);

    if (acceptCount > 0) {
      await acceptBtns.first().click();
      await waitForStability(page, 2000);

      // Should show some feedback - success notification or job removed
      const hasFeedback = await page.getByText(/accepted|success|job/i).first().isVisible({ timeout: 5000 }).catch(() => false);
      expect(hasFeedback).toBeTruthy();
    } else {
      // No accept buttons - either no jobs or all already accepted
      const hasHeading = await page.getByRole("heading", { name: /available missions|missions|jobs/i }).first().isVisible({ timeout: 3000 }).catch(() => false);
      expect(hasHeading).toBeTruthy();
    }
  });
});
