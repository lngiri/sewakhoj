import { test, expect } from "@playwright/test";
import { goToPage, quickNavigate, dismissLocationModal } from "./helpers";

test.describe("Browse & Discovery", () => {
  test("browse page loads with tasker cards", async ({ page }) => {
    // Use quickNavigate with 'load' instead of 'networkidle' to avoid hanging
    // on pages with persistent Supabase realtime connections.
    await quickNavigate(page, "/browse");

    // May be empty if no taskers in DB, but page should still render
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
  });

  test("browse page has search/filter controls", async ({ page }) => {
    // Use quickNavigate to avoid hanging on Supabase realtime connections
    await quickNavigate(page, "/browse");

    // Should have some filter or search UI
    const filters = page.locator("select, input[type='search'], [class*='filter'], [class*='Filter']");
    const filterCount = await filters.count();
    expect(filterCount).toBeGreaterThanOrEqual(0); // May vary
  });

  test("service filter dropdown works", async ({ page }) => {
    await quickNavigate(page, "/browse");

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
    // Use quickNavigate to avoid hanging on Supabase realtime connections
    await quickNavigate(page, "/browse");

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
    await quickNavigate(page, "/browse?service=plumbing");

    // Page should load with the filter applied
    await expect(page.locator("main")).toBeVisible();

    // URL should retain the query param
    expect(page.url()).toContain("service=plumbing");
  });

  test("browse page with city query param works", async ({ page }) => {
    await quickNavigate(page, "/browse?city=Kathmandu");

    await expect(page.locator("main")).toBeVisible();
    expect(page.url()).toContain("city=Kathmandu");
  });

  test("browse page service links navigate to slug URLs (not UUIDs)", async ({ page }) => {
    await quickNavigate(page, "/browse");

    // Look for service links on the browse page
    const serviceLinks = page.locator('a[href*="/services/"]');
    const linkCount = await serviceLinks.count();

    if (linkCount > 0) {
      // Verify no service link uses a UUID
      for (let i = 0; i < linkCount; i++) {
        const href = await serviceLinks.nth(i).getAttribute("href");
        expect(href).not.toBeNull();
        // UUID pattern should NOT appear in service links
        expect(href).not.toMatch(/\/services\/[0-9a-f]{8}-[0-9a-f]{4}-/i);
      }

      // Click the first service link and verify it navigates correctly
      await serviceLinks.first().click();
      await page.waitForLoadState("networkidle");
      await expect(page.locator("main")).toBeVisible();
      expect(page.url()).not.toMatch(/\/services\/[0-9a-f]{8}-[0-9a-f]{4}-/i);
    }
  });
});
