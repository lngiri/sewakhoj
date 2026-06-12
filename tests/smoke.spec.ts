import { test, expect } from "@playwright/test";
import { dismissLocationModal } from "./helpers";

const BASE_URL = process.env.SMOKE_TEST_URL || "http://localhost:3000";
const SMOKE_EMAIL = process.env.SMOKE_TEST_EMAIL;
const SMOKE_PASSWORD = process.env.SMOKE_TEST_PASSWORD;

test.use({ baseURL: BASE_URL });

test.describe("Smoke Tests", () => {
  /* ───── Public pages ───── */

  test("1: homepage loads with hero section", async ({ page }) => {
    await page.goto("/", { waitUntil: "load", timeout: 15000 });
    await dismissLocationModal(page);

    const hero = page.locator("h1, h2, [class*='hero'], [class*='Hero']").first();
    await expect(hero).toBeAttached({ timeout: 10000 });

    const body = await page.evaluate(() => document.body.innerText.toLowerCase());
    expect(
      body.includes("sewakhoj") || body.includes("find") || body.includes("service") || body.includes("tasker"),
    ).toBeTruthy();
  });

  test("2: login page has email and password form", async ({ page }) => {
    await page.goto("/login", { waitUntil: "load", timeout: 15000 });
    await dismissLocationModal(page);

    await expect(page.locator('input[type="email"]').first()).toBeAttached({ timeout: 5000 });
    await expect(page.locator('input[type="password"]').first()).toBeAttached({ timeout: 5000 });
    await expect(page.getByRole("button", { name: /sign in|log in|login/i }).first()).toBeAttached({ timeout: 5000 });
  });

  test("3: services catalog renders service cards", async ({ page }) => {
    await page.goto("/services", { waitUntil: "domcontentloaded", timeout: 15000 });
    await dismissLocationModal(page);

    const cards = page.locator("a[href*='/services/'], [class*='card'], [class*='Card'], [class*='service'], [class*='Service']");
    await expect(cards.first()).toBeAttached({ timeout: 10000 });
  });

  test("4: browse page renders with filter controls", async ({ page }) => {
    await page.goto("/browse", { waitUntil: "load", timeout: 15000 });
    await dismissLocationModal(page);

    const search = page.locator('input[placeholder*="Search" i], input[placeholder*="search" i]');
    const hasSearch = await search.isVisible().catch(() => false);

    const filter = page.locator("select, [class*='filter'], [class*='Filter']");
    const hasFilter = await filter.first().isVisible().catch(() => false);

    expect(hasSearch || hasFilter).toBeTruthy();
  });

  test("5: tasker profile page renders", async ({ page }) => {
    await page.goto("/browse", { waitUntil: "load", timeout: 15000 });
    await dismissLocationModal(page);

    const taskerLink = page.locator("a[href*='/tasker/']").first();
    const linkVisible = await taskerLink.isVisible({ timeout: 8000 }).catch(() => false);

    test.skip(!linkVisible, "No tasker links found on browse page");

    const href = await taskerLink.getAttribute("href");
    await page.goto(href!, { waitUntil: "load", timeout: 15000 });
    await dismissLocationModal(page);

    await expect(page.locator("main, article, [class*='profile'], [class*='Profile']").first()).toBeAttached({ timeout: 10000 });
  });

  test("6: static pages (about, contact, faq) all render", async ({ page }) => {
    const pages = ["/about", "/contact", "/faq"];
    for (const p of pages) {
      await page.goto(p, { waitUntil: "load", timeout: 15000 });
      await dismissLocationModal(page);

      const heading = page.locator("h1").first();
      await expect(heading).toBeAttached({ timeout: 8000 });
    }
  });

  /* ───── Authenticated pages ───── */

  test("7: login with smoke user credentials succeeds", async ({ page }) => {
    test.skip(!SMOKE_EMAIL || !SMOKE_PASSWORD, "SMOKE_TEST_EMAIL or SMOKE_TEST_PASSWORD not set");

    await page.goto("/login", { waitUntil: "load", timeout: 15000 });
    await dismissLocationModal(page);

    await page.locator('input[type="email"]').first().fill(SMOKE_EMAIL!);
    await page.locator('input[type="password"]').first().fill(SMOKE_PASSWORD!);
    await page.getByRole("button", { name: /sign in|log in|login/i }).first().click();

    await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 });
  });

  test("8: dashboard loads for authenticated user", async ({ page }) => {
    test.skip(!SMOKE_EMAIL || !SMOKE_PASSWORD, "SMOKE_TEST_EMAIL or SMOKE_TEST_PASSWORD not set");

    await page.goto("/login", { waitUntil: "load", timeout: 15000 });
    await dismissLocationModal(page);

    await page.locator('input[type="email"]').first().fill(SMOKE_EMAIL!);
    await page.locator('input[type="password"]').first().fill(SMOKE_PASSWORD!);
    await page.getByRole("button", { name: /sign in|log in|login/i }).first().click();

    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });

    await page.goto("/dashboard", { waitUntil: "load", timeout: 15000 });
    await dismissLocationModal(page);

    const body = await page.evaluate(() => document.body.innerText.toLowerCase());
    expect(
      body.includes("dashboard") || body.includes("booking") || body.includes("welcome"),
    ).toBeTruthy();
  });

  test("9: admin sidebar renders for staff users", async ({ page }) => {
    test.skip(!SMOKE_EMAIL || !SMOKE_PASSWORD, "SMOKE_TEST_EMAIL or SMOKE_TEST_PASSWORD not set");

    await page.goto("/login", { waitUntil: "load", timeout: 15000 });
    await dismissLocationModal(page);

    await page.locator('input[type="email"]').first().fill(SMOKE_EMAIL!);
    await page.locator('input[type="password"]').first().fill(SMOKE_PASSWORD!);
    await page.getByRole("button", { name: /sign in|log in|login/i }).first().click();

    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });

    await page.goto("/admin/taskers", { waitUntil: "load", timeout: 15000 });
    await dismissLocationModal(page);

    const denied = await page.evaluate(() => document.body.innerText.includes("ACCESS DENIED"));
    test.skip(denied, "User does not have admin access");

    await expect(page.getByText(/taskers kyc/i).first()).toBeAttached({ timeout: 10000 });
  });

  test("10: no uncaught page errors on critical pages", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    const urls: { path: string; waitUntil: "load" | "domcontentloaded" }[] = [
      { path: "/", waitUntil: "load" },
      { path: "/login", waitUntil: "load" },
      { path: "/services", waitUntil: "domcontentloaded" },
      { path: "/browse", waitUntil: "load" },
      { path: "/about", waitUntil: "load" },
      { path: "/contact", waitUntil: "load" },
      { path: "/faq", waitUntil: "load" },
    ];

    for (const { path, waitUntil } of urls) {
      await page.goto(path, { waitUntil, timeout: 15000 });
      await dismissLocationModal(page);
      await page.waitForTimeout(500);
    }

    expect(errors).toEqual([]);
  });
});
