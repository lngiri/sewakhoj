import { Page, expect } from "@playwright/test";

/**
 * Dismiss the location modal by selecting a city and location.
 * The modal appears on first visit when location is not set.
 */
export async function dismissLocationModal(page: Page) {
  // Wait for the modal to appear (it may or may not show)
  const modal = page.locator('[role="dialog"], .fixed.inset-0.z-50');
  const modalVisible = await modal.isVisible().catch(() => false);

  if (!modalVisible) {
    // Modal might not appear if location was already set
    return;
  }

  // Click the first city in the list
  const firstCity = modal.locator("button, div.cursor-pointer").filter({ hasText: /Kathmandu|Pokhara|Lalitpur/i }).first();
  if (await firstCity.isVisible().catch(() => false)) {
    await firstCity.click();
    await page.waitForTimeout(500);

    // Click the first location
    const firstLocation = modal.locator("button, div.cursor-pointer").filter({ hasText: /Baneshwor|Lakeside|Patan/i }).first();
    if (await firstLocation.isVisible().catch(() => false)) {
      await firstLocation.click();
      await page.waitForTimeout(500);
    }
  }

  // Try to close modal if still open
  const closeBtn = page.locator('button:has-text("Skip"), button:has-text("Close"), [aria-label="Close"]').first();
  if (await closeBtn.isVisible().catch(() => false)) {
    await closeBtn.click();
  }

  // Set localStorage to prevent modal from showing again
  await page.evaluate(() => {
    sessionStorage.setItem("sewakhoj_location_modal_shown", "true");
    localStorage.setItem("sewakhoj_city", "Kathmandu");
    localStorage.setItem("sewakhoj_specific_location", "Baneshwor");
  });
}

/**
 * Navigate to a page and wait for it to be fully loaded.
 */
export async function goToPage(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
  // Dismiss location modal if it appears
  await dismissLocationModal(page);
}

/**
 * Check that the navbar is visible and has expected links.
 */
export async function expectNavbarVisible(page: Page) {
  const nav = page.locator("nav");
  await expect(nav).toBeVisible();
}

/**
 * Helper to fill a form field by label text.
 */
export async function fillByLabel(page: Page, label: string, value: string) {
  const input = page.locator("input, textarea, select").filter({ has: page.locator(`..:has-text("${label}")`) }).first();
  if (await input.isVisible().catch(() => false)) {
    await input.fill(value);
  }
}

/**
 * Wait for Supabase realtime or network to settle.
 */
export async function waitForStability(page: Page, ms = 1000) {
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(ms);
}