import { test, expect, type Page } from '@playwright/test'
import { executeCommand, openCommandPalette } from './helpers'

type SettingsSurfaceState = {
  panelBackground: string
  railBackground: string
  mainBackground: string
  cardBackground: string
  railRight: number
  mainLeft: number
}

async function openSettings(page: Page) {
  await page.locator('body').click()
  await page.keyboard.press('Meta+,')
  const panel = page.getByTestId('settings-panel')
  try {
    await panel.waitFor({ timeout: 2_000 })
  } catch {
    await openCommandPalette(page)
    await executeCommand(page, 'Settings')
    await panel.waitFor({ timeout: 5_000 })
  }
  return panel
}

async function captureSettingsSurfaceState(page: Page, cardTestId: string): Promise<SettingsSurfaceState> {
  return page.evaluate((testId) => {
    const panel = document.querySelector('.settings-panel-shell')
    const rail = document.querySelector('[data-testid="settings-navigation-rail"]')
    const main = document.querySelector('[data-testid="settings-main-surface"]')
    const card = document.querySelector(`[data-testid="${testId}"]`)
    if (!panel || !rail || !main || !card) {
      throw new Error(`Missing Settings surface for ${testId}`)
    }

    const railBox = rail.getBoundingClientRect()
    const mainBox = main.getBoundingClientRect()
    return {
      panelBackground: getComputedStyle(panel).backgroundImage,
      railBackground: getComputedStyle(rail).backgroundImage,
      mainBackground: getComputedStyle(main).backgroundImage,
      cardBackground: getComputedStyle(card).backgroundColor,
      railRight: railBox.right,
      mainLeft: mainBox.left,
    }
  }, cardTestId)
}

async function selectThemePreset(page: Page, preset: string): Promise<void> {
  await page.getByTestId('settings-nav-settings-appearance').click()
  await page.getByTestId(`settings-theme-preset-${preset}`).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme-preset', preset)
}

test.describe('Settings theme surface screenshots', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 980 })
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('sidebar-top-nav')).toBeVisible({ timeout: 10_000 })
  })

  test('Settings shell, rail, main surface, and private cards follow selected themes', async ({ page }, testInfo) => {
    const panel = await openSettings(page)
    const states: SettingsSurfaceState[] = []

    for (const preset of ['nocturne', 'living-archive', 'daylight-atelier']) {
      await selectThemePreset(page, preset)
      const appearanceState = await captureSettingsSurfaceState(page, 'theme-pack-settings')
      expect(appearanceState.panelBackground).not.toBe('none')
      expect(appearanceState.railBackground).not.toBe('none')
      expect(appearanceState.mainBackground).not.toBe('none')
      expect(appearanceState.cardBackground).not.toBe('rgba(0, 0, 0, 0)')
      expect(appearanceState.railRight).toBeLessThanOrEqual(appearanceState.mainLeft + 1)
      states.push(appearanceState)

      await testInfo.attach(`settings-${preset}-appearance`, {
        body: await panel.screenshot(),
        contentType: 'image/png',
      })
    }

    await page.getByTestId('settings-nav-settings-portability').click()
    const portabilityState = await captureSettingsSurfaceState(page, 'locality-firewall-card')
    expect(portabilityState.cardBackground).not.toBe('rgba(0, 0, 0, 0)')
    await testInfo.attach('settings-living-archive-portability', {
      body: await panel.screenshot(),
      contentType: 'image/png',
    })

    expect(new Set(states.map((state) => state.mainBackground)).size).toBeGreaterThan(1)
  })
})
