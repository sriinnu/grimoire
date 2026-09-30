import { test, expect, type Page } from '@playwright/test'
import { sendShortcut } from './helpers'

const SOURCE_NOTE_TITLE = 'Grow Newsletter'
const INSERTED_WIKILINK_QUERY = '[[Mana'
const INSERTED_WIKILINK_TITLE = 'Manage Sponsorships'

async function insertWikilink(page: Page) {
  const editor = page.locator('.bn-editor')
  await expect(editor).toBeVisible({ timeout: 5000 })

  const firstParagraph = editor.locator('p').first()
  await expect(
    firstParagraph,
  ).toContainText('Build a sustainable audience through high-quality weekly essays', { timeout: 5000 })
  const paragraphsBefore = await editor.locator('p').count()
  await firstParagraph.click()
  // The paragraph wraps, and End only reaches the end of the visual line, so
  // Enter would split mid-sentence and the query would run into the tail of
  // the paragraph. Put the caret at the true end of the block instead.
  await firstParagraph.evaluate((element) => {
    const range = document.createRange()
    range.selectNodeContents(element)
    range.collapse(false)
    const selection = window.getSelection()
    selection?.removeAllRanges()
    selection?.addRange(range)
  })
  await page.keyboard.press('Enter')
  // The new block exists, and is empty, before we type into it; no fixed sleep.
  await expect(editor.locator('p')).toHaveCount(paragraphsBefore + 1, { timeout: 5000 })
  await expect(editor.locator('p').nth(1)).toHaveText('', { timeout: 5000 })

  await page.keyboard.type(INSERTED_WIKILINK_QUERY)

  const suggestionMenu = page.locator('.wikilink-menu')
  await expect(suggestionMenu).toBeVisible({ timeout: 5000 })
  const item = suggestionMenu.getByText(INSERTED_WIKILINK_TITLE, { exact: true })
  await expect(item).toBeVisible({ timeout: 5000 })
  // Let the menu settle: the item sits in the same place on two consecutive frames.
  await expect.poll(async () => {
    const before = await item.boundingBox()
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
    const after = await item.boundingBox()
    return Boolean(before && after && before.x === after.x && before.y === after.y)
  }, { timeout: 5000 }).toBe(true)
  const matchingWikilinks = editor.locator('.wikilink').filter({ hasText: INSERTED_WIKILINK_TITLE })
  const existingCount = await matchingWikilinks.count()
  await item.click()

  // Assert on the inserted node itself rather than sleeping.
  await expect(matchingWikilinks).toHaveCount(existingCount + 1, { timeout: 5000 })
  return matchingWikilinks.nth(existingCount)
}

async function openNote(page: Page, title: string) {
  await page.locator('body').click()
  await sendShortcut(page, 'p', ['Control'])
  const quickOpenInput = page.getByTestId('quick-open-input')
  await expect(quickOpenInput).toBeVisible({ timeout: 5_000 })
  await quickOpenInput.fill(title)
  const selectedResult = page.getByTestId('quick-open-palette').locator('[data-selected="true"]').first()
  const selectedTitle = selectedResult.locator('span.truncate').first()
  await expect(selectedTitle).toHaveText(title, { timeout: 5_000 })
  await selectedResult.click()
  await expect(page.getByRole('heading', { name: title, level: 1 })).toBeVisible({ timeout: 5_000 })
}

test.describe('Wikilink insertion and navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/vault/ping', route => route.fulfill({ status: 503 }))
    await page.goto('/')
    await expect(page.getByTestId('vault-dashboard')).toBeVisible({ timeout: 10_000 })
    await openNote(page, SOURCE_NOTE_TITLE)
  })

  test('[[ autocomplete inserts wikilink that is not broken', async ({ page }) => {
    const wikilink = await insertWikilink(page)

    const isBroken = await wikilink.evaluate(
      el => el.classList.contains('wikilink--broken'),
    )
    expect(isBroken).toBe(false)

    const target = await wikilink.getAttribute('data-target')
    expect(target).toBeTruthy()
  })

  test('@smoke Cmd+clicking an inserted wikilink navigates to the note', async ({ page }) => {
    const wikilink = await insertWikilink(page)
    await expect(wikilink).toBeVisible()

    await wikilink.click({ modifiers: ['Meta'] })
    await expect(page.locator('.bn-editor h1').first()).toHaveText(INSERTED_WIKILINK_TITLE, { timeout: 5000 })
  })
})
