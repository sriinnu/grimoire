import { test, expect, type Page } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import {
  createFixtureVaultCopy,
  openFixtureVault,
  removeFixtureVaultCopy,
} from '../helpers/fixtureVault'
import { openCommandPalette, executeCommand } from './helpers'

const IMAGE_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+yK9sAAAAASUVORK5CYII='
const IMAGE_BASE64 = IMAGE_DATA_URL.slice(IMAGE_DATA_URL.indexOf(',') + 1)
const FIXTURE_ATTACHMENT_PATH = 'attachments/toolbar-hover-fixture.png'

let tempVaultDir: string

async function openNote(page: Page, title: string) {
  await page.locator('[data-testid="note-list-container"]').getByText(title, { exact: true }).click()
  await expect(page.locator('.bn-editor')).toBeVisible({ timeout: 5_000 })
}

async function openRawMode(page: Page) {
  await openCommandPalette(page)
  await executeCommand(page, 'Toggle Raw')
  await expect(page.locator('.cm-content')).toBeVisible({ timeout: 5_000 })
}

async function openBlockNoteMode(page: Page) {
  await openCommandPalette(page)
  await executeCommand(page, 'Toggle Raw')
  await expect(page.locator('.bn-editor')).toBeVisible({ timeout: 5_000 })
}

async function getRawEditorContent(page: Page): Promise<string> {
  return page.evaluate(() => {
    const el = document.querySelector('.cm-content')
    if (!el) return ''

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- CodeMirror view is attached to the DOM node.
    const view = (el as any).cmTile?.view
    if (!view) return el.textContent ?? ''

    return view.state.doc.toString() as string
  })
}

async function setRawEditorContent(page: Page, content: string) {
  await page.evaluate((nextContent) => {
    const el = document.querySelector('.cm-content')
    if (!el) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- CodeMirror view is attached to the DOM node.
    const view = (el as any).cmTile?.view
    if (!view) return

    const fullDocumentRange = { from: 0, to: view.state.doc.length }
    view.dispatch({
      changes: { ...fullDocumentRange, insert: nextContent },
    })
  }, content)
}

function writeFixtureAttachment(vaultDir: string) {
  const attachmentPath = path.join(vaultDir, FIXTURE_ATTACHMENT_PATH)
  fs.mkdirSync(path.dirname(attachmentPath), { recursive: true })
  fs.writeFileSync(attachmentPath, Buffer.from(IMAGE_BASE64, 'base64'))
}

async function seedImageBlock(page: Page, imageUrl: string) {
  await openNote(page, 'Alpha Project')
  await openRawMode(page)

  const rawContent = await getRawEditorContent(page)
  const imageMarkdown = `\n\n![Toolbar hover regression](${imageUrl})\n`
  await setRawEditorContent(page, `${rawContent}${imageMarkdown}`)
  await page.waitForTimeout(700)

  await openBlockNoteMode(page)

  const image = page.locator('.bn-editor img.bn-visual-media').last()
  await expect(image).toBeVisible({ timeout: 5_000 })
  return image
}

async function expectImageRendered(image: ReturnType<Page['locator']>) {
  await expect(image).toBeVisible()
  await expect.poll(async () => (
    image.evaluate((node) => {
      const element = node as HTMLImageElement
      return element.complete && element.naturalWidth > 0 && element.naturalHeight > 0
    })
  )).toBe(true)
}

test.beforeEach(async ({ page }, testInfo) => {
  testInfo.setTimeout(90_000)
  tempVaultDir = createFixtureVaultCopy()
  writeFixtureAttachment(tempVaultDir)
  await openFixtureVault(page, tempVaultDir)
})

test.afterEach(async () => {
  removeFixtureVaultCopy(tempVaultDir)
})

test('markdown image renders as decoded media in the editor', async ({ page }) => {
  const image = await seedImageBlock(page, IMAGE_DATA_URL)

  const imageBox = await image.boundingBox()
  expect(imageBox).not.toBeNull()

  await expectImageRendered(image)
})

test('relative vault attachment image renders through the local file route', async ({ page }) => {
  const image = await seedImageBlock(page, FIXTURE_ATTACHMENT_PATH)

  await expectImageRendered(image)
  await expect(image).toHaveAttribute('src', /\/api\/vault\/file\?path=/)
})
