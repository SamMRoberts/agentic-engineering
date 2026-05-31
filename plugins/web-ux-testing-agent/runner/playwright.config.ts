// Playwright config for web-ux-testing-agent generated specs.
// Traces, screenshots, and videos are captured on failure; storageState and
// baseURL are injected from the runner via environment variables.
import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.WEB_UX_BASE_URL || "http://localhost:3000";
const storageState = process.env.WEB_UX_STORAGE_STATE || undefined;
const outputDir = process.env.WEB_UX_RESULTS_DIR || "test-results";

export default defineConfig({
  testDir: process.env.WEB_UX_TEST_DIR || "../tests/web-ux",
  outputDir,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["json"], ["list"]],
  use: {
    baseURL,
    storageState,
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure"
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } }
  ].filter((p) => {
    const only = process.env.WEB_UX_BROWSER;
    return !only || p.name === only;
  })
});
