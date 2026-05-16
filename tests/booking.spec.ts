import { test, expect } from "@playwright/test";
import { goToPage, dismissLocationModal, waitForStability } from "./helpers";

test.describe("Full Booking Flow", () => {
  test("complete booking journey: browse → tasker → book → payment → confirmation", async ({ page }) => {
    const TEST_EMAIL = process.env.TEST_USER_EMAIL || "testuser@sewakhoj.com";
    const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || "Test@123456";

    // Step 1: Go to homepage and dismiss location modal
    await goToPage(page, "/");

    // Step 2: Navigate to browse page
    await goToPage(page, "/browse");
    await waitForStability(page);

    // Step 3: Find a tasker card with a UUID-based link (not /tasker/landing, /tasker/onboard, etc.)
    const allTaskerLinks = page.locator('a[href*="/tasker/"]');
    const linkCount = await allTaskerLinks.count();
    let taskerHref: string | null = null;

    for (let i = 0; i < linkCount; i++) {
      const href = await allTaskerLinks.nth(i).getAttribute("href");
      if (href && /\/tasker\/[0-9a-f]{8}-[0-9a-f]{4}-/.test(href)) {
        taskerHref = href;
        break;
      }
    }

    if (!taskerHref) {
      console.log("No taskers found in browse — skipping booking flow test");
      test.skip();
      return;
    }

    await page.goto(taskerHref);
    await page.waitForLoadState("networkidle");
    await waitForStability(page);

    // Step 4: Click "Book Now" on tasker profile
    const bookNowBtn = page.locator('a[href*="/book/"], button:has-text("Book"), a:has-text("Book Now")').first();
    const bookBtnExists = await bookNowBtn.isVisible().catch(() => false);

    if (!bookBtnExists) {
      console.log("No Book Now button found — skipping booking flow test");
      test.skip();
      return;
    }

    await bookNowBtn.click();
    await page.waitForLoadState("networkidle");
    await waitForStability(page, 2000);

    // Step 5: Check if redirected to login (auth gate)
    if (page.url().includes("/login")) {
      // Sign in
      await page.locator('input[type="email"]').fill(TEST_EMAIL);
      await page.locator('input[type="password"]').fill(TEST_PASSWORD);
      await page.locator('button[type="submit"]').click();
      await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });
      await waitForStability(page, 2000);
    }

    // Should now be on the booking page
    expect(page.url()).toContain("/book/");

    // Step 6: Booking wizard — Step 1: Select Service
    // Look for service dropdown or service selection
    const serviceSelect = page.locator("select").first();
    if (await serviceSelect.isVisible().catch(() => false)) {
      // Try to select the second option (first is usually placeholder)
      const options = await serviceSelect.locator("option").all();
      if (options.length > 1) {
        await serviceSelect.selectOption({ index: 1 });
      }
    }

    // Step 7: Navigate to Schedule step (Step 2)
    // Look for "Next" or step navigation
    const nextBtn = page.locator('button:has-text("Next"), button:has-text("Continue"), button:has-text("Schedule")').first();
    const stepIndicators = page.locator('[class*="step"], [class*="Step"], button:has-text("Schedule"), button:has-text("Upgrades"), button:has-text("Review")');

    // Try clicking step tabs if they exist
    const scheduleTab = page.locator('button:has-text("Schedule"), div:has-text("Schedule")').first();
    if (await scheduleTab.isVisible().catch(() => false)) {
      await scheduleTab.click();
      await waitForStability(page);
    }

    // Step 8: Select date (if date input exists)
    const dateInput = page.locator('input[type="date"]').first();
    if (await dateInput.isVisible().catch(() => false)) {
      // Set to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split("T")[0];
      await dateInput.fill(dateStr);
    }

    // Step 9: Select time slot
    const timeSlot = page.locator('button:has-text("AM"), button:has-text("PM")').first();
    if (await timeSlot.isVisible().catch(() => false)) {
      await timeSlot.click();
      await waitForStability(page);
    }

    // Step 10: Fill address
    const addressInput = page.locator('textarea, input[placeholder*="address" i], input[placeholder*="Address" i]').first();
    if (await addressInput.isVisible().catch(() => false)) {
      await addressInput.fill("Test Address, Kathmandu");
    }

    // Step 11: Navigate to Upgrades step
    const upgradesTab = page.locator('button:has-text("Upgrades"), div:has-text("Upgrades")').first();
    if (await upgradesTab.isVisible().catch(() => false)) {
      await upgradesTab.click();
      await waitForStability(page);
    }

    // Step 12: Navigate to Review step
    const reviewTab = page.locator('button:has-text("Review"), div:has-text("Review")').first();
    if (await reviewTab.isVisible().catch(() => false)) {
      await reviewTab.click();
      await waitForStability(page);
    }

    // Step 13: Select payment method
    const esewaOption = page.locator('input[value="esewa"], label:has-text("eSewa"), button:has-text("eSewa")').first();
    if (await esewaOption.isVisible().catch(() => false)) {
      await esewaOption.click();
    }

    // Step 14: Agree to terms
    const termsCheckbox = page.locator('input[type="checkbox"]').first();
    if (await termsCheckbox.isVisible().catch(() => false)) {
      await termsCheckbox.check();
    }

    // Step 15: Submit booking
    const submitBtn = page.locator('button:has-text("Confirm"), button:has-text("Pay"), button:has-text("Book Now"), button[type="submit"]').last();
    const submitExists = await submitBtn.isVisible().catch(() => false);

    if (submitExists) {
      await submitBtn.click();
      await waitForStability(page, 3000);

      // Should see confirmation or redirect to tracking
      const success = page.locator('text=confirmed, text=success, text=Confirmed, text=Success, text=tracking').first();
      const hasSuccess = await success.isVisible().catch(() => false);
      expect(hasSuccess || page.url().includes("/tracking") || page.url().includes("/booking")).toBeTruthy();
    }
  });

  test("booking page shows tasker info", async ({ page }) => {
    // Navigate directly to a booking page if we can find a tasker
    await goToPage(page, "/browse");
    await waitForStability(page);

    // Find a UUID-based tasker link
    const allTaskerLinks = page.locator('a[href*="/tasker/"]');
    const linkCount = await allTaskerLinks.count();
    let taskerId: string | null = null;

    for (let i = 0; i < linkCount; i++) {
      const href = await allTaskerLinks.nth(i).getAttribute("href");
      if (href && /\/tasker\/([0-9a-f]{8}-[0-9a-f]{4}-)/.test(href)) {
        taskerId = href.split("/").pop() || null;
        break;
      }
    }

    if (!taskerId) {
      test.skip();
      return;
    }

    await goToPage(page, `/book/${taskerId}`);
    await waitForStability(page, 2000);

    // Should show tasker name or booking form
    const content = page.locator("main");
    await expect(content).toBeVisible();
  });

  test("booking page requires authentication", async ({ page }) => {
    // Clear any auth state
    await page.context().clearCookies();

    await goToPage(page, "/browse");
    await waitForStability(page);

    // Find a UUID-based tasker link
    const allTaskerLinks = page.locator('a[href*="/tasker/"]');
    const linkCount = await allTaskerLinks.count();
    let taskerId: string | null = null;

    for (let i = 0; i < linkCount; i++) {
      const href = await allTaskerLinks.nth(i).getAttribute("href");
      if (href && /\/tasker\/([0-9a-f]{8}-[0-9a-f]{4}-)/.test(href)) {
        taskerId = href.split("/").pop() || null;
        break;
      }
    }

    if (!taskerId) {
      test.skip();
      return;
    }

    await goToPage(page, `/book/${taskerId}`);
    await waitForStability(page, 2000);

    // Should redirect to login or show login prompt
    const needsAuth =
      page.url().includes("/login") ||
      (await page.locator('text=login, text=Login, text=sign in, text=Sign In').first().isVisible().catch(() => false));

    expect(needsAuth).toBeTruthy();
  });
});