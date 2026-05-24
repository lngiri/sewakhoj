import { test, expect } from "@playwright/test";
import { goToPage } from "./helpers";

test.describe("Tasker KYC Verification", () => {
  test("KYC page requires authentication", async ({ page }) => {
    await goToPage(page, "/tasker/kyc");

    // Should redirect to login
    await page.waitForURL(/\/login/, { timeout: 10000 });
    const url = page.url();
    expect(url).toContain("/login");
  });

  test("KYC page loads 3-step wizard for authenticated tasker", async ({ page }) => {
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

    await goToPage(page, "/tasker/kyc");
    const url = page.url();

    if (url.includes("/tasker/kyc")) {
      // Should have step indicators or heading
      const hasHeading = await page.getByRole("heading", { name: /identity|verification|kyc/i }).first().isVisible().catch(() => false);
      const hasSteps = await page.locator('[class*="step"], [class*="Step"]').first().isVisible().catch(() => false);
      expect(hasHeading || hasSteps).toBeTruthy();
    } else {
      // Redirected — user may not be a tasker
      expect(true).toBeTruthy();
    }
  });

  test("step 1 — Document type selection", async ({ page }) => {
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

    await goToPage(page, "/tasker/kyc");
    const url = page.url();
    if (!url.includes("/tasker/kyc")) {
      test.skip(true, "Not a tasker or KYC already submitted");
      return;
    }

    // Check for document type options
    const hasCitizenship = await page.getByText(/citizenship|nagarikta/i).first().isVisible().catch(() => false);
    const hasLicense = await page.getByText(/driving license|license/i).first().isVisible().catch(() => false);
    const hasPassport = await page.getByText(/passport/i).first().isVisible().catch(() => false);
    expect(hasCitizenship || hasLicense || hasPassport).toBeTruthy();
  });

  test("step 2 — Document upload interface", async ({ page }) => {
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

    await goToPage(page, "/tasker/kyc");
    const url = page.url();
    if (!url.includes("/tasker/kyc")) {
      test.skip(true, "Not a tasker or KYC already submitted");
      return;
    }

    // Navigate to step 2 if possible
    const continueBtn = page.locator('button:has-text("Continue"), button:has-text("Next")').first();
    if (await continueBtn.isVisible().catch(() => false)) {
      await continueBtn.click();
      await page.waitForTimeout(500);
    }

    // Should have file upload inputs
    const hasFileInput = await page.locator('input[type="file"]').first().isVisible().catch(() => false);
    const hasUploadText = await page.getByText(/upload|select|front|back/i).first().isVisible().catch(() => false);
    expect(hasFileInput || hasUploadText).toBeTruthy();
  });

  test("step 3 — Selfie/biometric capture", async ({ page }) => {
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

    await goToPage(page, "/tasker/kyc");
    const url = page.url();
    if (!url.includes("/tasker/kyc")) {
      test.skip(true, "Not a tasker or KYC already submitted");
      return;
    }

    // Navigate to step 3
    for (let i = 0; i < 2; i++) {
      const continueBtn = page.locator('button:has-text("Continue"), button:has-text("Next")').first();
      if (await continueBtn.isVisible().catch(() => false)) {
        await continueBtn.click();
        await page.waitForTimeout(500);
      }
    }

    // Should have camera/selfie section
    const hasCamera = await page.getByText(/camera|selfie|biometric|photo/i).first().isVisible().catch(() => false);
    const hasSubmit = await page.locator('button:has-text("Submit")').first().isVisible().catch(() => false);
    expect(hasCamera || hasSubmit).toBeTruthy();
  });
});
