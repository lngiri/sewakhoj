import { test, expect } from "@playwright/test";
import { goToPage, loginAsTestUser, waitForAdminReady, isUserAdmin } from "./helpers";

test.describe("Admin Authentication & Access Control", () => {
  test("admin redirects to login when unauthenticated", async ({ page }) => {
    await page.context().clearCookies();
    await goToPage(page, "/admin/taskers");
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

  test("admin sidebar has expected navigation links", async ({ page }) => {
    await loginAsTestUser(page);
    await goToPage(page, "/admin/taskers");
    await waitForAdminReady(page);
    if (!(await isUserAdmin(page))) { test.skip(true, "Test user lacks admin access"); }

    const sidebar = page.locator("aside").first();
    await expect(sidebar).toBeVisible({ timeout: 5000 });
    await expect(sidebar.getByRole("link", { name: /taskers kyc/i })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: /user directory/i })).toBeVisible();
  });

  test("admin header shows notification bell", async ({ page }) => {
    await loginAsTestUser(page);
    await goToPage(page, "/admin/taskers");
    await waitForAdminReady(page);
    if (!(await isUserAdmin(page))) { test.skip(true, "Test user lacks admin access"); }

    const bell = page.locator("button").filter({ has: page.locator("svg.lucide-bell") }).first();
    await expect(bell).toBeVisible({ timeout: 5000 });
  });

  test("admin /admin redirects to /admin/taskers", async ({ page }) => {
    await loginAsTestUser(page);
    await goToPage(page, "/admin");
    await waitForAdminReady(page);
    if (!(await isUserAdmin(page))) { test.skip(true, "Test user lacks admin access"); }

    await expect(page).toHaveURL(/\/admin\/taskers/, { timeout: 5000 });
  });
});
