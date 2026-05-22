import { defineConfig, devices } from "@playwright/test";

/**
 * In CI we run against a production build (next start) which is instant.
 * Locally we use the dev server (next dev) which JIT-compiles on request.
 * Using dev mode in CI caused tests to timeout because each page request
 * triggered slow on-demand compilation on the CI runner.
 */
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: 1,
  reporter: "list",
  // Increase per-test timeout in CI to account for cold-start page loads.
  timeout: isCI ? 60_000 : 30_000,
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], storageState: "e2e/.auth/user.json" },
      dependencies: ["setup"],
    },
    {
      name: "Mobile Chrome",
      use: { ...devices["Pixel 5"], storageState: "e2e/.auth/user.json" },
      dependencies: ["setup"],
    },
  ],
  webServer: {
    // In CI: use the pre-built production server (fast, no JIT compilation).
    // Locally: use the dev server with hot-reload for a better DX.
    command: isCI ? "npm start" : "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
});
