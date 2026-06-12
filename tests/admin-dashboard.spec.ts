import { test, expect } from "@playwright/test";
import { goToPage, loginAsTestUser, waitForAdminReady, isUserAdmin } from "./helpers";

test.describe("Admin Tasker Dashboard", () => {
  test("tasker registry loads with heading", async ({ page }) => {
    await loginAsTestUser(page);
    await goToPage(page, "/admin/taskers");
    await waitForAdminReady(page);
    if (!(await isUserAdmin(page))) { test.skip(true, "Test user lacks admin access"); }

    await expect(page.getByText(/tasker registry/i).first()).toBeAttached({ timeout: 15000 });
  });

  test("tasker page has status filter tabs", async ({ page }) => {
    await loginAsTestUser(page);
    await goToPage(page, "/admin/taskers");
    await waitForAdminReady(page);
    if (!(await isUserAdmin(page))) { test.skip(true, "Test user lacks admin access"); }

    await expect(page.getByRole("button", { name: /all taskers/i })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("button", { name: /pending/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /active/i })).toBeVisible();
  });

  test("tasker page has search input", async ({ page }) => {
    await loginAsTestUser(page);
    await goToPage(page, "/admin/taskers");
    await waitForAdminReady(page);
    if (!(await isUserAdmin(page))) { test.skip(true, "Test user lacks admin access"); }

    const search = page.locator('input[placeholder*="Search" i]');
    await expect(search).toBeAttached({ timeout: 15000 });
  });
});
