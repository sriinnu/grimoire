import { test, expect, type Page, type TestInfo } from '@playwright/test'
import { executeCommand, openCommandPalette } from './helpers'

const NOTE_SWITCH_TIMEOUT_MS = 5_000

async function openAllNotes(page: Page): Promise<void> {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.getByTestId('sidebar-top-nav')).toBeVisible({ timeout: 10_000 })
  await page.getByText('Pages', { exact: true }).first().click()
  await expect(page.getByTestId('note-list-container')).toBeVisible({ timeout: 10_000 })
}

async function openGrimoireProject(page: Page): Promise<void> {
  await page.locator('[data-note-path$="/26q1-grimoire-app.md"]').first().click()
  await expect(page.getByTestId('breadcrumb-filename-trigger')).toContainText('26q1-grimoire-app', {
    timeout: NOTE_SWITCH_TIMEOUT_MS,
  })
  await expect(page.locator('.bn-editor')).toBeVisible({ timeout: NOTE_SWITCH_TIMEOUT_MS })
}

async function captureSurface(page: Page, testInfo: TestInfo, name: string) {
  await testInfo.attach(name, {
    body: await page.screenshot({ fullPage: false }),
    contentType: 'image/png',
  })
}

type NativeShellChromeState = {
  noteHeaderBackgroundImage: string
  noteHeaderBorderBottomColor: string
  rootMaterial: string | null
  sidebarTargets: Array<{
    className: string
    backgroundImage: string
  }>
}

function readNativeShellChromeState(): NativeShellChromeState {
  const sidebarTargets = Array.from(
    document.querySelectorAll<HTMLElement>('.app-sidebar-panel, .app-sidebar-rail, .sidebar-title-bar'),
  )
  const noteHeader = document.querySelector<HTMLElement>('.note-list-chrome-row')
  if (sidebarTargets.length === 0 || !noteHeader) throw new Error('Native shell chrome targets are missing')
  const noteHeaderStyle = getComputedStyle(noteHeader)
  return {
    noteHeaderBackgroundImage: noteHeaderStyle.backgroundImage,
    noteHeaderBorderBottomColor: noteHeaderStyle.borderBottomColor,
    rootMaterial: document.documentElement.getAttribute('data-native-shell-material'),
    sidebarTargets: sidebarTargets.map((target) => ({
      backgroundImage: getComputedStyle(target).backgroundImage,
      className: target.className,
    })),
  }
}

async function expectScrollIntoView(page: Page, action: () => Promise<void>): Promise<void> {
  await page.evaluate(() => {
    const targetWindow = window as Window & { __grimoireWorkspaceScrollSeen?: Promise<boolean> }
    targetWindow.__grimoireWorkspaceScrollSeen = new Promise((resolve) => {
      const originalScrollIntoView = Element.prototype.scrollIntoView
      let timeoutId = 0

      const finish = (seen: boolean) => {
        Element.prototype.scrollIntoView = originalScrollIntoView
        window.clearTimeout(timeoutId)
        resolve(seen)
      }

      Element.prototype.scrollIntoView = function scrollIntoViewProbe(this: Element, arg?: boolean | ScrollIntoViewOptions) {
        finish(true)
        return originalScrollIntoView.call(this, arg)
      }
      timeoutId = window.setTimeout(() => finish(false), 3_000)
    })
  })

  await action()
  await expect.poll(
    () => page.evaluate(() => {
      const targetWindow = window as Window & { __grimoireWorkspaceScrollSeen?: Promise<boolean> }
      return targetWindow.__grimoireWorkspaceScrollSeen ?? false
    }),
    { timeout: 3_500 },
  ).toBe(true)
}

async function openSettings(page: Page): Promise<void> {
  await page.locator('body').click()
  await page.keyboard.press('Meta+,')
  const panel = page.getByTestId('settings-panel')
  try {
    await panel.waitFor({ timeout: 2_000 })
    return
  } catch {
    const settingsButton = page.getByTestId('status-settings')
    if (await settingsButton.isVisible()) {
      await settingsButton.click()
      await panel.waitFor({ timeout: 5_000 })
      return
    }
    await openCommandPalette(page)
    await executeCommand(page, 'Settings')
    await panel.waitFor({ timeout: 5_000 })
  }
}

test.describe('Workspace lightness screenshots', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 980 })
    await openAllNotes(page)
  })

  test('main workspace, collapsed sidebar, and long-note navigator stay visually inspectable', async ({ page }, testInfo) => {
    await openGrimoireProject(page)
    await expect(page.getByTestId('breadcrumb-filename-trigger')).toBeVisible()
    await expect(page.getByTestId('note-list-container')).toBeVisible()
    await captureSurface(page, testInfo, 'workspace-main-nocturne')

    await page.evaluate(() => document.body.classList.add('macos-overlay-chrome'))
    await page.getByRole('button', { name: 'Collapse sidebar' }).click()
    const rail = page.getByTestId('sidebar-rail')
    const mark = page.locator('.app-sidebar-rail__mark')
    await expect(rail).toBeVisible()
    await expect(mark).toBeVisible()

    const overlap = await page.evaluate(() => {
      const railNode = document.querySelector('[data-testid="sidebar-rail"]')
      const markNode = document.querySelector('.app-sidebar-rail__mark')
      if (!railNode || !markNode) throw new Error('Collapsed sidebar rail is missing')
      const railBox = railNode.getBoundingClientRect()
      const markBox = markNode.getBoundingClientRect()
      const railStyle = getComputedStyle(railNode)
      return {
        railTop: railBox.top,
        markTop: markBox.top,
        markLeft: markBox.left,
        markRight: markBox.right,
        railLeft: railBox.left,
        railRight: railBox.right,
        railPaddingTop: Number.parseFloat(railStyle.paddingTop),
        rootZoom: Number.parseFloat(getComputedStyle(document.documentElement).zoom) || 1,
      }
    })
    expect(overlap.railPaddingTop).toBeGreaterThanOrEqual(82)
    expect(overlap.markTop - overlap.railTop).toBeGreaterThanOrEqual(overlap.railPaddingTop * overlap.rootZoom * 0.9)
    expect(overlap.markLeft).toBeGreaterThanOrEqual(overlap.railLeft)
    expect(overlap.markRight).toBeLessThanOrEqual(overlap.railRight)
    await captureSurface(page, testInfo, 'workspace-collapsed-sidebar-macos-safe')

    await page.locator('.bn-editor').click()
    await page.keyboard.press('Control+F')
    await expect(page.getByRole('textbox', { name: 'Search this note' })).toBeVisible()
    await page.getByRole('textbox', { name: 'Search this note' }).fill('grimoire')
    await expect(page.locator('.editor-navigator__summary')).toContainText('matches')
    await captureSurface(page, testInfo, 'workspace-long-note-search')

    await page.getByRole('tab', { name: 'TOC' }).click()
    await expect(page.getByRole('button', { name: 'H2 Headings' })).toBeVisible()
    await expectScrollIntoView(page, () => page.getByRole('button', { name: 'H2 Headings' }).click())
    await captureSurface(page, testInfo, 'workspace-long-note-toc')
  })

  test('theme switching keeps the main workspace and editor navigator on themed materials', async ({ page }, testInfo) => {
    await openSettings(page)
    await page.getByTestId('settings-nav-settings-appearance').click()
    await page.getByTestId('settings-theme-preset-living-archive').click()
    await expect(page.locator('html')).toHaveAttribute('data-theme-preset', 'living-archive')
    await page.getByTestId('settings-save').click()
    await expect(page.getByTestId('settings-panel')).not.toBeVisible({ timeout: 5_000 })

    await openGrimoireProject(page)
    await page.locator('.bn-editor').click()
    await page.keyboard.press('Control+F')
    await expect(page.locator('.editor-navigator-popover-shell')).toBeVisible()

    const materials = await page.evaluate(() => {
      const editor = document.querySelector('.editor')
      const navigator = document.querySelector('.editor-navigator-popover-shell')
      const noteList = document.querySelector('.note-list-panel')
      if (!editor || !navigator || !noteList) throw new Error('Workspace themed surfaces are missing')
      return {
        editorBackground: getComputedStyle(editor).backgroundImage,
        navigatorBackground: getComputedStyle(navigator).backgroundColor,
        noteListBackground: getComputedStyle(noteList).backgroundImage,
      }
    })
    expect(materials.editorBackground).not.toBe('none')
    expect(materials.navigatorBackground).not.toBe('rgba(0, 0, 0, 0)')
    expect(materials.noteListBackground).not.toBe('none')
    await captureSurface(page, testInfo, 'workspace-living-archive-navigator')
  })

  test('native shell material modes preserve standard theme chrome and tint explicit variants', async ({ page }, testInfo) => {
    await openGrimoireProject(page)
    await page.evaluate(() => {
      document.body.classList.add('macos-overlay-chrome')
      document.documentElement.removeAttribute('data-native-shell-material')
    })

    const baselineChrome = await page.evaluate(readNativeShellChromeState)
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-native-shell-material', 'standard')
    })
    const standardChrome = await page.evaluate(readNativeShellChromeState)
    expect(standardChrome).toEqual({ ...baselineChrome, rootMaterial: 'standard' })

    for (const mode of ['unified', 'glass-preview'] as const) {
      await page.evaluate((material) => {
        document.documentElement.setAttribute('data-native-shell-material', material)
      }, mode)
      await page.waitForTimeout(240)
      const tintedChrome = await page.evaluate(readNativeShellChromeState)
      expect(tintedChrome.rootMaterial).toBe(mode)
      expect(tintedChrome.sidebarTargets).toHaveLength(standardChrome.sidebarTargets.length)
      for (const [index, target] of tintedChrome.sidebarTargets.entries()) {
        expect(target.className).toBe(standardChrome.sidebarTargets[index].className)
        expect(target.backgroundImage).not.toBe(standardChrome.sidebarTargets[index].backgroundImage)
      }
      expect(tintedChrome.noteHeaderBackgroundImage).not.toBe(standardChrome.noteHeaderBackgroundImage)
      expect(tintedChrome.noteHeaderBorderBottomColor).not.toBe(standardChrome.noteHeaderBorderBottomColor)
      await captureSurface(page, testInfo, `workspace-native-shell-${mode}`)
    }
  })
})
