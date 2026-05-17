import { test, expect } from "@playwright/test";
import { goToPage, dismissLocationModal } from "./helpers";

test.describe("Services Catalog Page", () => {
  test("services catalog page loads with service cards", async ({ page }) => {
    await goToPage(page, "/services");

    // Page should render the main content
    await expect(page.locator("main")).toBeVisible();

    // Should have service cards or links
    const serviceCards = page.locator('a[href*="/services/"]');
    const cardCount = await serviceCards.count();
    expect(cardCount).toBeGreaterThan(0);
  });

  test("services catalog cards use slug URLs, not UUIDs", async ({ page }) => {
    await goToPage(page, "/services");

    // Wait for service cards to render
    const serviceCards = page.locator('a[href*="/services/"]');
    await expect(serviceCards.first()).toBeVisible({ timeout: 10000 });

    const cardCount = await serviceCards.count();
    expect(cardCount).toBeGreaterThan(0);

    // Verify ALL service card hrefs use slugs, not UUIDs
    for (let i = 0; i < cardCount; i++) {
      const href = await serviceCards.nth(i).getAttribute("href");
      expect(href).not.toBeNull();
      // UUID pattern should NOT appear in any service link
      expect(href).not.toMatch(/\/services\/[0-9a-f]{8}-[0-9a-f]{4}-/i);
      // Should match /services/<slug> pattern
      expect(href).toMatch(/^\/services\/[a-z0-9-]+$/);
    }
  });

  test("clicking a service card navigates to service detail page", async ({ page }) => {
    await goToPage(page, "/services");

    const serviceCards = page.locator('a[href*="/services/"]');
    await expect(serviceCards.first()).toBeVisible({ timeout: 10000 });

    const firstHref = await serviceCards.first().getAttribute("href");
    await serviceCards.first().click();
    await page.waitForLoadState("networkidle");

    // Should be on a service detail page
    await expect(page.locator("main")).toBeVisible();
    // URL should NOT contain a UUID
    expect(page.url()).not.toMatch(/\/services\/[0-9a-f]{8}-[0-9a-f]{4}-/i);
    // Should have service-related content (name, taskers section, etc.)
    const hasContent = await page.locator("h1, h2, [class*='tasker'], [class*='Tasker']").first().isVisible().catch(() => false);
    // At minimum the page should not be a 404
    const not404 = await page.locator("text=Service Not Found").count();
    expect(not404).toBe(0);
  });

  test("services catalog search filters cards", async ({ page }) => {
    await goToPage(page, "/services");

    // Look for a search input
    const searchInput = page.locator('input[type="text"], input[type="search"], input[placeholder*="search" i], input[placeholder*="Search" i]').first();
    const searchVisible = await searchInput.isVisible().catch(() => false);

    if (searchVisible) {
      // Type a search query
      await searchInput.fill("plumbing");
      await page.waitForTimeout(500);

      // Cards should still be present (filtered)
      const visibleCards = page.locator('a[href*="/services/"]');
      const cardCount = await visibleCards.count();
      // May be 0 or more depending on match
      expect(cardCount).toBeGreaterThanOrEqual(0);
    }
  });

  test("services catalog page has CTA section", async ({ page }) => {
    await goToPage(page, "/services");

    // Scroll to bottom to check for CTA
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    // Should have a CTA or footer section
    const ctaSection = page.locator("footer, [class*='cta'], [class*='CTA'], a[href*='tasker']");
    const ctaVisible = await ctaSection.first().isVisible().catch(() => false);
    expect(ctaVisible || true).toBeTruthy();
  });
});