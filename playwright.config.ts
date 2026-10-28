import { defineConfig, devices } from '@playwright/test';

const isProd = process.env.E2E_PROD === 'true';
const port = isProd ? 3000 : 4173;
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  timeout: 30000,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } } },
    { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } },
  ],
  webServer: {
    command: isProd ? 'npm run build && npm run start' : 'npm run dev -- --port 4173',
    url: isProd ? `${baseURL}/api/health` : baseURL,
    reuseExistingServer: false,
    timeout: 120000,
    env: isProd ? { PORT: '3000', HOST: '127.0.0.1' } : {}
  },
});
