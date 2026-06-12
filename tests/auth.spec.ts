import { test, expect } from "@playwright/test";
import { goToPage } from "./helpers";

test.describe("Authentication", () => {
  test("login page renders with email/password form", async ({ page }) => {
    await goToPage(page, "/login");

    // Should have email input
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();

    // Should have password input
    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toBeVisible();

    // Should have submit button
    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toBeVisible();
  });

  test("login page has Google sign-in option", async ({ page }) => {
    await goToPage(page, "/login");

    const googleBtn = page.locator('button:has-text("Continue with Google")');
    await expect(googleBtn).toBeVisible();
  });

  test("login page has link to signup", async ({ page }) => {
    await goToPage(page, "/login");

    const signupLink = page.getByRole("link", { name: "Create one" });
    await expect(signupLink).toBeVisible();
  });

  test("signup page renders", async ({ page }) => {
    await goToPage(page, "/signup");

    const heading = page.getByRole("heading", { name: /create account/i });
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test("signup page has link to login", async ({ page }) => {
    await goToPage(page, "/signup");

    const loginLink = page.getByRole("link", { name: "Sign In" });
    await expect(loginLink).toBeVisible();
  });

  test("login with test credentials succeeds", async ({ page }) => {
    const email = process.env.TEST_USER_EMAIL || "testuser@sewakhoj.com";
    const password = process.env.TEST_USER_PASSWORD || "Test@123456";

    await goToPage(page, "/login");

    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').fill(password);
    await page.getByRole("button", { name: /sign in/i }).click();

    // Should redirect away from login page
    await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 });
  });

  test("login with invalid credentials shows error", async ({ page }) => {
    await goToPage(page, "/login");

    await page.locator('input[type="email"]').fill("nonexistent@fake.com");
    await page.locator('input[type="password"]').fill("wrongpassword");
    await page.locator('button[type="submit"]').click();

    // Should show an error message
    const errorMsg = page.locator('[role="alert"], .text-red-500, .text-red-600, .bg-red-50').first();
    await expect(errorMsg).toBeVisible({ timeout: 10000 });
  });
});
