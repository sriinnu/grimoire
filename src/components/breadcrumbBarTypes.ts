import type { Ref } from 'react'
import type { NoteLayout, VaultEntry } from '../types'

export interface BreadcrumbBarProps {
  entry: VaultEntry
  wordCount: number
  showDiffToggle: boolean
  diffMode: boolean
  diffLoading: boolean
  onToggleDiff: () => void
  rawMode?: boolean
  onToggleRaw?: () => void
  /** When true, raw mode is forced (non-markdown file) so the toggle stays hidden. */
  forceRawMode?: boolean
  showAIChat?: boolean
  onToggleAIChat?: () => void
  inspectorCollapsed?: boolean
  onToggleInspector?: () => void
  onToggleFavorite?: () => void
  onToggleOrganized?: () => void
  onDelete?: () => void
  onArchive?: () => void
  onUnarchive?: () => void
  onRenameFilename?: (path: string, newFilenameStem: string) => void
  noteLayout?: NoteLayout
  onToggleNoteLayout?: () => void
  /** Ref for direct DOM manipulation to avoid re-render on scroll. */
  barRef?: Ref<HTMLDivElement>
}

export const BREADCRUMB_ICON_CLASS = 'size-[16px]'
