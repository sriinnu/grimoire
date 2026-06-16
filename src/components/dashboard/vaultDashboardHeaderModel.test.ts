import { describe, expect, it } from 'vitest'
import { notebookTitle, shouldShowSyncBadge, storageLabel, syncLabel } from './vaultDashboardHeaderModel'

describe('vaultDashboardHeaderModel', () => {
  it('opens fixture notebooks as Sriinnu-first Grimoire instead of demo-vault copy', () => {
    expect(notebookTitle('demo-vault-v2')).toBe('Today in Grimoire')
    expect(notebookTitle('work-vault')).toBe('Work Notebook')
  })

  it('keeps ordinary edits out of the first-surface badge cluster', () => {
    expect(syncLabel('idle', 4, 0)).toBe('Unsaved changes')
    expect(shouldShowSyncBadge('idle', 0)).toBe(false)
    expect(shouldShowSyncBadge('pull_required', 0)).toBe(true)
    expect(shouldShowSyncBadge('idle', 2)).toBe(true)
  })

  it('uses calm storage labels for local and personal sync notebooks', () => {
    expect(storageLabel({ label: 'Notebook', path: '/vault', storageProvider: 'local', syncProvider: 'none' })).toBe('Local')
    expect(storageLabel({ label: 'Notebook', path: '/vault', storageProvider: 'icloud-drive', syncProvider: 'none' })).toBe('Personal Sync')
  })
})
