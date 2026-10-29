import { defineConfig } from '@playwright/test';

const screenshotsOnly = process.argv.includes('--project=screenshots');

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: true,
  retries: 0,
  workers: 2,
  reporter: 'list',
  use: {
    browserName: 'chromium',
    baseURL: 'http://127.0.0.1:5173',
    locale: 'vi-VN',
    contextOptions: { reducedMotion: 'reduce' },
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      testIgnore: ['**/screenshots.spec.ts', '**/production.spec.ts'],
    },
    {
      name: 'production',
      testMatch: '**/production.spec.ts',
      use: { baseURL: 'http://127.0.0.1:4173' },
    },
    { name: 'screenshots', testMatch: '**/screenshots.spec.ts' },
  ],
  webServer: [
    {
      command: 'npm run dev',
      url: 'http://127.0.0.1:5173',
      reuseExistingServer: false,
    },
    ...(screenshotsOnly
      ? []
      : [
          {
            command: 'npm run build && npm run preview',
            url: 'http://127.0.0.1:4173',
            reuseExistingServer: false,
            timeout: 120_000,
          },
        ]),
  ],
});
