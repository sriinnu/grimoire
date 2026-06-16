import { describe, expect, it } from 'vitest'
import { getNotebookVaultDisplayName } from './vaultDisplayName'

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
