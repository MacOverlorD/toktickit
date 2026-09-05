import { defineConfig } from '@playwright/test'
import { resolve } from 'node:path'

export default defineConfig({
  testDir: './e2e/lab-02',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 8_000 },
  globalSetup: './e2e/lab-02/global-setup.ts',
  globalTeardown: './e2e/lab-02/global-teardown.ts',
  outputDir: 'artifacts/lab-02/test-results',
  reporter: [
    ['list'],
    ['html', {
      outputFolder: 'artifacts/lab-02/playwright-report',
      open: 'never',
    }],
  ],
  use: {
    baseURL: 'http://localhost:5174',
    browserName: 'chromium',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      command: 'npm run dev',
      cwd: resolve('server'),
      url: 'http://localhost:3100/api/health',
      env: {
        ...process.env,
        PORT: '3100',
        CLIENT_URL: 'http://localhost:5174',
        UPLOAD_DIR: resolve('server/uploads'),
      },
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: 'npm run dev -- --mode e2e --host localhost --port 5174',
      cwd: resolve('client'),
      url: 'http://localhost:5174',
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
})
