import type { VaultEntry } from '../types'
import { formatLocalDateKey } from './localDate'

/** Title the journal capture flow gives today's entry: "Journal 2026-09-25". */
export function todayJournalTitle(now: Date = new Date()): string {
  return `Journal ${formatLocalDateKey(now)}`
}

/**
 * Today's journal entry, if one exists. Capture titles are either the bare
 * "Journal <date>" or "Journal <date> - <first line>", so both count.
 * Sriinnu: Reflect and Capacities open onto today's page; this is the lookup
 * behind "Today's Journal" — open it if it's there, create it if not.
 */
export function findTodayJournal(entries: readonly VaultEntry[], now: Date = new Date()): VaultEntry | null {
  const title = todayJournalTitle(now)
  const candidates = entries.filter((entry) =>
    entry.isA === 'Journal'
      && !entry.archived
      && (entry.title === title || entry.title.startsWith(`${title} - `)),
  )
  if (candidates.length === 0) return null
  // Several captures in one day: reopen the one touched most recently.
  return candidates.reduce((latest, entry) => ((entry.modifiedAt ?? 0) > (latest.modifiedAt ?? 0) ? entry : latest))
}
