import { defineConfig } from '@playwright/test'

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:41741'
const port = new URL(baseURL).port || '41741'
type BrowserName = 'chromium' | 'firefox' | 'webkit'
const supportedBrowsers = new Set<BrowserName>(['chromium', 'firefox', 'webkit'])
const requestedBrowserNames = (process.env.PLAYWRIGHT_BROWSERS || 'chromium')
  .split(',')
  .map((name) => name.trim())
  .filter((name): name is BrowserName => supportedBrowsers.has(name as BrowserName))
const browserNames = requestedBrowserNames.length > 0 ? requestedBrowserNames : ['chromium']
const reuseExistingServer = process.env.PLAYWRIGHT_REUSE_SERVER
  ? process.env.PLAYWRIGHT_REUSE_SERVER === '1'
  : process.env.CI !== 'true'
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
  testDir: './tests',
  timeout: 30_000,
  retries: 1,
  workers: 1,
  grep: /@smoke/,
  use: {
    baseURL,
    headless: true,
    storageState: claudeCodeOnboardingStorageState,
  },
  projects: browserNames.map((browserName) => ({ name: browserName, use: { browserName } })),
  webServer: {
    command: `node scripts/playwright-smoke-server.mjs ${port}`,
    url: baseURL,
    reuseExistingServer,
    timeout: 30_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
})
