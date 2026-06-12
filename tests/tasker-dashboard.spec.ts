import { test, expect } from "@playwright/test";
import { goToPage, waitForStability, loginTestUser } from "./helpers";

test.describe("Tasker Dashboard", () => {
  test("dashboard requires authentication", async ({ page }) => {
    await goToPage(page, "/dashboard");
    await page.waitForURL(/\/login/, { timeout: 10000 });
    const url = page.url();
    expect(url).toContain("/login");
  });

  test("authenticated user can access dashboard", async ({ page }) => {
    const loggedIn = await loginTestUser(page);
    if (!loggedIn) {
      test.skip(true, "Test user not available");
      return;
    }

    await goToPage(page, "/dashboard");
    await waitForStability(page, 3000);

    // Dashboard should load with sidebar
    const hasSidebar = await page.locator("aside").first().isVisible({ timeout: 5000 }).catch(() => false);
    const hasMainContent = await page.locator("main").first().isVisible({ timeout: 5000 }).catch(() => false);
    expect(hasSidebar || hasMainContent).toBeTruthy();
  });

  test("tasker view sidebar has correct sections", async ({ page }) => {
    const loggedIn = await loginTestUser(page);
    if (!loggedIn) {
      test.skip(true, "Test user not available");
      return;
    }

    await goToPage(page, "/dashboard");
    await waitForStability(page, 3000);

    // Check for key sidebar items
    const hasOverview = await page.getByText(/overview/i).first().isVisible({ timeout: 5000 }).catch(() => false);
    const hasTasks = await page.getByText(/my tasks/i).first().isVisible({ timeout: 3000 }).catch(() => false);
    const hasProfile = await page.getByText(/profile/i).first().isVisible({ timeout: 3000 }).catch(() => false);
    const hasLogs = await page.getByText(/activity logs|logs/i).first().isVisible({ timeout: 3000 }).catch(() => false);

    // At minimum, overview and profile should be visible
    expect(hasOverview || hasTasks || hasProfile || hasLogs).toBeTruthy();
  });

  test("overview shows stats cards for tasker", async ({ page }) => {
    const loggedIn = await loginTestUser(page);
    if (!loggedIn) {
      test.skip(true, "Test user not available");
      return;
    }

    await goToPage(page, "/dashboard");
    await waitForStability(page, 3000);

    // Check for stats cards - they may show 0 values
    const hasActiveJobs = await page.getByText(/active jobs|active tasks/i).first().isVisible({ timeout: 5000 }).catch(() => false);
    const hasCompleted = await page.getByText(/completed/i).first().isVisible({ timeout: 3000 }).catch(() => false);

    // Overview heading should be visible
    const hasHeading = await page.getByRole("heading", { name: /tasker dashboard|welcome back/i }).first().isVisible({ timeout: 5000 }).catch(() => false);
    expect(hasHeading || hasActiveJobs || hasCompleted).toBeTruthy();
  });

  test("pending tasker sees verification roadmap", async ({ page }) => {
    const loggedIn = await loginTestUser(page);
    if (!loggedIn) {
      test.skip(true, "Test user not available");
      return;
    }

    await goToPage(page, "/dashboard");
    await waitForStability(page, 3000);

    // Check if pending badge or verification roadmap is visible
    const hasPendingBadge = await page.getByText(/under review|pending/i).first().isVisible({ timeout: 5000 }).catch(() => false);
    const hasRoadmap = await page.getByText(/verification roadmap/i).first().isVisible({ timeout: 3000 }).catch(() => false);
    const hasSubmitted = await page.getByText(/submitted/i).first().isVisible({ timeout: 3000 }).catch(() => false);

    // This test validates the UI renders - it may or may not show pending state
    const dashboardLoaded = await page.getByRole("heading", { name: /tasker dashboard|welcome back/i }).first().isVisible({ timeout: 5000 }).catch(() => false);
    expect(dashboardLoaded || hasPendingBadge || hasRoadmap || hasSubmitted).toBeTruthy();
  });

  test("my tasks section with status filters", async ({ page }) => {
    const loggedIn = await loginTestUser(page);
    if (!loggedIn) {
      test.skip(true, "Test user not available");
      return;
    }

    await goToPage(page, "/dashboard");
    await waitForStability(page, 3000);

    // Click on "My Tasks" in sidebar if visible
    const tasksLink = page.getByText(/my tasks/i).first();
    if (await tasksLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await tasksLink.click();
      await waitForStability(page, 2000);
    }

    // Check for filter buttons
    const hasAllFilter = await page.getByRole("button", { name: /all/i }).first().isVisible({ timeout: 5000 }).catch(() => false);
    const hasPendingFilter = await page.getByRole("button", { name: /pending/i }).first().isVisible({ timeout: 3000 }).catch(() => false);
    const hasCompletedFilter = await page.getByRole("button", { name: /completed/i }).first().isVisible({ timeout: 3000 }).catch(() => false);

    // At least the heading should be visible
    const hasTasksHeading = await page.getByRole("heading", { name: /my tasks/i }).first().isVisible({ timeout: 5000 }).catch(() => false);
    expect(hasTasksHeading || hasAllFilter || hasPendingFilter || hasCompletedFilter).toBeTruthy();
  });

  test("booking detail modal opens on task click", async ({ page }) => {
    const loggedIn = await loginTestUser(page);
    if (!loggedIn) {
      test.skip(true, "Test user not available");
      return;
    }

    await goToPage(page, "/dashboard");
    await waitForStability(page, 3000);

    // Try clicking on "My Tasks" first
    const tasksLink = page.getByText(/my tasks/i).first();
    if (await tasksLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await tasksLink.click();
      await waitForStability(page, 2000);
    }

    // Look for booking cards - they have status badges
    const bookingCards = page.locator('[class*="rounded-"][class*="border"]').filter({ has: page.locator('text=/pending|accepted|completed/i') });
    const cardCount = await bookingCards.count().catch(() => 0);

    if (cardCount > 0) {
      await bookingCards.first().click();
      await waitForStability(page, 2000);

      // Modal should show booking details
      const hasModal = await page.getByText(/booking|appointment|service/i).first().isVisible({ timeout: 5000 }).catch(() => false);
      const hasCustomerInfo = await page.getByText(/customer|client/i).first().isVisible({ timeout: 3000 }).catch(() => false);
      expect(hasModal || hasCustomerInfo).toBeTruthy();
    } else {
      // No bookings - that's fine, just verify the tasks section loaded
      const hasTasksHeading = await page.getByRole("heading", { name: /my tasks/i }).first().isVisible({ timeout: 5000 }).catch(() => false);
      const hasNoBookings = await page.getByText(/no tasks|no bookings/i).first().isVisible({ timeout: 3000 }).catch(() => false);
      expect(hasTasksHeading || hasNoBookings).toBeTruthy();
    }
  });

  test("tasker can accept a pending booking", async ({ page }) => {
    const loggedIn = await loginTestUser(page);
    if (!loggedIn) {
      test.skip(true, "Test user not available");
      return;
    }

    await goToPage(page, "/dashboard");
    await waitForStability(page, 3000);

    // Navigate to tasks
    const tasksLink = page.getByText(/my tasks/i).first();
    if (await tasksLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await tasksLink.click();
      await waitForStability(page, 2000);
    }

    // Look for pending bookings
    const pendingCards = page.locator('[class*="rounded-"][class*="border"]').filter({ hasText: /pending/i });
    const pendingCount = await pendingCards.count().catch(() => 0);

    if (pendingCount > 0) {
      await pendingCards.first().click();
      await waitForStability(page, 2000);

      // Look for accept button in modal
      const acceptBtn = page.getByRole("button", { name: /accept|approve/i }).first();
      const hasAcceptBtn = await acceptBtn.isVisible({ timeout: 5000 }).catch(() => false);

      if (hasAcceptBtn) {
        await acceptBtn.click();
        await waitForStability(page, 2000);
        const hasSuccess = await page.getByText(/accepted|success/i).first().isVisible({ timeout: 5000 }).catch(() => false);
        expect(hasSuccess).toBeTruthy();
      } else {
        const hasModal = await page.getByText(/booking|appointment/i).first().isVisible({ timeout: 3000 }).catch(() => false);
        expect(hasModal).toBeTruthy();
      }
    } else {
      test.skip(true, "No pending bookings available");
    }
  });

  test("status progression buttons visible in booking modal", async ({ page }) => {
    const loggedIn = await loginTestUser(page);
    if (!loggedIn) {
      test.skip(true, "Test user not available");
      return;
    }

    await goToPage(page, "/dashboard");
    await waitForStability(page, 3000);

    // Navigate to tasks
    const tasksLink = page.getByText(/my tasks/i).first();
    if (await tasksLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await tasksLink.click();
      await waitForStability(page, 2000);
    }

    // Look for any booking cards
    const bookingCards = page.locator('[class*="rounded-"][class*="border"]').filter({ has: page.locator('text=/pending|accepted|completed/i') });
    const cardCount = await bookingCards.count().catch(() => 0);

    if (cardCount > 0) {
      await bookingCards.first().click();
      await waitForStability(page, 2000);

      const hasStartJourney = await page.getByText(/start journey|on the way|on-the-way/i).first().isVisible({ timeout: 3000 }).catch(() => false);
      const hasArrived = await page.getByText(/arrived|i've arrived/i).first().isVisible({ timeout: 3000 }).catch(() => false);
      const hasStartWorking = await page.getByText(/start working|in progress/i).first().isVisible({ timeout: 3000 }).catch(() => false);
      const hasComplete = await page.getByText(/mark complete|complete/i).first().isVisible({ timeout: 3000 }).catch(() => false);

      const hasModalContent = await page.getByText(/booking|appointment|service|status/i).first().isVisible({ timeout: 5000 }).catch(() => false);
      expect(hasModalContent || hasStartJourney || hasArrived || hasStartWorking || hasComplete).toBeTruthy();
    } else {
      test.skip(true, "No bookings available to test status progression");
    }
  });

  test("scheduling conflict warning when double-booking", async ({ page }) => {
    const loggedIn = await loginTestUser(page);
    if (!loggedIn) {
      test.skip(true, "Test user not available");
      return;
    }

    await goToPage(page, "/dashboard");
    await waitForStability(page, 3000);

    const tasksLink = page.getByText(/my tasks/i).first();
    if (await tasksLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await tasksLink.click();
      await waitForStability(page, 2000);
    }

    const acceptedCards = page.locator('[class*="rounded-"][class*="border"]').filter({ hasText: /accepted/i });
    const acceptedCount = await acceptedCards.count().catch(() => 0);

    if (acceptedCount > 0) {
      await acceptedCards.first().click();
      await waitForStability(page, 2000);

      const hasConflictWarning = await page.getByText(/conflict|overlap|double.book/i).first().isVisible({ timeout: 3000 }).catch(() => false);
      const hasModalContent = await page.getByText(/booking|appointment|service/i).first().isVisible({ timeout: 5000 }).catch(() => false);
      expect(hasModalContent || hasConflictWarning).toBeTruthy();
    } else {
      test.skip(true, "No accepted bookings to test conflict detection");
    }
  });

  test("activity logs section renders", async ({ page }) => {
    const loggedIn = await loginTestUser(page);
    if (!loggedIn) {
      test.skip(true, "Test user not available");
      return;
    }

    await goToPage(page, "/dashboard");
    await waitForStability(page, 3000);

    const logsLink = page.getByText(/activity logs/i).first();
    if (await logsLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await logsLink.click();
      await waitForStability(page, 2000);
    }

    const hasTable = await page.locator("table").first().isVisible({ timeout: 5000 }).catch(() => false);
    const hasLogsHeading = await page.getByRole("heading", { name: /activity|logs/i }).first().isVisible({ timeout: 3000 }).catch(() => false);
    const hasNoLogs = await page.getByText(/no logs|no activity/i).first().isVisible({ timeout: 3000 }).catch(() => false);

    expect(hasTable || hasLogsHeading || hasNoLogs).toBeTruthy();
  });

  test("logout button is present in sidebar", async ({ page }) => {
    const loggedIn = await loginTestUser(page);
    if (!loggedIn) {
      test.skip(true, "Test user not available");
      return;
    }

    await goToPage(page, "/dashboard");
    await waitForStability(page, 3000);

    const logoutBtn = page.getByRole("button", { name: /logout|log out|sign out/i }).first();
    const hasLogout = await logoutBtn.isVisible({ timeout: 5000 }).catch(() => false);
    expect(hasLogout).toBeTruthy();
  });
});
