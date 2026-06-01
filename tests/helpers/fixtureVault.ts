import { expect, type Page } from '@playwright/test'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { installFixtureVaultDesktopBridgeInBrowser } from './fixtureVaultDesktopBridge'
import { installFixtureVaultInitScript } from './fixtureVaultInitScript'

const FIXTURE_VAULT = path.resolve('tests/fixtures/test-vault')
const FIXTURE_VAULT_READY_TIMEOUT = 30_000
const FIXTURE_VAULT_REMOVE_RETRIES = 10
const FIXTURE_VAULT_REMOVE_RETRY_DELAY_MS = 100

interface FixturePageArgs {
  page: Page
}

interface CopyDirArgs {
  src: string
  dest: string
}

interface RemoveFixtureVaultArgs {
  tempVaultDir: string
}

function copyDirSync({ src, dest }: CopyDirArgs): void {
  fs.mkdirSync(dest, { recursive: true })
  for (const item of fs.readdirSync(src, { withFileTypes: true })) {
    const sourcePath = path.join(src, item.name)
    const destinationPath = path.join(dest, item.name)
    if (item.isDirectory()) {
      copyDirSync({ src: sourcePath, dest: destinationPath })
      continue
    }
    fs.copyFileSync(sourcePath, destinationPath)
  }
}

export function createFixtureVaultCopy(): string {
  const tempVaultDir = fs.mkdtempSync(path.join(os.tmpdir(), 'grimoire-test-vault-'))
  copyDirSync({ src: FIXTURE_VAULT, dest: tempVaultDir })
  return tempVaultDir
}

function removeFixtureVaultDirectory({ tempVaultDir }: RemoveFixtureVaultArgs): void {
  fs.rmSync(tempVaultDir, {
    recursive: true,
    force: true,
    maxRetries: FIXTURE_VAULT_REMOVE_RETRIES,
    retryDelay: FIXTURE_VAULT_REMOVE_RETRY_DELAY_MS,
  })
}

export function removeFixtureVaultCopy(tempVaultDir: string | null | undefined): void {
  if (!tempVaultDir) return
  removeFixtureVaultDirectory({ tempVaultDir })
}

async function waitForFixtureVaultReady({ page }: FixturePageArgs): Promise<void> {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => Boolean(window.__mockHandlers?.list_vault))
  await expect(page.getByTestId('vault-dashboard')).toBeVisible({ timeout: FIXTURE_VAULT_READY_TIMEOUT })
  await page.getByTestId('sidebar-top-nav').getByText('All Notes', { exact: true }).click()
  await page.locator('[data-testid="note-list-container"]').waitFor({ timeout: FIXTURE_VAULT_READY_TIMEOUT })
  await expect(page.getByText('Alpha Project', { exact: true }).first()).toBeVisible({
    timeout: FIXTURE_VAULT_READY_TIMEOUT,
  })
}

export async function openFixtureVault(
  page: Page,
  vaultPath: string,
): Promise<void> {
  await installFixtureVaultInitScript({ page, vaultPath })
  await waitForFixtureVaultReady({ page })
}

async function installFixtureVaultDesktopBridge({ page }: FixturePageArgs): Promise<void> {
  await page.evaluate(installFixtureVaultDesktopBridgeInBrowser)
  await page.waitForFunction(() => Boolean(window.__TAURI_INTERNALS__))
}

/**
 * Browser harness for desktop command-routing tests.
 *
 * This stubs the Tauri invoke bridge inside Playwright so tests can exercise
 * renderer shortcut dispatch and desktop menu-command dispatch without a native
 * shell. It is deterministic, but it is not a substitute for real native QA.
 */
export async function openFixtureVaultDesktopHarness(
  page: Page,
  vaultPath: string,
): Promise<void> {
  await openFixtureVault(page, vaultPath)
  await installFixtureVaultDesktopBridge({ page })
}

export const openFixtureVaultTauri = openFixtureVaultDesktopHarness
