import { describe, expect, it } from 'vitest'
import { formatVaultPathForDisplay, getNotebookVaultDisplayName } from './vaultDisplayName'

describe('formatVaultPathForDisplay', () => {
  it('strips the Windows extended-length prefix so paths read natively', () => {
    expect(formatVaultPathForDisplay('\\\\?\\C:\\Users\\sri\\Grimoire')).toBe('C:\\Users\\sri\\Grimoire')
  })

  it('rewrites extended-length UNC paths back to their plain \\\\server form', () => {
    expect(formatVaultPathForDisplay('\\\\?\\UNC\\server\\share\\Grimoire')).toBe('\\\\server\\share\\Grimoire')
  })

  it('leaves POSIX paths and empty values untouched', () => {
    expect(formatVaultPathForDisplay('/Users/sri/Grimoire')).toBe('/Users/sri/Grimoire')
    expect(formatVaultPathForDisplay('')).toBe('')
    expect(formatVaultPathForDisplay(null)).toBe('')
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
