import { test, expect, type Page } from '@playwright/test'

async function openCreateViewDialog(page: Page) {
  await page.getByRole('button', { name: 'Create lens' }).click()
  await expect(page.getByRole('dialog')).toContainText('Create Lens', { timeout: 5000 })
}

test.describe('Filter value input', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  test('default text filters use a plain text input instead of a dropdown', async ({ page }) => {
    await openCreateViewDialog(page)
    const dialog = page.getByRole('dialog')

    const valueInput = dialog.getByTestId('filter-value-input')
    await expect(valueInput).toBeVisible()
    await valueInput.fill('Project')
    await expect(valueInput).toHaveValue('Project')
    await expect(dialog.getByTestId('wikilink-dropdown')).toHaveCount(0)
  })

  test('wikilink-like text stays raw input with no autocomplete', async ({ page }) => {
    await openCreateViewDialog(page)
    const dialog = page.getByRole('dialog')

    const fieldCombobox = dialog.getByTestId('filter-field-combobox-input')
    await fieldCombobox.click()
    await dialog.getByTestId('filter-field-option-title').click()

    const valueInput = dialog.getByTestId('filter-value-input')
    await valueInput.fill('[[un')

    await expect(valueInput).toHaveValue('[[un')
    await expect(dialog.getByTestId('wikilink-dropdown')).toHaveCount(0)
  })
})
