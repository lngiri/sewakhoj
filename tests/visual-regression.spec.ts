import { test, expect } from "@playwright/test";
import { goToPage } from "./helpers";

// ─── Visual Regression Tests — Public Pages ───
// Generate/update baseline snapshots with: npx playwright test --update-snapshots
//
// These tests capture the rendered state of key public-facing pages to catch
// regressions in layout, spacing, typography, and component visibility.
// Since some pages fetch dynamic data (taskers, services), the initial/loading
// state or empty state is captured where possible to keep baselines stable.

test.describe("Visual Regression — Landing Page", () => {
  test("homepage hero and services grid", async ({ page }) => {
    await goToPage(page, "/");

    // Wait for dynamic content (service cards, hero animation) to settle
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);

    await expect(page).toHaveScreenshot("homepage-full.png", {
      fullPage: true,
      animations: "disabled",
      maxDiffPixelRatio: 0.01,
    });
  });
});

test.describe("Visual Regression — Browse Page", () => {
  test("browse page with filters and tasker grid", async ({ page }) => {
    await goToPage(page, "/browse");

    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    await expect(page).toHaveScreenshot("browse-full.png", {
      fullPage: true,
      animations: "disabled",
      maxDiffPixelRatio: 0.01,
    });
  });
});

test.describe("Visual Regression — Login Page", () => {
  test("login form with brand elements", async ({ page }) => {
    await goToPage(page, "/login");

    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    await expect(page).toHaveScreenshot("login-full.png", {
      fullPage: true,
      animations: "disabled",
      maxDiffPixelRatio: 0.01,
    });
  });
});

test.describe("Visual Regression — Signup Page", () => {
  test("signup form with role selection", async ({ page }) => {
    await goToPage(page, "/signup");

    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    await expect(page).toHaveScreenshot("signup-full.png", {
      fullPage: true,
      animations: "disabled",
      maxDiffPixelRatio: 0.01,
    });
  });
});

test.describe("Visual Regression — About Page", () => {
  test("about page with stats, story, and CTAs", async ({ page }) => {
    await goToPage(page, "/about");

    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    await expect(page).toHaveScreenshot("about-full.png", {
      fullPage: true,
      animations: "disabled",
      maxDiffPixelRatio: 0.01,
    });
  });
});

test.describe("Visual Regression — FAQ Page", () => {
  test("faq page with accordion panels", async ({ page }) => {
    await goToPage(page, "/faq");

    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    await expect(page).toHaveScreenshot("faq-full.png", {
      fullPage: true,
      animations: "disabled",
      maxDiffPixelRatio: 0.01,
    });
  });
});

test.describe("Visual Regression — Contact Page", () => {
  test("contact page with form and info", async ({ page }) => {
    await goToPage(page, "/contact");

    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    await expect(page).toHaveScreenshot("contact-full.png", {
      fullPage: true,
      animations: "disabled",
      maxDiffPixelRatio: 0.01,
    });
  });
});

test.describe("Visual Regression — Services Catalog", () => {
  test("services catalog with hero and grid", async ({ page }) => {
    await goToPage(page, "/services");

    // Use 'load' instead of 'networkidle' because Supabase realtime connections
    // can prevent 'networkidle' from ever resolving on this page.
    await page.waitForLoadState("load");
    await page.waitForTimeout(2000);

    await expect(page).toHaveScreenshot("services-full.png", {
      fullPage: true,
      animations: "disabled",
      maxDiffPixelRatio: 0.01,
    });
  });
});
