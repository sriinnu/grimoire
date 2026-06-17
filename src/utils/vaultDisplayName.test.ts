import { describe, expect, it } from 'vitest'
import { formatVaultPathForDisplay, getNotebookVaultDisplayName } from './vaultDisplayName'

describe('formatVaultPathForDisplay', () => {
  it('strips the Windows extended-length prefix so paths read natively', () => {
    expect(formatVaultPathForDisplay('\\\\?\\C:\\Users\\sri\\Grimoire')).toBe('C:\\Users\\sri\\Grimoire')
  })

  it('rewrites extended-length UNC paths back to their plain \\\\server form', () => {
    expect(formatVaultPathForDisplay('\\\\?\\UNC\\server\\share\\Grimoire')).toBe('\\\\server\\share\\Grimoire')
  })

  it('leaves POSIX paths, plain UNC, and empty values untouched', () => {
    expect(formatVaultPathForDisplay('/Users/sri/Grimoire')).toBe('/Users/sri/Grimoire')
    expect(formatVaultPathForDisplay('\\\\server\\share\\Grimoire')).toBe('\\\\server\\share\\Grimoire')
    expect(formatVaultPathForDisplay('')).toBe('')
    expect(formatVaultPathForDisplay(null)).toBe('')
    expect(formatVaultPathForDisplay(undefined)).toBe('')
  })

  it('matches the long-path prefix case-insensitively', () => {
    expect(formatVaultPathForDisplay('\\\\?\\unc\\server\\share')).toBe('\\\\server\\share')
  })

  it('collapses the home directory to ~ on macOS/Linux when home is known', () => {
    const opts = { homeDir: '/Users/sri', platform: 'macos' as const }
    expect(formatVaultPathForDisplay('/Users/sri/Grimoire', opts)).toBe('~/Grimoire')
    expect(formatVaultPathForDisplay('/Users/sri', opts)).toBe('~')
    // A trailing slash on home must not break the collapse.
    expect(formatVaultPathForDisplay('/Users/sri/Notes', { homeDir: '/Users/sri/', platform: 'linux' })).toBe('~/Notes')
    // Paths outside home are left absolute.
    expect(formatVaultPathForDisplay('/opt/vaults/Grimoire', opts)).toBe('/opt/vaults/Grimoire')
  })

  it('never uses ~ on Windows even when a home dir is supplied', () => {
    expect(
      formatVaultPathForDisplay('\\\\?\\C:\\Users\\sri\\Grimoire', {
        homeDir: 'C:\\Users\\sri',
        platform: 'windows',
      }),
    ).toBe('C:\\Users\\sri\\Grimoire')
  })
})

describe('getNotebookVaultDisplayName', () => {
  it('presents starter and demo vault names as the private notebook', () => {
    expect(getNotebookVaultDisplayName({ label: 'demo-vault-v2', path: '/repo/demo-vault-v2' })).toBe('Notebook')
    expect(getNotebookVaultDisplayName({ label: 'Getting Started', path: '/Users/sri/Getting Started' })).toBe('Notebook')
  })

  it('preserves user-chosen notebook names', () => {
    expect(getNotebookVaultDisplayName({ label: 'Sriinnu', path: '/Users/sri/Grimoire' })).toBe('Sriinnu')
    expect(getNotebookVaultDisplayName({ path: '/Users/sri/Research' })).toBe('Research')
  })
})
