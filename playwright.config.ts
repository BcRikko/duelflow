import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/vrt',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    ...devices['Desktop Chrome'],
    viewport: { width: 1280, height: 720 },
  },
  snapshotPathTemplate: 'tests/vrt/__screenshots__/{testFilePath}/{arg}{ext}',
  webServer: {
    command: 'pnpm dev -- --port 5173',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
  expect: {
    toHaveScreenshot: {
      maxDiffPixels: 50,
      threshold: 0.2,
    },
  },
});
