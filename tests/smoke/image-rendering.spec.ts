import { expect, type Page, test } from '@playwright/test'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { APP_COMMAND_IDS } from '../../src/hooks/appCommandCatalog'
import { openFixtureVault, removeFixtureVaultCopy } from '../helpers/fixtureVault'
import { triggerShortcutCommand } from './testBridge'

const DEMO_VAULT = path.resolve('demo-vault-v2')

let tempVaultDir: string

function createDemoVaultCopy(): string {
  const copyPath = fs.mkdtempSync(path.join(os.tmpdir(), 'grimoire-demo-vault-'))
  fs.cpSync(DEMO_VAULT, copyPath, { recursive: true })
  return copyPath
}

async function openReferenceNote(page: Page): Promise<void> {
  await triggerShortcutCommand(page, APP_COMMAND_IDS.fileQuickOpen)
  const quickOpenInput = page.getByTestId('quick-open-input')
  await expect(quickOpenInput).toBeVisible({ timeout: 5_000 })
  await quickOpenInput.fill('Grimoire QA Reference')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: 'Grimoire QA Reference', level: 1 })).toBeVisible({
    timeout: 5_000,
  })
}

async function openReferenceImage(page: Page): Promise<void> {
  await triggerShortcutCommand(page, APP_COMMAND_IDS.fileQuickOpen)
  const quickOpenInput = page.getByTestId('quick-open-input')
  await expect(quickOpenInput).toBeVisible({ timeout: 5_000 })
  await quickOpenInput.fill('grimoire-reference.png')
  await page.keyboard.press('Enter')
  await expect(page.getByTestId('vault-image-shell')).toBeVisible({ timeout: 5_000 })
}

test.beforeEach(async ({ page }, testInfo) => {
  testInfo.setTimeout(45_000)
  tempVaultDir = createDemoVaultCopy()
  await openFixtureVault(page, tempVaultDir, { readyNoteTitle: null })
})

test.afterEach(async () => {
  removeFixtureVaultCopy(tempVaultDir)
})

test('embedded vault attachment images render as actual loaded images', async ({ page }) => {
  await openReferenceNote(page)
  await expect(page.getByTestId('breadcrumb-filename-trigger')).toBeVisible()

  const image = page.locator('.bn-editor img[src*="grimoire-reference.png"]').first()
  await expect(image).toBeVisible()
  await expect(image).toHaveAttribute('src', /\/api\/vault\/file\?path=.*grimoire-reference\.png/)
  await expect.poll(async () => image.evaluate((element) => (
    element instanceof HTMLImageElement ? element.naturalWidth : 0
  ))).toBeGreaterThan(20)
})

test('selected image files use the native preview shell and load inside the vault scope', async ({ page }) => {
  await openReferenceImage(page)

  const stage = page.getByTestId('vault-image-stage')
  const caption = page.getByTestId('vault-image-caption')
  const image = page.getByTestId('vault-image-preview')

  await expect(stage).toBeVisible()
  await expect(caption).toContainText('grimoire-reference.png')
  await expect(caption).toContainText('PNG')
  await expect(image).toHaveAttribute('src', /\/api\/vault\/file\?path=.*grimoire-reference\.png/)
  await expect.poll(async () => image.evaluate((element) => (
    element instanceof HTMLImageElement ? element.naturalWidth : 0
  ))).toBeGreaterThan(20)
  await expect(stage).toHaveAttribute('data-state', 'loaded')
  await expect(caption).toContainText('Loaded')
  await expect.poll(async () => image.evaluate((element) => {
    const event = new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
      clientX: 520,
      clientY: 360,
    })
    element.dispatchEvent(event)
    return event.defaultPrevented
  })).toBe(false)
})
