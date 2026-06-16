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
  await firstParagraph.click()
  await page.keyboard.press('End')
  await page.keyboard.press('Enter')
  await page.waitForTimeout(200)

  await page.keyboard.type(INSERTED_WIKILINK_QUERY)

  const suggestionMenu = page.locator('.wikilink-menu')
  await expect(suggestionMenu).toBeVisible({ timeout: 5000 })
  const matchingWikilinks = editor.locator('.wikilink').filter({ hasText: INSERTED_WIKILINK_TITLE })
  const existingCount = await matchingWikilinks.count()
  await suggestionMenu.getByText(INSERTED_WIKILINK_TITLE, { exact: true }).click()
  await page.waitForTimeout(500)

  await expect(matchingWikilinks).toHaveCount(existingCount + 1)
  return matchingWikilinks.nth(existingCount)
}

async function openNote(page: Page, title: string) {
  await page.locator('body').click()
  await sendShortcut(page, 'p', ['Control'])
  const quickOpenInput = page.getByTestId('quick-open-input')
  await expect(quickOpenInput).toBeVisible({ timeout: 5_000 })
  await quickOpenInput.fill(title)
  const selectedResult = page.getByTestId('quick-open-palette').locator('[class*="bg-accent"]').first()
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
