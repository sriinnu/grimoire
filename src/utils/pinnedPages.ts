import type { VaultEntry } from '../types'

/** Favourite pages in the user's sidebar order. */
export function selectPinnedEntries(entries: readonly VaultEntry[], limit = 6): VaultEntry[] {
  return entries
    .filter((entry) => entry.favorite && !entry.archived)
    .sort((a, b) => {
      const ai = a.favoriteIndex ?? Number.POSITIVE_INFINITY
      const bi = b.favoriteIndex ?? Number.POSITIVE_INFINITY
      if (ai !== bi) return ai < bi ? -1 : 1
      return a.title.localeCompare(b.title)
    })
    .slice(0, limit)
}
