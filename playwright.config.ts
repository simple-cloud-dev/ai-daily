import { defineConfig, devices } from '@playwright/test';

const API_PORT = 4000;
const WEB_PORT = 3000;
const QA_READ_TOKEN = 'qa-read-token-123456';
const QA_WRITE_TOKEN = 'qa-write-token-123456';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://127.0.0.1:${WEB_PORT}`,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'npm run start:test --workspace @ai-daily/api',
      port: API_PORT,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        NODE_ENV: 'test',
        PORT: String(API_PORT),
        CORS_ALLOWED_ORIGINS: `http://127.0.0.1:${WEB_PORT},http://localhost:${WEB_PORT}`,
        API_READ_TOKEN: QA_READ_TOKEN,
        API_WRITE_TOKEN: QA_WRITE_TOKEN,
      },
    },
    {
      command: `npm run dev --workspace @ai-daily/web -- --host 127.0.0.1 --port ${WEB_PORT}`,
      port: WEB_PORT,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        VITE_API_URL: `http://127.0.0.1:${API_PORT}`,
        VITE_API_READ_TOKEN: QA_READ_TOKEN,
      },
    },
  ],
});
