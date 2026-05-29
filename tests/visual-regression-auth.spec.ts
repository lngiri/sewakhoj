import { test, expect } from "@playwright/test";
import { goToPage, loginTestUser } from "./helpers";

// ─── Visual Regression Tests — Auth-Gated Pages ───
// Generate/update baseline snapshots with: npx playwright test --update-snapshots
//
// These pages require an authenticated session. The test attempts to log in
// with the test user credentials. If login fails (test user not provisioned),
// the test is skipped gracefully.
//
// Dashboards display dynamic user-specific data (bookings, earnings, stats)
// which will vary between environments, so snapshot diffs are expected when
// data changes. The primary value is catching layout/structural regressions.

test.describe("Visual Regression — Dashboard (Customer View)", () => {
  test("dashboard overview with sidebar and stats", async ({ page }) => {
    const loggedIn = await loginTestUser(page);
    if (!loggedIn) {
      test.skip(true, "Test user login failed — user may not be provisioned");
      return;
    }

    // Navigate to dashboard
    await goToPage(page, "/dashboard");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Verify the page actually rendered before taking a screenshot
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });

    await expect(page).toHaveScreenshot("dashboard-customer-overview.png", {
      fullPage: true,
      animations: "disabled",
      maxDiffPixelRatio: 0.02,
    });
  });

  test("dashboard tasks section", async ({ page }) => {
    const loggedIn = await loginTestUser(page);
    if (!loggedIn) {
      test.skip(true, "Test user login failed");
      return;
    }

    await goToPage(page, "/dashboard");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Navigate to tasks section via section query param
    await page.goto("/dashboard?section=tasks");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });

    await expect(page).toHaveScreenshot("dashboard-customer-tasks.png", {
      fullPage: true,
      animations: "disabled",
      maxDiffPixelRatio: 0.02,
    });
  });

  test("dashboard profile settings section", async ({ page }) => {
    const loggedIn = await loginTestUser(page);
    if (!loggedIn) {
      test.skip(true, "Test user login failed");
      return;
    }

    await goToPage(page, "/dashboard");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Navigate to profile section
    await page.goto("/dashboard?section=profile");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });

    await expect(page).toHaveScreenshot("dashboard-customer-profile.png", {
      fullPage: true,
      animations: "disabled",
      maxDiffPixelRatio: 0.02,
    });
  });
});
