import { test, expect } from "@playwright/test";
import { goToPage, dismissLocationModal } from "./helpers";

test.describe("Core SSR — Page Load Smoke Tests", () => {

  test("1: Homepage renders with hero and service cards", async ({ page }) => {
    await goToPage(page, "/");
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator("main")).toBeVisible();
    await expect(page).toHaveTitle(/SewaKhoj/i);
  });

  test("2: Services catalog page shows services list", async ({ page }) => {
    await goToPage(page, "/services");
    await expect(page.locator("main")).toBeVisible();
  });

  test("3: Browse page renders filter sidebar", async ({ page }) => {
    await goToPage(page, "/browse");
    await expect(page.locator("main")).toBeVisible();
  });

  test("4: Login page has email/password inputs", async ({ page }) => {
    await goToPage(page, "/login");
    await expect(page.locator('input[type="email"]').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('input[type="password"]').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('button[type="submit"]').first()).toBeVisible({ timeout: 5000 });
  });

  test("5: Signup page has email/phone tabs", async ({ page }) => {
    await goToPage(page, "/signup");
    await expect(page.locator("h2").filter({ hasText: /Create Account/i }).first()).toBeVisible({ timeout: 5000 });
  });

  test("6: Settings page has personal info and preferences", async ({ page }) => {
    await goToPage(page, "/settings");
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator("text=Personal Information").first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=Preferences").first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=Security").first()).toBeVisible({ timeout: 5000 });
  });

  test("7: Tasker profile page shows sections", async ({ page }) => {
    await goToPage(page, "/tasker/profile");
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator("text=Professional Information").first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=Skills").first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=Documents").first()).toBeVisible({ timeout: 5000 });
  });

  test("8: About page is a static page", async ({ page }) => {
    await goToPage(page, "/about");
    await expect(page.locator("main")).toBeVisible();
  });

  test("9: Contact page renders", async ({ page }) => {
    await goToPage(page, "/contact");
    await expect(page.locator("main")).toBeVisible();
  });

  test("10: FAQ page renders", async ({ page }) => {
    await goToPage(page, "/faq");
    await expect(page.locator("main")).toBeVisible();
  });

});
