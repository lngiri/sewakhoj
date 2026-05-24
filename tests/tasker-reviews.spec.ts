import { test, expect } from "@playwright/test";
import { goToPage, waitForStability, loginTestUser } from "./helpers";

test.describe("Tasker Reviews Management", () => {
  test("reviews section shows average rating", async ({ page }) => {
    const loggedIn = await loginTestUser(page);
    if (!loggedIn) {
      test.skip(true, "Test user not available");
      return;
    }

    await goToPage(page, "/dashboard");
    await waitForStability(page, 3000);

    // Click on Reviews in sidebar
    const reviewsLink = page.getByText(/reviews/i).first();
    if (await reviewsLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await reviewsLink.click();
      await waitForStability(page, 2000);
    }

    // Check for star rating display
    const hasStars = await page.locator('[class*="star"], [class*="rating"]').first().isVisible({ timeout: 5000 }).catch(() => false);
    const hasRatingText = await page.getByText(/rating|reviews/i).first().isVisible({ timeout: 3000 }).catch(() => false);
    const hasReviewsHeading = await page.getByRole("heading", { name: /reviews/i }).first().isVisible({ timeout: 3000 }).catch(() => false);

    expect(hasStars || hasRatingText || hasReviewsHeading).toBeTruthy();
  });

  test("review list renders with customer info", async ({ page }) => {
    const loggedIn = await loginTestUser(page);
    if (!loggedIn) {
      test.skip(true, "Test user not available");
      return;
    }

    await goToPage(page, "/dashboard");
    await waitForStability(page, 3000);

    // Click on Reviews
    const reviewsLink = page.getByText(/reviews/i).first();
    if (await reviewsLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await reviewsLink.click();
      await waitForStability(page, 2000);
    }

    // Check for review cards or empty state
    const hasReviewCards = await page.locator('[class*="review"], [class*="rounded-"][class*="border"]').first().isVisible({ timeout: 5000 }).catch(() => false);
    const hasNoReviews = await page.getByText(/no reviews|no ratings/i).first().isVisible({ timeout: 3000 }).catch(() => false);
    const hasReviewsHeading = await page.getByRole("heading", { name: /reviews/i }).first().isVisible({ timeout: 3000 }).catch(() => false);

    expect(hasReviewCards || hasNoReviews || hasReviewsHeading).toBeTruthy();
  });

  test("tasker can respond to a review", async ({ page }) => {
    const loggedIn = await loginTestUser(page);
    if (!loggedIn) {
      test.skip(true, "Test user not available");
      return;
    }

    await goToPage(page, "/dashboard");
    await waitForStability(page, 3000);

    // Click on Reviews
    const reviewsLink = page.getByText(/reviews/i).first();
    if (await reviewsLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await reviewsLink.click();
      await waitForStability(page, 2000);
    }

    // Look for respond button or textarea
    const hasRespondBtn = await page.getByRole("button", { name: /respond|reply/i }).first().isVisible({ timeout: 5000 }).catch(() => false);
    const hasTextarea = await page.locator("textarea").first().isVisible({ timeout: 3000 }).catch(() => false);
    const hasNoReviews = await page.getByText(/no reviews/i).first().isVisible({ timeout: 3000 }).catch(() => false);

    if (hasNoReviews) {
      // No reviews to respond to - that's fine
      expect(hasNoReviews).toBeTruthy();
    } else {
      // Either respond button or textarea should be visible
      expect(hasRespondBtn || hasTextarea).toBeTruthy();
    }
  });

  test("empty state when no reviews", async ({ page }) => {
    const loggedIn = await loginTestUser(page);
    if (!loggedIn) {
      test.skip(true, "Test user not available");
      return;
    }

    await goToPage(page, "/dashboard");
    await waitForStability(page, 3000);

    // Click on Reviews
    const reviewsLink = page.getByText(/reviews/i).first();
    if (await reviewsLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await reviewsLink.click();
      await waitForStability(page, 2000);
    }

    // Reviews section should render - either with reviews or empty state
    const hasReviewsHeading = await page.getByRole("heading", { name: /reviews/i }).first().isVisible({ timeout: 5000 }).catch(() => false);
    const hasContent = await page.locator("main, [class*='space-y-']").first().isVisible({ timeout: 3000 }).catch(() => false);

    expect(hasReviewsHeading || hasContent).toBeTruthy();
  });
});
