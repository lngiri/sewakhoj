import { test, expect } from "@playwright/test";
import { goToPage, loginAsTestUser, waitForAdminReady, isUserAdmin } from "./helpers";

test.describe("Admin Tasker KYC Management", () => {
  test("taskers page loads with registry header", async ({ page }) => {
    await loginAsTestUser(page);
    await goToPage(page, "/admin/taskers");
    await waitForAdminReady(page);
    if (!(await isUserAdmin(page))) { test.skip(true, "Test user lacks admin access"); }

    await expect(page.getByText(/tasker registry/i).first()).toBeAttached({ timeout: 15000 });
  });

  test("status tabs render", async ({ page }) => {
    await loginAsTestUser(page);
    await goToPage(page, "/admin/taskers");
    await waitForAdminReady(page);
    if (!(await isUserAdmin(page))) { test.skip(true, "Test user lacks admin access"); }

    await expect(page.getByRole("button", { name: /all taskers/i })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("button", { name: /pending/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /active/i })).toBeVisible();
  });

  test("search input is present", async ({ page }) => {
    await loginAsTestUser(page);
    await goToPage(page, "/admin/taskers");
    await waitForAdminReady(page);
    if (!(await isUserAdmin(page))) { test.skip(true, "Test user lacks admin access"); }

    const search = page.locator('input[placeholder*="Search" i]');
    await expect(search).toBeAttached({ timeout: 15000 });
  });

  test("pending tab shows either cards or empty state", async ({ page }) => {
    await loginAsTestUser(page);
    await goToPage(page, "/admin/taskers");
    await waitForAdminReady(page);
    if (!(await isUserAdmin(page))) { test.skip(true, "Test user lacks admin access"); }

    const emptyState = page.getByRole("heading", { name: /queue clear/i });
    const taskerCards = page.locator('[class*="rounded-\\[2rem\\]"][class*="border"]').first();

    const isEmpty = await emptyState.isVisible({ timeout: 15000 }).catch(() => false);
    const hasCards = await taskerCards.isVisible({ timeout: 3000 }).catch(() => false);

    expect(isEmpty || hasCards).toBeTruthy();
  });
});
