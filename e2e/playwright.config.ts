import { defineConfig, devices } from '@playwright/test'

/**
 * The end-to-end flows run against servers already up: CI's Docker stack on `*.yeral.localhost` (operations.md,
 * "The production-like stack"; Chromium resolves `*.localhost` to this machine by itself), or a developer's dev
 * servers through `E2E_CLIENT_URL`, `E2E_BUSINESS_URL` and `E2E_API_URL` (`http://localhost:<PORT_BASE + 1>`, `+ 2`
 * and `+ 4`, the api with `E2E_HOOKS=true` for the flows that let a booking's time pass). Chromium only (ADR 0013):
 * the flows prove the apps and the api work together, not the browsers.
 */
export default defineConfig({
  testDir: './tests',
  // the flows share one business's calendar: one after the other keeps each test's request the only new one
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 120_000,
  // the push channel (ADR 0028) shows the other side's change within a few seconds
  expect: { timeout: 15_000 },
  // the HTML report with the traces: `pnpm --filter @yeral/e2e exec playwright show-report`; CI uploads it on failure
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    ...devices['Desktop Chrome'],
    // a developer may point the tests at a Caddy with a local certificate
    ignoreHTTPSErrors: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    // the owner's sign-in once per run (tests/owner.setup.ts), then the flows
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    { name: 'chromium', dependencies: ['setup'] },
  ],
})
