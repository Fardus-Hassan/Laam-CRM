import { defineConfig } from '@playwright/test';

/** Temporary UI smoke for Windows (laam.localhost → 127.0.0.1). */
export default defineConfig({
  testDir: './e2e',
  testMatch: ['{ui-smoke,hold-flow-ui,incentive-hub-ui}.spec.ts'],
  timeout: 180_000,
  expect: { timeout: 25_000 },
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: process.env.E2E_WEB_URL ?? 'http://laam.localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: {
      args: ['--host-resolver-rules=MAP laam.localhost 127.0.0.1'],
    },
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
