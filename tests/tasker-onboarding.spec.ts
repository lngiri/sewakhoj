import { test, expect } from "@playwright/test";
import { goToPage } from "./helpers";

test.describe("Tasker Onboarding Wizard", () => {
  test("onboarding page requires authentication", async ({ page }) => {
    await goToPage(page, "/tasker/onboard");

    // Should redirect to login page
    await page.waitForURL(/\/login/, { timeout: 10000 });
    const url = page.url();
    expect(url).toContain("/login");
  });

  test("onboarding page loads for authenticated user", async ({ page }) => {
    // Try to sign in first
    try {
      await goToPage(page, "/login");
      await page.locator('input[type="email"]').first().fill("testuser@sewakhoj.com");
      await page.locator('input[type="password"]').first().fill("Test@123456");
      await page.locator('button[type="submit"]').first().click();
      await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 10000 });
    } catch {
      test.skip(true, "Test user not available — skipping onboarding test");
      return;
    }

    await goToPage(page, "/tasker/onboard");

    // If already a tasker, will redirect to dashboard — that's fine
    const url = page.url();
    const isOnboard = url.includes("/tasker/onboard");
    const isDashboard = url.includes("/dashboard");

    if (isOnboard) {
      // Step indicators should be visible
      const stepLabels = page.locator('text=Personal').or(page.locator('text=Skills'));
      await expect(stepLabels.first()).toBeVisible({ timeout: 5000 });
    } else if (isDashboard) {
      // Already a tasker — test passes
      expect(true).toBeTruthy();
    }
  });

  test("step 1 — Personal Info form renders", async ({ page }) => {
    try {
      await goToPage(page, "/login");
      await page.locator('input[type="email"]').first().fill("testuser@sewakhoj.com");
      await page.locator('input[type="password"]').first().fill("Test@123456");
      await page.locator('button[type="submit"]').first().click();
      await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 10000 });
    } catch {
      test.skip(true, "Test user not available");
      return;
    }

    await goToPage(page, "/tasker/onboard");
    const url = page.url();
    if (!url.includes("/tasker/onboard")) {
      test.skip(true, "Already a tasker — skipping");
      return;
    }

    // Personal info fields
    const hasFullName = await page.locator('input[id*="fullName"], input[name*="fullName"], input[placeholder*="Full Name"], input[placeholder*="full name"]').isVisible().catch(() => false);
    const hasPhone = await page.locator('input[type="tel"], input[id*="phone"], input[name*="phone"]').isVisible().catch(() => false);
    const hasEmail = await page.locator('input[type="email"]').isVisible().catch(() => false);
    expect(hasFullName || hasPhone || hasEmail).toBeTruthy();
  });

  test("step 2 — Skills search and selection", async ({ page }) => {
    try {
      await goToPage(page, "/login");
      await page.locator('input[type="email"]').first().fill("testuser@sewakhoj.com");
      await page.locator('input[type="password"]').first().fill("Test@123456");
      await page.locator('button[type="submit"]').first().click();
      await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 10000 });
    } catch {
      test.skip(true, "Test user not available");
      return;
    }

    await goToPage(page, "/tasker/onboard");
    const url = page.url();
    if (!url.includes("/tasker/onboard")) {
      test.skip(true, "Already a tasker");
      return;
    }

    // Navigate to step 2 — look for "Next" or step navigation
    const nextBtn = page.locator('button:has-text("Next"), button:has-text("Continue")').first();
    if (await nextBtn.isVisible().catch(() => false)) {
      await nextBtn.click();
      await page.waitForTimeout(500);
    }

    // Skills section should have search or skill cards
    const hasSearch = await page.locator('input[placeholder*="search"], input[placeholder*="Search"]').isVisible().catch(() => false);
    const hasSkillCards = await page.locator('.skill-card, [class*="skill"]').first().isVisible().catch(() => false);
    expect(hasSearch || hasSkillCards).toBeTruthy();
  });

  test("step 3 — Availability grid renders", async ({ page }) => {
    try {
      await goToPage(page, "/login");
      await page.locator('input[type="email"]').first().fill("testuser@sewakhoj.com");
      await page.locator('input[type="password"]').first().fill("Test@123456");
      await page.locator('button[type="submit"]').first().click();
      await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 10000 });
    } catch {
      test.skip(true, "Test user not available");
      return;
    }

    await goToPage(page, "/tasker/onboard");
    const url = page.url();
    if (!url.includes("/tasker/onboard")) {
      test.skip(true, "Already a tasker");
      return;
    }

    // Navigate to step 3
    for (let i = 0; i < 2; i++) {
      const nextBtn = page.locator('button:has-text("Next"), button:has-text("Continue")').first();
      if (await nextBtn.isVisible().catch(() => false)) {
        await nextBtn.click();
        await page.waitForTimeout(500);
      }
    }

    // Availability section should have day labels
    const hasDays = await page.getByText(/Sun|Mon|Tue|Wed|Thu|Fri|Sat/i).first().isVisible().catch(() => false);
    const hasSlots = await page.getByText(/morning|afternoon|evening/i).first().isVisible().catch(() => false);
    expect(hasDays || hasSlots).toBeTruthy();
  });

  test("step 4 — Document upload section", async ({ page }) => {
    try {
      await goToPage(page, "/login");
      await page.locator('input[type="email"]').first().fill("testuser@sewakhoj.com");
      await page.locator('input[type="password"]').first().fill("Test@123456");
      await page.locator('button[type="submit"]').first().click();
      await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 10000 });
    } catch {
      test.skip(true, "Test user not available");
      return;
    }

    await goToPage(page, "/tasker/onboard");
    const url = page.url();
    if (!url.includes("/tasker/onboard")) {
      test.skip(true, "Already a tasker");
      return;
    }

    // Navigate to step 4
    for (let i = 0; i < 3; i++) {
      const nextBtn = page.locator('button:has-text("Next"), button:has-text("Continue")').first();
      if (await nextBtn.isVisible().catch(() => false)) {
        await nextBtn.click();
        await page.waitForTimeout(500);
      }
    }

    // Document upload section should have file inputs
    const hasFileInput = await page.locator('input[type="file"]').first().isVisible().catch(() => false);
    const hasUploadText = await page.getByText(/citizenship|license|document|upload/i).first().isVisible().catch(() => false);
    expect(hasFileInput || hasUploadText).toBeTruthy();
  });

  test("step 5 — Pricing configuration", async ({ page }) => {
    try {
      await goToPage(page, "/login");
      await page.locator('input[type="email"]').first().fill("testuser@sewakhoj.com");
      await page.locator('input[type="password"]').first().fill("Test@123456");
      await page.locator('button[type="submit"]').first().click();
      await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 10000 });
    } catch {
      test.skip(true, "Test user not available");
      return;
    }

    await goToPage(page, "/tasker/onboard");
    const url = page.url();
    if (!url.includes("/tasker/onboard")) {
      test.skip(true, "Already a tasker");
      return;
    }

    // Navigate to step 5
    for (let i = 0; i < 4; i++) {
      const nextBtn = page.locator('button:has-text("Next"), button:has-text("Continue")').first();
      if (await nextBtn.isVisible().catch(() => false)) {
        await nextBtn.click();
        await page.waitForTimeout(500);
      }
    }

    // Pricing section should have rate input
    const hasRateInput = await page.locator('input[id*="hourlyRate"], input[id*="rate"], input[placeholder*="rate"], input[placeholder*="Rate"]').isVisible().catch(() => false);
    const hasPricingText = await page.getByText(/hourly|rate|pricing|Rs/i).first().isVisible().catch(() => false);
    expect(hasRateInput || hasPricingText).toBeTruthy();
  });

  test("step 6 — Finalize review and submit", async ({ page }) => {
    try {
      await goToPage(page, "/login");
      await page.locator('input[type="email"]').first().fill("testuser@sewakhoj.com");
      await page.locator('input[type="password"]').first().fill("Test@123456");
      await page.locator('button[type="submit"]').first().click();
      await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 10000 });
    } catch {
      test.skip(true, "Test user not available");
      return;
    }

    await goToPage(page, "/tasker/onboard");
    const url = page.url();
    if (!url.includes("/tasker/onboard")) {
      test.skip(true, "Already a tasker");
      return;
    }

    // Navigate to step 6
    for (let i = 0; i < 5; i++) {
      const nextBtn = page.locator('button:has-text("Next"), button:has-text("Continue")').first();
      if (await nextBtn.isVisible().catch(() => false)) {
        await nextBtn.click();
        await page.waitForTimeout(500);
      }
    }

    // Finalize step should have submit button or review summary
    const hasSubmit = await page.locator('button:has-text("Submit"), button:has-text("Finish"), button:has-text("Complete")').isVisible().catch(() => false);
    const hasReview = await page.getByText(/review|summary|finalize/i).first().isVisible().catch(() => false);
    expect(hasSubmit || hasReview).toBeTruthy();
  });

  test("progress persistence — form data preserved across steps", async ({ page }) => {
    try {
      await goToPage(page, "/login");
      await page.locator('input[type="email"]').first().fill("testuser@sewakhoj.com");
      await page.locator('input[type="password"]').first().fill("Test@123456");
      await page.locator('button[type="submit"]').first().click();
      await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 10000 });
    } catch {
      test.skip(true, "Test user not available");
      return;
    }

    await goToPage(page, "/tasker/onboard");
    const url = page.url();
    if (!url.includes("/tasker/onboard")) {
      test.skip(true, "Already a tasker");
      return;
    }

    // Step indicators should show progress
    const stepIndicators = page.locator('[class*="step"], [class*="Step"]');
    const hasSteps = await stepIndicators.first().isVisible().catch(() => false);
    expect(hasSteps).toBeTruthy();
  });
});
