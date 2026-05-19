import { describe, expect, it } from 'vitest'
import { getNoteLocationLabel } from '../utils/noteLocation'

describe('getNoteLocationLabel', () => {
  it('shows vault-relative project folders instead of absolute paths', () => {
    expect(getNoteLocationLabel('/Users/srinivas/Grimoire/projects/grimoire/plan.md')).toBe(
      'projects / grimoire',
    )
  })

  it('falls back to root for top-level vault notes', () => {
    expect(getNoteLocationLabel('/Users/srinivas/Grimoire/todo.md')).toBe('Vault root')
  })

  it('uses the active vault path when a vault name is custom', () => {
    const vaultPath = '/Users/srinivas/iCloud Drive/Sriinnu'

    expect(getNoteLocationLabel(`${vaultPath}/todo.md`, vaultPath)).toBe('Sriinnu')
    expect(getNoteLocationLabel(`${vaultPath}/projects/astral/todo.md`, vaultPath)).toBe('projects / astral')
  })
})
