import { defineConfig } from '@playwright/test';

const apiUrl = process.env.E2E_API_URL ?? 'http://localhost:3333/api';

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  projects: [{ name: 'api' }],
  // Expect the API to already be built (`nx run api:build:development`).
  // CI builds before this step; locally `pnpm test:e2e` script builds first.
  webServer: {
    command: 'pnpm exec cross-env PORT=3333 node apps/api/dist/main.js',
    url: 'http://localhost:3333/api/docs',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  use: {
    baseURL: apiUrl,
    trace: 'on-first-retry',
  },
});
