import { test, expect, type Page, type TestInfo } from '@playwright/test'
import { executeCommand, openCommandPalette } from './helpers'

type ForcedColorSurface = {
  backgroundImage: string
  boxShadow: string
  forcedColorAdjust: string
}

async function openAllNotes(page: Page): Promise<void> {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.getByTestId('sidebar-top-nav')).toBeVisible({ timeout: 10_000 })
  await page.getByText('All Notes', { exact: true }).first().click()
  await expect(page.getByTestId('note-list-container')).toBeVisible({ timeout: 10_000 })
}

async function openGrimoireProject(page: Page): Promise<void> {
  await page.locator('[data-note-path$="/26q1-grimoire-app.md"]').first().click()
  await expect(page.getByTestId('breadcrumb-filename-trigger')).toContainText('26q1-grimoire-app', {
    timeout: 5_000,
  })
  await expect(page.locator('.bn-editor')).toBeVisible({ timeout: 5_000 })
}

async function openSettings(page: Page): Promise<void> {
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
}

async function readSurface(page: Page, selector: string): Promise<ForcedColorSurface> {
  return page.evaluate((targetSelector) => {
    const element = document.querySelector(targetSelector)
    if (!element) throw new Error(`Missing forced-colors surface: ${targetSelector}`)
    const style = getComputedStyle(element)
    return {
      backgroundImage: style.backgroundImage,
      boxShadow: style.boxShadow,
      forcedColorAdjust: style.forcedColorAdjust,
    }
  }, selector)
}

function expectForcedColorSurface(surface: ForcedColorSurface): void {
  expect(surface.backgroundImage).toBe('none')
  expect(surface.boxShadow).toBe('none')
  expect(surface.forcedColorAdjust).toBe('auto')
}

async function captureSurface(page: Page, testInfo: TestInfo, name: string): Promise<void> {
  await testInfo.attach(name, {
    body: await page.screenshot({ fullPage: false }),
    contentType: 'image/png',
  })
}

test.describe('Forced-colors theme surfaces', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 980 })
    await page.emulateMedia({ forcedColors: 'active' })
    await openAllNotes(page)
  })

  test('workspace, Settings, status bar, and navigator use OS high-contrast colors', async ({ page }, testInfo) => {
    await expect.poll(() => page.evaluate(() => matchMedia('(forced-colors: active)').matches)).toBe(true)
    await openGrimoireProject(page)

    for (const selector of ['.app-sidebar-panel', '.note-list-panel', '.editor-scroll-area', '.status-bar']) {
      expectForcedColorSurface(await readSurface(page, selector))
    }

    await openSettings(page)
    for (const selector of ['.settings-panel-shell', '.settings-navigation-rail', '.settings-main-surface']) {
      expectForcedColorSurface(await readSurface(page, selector))
    }
    await page.getByTestId('settings-nav-settings-portability').focus()
    const focusOutline = await page.evaluate(() => getComputedStyle(document.activeElement as Element).outlineStyle)
    expect(focusOutline).toBe('solid')
    await captureSurface(page, testInfo, 'forced-colors-settings')

    await page.keyboard.press('Escape')
    await expect(page.getByTestId('settings-panel')).not.toBeVisible({ timeout: 5_000 })
    await page.locator('.bn-editor').click()
    await page.keyboard.press('Control+F')
    await expect(page.locator('.editor-navigator-popover-shell')).toBeVisible()
    expectForcedColorSurface(await readSurface(page, '.editor-navigator-popover-shell'))
    await captureSurface(page, testInfo, 'forced-colors-navigator')
  })
})
