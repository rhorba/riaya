import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./test-results",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  timeout: 30000,
  reporter: [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]],

  use: {
    baseURL: "http://localhost:3000",
    trace: "on",
    video: {
      mode: "on",
      size: { width: 1280, height: 720 },
    },
    screenshot: "on",
    locale: "fr-FR",
    headless: true,
    viewport: { width: 1280, height: 720 },
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
