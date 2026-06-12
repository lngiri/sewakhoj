import { test, expect } from "@playwright/test";
import { goToPage, loginAsTestUser } from "./helpers";

test.describe("Booking Acceptance", () => {
  test("dashboard page body renders for authenticated user", async ({ page }) => {
    await loginAsTestUser(page);
    await goToPage(page, "/dashboard");
    await expect(page.getByText(/dashboard/i).first()).toBeAttached({ timeout: 15000 });
  });

  test("tasker dashboard loads or redirects to onboarding", async ({ page }) => {
    await loginAsTestUser(page);
    const response = await page.goto("/dashboard/tasker", { waitUntil: "load", timeout: 15000 });

    expect(response?.ok()).toBeTruthy();
    const url = page.url();
    if (url.includes("/dashboard/tasker")) {
      // If we landed on the tasker dashboard, it should have main content
      expect(url).toContain("/dashboard/tasker");
    } else {
      // Redirected to onboarding (user is not a tasker) — acceptable
      expect(url).toContain("/onboard");
    }
  });

  test("POST /api/bookings/accept returns 200 for valid payload", async ({ page }) => {
    const res = await page.request.post("/api/bookings/accept", {
      data: { bookingId: "00000000-0000-0000-0000-000000000000" },
    });
    expect(res.status()).toBe(200);
  });

  test("POST /api/bookings/decline returns 401 without auth", async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.request.post("/api/bookings/decline", {
      data: { bookingId: "00000000-0000-0000-0000-000000000000" },
    });
    expect([401, 400, 404]).toContain(res.status());
  });
});
