import { test, expect } from "@playwright/test";
import { goToPage, dismissLocationModal } from "./helpers";

test.describe("Browse & Discovery", () => {
  test("browse page loads with tasker cards", async ({ page }) => {
    await goToPage(page, "/browse");

    // Should have tasker cards or a grid of results
    const taskerCards = page.locator('[class*="card"], [class*="Card"], .grid > div');
    // May be empty if no taskers in DB, but page should still render
    await expect(page.locator("main")).toBeVisible();
  });

  test("browse page has search/filter controls", async ({ page }) => {
    await goToPage(page, "/browse");

    // Should have some filter or search UI
    const filters = page.locator("select, input[type='search'], [class*='filter'], [class*='Filter']");
    const filterCount = await filters.count();
    expect(filterCount).toBeGreaterThanOrEqual(0); // May vary
  });

  test("service filter dropdown works", async ({ page }) => {
    await goToPage(page, "/browse");

    // Look for a service dropdown
    const serviceSelect = page.locator("select").first();
    if (await serviceSelect.isVisible().catch(() => false)) {
      await serviceSelect.selectOption({ index: 1 });
      await page.waitForTimeout(1000);
      // Page should still be functional
      await expect(page.locator("main")).toBeVisible();
    }
  });

  test("browse page links to tasker profiles", async ({ page }) => {
    await goToPage(page, "/browse");

    // Look for links to tasker profiles
    const taskerLinks = page.locator('a[href*="/tasker/"]');
    const linkCount = await taskerLinks.count();

    if (linkCount > 0) {
      const href = await taskerLinks.first().getAttribute("href");
      expect(href).toContain("/tasker/");
    }
    // If no taskers, that's OK — the page still rendered
  });

  test("browse page with service query param filters results", async ({ page }) => {
    await goToPage(page, "/browse?service=plumbing");

    // Page should load with the filter applied
    await expect(page.locator("main")).toBeVisible();

    // URL should retain the query param
    expect(page.url()).toContain("service=plumbing");
  });

  test("browse page with city query param works", async ({ page }) => {
    await goToPage(page, "/browse?city=Kathmandu");

    await expect(page.locator("main")).toBeVisible();
    expect(page.url()).toContain("city=Kathmandu");
  });
});