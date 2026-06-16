import { test, expect } from '@playwright/test'
import { executeCommand, openCommandPalette } from './helpers'

test('clicking + in type section creates note with that type', async ({ page }) => {
  await page.goto('/')
  await page.waitForTimeout(2000)

  // Click on "Making" in the sidebar to select the Project place.
  const projectsItem = page.locator('.app__sidebar').locator('text=Making').first()
  await projectsItem.click()
  await page.waitForTimeout(1000)

  // Click the "+" button to create a new note
  await page.click('[title="Create new note"]')
  await expect(page.locator('.bn-editor')).toBeVisible({ timeout: 5000 })

  // The new note should use a type-specific untitled filename.
  await expect(page.getByTestId('breadcrumb-filename-trigger')).toContainText(/untitled-project-\d+/i)

  // Toggle raw editor to see frontmatter
  await openCommandPalette(page)
  await executeCommand(page, 'Toggle Raw')
  await expect(page.locator('.cm-content')).toBeVisible({ timeout: 5000 })

  const rawEditor = page.locator('.cm-content')
  const content = await rawEditor.textContent()
  expect(content).toContain('type: Project')
})

test('clicking + in Pages creates generic note', async ({ page }) => {
  await page.goto('/')
  await page.waitForTimeout(2000)

  // Click on "Pages" in sidebar
  await page.locator('text=Pages').first().click()
  await page.waitForTimeout(500)

  // Click the "+" button
  await page.click('[title="Create new note"]')
  await expect(page.locator('.bn-editor')).toBeVisible({ timeout: 5000 })

  // The new note should be a generic untitled note, not a typed one.
  await expect(page.getByTestId('breadcrumb-filename-trigger')).toContainText(/untitled-note-\d+/i)
  await expect(page.getByTestId('breadcrumb-filename-trigger')).not.toContainText(/untitled-project-\d+/i)
})
