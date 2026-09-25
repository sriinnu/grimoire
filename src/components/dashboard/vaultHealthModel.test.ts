import { describe, expect, it } from 'vitest'
import { resolveVaultHealth } from './vaultHealthModel'

const base = { activeNotes: 12, modifiedCount: 0, conflictCount: 0, syncStatus: 'idle' as const }

describe('vault health', () => {
  it('never claims a backup; says what is true on this device', () => {
    expect(resolveVaultHealth(base)).toEqual({ tone: 'calm', title: 'All saved on this device', meta: '12 pages, history up to date' })
    expect(resolveVaultHealth({ ...base, modifiedCount: 3 }).meta).toBe('3 changes not in history yet')
  })

  it('raises conflicts, sync errors and pending pulls as attention', () => {
    expect(resolveVaultHealth({ ...base, conflictCount: 2 })).toMatchObject({ tone: 'attention', title: '2 conflicts to resolve' })
    expect(resolveVaultHealth({ ...base, syncStatus: 'conflict' }).title).toBe('1 conflict to resolve')
    expect(resolveVaultHealth({ ...base, syncStatus: 'error' }).title).toBe('Sync needs a look')
    expect(resolveVaultHealth({ ...base, syncStatus: 'pull_required' }).title).toBe('Updates waiting to pull')
  })
})
