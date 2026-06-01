import { test, expect, type Page } from '@playwright/test'
import { triggerShortcutCommand } from './testBridge'

const SURFACE_OPEN_BUDGET_MS = 4_000
const NOTE_SWITCH_BUDGET_MS = 5_000
const NAVIGATOR_BUDGET_MS = 3_000
const LONG_LIST_SEARCH_BUDGET_MS = 4_000
const LONG_LIST_INPUT_ECHO_BUDGET_MS = 500
const LONG_LIST_VISIBLE_LOCK_GAP_MS = 150
const LONG_LIST_RENDERED_ROW_LIMIT = 160
const COMMAND_IDS = {
  fileQuickOpen: 'file-quick-open',
  viewCommandPalette: 'view-command-palette',
} as const

async function measureUntil(
  page: Page,
  action: () => Promise<void>,
  predicate: () => boolean,
  timeoutMs: number,
): Promise<number> {
  const startedAt = await page.evaluate(() => performance.now())
  await action()
  await page.waitForFunction(predicate, undefined, { timeout: timeoutMs })
  const endedAt = await page.evaluate(() => performance.now())
  return endedAt - startedAt
}

async function measureScrollIntoView(
  page: Page,
  action: () => Promise<void>,
  timeoutMs: number,
): Promise<number> {
  await page.evaluate((timeout) => {
    const targetWindow = window as Window & { __grimoireScrollIntoViewMs?: Promise<number | null> }
    targetWindow.__grimoireScrollIntoViewMs = new Promise((resolve) => {
      const startedAt = performance.now()
      const originalScrollIntoView = Element.prototype.scrollIntoView
      let timeoutId = 0

      const finish = (duration: number | null) => {
        Element.prototype.scrollIntoView = originalScrollIntoView
        window.clearTimeout(timeoutId)
        resolve(duration)
      }

      Element.prototype.scrollIntoView = function scrollIntoViewProbe(this: Element, arg?: boolean | ScrollIntoViewOptions) {
        finish(performance.now() - startedAt)
        return originalScrollIntoView.call(this, arg)
      }
      timeoutId = window.setTimeout(() => finish(null), timeout)
    })
  }, timeoutMs)

  await action()
  const elapsed = await page.evaluate(() => {
    const targetWindow = window as Window & { __grimoireScrollIntoViewMs?: Promise<number | null> }
    return targetWindow.__grimoireScrollIntoViewMs ?? null
  })
  expect(elapsed).not.toBeNull()
  return elapsed ?? timeoutMs
}

async function measureResponsiveUntil(
  page: Page,
  action: () => Promise<void>,
  predicate: () => boolean,
  timeoutMs: number,
): Promise<{ actionMs: number; elapsedMs: number; maxFrameGapMs: number }> {
  const startedAt = await page.evaluate(() => performance.now())
  await page.evaluate(() => {
    const targetWindow = window as Window & { __grimoireFrameGapProbe?: { stop: () => number } }
    let maxGap = 0
    let lastFrameAt = performance.now()
    let frameId = 0
    let active = true

    const tick = (timestamp: number) => {
      maxGap = Math.max(maxGap, timestamp - lastFrameAt)
      lastFrameAt = timestamp
      if (active) frameId = requestAnimationFrame(tick)
    }

    frameId = requestAnimationFrame(tick)
    targetWindow.__grimoireFrameGapProbe = {
      stop: () => {
        active = false
        cancelAnimationFrame(frameId)
        return maxGap
      },
    }
  })

  await action()
  const actionEndedAt = await page.evaluate(() => performance.now())
  await page.waitForFunction(predicate, undefined, { timeout: timeoutMs })
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())))
  const endedAt = await page.evaluate(() => performance.now())
  const maxFrameGapMs = await page.evaluate(() => {
    const targetWindow = window as Window & { __grimoireFrameGapProbe?: { stop: () => number } }
    return targetWindow.__grimoireFrameGapProbe?.stop() ?? 0
  })
  return { actionMs: actionEndedAt - startedAt, elapsedMs: endedAt - startedAt, maxFrameGapMs }
}

async function openAllNotes(page: Page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.getByTestId('sidebar-top-nav')).toBeVisible({ timeout: 10_000 })
  await page.getByText('All Notes', { exact: true }).first().click()
  await expect(page.getByTestId('note-list-container')).toBeVisible({ timeout: 10_000 })
}

async function installLargeVaultMocks(page: Page, entryCount: number) {
  await page.addInitScript((count) => {
    type BrowserVaultEntry = Record<string, unknown>

    const now = Math.floor(Date.now() / 1000)
    const makeEntry = (index: number): BrowserVaultEntry => {
      const isNeedle = index === count - 1
      const title = isNeedle ? 'Needle Capsule Long Vault' : `Long Vault Note ${index + 1}`
      const slug = title.toLowerCase().replace(/\s+/g, '-')
      return {
        path: `/Users/mock/demo-vault-v2/long/${slug}.md`,
        filename: `${slug}.md`,
        title,
        isA: index % 5 === 0 ? 'Project' : 'Note',
        aliases: [],
        belongsTo: [],
        relatedTo: [],
        status: index % 7 === 0 ? 'Active' : null,
        archived: false,
        modifiedAt: now - index,
        createdAt: now - 100_000 - index,
        fileSize: 500 + index,
        snippet: isNeedle ? 'needle-capsule target text for the long vault search guard' : `Filler body ${index + 1}`,
        wordCount: 80 + (index % 70),
        relationships: {},
        icon: null,
        color: null,
        order: null,
        sidebarLabel: null,
        template: null,
        sort: null,
        view: null,
        visible: null,
        organized: false,
        favorite: false,
        favoriteIndex: null,
        listPropertiesDisplay: [],
        outgoingLinks: [],
        properties: {},
        hasH1: false,
      }
    }
    const entries = Array.from({ length: count }, (_unused, index) => makeEntry(index))
    const patchHandlers = (handlers: Record<string, (args?: unknown) => unknown> | undefined) => {
      if (!handlers) return handlers
      return Object.assign(handlers, {
        list_vault: () => entries,
        reload_vault: () => entries,
        reload_vault_entry: (args?: { path?: string }) => entries.find((entry) => entry.path === args?.path) ?? entries[0],
        get_note_content: (args?: { path?: string }) => `# ${entries.find((entry) => entry.path === args?.path)?.title ?? 'Long Vault Note'}\n\nMock long-vault content.`,
      })
    }

    let ref = patchHandlers(window.__mockHandlers) ?? null
    Object.defineProperty(window, '__mockHandlers', {
      configurable: true,
      get() {
        return patchHandlers(ref) ?? ref
      },
      set(value) {
        ref = patchHandlers(value as Record<string, (args?: unknown) => unknown> | undefined) ?? null
      },
    })
  }, entryCount)
}

async function openGrimoireProject(page: Page) {
  await page.locator('[data-note-path$="/26q1-grimoire-app.md"]').first().click()
  await expect(page.getByTestId('breadcrumb-filename-trigger')).toContainText('26q1-grimoire-app', {
    timeout: NOTE_SWITCH_BUDGET_MS,
  })
  await expect(page.locator('.bn-editor')).toBeVisible({ timeout: NOTE_SWITCH_BUDGET_MS })
}

test.describe('Runtime lightness latency checks', () => {
  test('command palette and quick open focus before the user feels the shell', async ({ page }) => {
    await openAllNotes(page)

    const commandPaletteMs = await measureUntil(
      page,
      () => triggerShortcutCommand(page, COMMAND_IDS.viewCommandPalette),
      () => document.querySelector('[data-testid="command-palette-surface"]') !== null
        && document.activeElement?.matches('input[placeholder="Type a command..."]') === true,
      SURFACE_OPEN_BUDGET_MS,
    )
    expect(commandPaletteMs).toBeLessThan(SURFACE_OPEN_BUDGET_MS)

    await page.keyboard.press('Escape')
    await expect(page.getByTestId('command-palette-surface')).not.toBeVisible()

    const quickOpenMs = await measureUntil(
      page,
      () => triggerShortcutCommand(page, COMMAND_IDS.fileQuickOpen),
      () => document.querySelector('[data-testid="quick-open-palette"]') !== null
        && document.activeElement?.getAttribute('data-testid') === 'quick-open-input',
      SURFACE_OPEN_BUDGET_MS,
    )
    expect(quickOpenMs).toBeLessThan(SURFACE_OPEN_BUDGET_MS)
  })

  test('long all-notes lists stay virtualized while note-list search responds', async ({ page }) => {
    await installLargeVaultMocks(page, 2_500)
    await openAllNotes(page)

    const visibleRows = page.getByTestId('note-list-container').locator('[data-note-path]')
    await expect(page.getByText('Long Vault Note 1', { exact: true })).toBeVisible({ timeout: SURFACE_OPEN_BUDGET_MS })
    expect(await visibleRows.count()).toBeLessThan(LONG_LIST_RENDERED_ROW_LIMIT)

    await page.getByRole('button', { name: 'Search notes' }).click()
    const searchInput = page.getByPlaceholder('Search notes...')
    await expect(searchInput).toBeVisible({ timeout: SURFACE_OPEN_BUDGET_MS })

    const {
      actionMs: inputActionMs,
      elapsedMs: inputEchoMs,
      maxFrameGapMs: searchFrameGapMs,
    } = await measureResponsiveUntil(
      page,
      () => searchInput.fill('needle-capsule'),
      () => document.activeElement instanceof HTMLInputElement
        && document.activeElement.value === 'needle-capsule',
      LONG_LIST_INPUT_ECHO_BUDGET_MS,
    )
    expect(inputActionMs).toBeLessThan(LONG_LIST_INPUT_ECHO_BUDGET_MS)
    expect(inputEchoMs).toBeLessThan(LONG_LIST_INPUT_ECHO_BUDGET_MS)
    expect(searchFrameGapMs).toBeLessThan(LONG_LIST_VISIBLE_LOCK_GAP_MS)
    expect(await visibleRows.count()).toBeLessThan(LONG_LIST_RENDERED_ROW_LIMIT)

    const { elapsedMs: resultMs, maxFrameGapMs: resultFrameGapMs } = await measureResponsiveUntil(
      page,
      () => Promise.resolve(),
      () => Array.from(document.querySelectorAll('[data-note-path]'))
        .some((element) => element.textContent?.includes('Needle Capsule Long Vault')),
      LONG_LIST_SEARCH_BUDGET_MS,
    )
    expect(resultMs).toBeLessThan(LONG_LIST_SEARCH_BUDGET_MS)
    expect(resultFrameGapMs).toBeLessThan(LONG_LIST_VISIBLE_LOCK_GAP_MS)
    await expect(page.getByText('Needle Capsule Long Vault', { exact: true })).toBeVisible()
    expect(await visibleRows.count()).toBeLessThan(LONG_LIST_RENDERED_ROW_LIMIT)
  })

  test('note switch, in-note search, and TOC jump stay within interaction budgets', async ({ page }) => {
    await openAllNotes(page)
    await openGrimoireProject(page)

    const noteSwitchMs = await measureUntil(
      page,
      () => page.locator('[data-note-path$="/grow-newsletter.md"]').first().click(),
      () => document.querySelector('[data-testid="breadcrumb-filename-trigger"]')?.textContent?.includes('grow-newsletter') === true
        && document.querySelector('.bn-editor') !== null,
      NOTE_SWITCH_BUDGET_MS,
    )
    expect(noteSwitchMs).toBeLessThan(NOTE_SWITCH_BUDGET_MS)

    await openGrimoireProject(page)
    await page.locator('.bn-editor').click()
    await page.keyboard.press('Control+F')
    await expect(page.getByRole('textbox', { name: 'Search this note' })).toBeVisible({ timeout: NAVIGATOR_BUDGET_MS })

    const searchMs = await measureUntil(
      page,
      () => page.getByRole('textbox', { name: 'Search this note' }).fill('grimoire'),
      () => Array.from(document.querySelectorAll('.editor-navigator__summary'))
        .some((element) => element.textContent?.includes('matches')),
      NAVIGATOR_BUDGET_MS,
    )
    expect(searchMs).toBeLessThan(NAVIGATOR_BUDGET_MS)

    await page.getByRole('tab', { name: 'TOC' }).click()
    await expect(page.getByRole('button', { name: 'H2 Headings' })).toBeVisible({ timeout: NAVIGATOR_BUDGET_MS })

    const tocJumpMs = await measureScrollIntoView(
      page,
      () => page.getByRole('button', { name: 'H2 Headings' }).click(),
      NAVIGATOR_BUDGET_MS,
    )
    expect(tocJumpMs).toBeLessThan(NAVIGATOR_BUDGET_MS)
  })
})
