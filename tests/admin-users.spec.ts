import { test, expect } from "@playwright/test";
import { goToPage, loginAsTestUser, waitForAdminReady, isUserAdmin } from "./helpers";

test.describe("Admin User Directory", () => {
  test("users page loads with Database Explorer header", async ({ page }) => {
    await loginAsTestUser(page);
    await goToPage(page, "/admin/users");
    await waitForAdminReady(page);
    if (!(await isUserAdmin(page))) { test.skip(true, "Test user lacks admin access"); }

    await expect(page.getByText(/database explorer/i).first()).toBeAttached({ timeout: 15000 });
  });

  test("users page has search and filters", async ({ page }) => {
    await loginAsTestUser(page);
    await goToPage(page, "/admin/users");
    await waitForAdminReady(page);
    if (!(await isUserAdmin(page))) { test.skip(true, "Test user lacks admin access"); }

    const search = page.locator('input[placeholder*="Search" i]');
    await expect(search).toBeAttached({ timeout: 15000 });

    const selects = page.locator("select");
    expect(await selects.count()).toBeGreaterThanOrEqual(2);
  });

  test("users page has a data table", async ({ page }) => {
    await loginAsTestUser(page);
    await goToPage(page, "/admin/users");
    await waitForAdminReady(page);
    if (!(await isUserAdmin(page))) { test.skip(true, "Test user lacks admin access"); }

    const table = page.locator("table").first();
    await expect(table).toBeAttached({ timeout: 15000 });

    const headers = page.locator("th");
    expect(await headers.count()).toBeGreaterThanOrEqual(5);
  });

  test("users page has column configuration button", async ({ page }) => {
    await loginAsTestUser(page);
    await goToPage(page, "/admin/users");
    await waitForAdminReady(page);
    if (!(await isUserAdmin(page))) { test.skip(true, "Test user lacks admin access"); }

    const columnsBtn = page.getByRole("button", { name: /columns/i });
    await expect(columnsBtn).toBeVisible({ timeout: 15000 });
  });
});
