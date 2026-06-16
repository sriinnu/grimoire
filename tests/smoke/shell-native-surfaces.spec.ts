import { expect, test } from '@playwright/test'
import {
  createFixtureVaultCopy,
  openFixtureVault,
  removeFixtureVaultCopy,
} from '../helpers/fixtureVault'

let tempVaultDir: string

test.beforeEach(async ({ page }, testInfo) => {
  testInfo.setTimeout(45_000)
  tempVaultDir = createFixtureVaultCopy()
  await openFixtureVault(page, tempVaultDir)
})

test.afterEach(async () => {
  removeFixtureVaultCopy(tempVaultDir)
})

test('sidebar graph opens nodes and agent handoff surfaces', async ({ page }) => {
  await page.getByRole('button', { name: 'Graph' }).click()

  const dialog = page.getByTestId('graph-dialog-content')
  await expect(dialog).toBeVisible({ timeout: 15_000 })
  await expect.poll(async () => (await dialog.boundingBox())?.width ?? 0).toBeGreaterThan(900)
  await expect(page.getByRole('heading', { name: 'Second Brain Map' })).toBeVisible()
  await expect(page.getByTestId('graph-dialog-brain-summary')).toContainText('graph nodes')
  await expect(page.getByTestId('graph-dialog-brain-summary')).toContainText('source-safe')
  await expect(page.getByTestId('graph-svg')).toBeVisible()
  await expect.poll(async () => (await page.getByTestId('graph-canvas').boundingBox())?.width ?? 0).toBeGreaterThan(600)
  await expect(page.getByTestId('graph-canvas-agent-rail')).toBeVisible()
  await expect(page.getByTestId('graph-agent-handoff')).toBeVisible()
  await expect(page.getByTestId('graph-node').first()).toBeVisible()
})

test('right click opens the note context menu', async ({ page }) => {
  const alphaProject = page.locator('[data-note-path$="/project/alpha-project.md"]').first()

  await expect(alphaProject).toBeVisible()
  await alphaProject.click({ button: 'right' })

  const menu = page.getByTestId('note-context-menu')
  await expect(menu).toBeVisible()
  await expect(menu).toHaveAttribute('role', 'menu')
  await expect(menu.getByRole('menuitem', { name: /Status: Active/i })).toBeVisible()
})

test('right click opens the sidebar place context menu', async ({ page }) => {
  const makingPlace = page.locator('.app__sidebar').getByText('Making', { exact: true }).first()

  await expect(makingPlace).toBeVisible()
  await makingPlace.click({ button: 'right' })

  const sidebarMenu = page.getByTestId('sidebar-context-menu')
  await expect(sidebarMenu).toBeVisible()
  await expect(sidebarMenu).toHaveAttribute('role', 'menu')
  await expect(sidebarMenu.getByRole('menuitem', { name: 'Rename place…' })).toBeVisible()
  await expect(sidebarMenu.getByRole('menuitem', { name: 'Customize mark & color…' })).toBeVisible()

  await page.mouse.click(600, 24)
  await expect(sidebarMenu).toBeHidden()
})

test('editor text keeps the native context menu available', async ({ page }) => {
  const alphaProject = page.locator('[data-note-path$="/project/alpha-project.md"]').first()

  await expect(alphaProject).toBeVisible()
  await alphaProject.click()

  const editable = page.locator('[contenteditable="true"], [contenteditable="plaintext-only"], .bn-editor').first()
  await expect(editable).toBeVisible()

  await expect.poll(async () => editable.evaluate((element) => {
    const event = new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
      clientX: 480,
      clientY: 320,
    })
    element.dispatchEvent(event)
    return event.defaultPrevented
  })).toBe(false)
})

test('editor properties rail exposes Second Brain and opens the AI lane', async ({ page }) => {
  const alphaProject = page.locator('[data-note-path$="/project/alpha-project.md"]').first()

  await expect(alphaProject).toBeVisible()
  await alphaProject.click()
  await expect(page.getByTestId('breadcrumb-filename-trigger')).toBeVisible()

  if (!(await page.getByTestId('second-brain-panel').isVisible().catch(() => false))) {
    await page.getByRole('button', { name: 'Open the properties panel' }).click()
  }

  const secondBrain = page.getByTestId('second-brain-panel')
  await expect(secondBrain).toBeVisible()
  await expect(secondBrain).toContainText('Second Brain')
  await expect(secondBrain).toContainText('Graph Nodes')

  await page.getByRole('button', { name: 'Open Second Brain chat' }).click()

  await expect(page.getByTestId('ai-panel')).toBeVisible()
  await expect(page.getByTestId('context-bar')).toContainText('Alpha Project')
})
