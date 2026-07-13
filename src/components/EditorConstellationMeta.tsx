import { useEffect, useMemo, useState } from 'react'
import { UserRound } from 'lucide-react'
import { Glyph } from './glyphs/Glyph'
import type { VaultEntry } from '../types'
import { getDisplayDate, relativeDate } from '../utils/noteListHelpers'
import { EditorNavigatorControls } from './EditorNavigatorControls'

const DEFAULT_METADATA_FIELDS = ['type', 'status', 'owner', 'priority', 'modified', 'locality'] as const
type MetadataField = typeof DEFAULT_METADATA_FIELDS[number]

const SUPPORTED_METADATA_FIELDS = new Set<string>(DEFAULT_METADATA_FIELDS)

function normalizeMetadataFields(value: string | null): MetadataField[] {
  if (!value) return [...DEFAULT_METADATA_FIELDS]
  const fields = value
    .split(/\s+/u)
    .filter((field): field is MetadataField => SUPPORTED_METADATA_FIELDS.has(field))
  return fields.length > 0 ? fields : [...DEFAULT_METADATA_FIELDS]
}

function readDocumentMetadataFields(): MetadataField[] {
  if (typeof document === 'undefined') return [...DEFAULT_METADATA_FIELDS]
  return normalizeMetadataFields(document.documentElement.getAttribute('data-theme-metadata-fields'))
}

function useVisibleMetadataFields(): ReadonlySet<MetadataField> {
  const [fields, setFields] = useState(readDocumentMetadataFields)

  useEffect(() => {
    const root = document.documentElement
    const syncFields = () => setFields(readDocumentMetadataFields())
    const observer = new MutationObserver(syncFields)
    observer.observe(root, { attributes: true, attributeFilter: ['data-theme-metadata-fields'] })
    return () => observer.disconnect()
  }, [])

  return useMemo(() => new Set(fields), [fields])
}

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
  field,
  label,
  value,
  tone,
}: {
  field: MetadataField
  label: string
  value: string
  tone?: 'active' | 'high'
}) {
  return (
    <span className="editor-meta-pill" data-field={field} data-tone={tone}>
      <span className="editor-meta-pill__label">{label}</span>
      <strong className="editor-meta-pill__value">{value}</strong>
    </span>
  )
}

/** Compact note intelligence strip shown above the editor body. */
export function EditorConstellationMeta({ content, entry }: { content: string; entry: VaultEntry }) {
  const visibleFields = useVisibleMetadataFields()
  const status = propertyText(entry, ['status', 'Status']) ?? entry.status ?? 'active'
  const owner = propertyText(entry, ['owner', 'Owner', 'author', 'Author'])
  const priority = propertyText(entry, ['priority', 'Priority'])
  const modified = formatModified(entry)

  return (
    <div className="editor-meta-strip" aria-label="Note metadata" data-testid="editor-meta-strip">
      {visibleFields.has('type') ? <MetaPill field="type" label="type" value={shortType(entry)} /> : null}
      {visibleFields.has('status') ? (
        <MetaPill field="status" label="status" value={status} tone={status.toLowerCase() === 'active' ? 'active' : undefined} />
      ) : null}
      {visibleFields.has('owner') && owner ? (
        <span className="editor-meta-pill editor-meta-pill--icon" data-field="owner">
          <UserRound className="size-3.5" />
          <strong className="editor-meta-pill__value">{owner}</strong>
        </span>
      ) : null}
      {visibleFields.has('priority') && priority ? (
        <MetaPill field="priority" label="priority" value={priority} tone={priority.toLowerCase() === 'high' ? 'high' : undefined} />
      ) : null}
      {visibleFields.has('modified') && modified ? (
        <span className="editor-meta-pill editor-meta-pill--icon" data-field="modified">
          <Glyph name="clock" size={14} />
          <strong className="editor-meta-pill__value">{modified}</strong>
        </span>
      ) : null}
      {visibleFields.has('locality') ? (
        <span className="editor-meta-pill editor-meta-pill--icon editor-meta-pill--source" data-field="locality">
          <Glyph name="gitHistory" size={14} />
          <strong className="editor-meta-pill__value">local markdown</strong>
        </span>
      ) : null}
      <EditorNavigatorControls content={content} enableFindShortcut variant="meta" />
      <span className="editor-meta-strip__spacer" aria-hidden="true" />
      {typeof entry.wordCount === 'number' ? (
        <span className="editor-meta-strip__wordcount" data-testid="editor-meta-wordcount">
          {entry.wordCount.toLocaleString()} {entry.wordCount === 1 ? 'word' : 'words'}
        </span>
      ) : null}
    </div>
  )
}
