import { expect, type Page, type TestInfo, test } from '@playwright/test'
import fs from 'fs'
import os from 'os'
import path from 'path'
import {
  createFixtureVaultCopy,
  openFixtureVault,
  removeFixtureVaultCopy,
} from '../helpers/fixtureVault'
import { executeCommand, openCommandPalette } from './helpers'

const ATLAS_PRESETS = [
  'constellation',
  'daylight-notebook',
  'morning-notebook',
  'living-archive',
  'nocturne',
  'code-notebook',
] as const

type AtlasPreset = typeof ATLAS_PRESETS[number]

interface ThemeAtlasState {
  activeGlyphBorder: string
  activeGlyphColor: string
  appBackground: string
  editorBackground: string
  graphNodesVisible: boolean
  horizontalOverflow: number
  inspectorVisible: boolean
  mode: string | null
  noteListBackground: string
  preset: string | null
  secondBrainVisible: boolean
  sidebarBackground: string
}

let tempVaultDir: string

async function openSettings(page: Page): Promise<void> {
  await page.locator('body').click()
  await page.keyboard.press('Meta+,')
  const panel = page.getByTestId('settings-panel')
  try {
    await panel.waitFor({ timeout: 2_000 })
    return
  } catch {
    await openCommandPalette(page)
    await executeCommand(page, 'Settings')
    await panel.waitFor({ timeout: 5_000 })
  }
}

async function selectThemePreset(page: Page, preset: AtlasPreset): Promise<void> {
  await openSettings(page)
  const appearanceNav = page.getByTestId('settings-nav-settings-appearance')
  if (await appearanceNav.isVisible()) {
    await appearanceNav.click()
  } else {
    await page.getByTestId('settings-mobile-nav-settings-appearance').click()
  }

  await page.getByTestId(`settings-theme-preset-${preset}`).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme-preset', preset)
  await page.getByTestId('settings-save').click()
  await expect(page.getByTestId('settings-panel')).not.toBeVisible({ timeout: 5_000 })
}

async function openEditorShell(page: Page): Promise<void> {
  const alphaProject = page.locator('[data-note-path$="/project/alpha-project.md"]').first()
  await expect(alphaProject).toBeVisible({ timeout: 10_000 })
  await alphaProject.click()
  await expect(page.getByTestId('breadcrumb-filename-trigger')).toContainText('alpha-project', { timeout: 5_000 })
  await expect(page.locator('.bn-editor')).toBeVisible({ timeout: 5_000 })

  if (!(await page.getByTestId('second-brain-panel').isVisible().catch(() => false))) {
    await page.getByRole('button', { name: 'Open the properties panel' }).click()
  }
  await expect(page.getByTestId('second-brain-panel')).toBeVisible({ timeout: 5_000 })
}

function isGreenCast(value: string): boolean {
  const match = value.match(/rgb\((?<red>\d+), (?<green>\d+), (?<blue>\d+)\)/u)
  if (!match?.groups) return false
  const red = Number.parseInt(match.groups.red, 10)
  const green = Number.parseInt(match.groups.green, 10)
  const blue = Number.parseInt(match.groups.blue, 10)
  return green > blue && green - red > 4
}

async function captureThemeAtlasState(page: Page): Promise<ThemeAtlasState> {
  return page.evaluate(() => {
    const root = document.documentElement
    const app = document.querySelector('.app')
    const sidebar = document.querySelector('.app-sidebar-panel')
    const noteList = document.querySelector('.note-list-panel')
    const editor = document.querySelector('.editor, .editor-scroll-area')
    const inspector = document.querySelector('[data-testid="second-brain-panel"]')
    const activeGlyph = document.querySelector(
      '.sidebar-top-nav__tone[data-active="true"] .sidebar-nav-glyph, .sidebar-rail__tone[data-active="true"] .sidebar-rail__glyph',
    )

    const backgroundSignature = (element: Element | null) => {
      if (!element) return ''
      const style = getComputedStyle(element)
      return `${style.backgroundColor}|${style.backgroundImage}`
    }
    const readStyle = (element: Element | null, property: string) => (
      element ? getComputedStyle(element).getPropertyValue(property) : ''
    )

    return {
      activeGlyphBorder: readStyle(activeGlyph, 'border-color'),
      activeGlyphColor: readStyle(activeGlyph, 'color'),
      appBackground: backgroundSignature(app),
      editorBackground: backgroundSignature(editor),
      graphNodesVisible: document.body.innerText.includes('Graph Nodes'),
      horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      inspectorVisible: Boolean(inspector && getComputedStyle(inspector).display !== 'none'),
      mode: root.getAttribute('data-theme'),
      noteListBackground: backgroundSignature(noteList),
      preset: root.getAttribute('data-theme-preset'),
      secondBrainVisible: document.body.innerText.includes('Second Brain'),
      sidebarBackground: backgroundSignature(sidebar),
    }
  })
}

async function attachThemeScreenshot(page: Page, testInfo: TestInfo, preset: AtlasPreset): Promise<string> {
  const screenshot = await page.screenshot({ fullPage: false })
  const shotPath = path.join(os.tmpdir(), `grimoire-theme-atlas-${preset}.png`)
  fs.writeFileSync(shotPath, screenshot)
  await testInfo.attach(`theme-atlas-${preset}`, {
    body: screenshot,
    contentType: 'image/png',
  })
  return shotPath
}

test.describe('Theme atlas fidelity', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    testInfo.setTimeout(90_000)
    await page.setViewportSize({ width: 1440, height: 900 })
    tempVaultDir = createFixtureVaultCopy()
    await openFixtureVault(page, tempVaultDir)
    await page.locator('body').evaluate(() => document.body.classList.add('macos-overlay-chrome'))
  })

  test.afterEach(async () => {
    removeFixtureVaultCopy(tempVaultDir)
  })

  test('built-in presets render as distinct complete workspace personalities', async ({ page }, testInfo) => {
    const signatures = new Set<string>()

    for (const preset of ATLAS_PRESETS) {
      await selectThemePreset(page, preset)
      await openEditorShell(page)

      const state = await captureThemeAtlasState(page)
      expect(state.preset).toBe(preset)
      expect(state.appBackground).not.toBe('|')
      expect(state.sidebarBackground).not.toBe('|')
      expect(state.noteListBackground).not.toBe('|')
      expect(state.editorBackground).not.toBe('|')
      expect(state.inspectorVisible).toBe(true)
      expect(state.secondBrainVisible).toBe(true)
      expect(state.graphNodesVisible).toBe(true)
      expect(state.horizontalOverflow).toBeLessThanOrEqual(1)
      expect(state.activeGlyphColor).not.toHaveLength(0)
      expect(state.activeGlyphBorder).not.toHaveLength(0)

      if (state.mode === 'dark') {
        expect(isGreenCast(state.appBackground), `${preset} app background is green-cast`).toBe(false)
        expect(isGreenCast(state.sidebarBackground), `${preset} sidebar background is green-cast`).toBe(false)
        expect(isGreenCast(state.editorBackground), `${preset} editor background is green-cast`).toBe(false)
      }

      signatures.add([
        state.mode,
        state.appBackground,
        state.sidebarBackground,
        state.noteListBackground,
        state.editorBackground,
        state.activeGlyphColor,
      ].join('\n'))

      const shotPath = await attachThemeScreenshot(page, testInfo, preset)
      testInfo.annotations.push({ type: 'theme screenshot', description: shotPath })
    }

    expect(signatures.size).toBe(ATLAS_PRESETS.length)
  })
})
