import { test, expect } from "@playwright/test";
import { goToPage } from "./helpers";

test.describe("Tasker Landing Page", () => {
  test("landing page loads with hero section", async ({ page }) => {
    await goToPage(page, "/tasker/landing");

    // Hero heading should be visible
    await expect(page.getByRole("heading", { name: /Turn Your Skills/i }).first()).toBeVisible();
    await expect(page.getByText("Serious Earnings").first()).toBeVisible();
  });

  test("benefits section shows all 4 cards", async ({ page }) => {
    await goToPage(page, "/tasker/landing");

    // Check all 4 benefit cards
    await expect(page.getByText("Earn More").first()).toBeVisible();
    await expect(page.getByText("Flexible Schedule").first()).toBeVisible();
    await expect(page.getByText("Verification Badge").first()).toBeVisible();
    await expect(page.getByText("Build Reputation").first()).toBeVisible();
  });

  test('"Get Started" CTA links to signup with redirect', async ({ page }) => {
    await goToPage(page, "/tasker/landing");

    const cta = page.getByRole("link", { name: /Get Started/i }).first();
    await expect(cta).toBeVisible();
    const href = await cta.getAttribute("href");
    expect(href).toContain("/signup");
    expect(href).toContain("redirect=");
  });

  test('"Browse Services" link works', async ({ page }) => {
    await goToPage(page, "/tasker/landing");

    const browseLink = page.getByRole("link", { name: /Browse Services/i }).first();
    await expect(browseLink).toBeVisible();
    const href = await browseLink.getAttribute("href");
    expect(href).toContain("/browse");
  });

  test("How It Works steps are visible", async ({ page }) => {
    await goToPage(page, "/tasker/landing");

    await expect(page.getByText("Tell Us About Yourself").first()).toBeVisible();
    await expect(page.getByText("Set Your Rates").first()).toBeVisible();
    await expect(page.getByText("Start Earning").first()).toBeVisible();
  });

  test("footer or bottom section is present", async ({ page }) => {
    await goToPage(page, "/tasker/landing");

    // Page should have a footer or bottom CTA
    const hasFooter = await page.locator("footer").isVisible().catch(() => false);
    const hasBottomCTA = await page.getByRole("link", { name: /Get Started/i }).last().isVisible().catch(() => false);
    expect(hasFooter || hasBottomCTA).toBeTruthy();
  });
});
