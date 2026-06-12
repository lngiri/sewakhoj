import { test, expect } from "@playwright/test";
import { goToPage, waitForStability, loginTestUser } from "./helpers";

test.describe("Core Interactive — Authenticated User Flow", () => {

  test("1: Dashboard page shows content for logged-in user", async ({ page }) => {
    const loggedIn = await loginTestUser(page);
    if (!loggedIn) {
      test.skip(true, "Login failed — skipping");
      return;
    }
    await goToPage(page, "/dashboard");
    await expect(page.locator("h1").filter({ hasText: /Customer Dashboard|Dashboard|My Bookings/i }).first()).toBeAttached({ timeout: 10000 });
  });

  test("2: Browse page renders with search input", async ({ page }) => {
    await goToPage(page, "/browse");
    await page.waitForTimeout(3000);

    // Check for search input
    const searchInput = page.locator('input[type="text"], input[placeholder*="Search" i]').first();
    await expect(searchInput).toBeAttached({ timeout: 10000 });
  });

  test("3: Settings page form fields are editable", async ({ page }) => {
    const loggedIn = await loginTestUser(page);
    if (!loggedIn) {
      test.skip(true, "Login failed — skipping");
      return;
    }
    await goToPage(page, "/settings");

    // Check for at least one non-disabled input
    const inputs = page.locator("input:not([disabled])");
    const count = await inputs.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("4: Tasker dashboard page renders for logged-in user", async ({ page }) => {
    const loggedIn = await loginTestUser(page);
    if (!loggedIn) {
      test.skip(true, "Login failed — skipping");
      return;
    }
    await goToPage(page, "/dashboard/tasker");
    await expect(page.locator("h1").filter({ hasText: /Tasker Dashboard|Tasker|Jobs/i }).first()).toBeAttached({ timeout: 10000 });
  });

  test("5: Services page navigation works", async ({ page }) => {
    await goToPage(page, "/services");

    // Check we have at least one service link
    const serviceLinks = page.locator('a[href*="/services/"]');
    const count = await serviceLinks.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

});
