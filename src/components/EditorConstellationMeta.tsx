import { Clock, GitBranch, UserRound } from 'lucide-react'
import type { VaultEntry } from '../types'
import { getDisplayDate, relativeDate } from '../utils/noteListHelpers'
import { EditorNavigatorControls } from './EditorNavigatorControls'

function propertyText(entry: VaultEntry, keys: string[]): string | null {
  const properties = entry.properties ?? {}
  for (const key of keys) {
    const value = properties[key]
    if (Array.isArray(value)) return value.map(String).filter(Boolean).join(', ') || null
    if (value !== null && value !== undefined && value !== false) return String(value)
  }
  return null
}

function shortType(entry: VaultEntry): string {
  return entry.isA?.trim() || (entry.fileKind === 'markdown' ? 'markdown' : entry.fileKind ?? 'note')
}

function formatModified(entry: VaultEntry): string | null {
  const date = getDisplayDate(entry)
  return date ? relativeDate(date) : null
}

function MetaPill({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: 'active' | 'high'
}) {
  return (
    <span className="editor-meta-pill" data-tone={tone}>
      <span className="editor-meta-pill__label">{label}</span>
      <strong className="editor-meta-pill__value">{value}</strong>
    </span>
  )
}

/** Compact note intelligence strip shown above the editor body. */
export function EditorConstellationMeta({ content, entry }: { content: string; entry: VaultEntry }) {
  const status = propertyText(entry, ['status', 'Status']) ?? entry.status ?? 'active'
  const owner = propertyText(entry, ['owner', 'Owner', 'author', 'Author'])
  const priority = propertyText(entry, ['priority', 'Priority'])
  const modified = formatModified(entry)

  return (
    <div className="editor-meta-strip" aria-label="Note metadata" data-testid="editor-meta-strip">
      <MetaPill label="type" value={shortType(entry)} />
      <MetaPill label="status" value={status} tone={status.toLowerCase() === 'active' ? 'active' : undefined} />
      {owner ? (
        <span className="editor-meta-pill editor-meta-pill--icon">
          <UserRound className="size-3.5" />
          <strong className="editor-meta-pill__value">{owner}</strong>
        </span>
      ) : null}
      {priority ? <MetaPill label="priority" value={priority} tone={priority.toLowerCase() === 'high' ? 'high' : undefined} /> : null}
      {modified ? (
        <span className="editor-meta-pill editor-meta-pill--icon">
          <Clock className="size-3.5" />
          <strong className="editor-meta-pill__value">{modified}</strong>
        </span>
      ) : null}
      <span className="editor-meta-pill editor-meta-pill--icon editor-meta-pill--source">
        <GitBranch className="size-3.5" />
        <strong className="editor-meta-pill__value">local markdown</strong>
      </span>
      <EditorNavigatorControls content={content} enableFindShortcut variant="meta" />
    </div>
  )
}
