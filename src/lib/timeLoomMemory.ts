import type { VaultEntry } from '../types'
import {
  buildMemoryLedgerAuditQueue,
  buildMemoryLedgerRecord,
  isMemoryLedgerEntry,
} from './memoryLedger'

export type TimeLoomMemoryTypeLabel = 'Memory' | 'Memory review'

/** Returns the count-safe Time Loom label for Memory Ledger entries. */
export function timeLoomMemoryTypeLabel(
  entry: VaultEntry,
  now = new Date(),
): TimeLoomMemoryTypeLabel | null {
  if (!isMemoryLedgerEntry(entry)) return null
  const record = buildMemoryLedgerRecord(entry)
  return buildMemoryLedgerAuditQueue([record], now).length > 0 ? 'Memory review' : 'Memory'
}
