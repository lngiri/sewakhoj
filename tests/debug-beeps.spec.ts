import { test, expect } from "@playwright/test";
import { goToPage } from "./helpers";

test.describe("Debug Beeps Page", () => {
  test("page loads with all 4 pattern buttons and initial empty log", async ({ page }) => {
    await goToPage(page, "/debug/beeps");

    // Page header should be visible
    await expect(
      page.getByRole("heading", { name: /Beep Pattern Debug Console/i })
    ).toBeVisible();

    // All 4 pattern buttons should be visible
    await expect(page.getByRole("button", { name: /Booking Sent/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Booking Accepted/i })).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Booking Declined/i })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /New Request/i })
    ).toBeVisible();

    // Random tone and Clear log buttons
    await expect(page.getByRole("button", { name: /Random tone/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Clear log/i })).toBeVisible();

    // Initial log should show empty state message
    await expect(page.getByText("No beeps triggered yet")).toBeVisible();

    // Force play toggle should be present (labelled "Respect focus" by default)
    await expect(page.getByText(/Respect focus/)).toBeVisible();
  });

  test("enable force play then click each pattern button produces log entries", async ({ page }) => {
    await goToPage(page, "/debug/beeps");

    // Enable "Force play" so beeps fire even when page is focused
    const forcePlayCheckbox = page.locator('input[type="checkbox"]');
    await expect(forcePlayCheckbox).toBeVisible();
    await forcePlayCheckbox.check();

    // Verify the label changed (scope to the label element to avoid multiple matches)
    await expect(page.locator('label').filter({ hasText: /Force play/ })).toBeVisible();

    // Click each pattern button and verify a log entry appears
    const patternButtons = [
      { name: /Booking Sent/i, expectedEntry: "📤" },
      { name: /Booking Accepted/i, expectedEntry: "✅" },
      { name: /Booking Declined/i, expectedEntry: "❌" },
      { name: /New Request/i, expectedEntry: "⚡" },
    ];

    // Scope the log container for assertions
    const logSection = page.locator('text=Event log').locator('..').locator('..');

    for (const pattern of patternButtons) {
      // Click the pattern button
      await page.getByRole("button", { name: pattern.name }).click();
      await page.waitForTimeout(200);

      // The log section should contain the icon for this pattern
      await expect(logSection.getByText(pattern.expectedEntry)).toBeVisible();

      // The "No beeps triggered yet" should no longer be visible
      await expect(page.getByText("No beeps triggered yet")).not.toBeVisible();
    }
  });

  test("clicking random tone adds entry to log", async ({ page }) => {
    await goToPage(page, "/debug/beeps");

    // Enable force play
    await page.locator('input[type="checkbox"]').check();

    // Click random tone
    await page.getByRole("button", { name: /Random tone/i }).click();
    await page.waitForTimeout(200);

    // Log section should contain "Custom tone" entry
    const logSection = page.locator('text=Event log').locator('..').locator('..');
    await expect(logSection.getByText(/Custom tone/)).toBeVisible();
  });

  test("clear log button resets the log and hides waveform", async ({ page }) => {
    await goToPage(page, "/debug/beeps");

    // Enable force play
    await page.locator('input[type="checkbox"]').check();

    // Trigger a beep first
    await page.getByRole("button", { name: /Booking Sent/i }).click();
    await page.waitForTimeout(200);

    // Verify log has content (scope to log section)
    const logSection = page.locator('text=Event log').locator('..').locator('..');
    await expect(logSection.getByText("📤")).toBeVisible();

    // Click clear log
    await page.getByRole("button", { name: /Clear log/i }).click();
    await page.waitForTimeout(300);

    // Log should show empty state message again
    await expect(page.getByText("No beeps triggered yet")).toBeVisible();

    // Waveform visualizer section should be hidden
    await expect(page.getByText("Last triggered")).not.toBeVisible();
  });

  test("suppression warning appears when force play is off and page is focused", async ({ page }) => {
    await goToPage(page, "/debug/beeps");

    // Force play is off by default (label is "Respect focus")
    await expect(page.getByText(/Respect focus/)).toBeVisible();

    // Ensure page is focused (avoid flakiness if browser loses focus)
    await page.focus('body');
    await page.waitForTimeout(100);

    // Click a pattern button while page is focused
    await page.getByRole("button", { name: /Booking Sent/i }).click();
    await page.waitForTimeout(200);

    // The log should show a SUPPRESSED warning
    await expect(page.getByText(/SUPPRESSED/)).toBeVisible();
  });

  test("page has correct frequencies listed in footer", async ({ page }) => {
    await goToPage(page, "/debug/beeps");

    // Footer should list the frequencies
    await expect(page.getByText("C6=1047Hz")).toBeVisible();
    await expect(page.getByText("E5=659Hz")).toBeVisible();
    await expect(page.getByText("A5=880Hz")).toBeVisible();
    await expect(page.getByText("G4=392Hz")).toBeVisible();
    await expect(page.getByText("C4=262Hz")).toBeVisible();
    await expect(page.getByText("D6=1175Hz")).toBeVisible();
  });

  test("focus status indicator shows focused state by default", async ({ page }) => {
    await goToPage(page, "/debug/beeps");

    // Focus indicator should show "focused" (scope to the indicator div)
    const focusIndicator = page.locator('text=focused').first();
    await expect(focusIndicator).toBeVisible();
  });
});

// ─── Visual regression tests ───
// Note: The debug/beeps page uses hardcoded dark gradients (from-slate-950),
// so it does not support light/dark mode switching. Screenshots capture the
// dark-only design in different interaction states.
//
// Generate/update baseline snapshots with: npx playwright test --update-snapshots
test.describe("Debug Beeps Page — Visual Regression", () => {
  test("initial empty state screenshot", async ({ page }) => {
    await goToPage(page, "/debug/beeps");

    // Wait for fonts and initial render to settle
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot("debug-beeps-initial.png", {
      fullPage: true,
      animations: "disabled",
      maxDiffPixelRatio: 0.01,
    });
  });

  test("after triggering a beep with waveform and log entry", async ({ page }) => {
    await goToPage(page, "/debug/beeps");

    // Enable force play
    await page.locator('input[type="checkbox"]').check();
    await page.waitForTimeout(200);

    // Click Booking Accepted button (triggers waveform + log entry)
    await page.getByRole("button", { name: /Booking Accepted/i }).click();
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot("debug-beeps-triggered.png", {
      fullPage: true,
      animations: "disabled",
      maxDiffPixelRatio: 0.01,
    });
  });

  test("after clicking all patterns with populated event log", async ({ page }) => {
    await goToPage(page, "/debug/beeps");

    // Enable force play
    await page.locator('input[type="checkbox"]').check();
    await page.waitForTimeout(200);

    // Click all 4 pattern buttons in sequence
    const buttons = [/Booking Sent/i, /Booking Accepted/i, /Booking Declined/i, /New Request/i];
    for (const btn of buttons) {
      await page.getByRole("button", { name: btn }).click();
      await page.waitForTimeout(300);
    }

    // Also click random tone for variety
    await page.getByRole("button", { name: /Random tone/i }).click();
    await page.waitForTimeout(300);

    await expect(page).toHaveScreenshot("debug-beeps-populated.png", {
      fullPage: true,
      animations: "disabled",
      maxDiffPixelRatio: 0.01,
    });
  });
});
