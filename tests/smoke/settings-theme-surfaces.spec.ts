import { test, expect, type Page } from '@playwright/test'
import { executeCommand, openCommandPalette } from './helpers'

type SettingsSurfaceState = {
  panelBackground: string
  railBackground: string
  mobileRailBackground: string
  mainBackground: string
  cardBackground: string
  cardBackgroundImage: string
  railRight: number
  mainLeft: number
  railVisible: boolean
  overflowX: number
}

type TypographyRoleState = {
  display: string
  editor: string
  label: string
  mono: string
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
    const mobileRail = document.querySelector('[data-testid="settings-mobile-navigation"]')
    const main = document.querySelector('[data-testid="settings-main-surface"]')
    const card = document.querySelector(`[data-testid="${testId}"]`)
    if (!panel || !rail || !mobileRail || !main || !card) {
      throw new Error(`Missing Settings surface for ${testId}`)
    }

    const railBox = rail.getBoundingClientRect()
    const mainBox = main.getBoundingClientRect()
    return {
      panelBackground: getComputedStyle(panel).backgroundImage,
      railBackground: getComputedStyle(rail).backgroundImage,
      mobileRailBackground: getComputedStyle(mobileRail).backgroundImage,
      mainBackground: getComputedStyle(main).backgroundImage,
      cardBackground: getComputedStyle(card).backgroundColor,
      cardBackgroundImage: getComputedStyle(card).backgroundImage,
      railRight: railBox.right,
      mainLeft: mainBox.left,
      railVisible: getComputedStyle(rail).display !== 'none',
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    }
  }, cardTestId)
}

function expectVisibleCardMaterial(state: SettingsSurfaceState): void {
  const hasBackgroundImage = state.cardBackgroundImage !== 'none'
  const hasBackgroundColor = state.cardBackground !== 'rgba(0, 0, 0, 0)'
  expect(hasBackgroundImage || hasBackgroundColor).toBe(true)
}

async function captureTypographyRoleState(page: Page): Promise<TypographyRoleState> {
  return page.evaluate(() => {
    const style = getComputedStyle(document.documentElement)
    return {
      display: style.getPropertyValue('--grimoire-display-font-family'),
      editor: style.getPropertyValue('--grimoire-editor-font-family'),
      label: style.getPropertyValue('--grimoire-label-font-family'),
      mono: style.getPropertyValue('--grimoire-mono-font-family'),
    }
  })
}

async function selectThemePreset(page: Page, preset: string): Promise<void> {
  const desktopNav = page.getByTestId('settings-nav-settings-appearance')
  if (await desktopNav.isVisible()) {
    await desktopNav.click()
  } else {
    await page.getByTestId('settings-mobile-nav-settings-appearance').click()
  }
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
      expectVisibleCardMaterial(appearanceState)
      expect(appearanceState.railVisible).toBe(true)
      expect(appearanceState.railRight).toBeLessThanOrEqual(appearanceState.mainLeft + 1)
      expect(appearanceState.overflowX).toBeLessThanOrEqual(1)
      states.push(appearanceState)

      await testInfo.attach(`settings-${preset}-appearance`, {
        body: await panel.screenshot(),
        contentType: 'image/png',
      })
    }

    await page.getByTestId('settings-nav-settings-portability').click()
    const portabilityState = await captureSettingsSurfaceState(page, 'locality-firewall-card')
    expectVisibleCardMaterial(portabilityState)
    await testInfo.attach('settings-living-archive-portability', {
      body: await panel.screenshot(),
      contentType: 'image/png',
    })

    expect(new Set(states.map((state) => state.mainBackground)).size).toBeGreaterThan(1)
  })

  test('iPad Settings keeps a theme-owned section rail when the desktop rail collapses', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 744, height: 980 })
    const panel = await openSettings(page)
    await selectThemePreset(page, 'living-archive')

    await expect(page.getByTestId('settings-navigation-rail')).toBeHidden()
    await expect(page.getByTestId('settings-mobile-navigation')).toBeVisible()

    await page.getByTestId('settings-mobile-nav-settings-portability').click()
    await expect(page.getByTestId('settings-mobile-nav-settings-portability')).toHaveAttribute('aria-current', 'page')

    const state = await captureSettingsSurfaceState(page, 'locality-firewall-card')
    expect(state.railVisible).toBe(false)
    expect(state.mobileRailBackground).not.toBe('none')
    expect(state.mainBackground).not.toBe('none')
    expect(state.overflowX).toBeLessThanOrEqual(1)
    expectVisibleCardMaterial(state)

    await testInfo.attach('settings-ipad-mobile-navigation', {
      body: await panel.screenshot(),
      contentType: 'image/png',
    })
  })

  test('Typography role edits save through local theme JSON and update live font variables', async ({ page }, testInfo) => {
    const panel = await openSettings(page)
    await selectThemePreset(page, 'nocturne')
    await expect(page.getByTestId('theme-pack-typography-roles')).toBeVisible()

    await page.getByLabel('Headings font stack').fill("'Grimoire Heading Test', serif")
    await page.getByLabel('Body and lists font stack').fill("'Grimoire Body Test', system-ui, sans-serif")
    await page.getByLabel('Code font stack').fill("'Grimoire Code Test', monospace")
    await page.getByLabel('Labels font stack').fill("'Grimoire Label Test', sans-serif")
    await page.getByTestId('theme-pack-apply-typography').click()

    await expect(page.getByTestId('theme-pack-contract-summary')).toContainText(
      'Fonts display, editor, mono, label',
    )
    await expect.poll(async () => (await captureTypographyRoleState(page)).display).toContain('Grimoire Heading Test')
    await expect.poll(async () => (await captureTypographyRoleState(page)).editor).toContain('Grimoire Body Test')
    await expect.poll(async () => (await captureTypographyRoleState(page)).mono).toContain('Grimoire Code Test')
    await expect.poll(async () => (await captureTypographyRoleState(page)).label).toContain('Grimoire Label Test')

    const storedTypography = await page.evaluate(() => {
      const stored = window.localStorage.getItem('grimoire:local-theme-pack')
      if (!stored) return null
      return JSON.parse(stored).typography as Record<string, string>
    })
    expect(storedTypography).toMatchObject({
      display: "'Grimoire Heading Test', serif",
      editor: "'Grimoire Body Test', system-ui, sans-serif",
      mono: "'Grimoire Code Test', monospace",
      label: "'Grimoire Label Test', sans-serif",
    })

    await testInfo.attach('settings-typography-roles', {
      body: await panel.screenshot(),
      contentType: 'image/png',
    })
  })
})
