import type { VaultEntry } from '../../types'
import { resolveEntryLocalityPolicy } from '../../lib/localityPolicy'

/**
 * Title to show for an entry on the dashboard. Local-only pages (journals,
 * dreams, anything marked private) keep their titles off this screen, the
 * same way Recent Pages does; they stay openable.
 */
export function dashboardEntryTitle(entry: VaultEntry): { title: string; isPrivate: boolean } {
  if (!resolveEntryLocalityPolicy(entry).localOnly) return { title: entry.title, isPrivate: false }
  const type = entry.isA?.trim().toLowerCase() || 'page'
  return { title: `Private ${type}`, isPrivate: true }
}
