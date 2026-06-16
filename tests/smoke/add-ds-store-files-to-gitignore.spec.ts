import { test, expect } from '@playwright/test'
import { openCommandPalette, findCommand } from './helpers'

test.describe('DS_Store gitignore for new vaults', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  test('Repair Notebook command is available in the command palette', async ({ page }) => {
    await openCommandPalette(page)
    const found = await findCommand(page, 'Repair Notebook')
    expect(found).toBe(true)
  })
})
