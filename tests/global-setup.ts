import { chromium, FullConfig } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const AUTH_FILE = path.join(__dirname, ".auth.json");

// Load .env.local manually since Playwright doesn't auto-load it
function loadEnv() {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.substring(0, eqIdx).trim();
    const value = trimmed.substring(eqIdx + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

async function globalSetup(config: FullConfig) {
  loadEnv();

  const baseURL = config.projects[0].use.baseURL as string;
  const TEST_EMAIL = process.env.TEST_USER_EMAIL || "testuser@sewakhoj.com";
  const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || "Test@123456";

  // Sign in and save auth state
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(`${baseURL}/login`, { waitUntil: "networkidle" });

    // Fill login form — use .first() because login page may have duplicate email inputs
    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const submitButton = page.locator('button[type="submit"]').first();

    await emailInput.fill(TEST_EMAIL);
    await passwordInput.fill(TEST_PASSWORD);
    await submitButton.click();

    // Wait for redirect after login
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });
    console.log(`Logged in as ${TEST_EMAIL}, saving auth state...`);

    await context.storageState({ path: AUTH_FILE });
    console.log("Global setup complete — auth state saved");
  } catch (err) {
    console.warn("Global setup: Could not sign in — tests that require auth may fail");
    console.warn("Error:", err);
    // Still save empty state so tests can run
    await context.storageState({ path: AUTH_FILE });
  } finally {
    await browser.close();
  }
}

export default globalSetup;
