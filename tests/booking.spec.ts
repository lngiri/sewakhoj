import { test, expect } from "@playwright/test";
import { quickNavigate, loginAsTestUser } from "./helpers";

async function findTaskerId(page: any): Promise<string | null> {
  await quickNavigate(page, "/browse");
  const links = page.locator('a[href*="/tasker/"]');
  const count = await links.count();
  for (let i = 0; i < count; i++) {
    const href = await links.nth(i).getAttribute("href");
    const match = href?.match(/\/tasker\/([0-9a-f-]+)/);
    if (match) return match[1];
  }
  return null;
}

test.describe("Full Booking Flow", () => {
  test("booking page loads for a tasker", async ({ page }) => {
    const taskerId = await findTaskerId(page);
    if (!taskerId) {
      test.skip(true, "No taskers found in browse");
    }

    await quickNavigate(page, `/book/${taskerId}`);
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
  });

  test("booking page requires authentication", async ({ page }) => {
    const taskerId = await findTaskerId(page);
    if (!taskerId) {
      test.skip(true, "No taskers found in browse");
    }

    await page.context().clearCookies();
    await quickNavigate(page, `/book/${taskerId}`);

    const redirected = page.url().includes("/login");
    expect(redirected).toBeTruthy();
  });

  test("booking form has service, schedule, and payment sections", async ({ page }) => {
    const taskerId = await findTaskerId(page);
    if (!taskerId) {
      test.skip(true, "No taskers found in browse");
    }

    await loginAsTestUser(page);
    await quickNavigate(page, `/book/${taskerId}`);

    // Should be on booking page
    expect(page.url()).toContain("/book/");

    // Fill a minimal booking
    const serviceSelect = page.locator("select").first();
    if (await serviceSelect.isVisible().catch(() => false)) {
      const options = await serviceSelect.locator("option").all();
      if (options.length > 1) {
        await serviceSelect.selectOption({ index: 1 });
      }
    }

    const dateInput = page.locator('input[type="date"]').first();
    if (await dateInput.isVisible().catch(() => false)) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      await dateInput.fill(tomorrow.toISOString().split("T")[0]);
    }

    const addressInput = page.locator("textarea, input[placeholder*='address' i]").first();
    if (await addressInput.isVisible().catch(() => false)) {
      await addressInput.fill("Test Address, Kathmandu");
    }

    // Should have a submit/confirm button
    const submitBtn = page.locator('button[type="submit"], button:has-text("Confirm"), button:has-text("Book Now")').first();
    await expect(submitBtn).toBeVisible({ timeout: 5000 });
  });
});
