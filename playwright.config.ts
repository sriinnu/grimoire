import { defineConfig } from '@playwright/test'

const baseURL = process.env.BASE_URL || 'http://localhost:5201'
type BrowserName = 'chromium' | 'firefox' | 'webkit'
const supportedBrowsers = new Set<BrowserName>(['chromium', 'firefox', 'webkit'])
const requestedBrowserNames = (process.env.PLAYWRIGHT_BROWSERS || 'chromium')
  .split(',')
  .map((name) => name.trim())
  .filter((name): name is BrowserName => supportedBrowsers.has(name as BrowserName))
const browserNames = requestedBrowserNames.length > 0 ? requestedBrowserNames : ['chromium']
const claudeCodeOnboardingStorageState = {
  cookies: [],
  origins: [
    {
      origin: baseURL,
      localStorage: [
        { name: 'grimoire:claude-code-onboarding-dismissed', value: '1' },
      ],
    },
  ],
}

export default defineConfig({
  testDir: './tests/smoke',
  timeout: 20_000,
  retries: 2,
  workers: 1,
  use: {
    baseURL,
    headless: true,
    storageState: claudeCodeOnboardingStorageState,
  },
  projects: browserNames.map((browserName) => ({ name: browserName, use: { browserName } })),
  webServer: {
    command: `pnpm dev --port ${process.env.BASE_URL?.match(/:(\d+)/)?.[1] || '5201'}`,
    url: baseURL,
    reuseExistingServer: true,
  },
})
