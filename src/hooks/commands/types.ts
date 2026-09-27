export type CommandGroup = 'Start' | 'Recent' | 'Navigation' | 'Capture' | 'Page' | 'Git' | 'View' | 'Settings'

export interface CommandAction {
  id: string
  label: string
  group: CommandGroup
  shortcut?: string
  keywords?: string[]
  enabled: boolean
  execute: () => void
}

// Start and Recent are palette-only lead groups; see commandPaletteDefaults.ts.
const GROUP_ORDER: CommandGroup[] = ['Start', 'Recent', 'Navigation', 'Capture', 'Page', 'Git', 'View', 'Settings']

export function groupSortKey(group: CommandGroup): number {
  return GROUP_ORDER.indexOf(group)
}
