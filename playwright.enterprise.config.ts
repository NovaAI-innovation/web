/**
 * Enterprise Playwright Configuration
 * 
 * Extended configuration for enterprise-grade E2E testing including
 * performance, security, and compliance test suites.
 */
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/enterprise",
  fullyParallel: false, // Run serially for integration tests
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 2,
  reporter: [
    ["html", { open: "never" }],
    ["list"],
    ["json", { outputFile: "test-results/enterprise-results.json" }],
    ["junit", { outputFile: "test-results/enterprise-junit.xml" }],
  ],
  use: {
    baseURL: process.env.TEST_BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 15000,
    navigationTimeout: 15000,
  },
  projects: [
    // Desktop Chrome
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    // Desktop Firefox
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    // Desktop Safari
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
    // Mobile Chrome
    {
      name: "Mobile Chrome",
      use: { ...devices["Pixel 5"] },
    },
    // Mobile Safari
    {
      name: "Mobile Safari",
      use: { ...devices["iPhone 12"] },
    },
    // High DPI
    {
      name: "high-dpi",
      use: {
        ...devices["Desktop Chrome"],
        deviceScaleFactor: 2,
      },
    },
  ],
  webServer: process.env.TEST_BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
        timeout: 120000,
      },
});
