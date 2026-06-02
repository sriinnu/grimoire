import { test, expect } from '@playwright/test'

test.describe('AI chat empty body fix — no regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/vault/ping', route => route.fulfill({ status: 503 }))
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('vault-dashboard')).toBeVisible({ timeout: 5_000 })
    await page.getByTestId('sidebar-top-nav').getByText('All Notes', { exact: true }).click()
    await expect(page.locator('[data-testid="note-list-container"]')).toBeVisible({ timeout: 5_000 })
  })

  test('AI panel opens, note is selected, and browser mode does not send without a provider @smoke', async ({ page }) => {
    // Select a note so the AI panel has context
    const noteItem = page.locator('.app__note-list .cursor-pointer').first()
    await noteItem.click()

    // Verify editor has content (note body is loaded)
    const editor = page.locator('.bn-editor')
    await expect(editor).toBeVisible({ timeout: 3000 })

    // Open the AI panel from the editor toolbar
    await page.getByRole('button', { name: 'Open the AI panel' }).click()
    await expect(page.getByTestId('ai-panel')).toBeVisible({ timeout: 3000 })

    // Browser smoke does not provide the native Claude Code bridge. The panel must
    // stay honest and disabled instead of attempting an empty provider call.
    const input = page.getByTestId('agent-input')
    await expect(input).toBeVisible()
    await expect(input).toBeDisabled()
    await expect(input).toHaveAttribute('placeholder', /Claude Code is not installed/)
    await expect(page.getByTestId('agent-send')).toBeDisabled()
  })
})
