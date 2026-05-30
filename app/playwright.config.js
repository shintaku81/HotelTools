import { defineConfig, devices } from '@playwright/test'

// E2E は dev サーバを Supabase 無効(空env)で起動し、useRooms() のフォールバック
// デモデータ(約99室)で決定論的に動かす。スマホ/PC 両ビューポートで検証する。
const PORT = 5174
const BASE_URL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      // Chromium ベースのスマホ端末(Pixel 5 ≒ 393x851)。WebKit不要で軽量。
      name: 'mobile',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
  ],
  webServer: {
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: { VITE_SUPABASE_URL: '', VITE_SUPABASE_ANON_KEY: '' },
  },
})
