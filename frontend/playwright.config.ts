import { defineConfig, devices } from '@playwright/test'

const E2E_BASE_URL = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'
const isRemoteE2E = !!process.env.CI && /^https?:\/\//.test(process.env.E2E_BASE_URL ?? '')

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: E2E_BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  // CI runs against the deployed preview; locally, start Vite with placeholder SSO settings.
  webServer: isRemoteE2E
    ? undefined
    : {
        command: 'npm run dev -- --host 127.0.0.1 --port 4173',
        url: 'http://127.0.0.1:4173',
        env: {
          VITE_OIDC_ISSUER_URI:
            process.env.VITE_OIDC_ISSUER_URI ??
            'https://local-e2e.example.test/auth/realms/standard',
          VITE_OIDC_CLIENT_ID: process.env.VITE_OIDC_CLIENT_ID ?? 'local-e2e-client',
        },
        reuseExistingServer: !process.env.CI,
        timeout: 120000,
      },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
