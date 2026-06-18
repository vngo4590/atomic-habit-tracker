import { defineConfig, devices } from "@playwright/test";

/**
 * In CI we build WITHOUT standalone mode (NEXT_OUTPUT_STANDALONE=false) so
 * `next start` works normally. Locally we use the dev server for hot-reload.
 *
 * Standalone mode (for Docker) doesn't support `next start` and requires
 * `node .next/standalone/server.js`. However, the standalone server has
 * reliability issues with API route handling in CI, so we skip it for E2E.
 */
const isCI = !!process.env.CI;
// When BASE_URL is set we run E2E tests against an already-running app
// (e.g. the per-PR preview Container App). In that mode Playwright must
// not try to spin up its own webServer, since this CI runner has no
// `.next/` build available.
const externalBaseURL = process.env.BASE_URL ?? null;

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
    baseURL: externalBaseURL ?? "http://localhost:3000",
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
  // Skip the local webServer entirely when targeting an external preview.
  ...(externalBaseURL
    ? {}
    : {
        webServer: {
          // CI: use `next start` against a non-standalone production build.
          // Local: use dev server with hot-reload for better DX.
          command: isCI ? "node node_modules/.bin/next start -p 3000" : "npm run dev",
          url: "http://localhost:3000",
          reuseExistingServer: !isCI,
          timeout: 120_000,
        },
      }),
});
