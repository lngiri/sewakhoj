import { test, expect } from "@playwright/test";
import { goToPage, loginAsTestUser } from "./helpers";

test.describe("Booking Tracking", () => {
  test("tracking page requires authentication", async ({ page }) => {
    await page.context().clearCookies();
    await goToPage(page, "/booking/some-test-id/tracking");

    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

  test("authenticated user can access tracking for their bookings", async ({ page }) => {
    await loginAsTestUser(page);

    await goToPage(page, "/dashboard");

    // Look for a booking link
    const bookingLink = page.locator('a[href*="/tracking"]').first();
    const hasBooking = await bookingLink.isVisible({ timeout: 5000 }).catch(() => false);

    if (!hasBooking) {
      test.skip(true, "No bookings found for test user");
    }

    await bookingLink.click();
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
  });
});
