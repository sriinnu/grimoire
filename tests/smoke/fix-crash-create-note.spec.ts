import fs from 'fs'
import path from 'path'
import { test, expect, type Page } from '@playwright/test'
import { executeCommand, openCommandPalette, sendShortcut } from './helpers'
import { createFixtureVaultCopy, openFixtureVault, removeFixtureVaultCopy } from '../helpers/fixtureVault'

let tempVaultDir: string

function seedTypeEntry(vaultPath: string, typeName: string, template: string): void {
  const slug = typeName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'type'
  const body = [
    '---',
    `title: ${typeName}`,
    'type: Type',
    'template: |',
    ...template.split('\n').map((line) => `  ${line}`),
    '---',
    '',
  ].join('\n')
  fs.writeFileSync(path.join(vaultPath, `${slug}.md`), body)
}

async function openTestVault(page: Page): Promise<void> {
  await openFixtureVault(page, tempVaultDir)
}

async function selectSection(page: Page, label: string): Promise<void> {
  await page.locator('aside').getByText(label, { exact: true }).first().click()
}

async function createNoteFromListHeader(page: Page): Promise<void> {
  await page.locator('.app__note-list button[title^="Create "]').first().click()
}

function untitledFilename(page: Page, typeLabel: string) {
  const slug = typeLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  return page.getByRole('button', { name: new RegExp(`^Filename untitled-${slug}-\\d+`, 'i') }).first()
}

function capturePageErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('pageerror', (err) => errors.push(err.message))
  return errors
}

async function expectUntitledNoteWithoutCrash(
  page: Page,
  typeLabel: string,
  createNote: () => Promise<void>,
): Promise<void> {
  const errors = capturePageErrors(page)

  await createNote()
  await expect(untitledFilename(page, typeLabel)).toBeVisible({ timeout: 10_000 })
  await expect(page.locator('.bn-editor')).toBeVisible({ timeout: 5_000 })

  expect(errors).toEqual([])
}

test.describe('Create note crash fix', () => {
  test.beforeEach(() => {
    tempVaultDir = createFixtureVaultCopy()
  })

  test.afterEach(() => {
    removeFixtureVaultCopy(tempVaultDir)
  })

  test('clicking + next to a type section creates a note without crashing @smoke', async ({ page }) => {
    await openTestVault(page)
    await selectSection(page, 'Making')
    await expectUntitledNoteWithoutCrash(page, 'project', async () => {
      await createNoteFromListHeader(page)
    })
  })

  test('Cmd+N creates a note without crashing @smoke', async ({ page }) => {
    await openTestVault(page)
    await expectUntitledNoteWithoutCrash(page, 'note', async () => {
      await page.waitForTimeout(300)
      await page.locator('body').click()
      await sendShortcut(page, 'n', ['Control'])
    })
  })

  test('creating note for custom type does not crash', async ({ page }) => {
    await openTestVault(page)
    await selectSection(page, 'Moments')
    await expectUntitledNoteWithoutCrash(page, 'event', async () => {
      await createNoteFromListHeader(page)
    })
  })

  test('command palette creates typed notes without crashing when a type template is present @smoke', async ({ page }) => {
    seedTypeEntry(tempVaultDir, 'Procedure', '## Checklist\n\n- first step\n- [[Alpha Project]]\n- unmatched [link')
    await openTestVault(page)
    await expectUntitledNoteWithoutCrash(page, 'procedure', async () => {
      await openCommandPalette(page)
      await executeCommand(page, 'new procedure')
    })
    await expect(page.locator('.bn-editor')).toContainText('Checklist')
    await expect(page.locator('.bn-editor')).toContainText('Alpha Project')
  })
})
