import { test, expect, type Page } from '@playwright/test'
import { executeCommand, openCommandPalette } from './helpers'
import {
  EXPERIENCE_PROFILE_CONTRACTS,
  type ExperienceProfileContract,
} from './settingsExperienceProfileContracts'

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

type ExperienceProfileState = {
  canvas: string | null
  codeBlock: string | null
  definitionId: string | null
  density: string | null
  editorLineHeight: string
  editorMaxWidth: string
  graph: string | null
  heading: string | null
  id: string | null
  metadataFields: string | null
  metadataStrip: string | null
  mode: string | null
  motion: string | null
  primary: string
  surfaceApp: string
  surfaceEditor: string
  surfaceSidebar: string
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

function expectRenderedDarkSurfaceNeutral(value: string, label: string): void {
  const match = value.match(/^#(?<red>[0-9a-f]{2})(?<green>[0-9a-f]{2})(?<blue>[0-9a-f]{2})$/iu)
  expect(match?.groups, label).toBeDefined()
  const red = Number.parseInt(match!.groups!.red, 16)
  const green = Number.parseInt(match!.groups!.green, 16)
  const blue = Number.parseInt(match!.groups!.blue, 16)
  expect(blue >= green, `${label} rendered rgb(${red}, ${green}, ${blue}) should stay graphite, not greenish`).toBe(true)
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

async function captureExperienceProfileState(page: Page): Promise<ExperienceProfileState> {
  return page.evaluate(() => {
    const root = document.documentElement
    const style = getComputedStyle(root)
    const readCssVariable = (name: string) => style.getPropertyValue(name).trim()

    return {
      canvas: root.getAttribute('data-theme-canvas'),
      codeBlock: root.getAttribute('data-theme-code-block'),
      definitionId: root.getAttribute('data-theme-definition-id'),
      density: root.getAttribute('data-theme-density'),
      editorLineHeight: readCssVariable('--editor-line-height'),
      editorMaxWidth: readCssVariable('--editor-max-width'),
      graph: root.getAttribute('data-theme-graph'),
      heading: root.getAttribute('data-theme-heading'),
      id: root.getAttribute('data-theme-preset'),
      metadataFields: root.getAttribute('data-theme-metadata-fields'),
      metadataStrip: root.getAttribute('data-theme-metadata-strip'),
      mode: root.getAttribute('data-theme-definition-mode'),
      motion: root.getAttribute('data-theme-motion'),
      primary: readCssVariable('--primary'),
      surfaceApp: readCssVariable('--surface-app'),
      surfaceEditor: readCssVariable('--surface-editor'),
      surfaceSidebar: readCssVariable('--surface-sidebar'),
    }
  })
}

async function expectExperienceProfileContract(page: Page, contract: ExperienceProfileContract): Promise<ExperienceProfileState> {
  await expect.poll(async () => captureExperienceProfileState(page)).toMatchObject({
    canvas: contract.canvas,
    codeBlock: contract.codeBlock,
    definitionId: contract.id,
    density: contract.density,
    editorMaxWidth: contract.editorMaxWidth,
    graph: contract.graph,
    heading: contract.heading,
    id: contract.id,
    metadataFields: contract.metadataFields,
    metadataStrip: contract.metadataStrip,
    mode: contract.mode,
    motion: contract.motion,
  })

  const state = await captureExperienceProfileState(page)
  expect(state.editorLineHeight).not.toHaveLength(0)
  expect(state.primary).not.toHaveLength(0)
  expect(state.surfaceApp).not.toHaveLength(0)
  expect(state.surfaceEditor).not.toHaveLength(0)
  expect(state.surfaceSidebar).not.toHaveLength(0)
  expect(state.surfaceApp).not.toBe(state.surfaceEditor)
  expect(state.surfaceSidebar).not.toBe(state.surfaceEditor)
  if (contract.mode === 'dark') {
    expectRenderedDarkSurfaceNeutral(state.surfaceApp, `${contract.id} app surface`)
    expectRenderedDarkSurfaceNeutral(state.surfaceSidebar, `${contract.id} sidebar surface`)
    expectRenderedDarkSurfaceNeutral(state.surfaceEditor, `${contract.id} editor surface`)
  }

  const traitList = page.getByTestId(`settings-theme-preset-${contract.id}-traits`)
  for (const label of contract.traitLabels) {
    await expect(traitList).toContainText(label)
  }
  await expect(page.getByTestId(`settings-theme-preset-${contract.id}`)).toHaveAttribute('data-shell', contract.shell)
  await expect(page.getByTestId(`settings-theme-preset-${contract.id}`)).toHaveAttribute('data-writing', contract.writing)
  await expect(traitList.getByLabel(`Shell: ${contract.shellLabel}`)).toBeVisible()
  await expect(traitList.getByLabel(`Writing: ${contract.writingLabel}`)).toBeVisible()
  await expect(page.getByTestId('settings-appearance-preview')).toHaveAttribute('data-shell-preview', contract.shell)
  await expect(page.getByTestId('settings-appearance-preview')).toHaveAttribute('data-writing-preview', contract.writing)

  return state
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

test.describe('Settings experience profile surface screenshots', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 980 })
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('sidebar-top-nav')).toBeVisible({ timeout: 10_000 })
  })

  test('Settings shell, rail, main surface, and private cards follow selected experience profiles', async ({ page }, testInfo) => {
    const panel = await openSettings(page)
    const states: SettingsSurfaceState[] = []
    const profileTokenSignatures = new Set<string>()

    for (const contract of EXPERIENCE_PROFILE_CONTRACTS) {
      await selectThemePreset(page, contract.id)
      const profileState = await expectExperienceProfileContract(page, contract)
      const appearanceState = await captureSettingsSurfaceState(page, 'theme-pack-settings')
      expect(appearanceState.panelBackground).not.toBe('none')
      expect(appearanceState.railBackground).not.toBe('none')
      expect(appearanceState.mainBackground).not.toBe('none')
      expectVisibleCardMaterial(appearanceState)
      expect(appearanceState.railVisible).toBe(true)
      expect(appearanceState.railRight).toBeLessThanOrEqual(appearanceState.mainLeft + 1)
      expect(appearanceState.overflowX).toBeLessThanOrEqual(1)
      states.push(appearanceState)
      profileTokenSignatures.add([
        profileState.mode,
        profileState.surfaceApp,
        profileState.surfaceSidebar,
        profileState.surfaceEditor,
        profileState.primary,
      ].join('|'))

      await testInfo.attach(`settings-${contract.id}-appearance`, {
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
    expect(profileTokenSignatures.size).toBe(EXPERIENCE_PROFILE_CONTRACTS.length)
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
      'Fonts ui, editor, mono, display, label',
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
