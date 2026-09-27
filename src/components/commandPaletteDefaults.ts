import type { CommandAction, CommandGroup } from '../hooks/commands/types'
import { groupSortKey } from '../hooks/commands/types'
import type { VaultEntry } from '../types'

/**
 * What the palette shows before you type. Three verbs people reach for most,
 * then the pages they were just in, then everything else in registry order.
 * Nothing here is invented: a row appears only when its command exists and
 * is enabled, and Recent is empty until there is history.
 */
export const PALETTE_START_COMMAND_IDS: readonly string[] = ['open-today-journal', 'create-note', 'quick-capture']

export const PALETTE_RECENT_LIMIT = 5

export interface PaletteGroup {
  group: CommandGroup
  items: CommandAction[]
}

export function recentCommandId(path: string): string {
  return `recent:${path}`
}

/** Turns recently opened pages into palette rows that open them. */
export function buildRecentCommands(
  recentEntries: readonly VaultEntry[],
  onOpenEntry: (entry: VaultEntry) => void,
  limit = PALETTE_RECENT_LIMIT,
): CommandAction[] {
  return recentEntries.slice(0, limit).map((entry) => ({
    id: recentCommandId(entry.path),
    label: entry.title,
    group: 'Recent',
    keywords: [entry.filename],
    enabled: true,
    execute: () => onOpenEntry(entry),
  }))
}

function groupByRegistryOrder(commands: readonly CommandAction[]): PaletteGroup[] {
  const grouped = new Map<CommandGroup, CommandAction[]>()
  for (const command of commands) {
    const bucket = grouped.get(command.group)
    if (bucket) bucket.push(command)
    else grouped.set(command.group, [command])
  }
  return Array.from(grouped.entries())
    .sort((left, right) => groupSortKey(left[0]) - groupSortKey(right[0]))
    .map(([group, items]) => ({ group, items }))
}

/**
 * Empty-query layout. On a first open the Start verbs lead; once you have
 * been around the palette before, Recent pages come first because that is
 * what a reopen is usually for.
 */
export function buildEmptyQueryGroups(
  enabledCommands: readonly CommandAction[],
  recentCommands: readonly CommandAction[],
  recentsFirst: boolean,
): PaletteGroup[] {
  const byId = new Map(enabledCommands.map((command) => [command.id, command]))
  const start = PALETTE_START_COMMAND_IDS
    .map((id) => byId.get(id))
    .filter((command): command is CommandAction => command !== undefined)
  const startIds = new Set(start.map((command) => command.id))
  const rest = enabledCommands.filter((command) => !startIds.has(command.id))

  const lead: PaletteGroup[] = []
  if (start.length > 0) lead.push({ group: 'Start', items: start })
  if (recentCommands.length > 0) lead.push({ group: 'Recent', items: [...recentCommands] })
  if (recentsFirst) lead.reverse()

  return [...lead, ...groupByRegistryOrder(rest)]
}

let paletteOpens = 0

/** Records an open and says whether Recent should lead this time. */
export function registerPaletteOpen(): boolean {
  paletteOpens += 1
  return paletteOpens > 1
}

export function resetPaletteOpensForTests(): void {
  paletteOpens = 0
}
