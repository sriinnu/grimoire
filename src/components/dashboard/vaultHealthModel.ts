import type { SyncStatus } from '../../types'

export type VaultHealthTone = 'calm' | 'attention'

export interface VaultHealth {
  tone: VaultHealthTone
  title: string
  meta: string
}

function pages(count: number): string {
  return `${count} ${count === 1 ? 'page' : 'pages'}`
}

/**
 * What the health card may truthfully say. It used to read "Everything backed
 * up" unconditionally — while the status bar said "Edits waiting", and for
 * vaults with no sync at all. Sriinnu: a private notebook earns trust by never
 * overclaiming.
 */
export function resolveVaultHealth(input: {
  activeNotes: number
  modifiedCount: number
  conflictCount: number
  syncStatus: SyncStatus
}): VaultHealth {
  const { activeNotes, modifiedCount, conflictCount, syncStatus } = input
  if (conflictCount > 0 || syncStatus === 'conflict') {
    const n = Math.max(conflictCount, 1)
    return { tone: 'attention', title: `${n} ${n === 1 ? 'conflict' : 'conflicts'} to resolve`, meta: 'Open the status bar to review' }
  }
  if (syncStatus === 'error') {
    return { tone: 'attention', title: 'Sync needs a look', meta: `${pages(activeNotes)} saved on this device` }
  }
  if (syncStatus === 'pull_required') {
    return { tone: 'attention', title: 'Updates waiting to pull', meta: `${pages(activeNotes)} saved on this device` }
  }
  if (modifiedCount > 0) {
    return {
      tone: 'calm',
      title: 'All saved on this device',
      meta: `${modifiedCount} ${modifiedCount === 1 ? 'change' : 'changes'} not in history yet`,
    }
  }
  return { tone: 'calm', title: 'All saved on this device', meta: `${pages(activeNotes)}, history up to date` }
}
