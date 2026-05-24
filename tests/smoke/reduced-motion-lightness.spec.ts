import { test, expect, type Page, type TestInfo } from '@playwright/test'
import { executeCommand, openCommandPalette } from './helpers'

type MotionState = {
  animationName: string
  animationDuration: string
  transitionDuration: string
  transform: string
}

type ScrollProbeState = {
  block: ScrollLogicalPosition | null
  behavior: ScrollBehavior | null
  rawType: string
  target: string
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

async function captureSurface(page: Page, testInfo: TestInfo, name: string): Promise<void> {
  await testInfo.attach(name, {
    body: await page.screenshot({ fullPage: false }),
    contentType: 'image/png',
  })
}

async function readMotionState(page: Page, selector: string): Promise<MotionState> {
  return page.evaluate((targetSelector) => {
    const element = document.querySelector(targetSelector)
    if (!element) throw new Error(`Missing motion target: ${targetSelector}`)
    const style = getComputedStyle(element)
    return {
      animationName: style.animationName,
      animationDuration: style.animationDuration,
      transitionDuration: style.transitionDuration,
      transform: style.transform,
    }
  }, selector)
}

function durationList(value: string): number[] {
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      if (part.endsWith('ms')) return Number.parseFloat(part)
      if (part.endsWith('s')) return Number.parseFloat(part) * 1_000
      return Number.parseFloat(part) || 0
    })
}

function expectNoRuntimeMotion(state: MotionState): void {
  expect(state.animationName.split(',').map((name) => name.trim()).every((name) => name === 'none')).toBe(true)
  expect(durationList(state.animationDuration).every((durationMs) => durationMs <= 1)).toBe(true)
  expect(durationList(state.transitionDuration).every((durationMs) => durationMs <= 1)).toBe(true)
  expect(state.transform).toBe('none')
}

async function installScrollProbe(page: Page): Promise<void> {
  await page.evaluate(() => {
    const targetWindow = window as Window & {
      __grimoireReducedMotionScroll?: {
        options: ScrollIntoViewOptions | boolean | null
        target: string
      }
    }
    const originalScrollIntoView = Element.prototype.scrollIntoView
    targetWindow.__grimoireReducedMotionScroll = undefined

    Element.prototype.scrollIntoView = function scrollIntoViewProbe(
      this: Element,
      arg?: boolean | ScrollIntoViewOptions,
    ) {
      targetWindow.__grimoireReducedMotionScroll = {
        options: arg ?? null,
        target: `${this.tagName.toLowerCase()}.${this.className.toString()} ${this.textContent?.trim().slice(0, 80) ?? ''}`,
      }
      Element.prototype.scrollIntoView = originalScrollIntoView
      return originalScrollIntoView.call(this, arg)
    }
  })
}

async function readScrollProbe(page: Page): Promise<ScrollProbeState> {
  return page.evaluate(() => {
    const targetWindow = window as Window & {
      __grimoireReducedMotionScroll?: {
        options: ScrollIntoViewOptions | boolean | null
        target: string
      }
    }
    const payload = targetWindow.__grimoireReducedMotionScroll
    const value = payload?.options
    const target = payload?.target ?? ''
    if (typeof value === 'boolean') return { block: null, behavior: null, rawType: 'boolean', target }
    if (value && typeof value === 'object') {
      return {
        block: value.block ?? null,
        behavior: value.behavior ?? null,
        rawType: 'options',
        target,
      }
    }
    return { block: null, behavior: null, rawType: 'empty', target }
  })
}

test.describe('Reduced motion lightness surfaces', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 980 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await openAllNotes(page)
  })

  test('Settings, workspace, and note navigator keep context without runtime motion', async ({ page }, testInfo) => {
    await openGrimoireProject(page)
    expectNoRuntimeMotion(await readMotionState(page, '.editor-scroll-area'))
    expectNoRuntimeMotion(await readMotionState(page, '.editor-agent-composer-wrap'))

    await openSettings(page)
    expectNoRuntimeMotion(await readMotionState(page, '.settings-panel-shell'))
    await page.getByTestId('settings-nav-settings-portability').click()
    await captureSurface(page, testInfo, 'reduced-motion-settings-portability')
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('settings-panel')).not.toBeVisible({ timeout: 5_000 })

    await page.locator('.bn-editor').click()
    await page.keyboard.press('Control+F')
    await expect(page.locator('.editor-navigator-popover-shell')).toBeVisible()
    expectNoRuntimeMotion(await readMotionState(page, '.editor-navigator-popover-shell'))
    await page.getByRole('textbox', { name: 'Search this note' }).fill('grimoire')
    await expect(page.locator('.editor-navigator__summary')).toContainText('matches')
    await captureSurface(page, testInfo, 'reduced-motion-note-search')

    await page.getByRole('tab', { name: 'TOC' }).click()
    await installScrollProbe(page)
    await page.getByRole('button', { name: 'H2 Headings' }).click()
    const scrollProbe = await readScrollProbe(page)
    expect(scrollProbe.rawType).toBe('options')
    expect(scrollProbe.block).toBe('center')
    expect(scrollProbe.behavior).toBeNull()
    const hitCount = await page.locator('.editor-navigator-hit-overlay').count()
    expect(hitCount, `navigator cue missing after scroll probe: ${JSON.stringify(scrollProbe)}`).toBeGreaterThan(0)
    expectNoRuntimeMotion(await readMotionState(page, '.editor-navigator-hit-overlay'))
    await captureSurface(page, testInfo, 'reduced-motion-toc-jump')
  })
})
