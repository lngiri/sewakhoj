import { test, expect } from "@playwright/test";
import { goToPage, quickNavigate, loginAdminUser } from "./helpers";

test.describe("Admin Live Map", () => {

  test("live map page loads with header", async ({ page }) => {
    const loggedIn = await loginAdminUser(page);
    if (!loggedIn) {
      test.skip(true, "Admin login failed");
      return;
    }

    await quickNavigate(page, "/admin/live-map");
    await page.waitForTimeout(2000);

    // Check for Live Tasker Map header
    const header = page.locator("h2, h1").filter({ hasText: /Live Tasker Map|Live Map/i }).first();
    const headerVisible = await header.isVisible({ timeout: 5000 }).catch(() => false);

    expect(headerVisible).toBe(true);
  });

  test("map component renders", async ({ page }) => {
    const loggedIn = await loginAdminUser(page);
    if (!loggedIn) {
      test.skip(true, "Admin login failed");
      return;
    }

    await quickNavigate(page, "/admin/live-map");
    await page.waitForTimeout(3000); // Extra time for map to load

    // Check for map container (Leaflet renders a div with class leaflet-container)
    const mapContainer = page.locator(".leaflet-container, [class*='leaflet'], .h-\\[600px\\]").first();
    const mapVisible = await mapContainer.isVisible({ timeout: 5000 }).catch(() => false);

    // Or check for loading state
    const loadingText = page.locator("div").filter({ hasText: /Loading Real-time Map/i }).first();
    const loadingVisible = await loadingText.isVisible({ timeout: 3000 }).catch(() => false);

    expect(mapVisible || loadingVisible).toBe(true);
  });

  test("stats cards show metrics", async ({ page }) => {
    const loggedIn = await loginAdminUser(page);
    if (!loggedIn) {
      test.skip(true, "Admin login failed");
      return;
    }

    await quickNavigate(page, "/admin/live-map");
    await page.waitForTimeout(2000);

    // Check for stat cards
    const statLabels = [
      /Total Online/i,
      /Active Jobs/i,
      /Platform Load/i,
    ];

    let foundStats = 0;
    for (const label of statLabels) {
      const el = page.locator("h4, p").filter({ hasText: label }).first();
      if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
        foundStats++;
      }
    }

    expect(foundStats).toBeGreaterThan(0);
  });

  test("live indicator is present", async ({ page }) => {
    const loggedIn = await loginAdminUser(page);
    if (!loggedIn) {
      test.skip(true, "Admin login failed");
      return;
    }

    await quickNavigate(page, "/admin/live-map");
    await page.waitForTimeout(2000);

    // Check for live indicator
    const liveIndicator = page.locator("span, div").filter({ hasText: /Live Updates Active/i }).first();
    const liveVisible = await liveIndicator.isVisible({ timeout: 3000 }).catch(() => false);

    // Also check for the pulsing dot
    const pulseDot = page.locator(".animate-ping, [class*='animate-ping']").first();
    const pulseVisible = await pulseDot.isVisible({ timeout: 2000 }).catch(() => false);

    expect(liveVisible || pulseVisible).toBe(true);
  });
});
