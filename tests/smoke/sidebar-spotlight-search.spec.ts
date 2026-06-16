import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import {
  createFixtureVaultCopy,
  openFixtureVaultDesktopHarness,
  removeFixtureVaultCopy,
} from '../helpers/fixtureVault'

let tempVaultDir: string
const SPOTLIGHT_PLACEHOLDER = 'Search pages, docs, and project files...'

test.describe('Sidebar Spotlight search', () => {
  test.beforeEach(async ({ page }) => {
    tempVaultDir = createFixtureVaultCopy()
    const docsDir = path.join(tempVaultDir, 'docs')
    fs.mkdirSync(docsDir, { recursive: true })
    fs.writeFileSync(
      path.join(docsDir, 'spotlight-proof.ts'),
      [
        'export const spotlightSentinel = "project docs searchable from the sidebar";',
        'export const profileLanguage = "experience profiles searchable from the sidebar";',
        '',
      ].join('\n'),
    )

    await openFixtureVaultDesktopHarness(page, tempVaultDir)
    await page.setViewportSize({ width: 1600, height: 900 })
  })

  test.afterEach(() => {
    removeFixtureVaultCopy(tempVaultDir)
  })

  test('finds project text from the left sidebar search @smoke', async ({ page }) => {
    const sidebarSearch = page.getByTestId('sidebar-search-input')
    await expect(sidebarSearch).toBeVisible()

    await sidebarSearch.click()
    const searchInput = page.getByPlaceholder(SPOTLIGHT_PLACEHOLDER)
    await expect(searchInput).toBeFocused()

    await searchInput.fill('spotlightSentinel')
    await expect(page.getByText('spotlight-proof.ts', { exact: true })).toBeVisible({ timeout: 5_000 })
    await expect(page.getByText('project docs searchable from the sidebar')).toBeVisible()

    await searchInput.fill('docs/spotlight-proof')
    await expect(page.getByText('spotlight-proof.ts', { exact: true })).toBeVisible({ timeout: 5_000 })
    await expect(page.getByText('docs/spotlight-proof.ts', { exact: true }).first()).toBeVisible()

    await page.getByText('spotlight-proof.ts', { exact: true }).click()
    await expect(page.getByTestId('breadcrumb-filename-trigger')).toContainText('spotlight-proof', {
      timeout: 5_000,
    })
  })

  test('seeds Spotlight from a typed sidebar key', async ({ page }) => {
    const sidebarSearch = page.getByTestId('sidebar-search-input')
    await expect(sidebarSearch).toBeVisible()

    await sidebarSearch.press('s')

    const searchInput = page.getByPlaceholder(SPOTLIGHT_PLACEHOLDER)
    await expect(searchInput).toBeFocused()
    await expect(searchInput).toHaveValue('s')
  })

  test('finds experience profile language from the left sidebar search', async ({ page }) => {
    const sidebarSearch = page.getByTestId('sidebar-search-input')
    await expect(sidebarSearch).toBeVisible()

    await sidebarSearch.click()
    const searchInput = page.getByPlaceholder(SPOTLIGHT_PLACEHOLDER)
    await expect(searchInput).toBeFocused()

    await searchInput.fill('experience profiles')
    await expect(page.getByText('spotlight-proof.ts', { exact: true })).toBeVisible({ timeout: 5_000 })
    await expect(page.getByText('experience profiles searchable from the sidebar')).toBeVisible()
  })
})
