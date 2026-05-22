import { defineConfig, devices } from "@playwright/test";

/**
 * In CI we run against a production build (standalone server.js) which serves
 * pages instantly. Locally we use the dev server which JIT-compiles on request.
 *
 * Using `npm run dev` in CI caused tests to timeout because each page request
 * triggered slow on-demand compilation on the CI runner.
 *
 * Using `next start` doesn't work with `output: "standalone"` — we must use
 * `node .next/standalone/server.js` with the static assets pre-copied.
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
    // CI: use standalone server.js (requires static assets copied first).
    // Local: use dev server with hot-reload for better DX.
    command: isCI ? "node .next/standalone/server.js" : "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !isCI,
    timeout: 120_000,
    // Pass environment so the standalone server knows where to listen.
    env: isCI ? { PORT: "3000", HOSTNAME: "0.0.0.0" } : undefined,
  },
});
