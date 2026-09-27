import { useEffect, useMemo, useState } from 'react'
import { UserRound } from 'lucide-react'
import { Glyph } from './glyphs/Glyph'
import type { VaultEntry } from '../types'
import { getDisplayDate, relativeDate } from '../utils/noteListHelpers'
import { EditorNavigatorControls } from './EditorNavigatorControls'
import { useLiveWordCount } from './useLiveWordCount'
import { formatReadingTime } from '../utils/readingTime'
import { requestNotePropertyFocus } from './noteIconPropertyEvents'
import { requestInspectorJump } from './inspector/inspectorKeyboard'

const SUPPORTED_METADATA_FIELD_LIST = ['type', 'status', 'owner', 'priority', 'modified', 'locality'] as const
type MetadataField = typeof SUPPORTED_METADATA_FIELD_LIST[number]

// 'locality' is opt-in (theme packs can still ask for it): "local markdown" was
// true of every note, so by default it was a pill with no information in it.
const DEFAULT_METADATA_FIELDS: readonly MetadataField[] = ['type', 'status', 'owner', 'priority', 'modified']

const SUPPORTED_METADATA_FIELDS = new Set<string>(SUPPORTED_METADATA_FIELD_LIST)

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

/** Which frontmatter key a chip edits. Type is a chip too, but it opens About rather than a cell. */
const CHIP_PROPERTY: Partial<Record<MetadataField, string>> = { status: 'status', owner: 'owner', priority: 'priority' }

function editChip(field: MetadataField) {
  const key = CHIP_PROPERTY[field]
  if (key) requestNotePropertyFocus(key)
  else requestNotePropertyFocus('type')
  requestInspectorJump('about')
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
    <button
      type="button"
      className="editor-meta-pill editor-meta-pill--button"
      data-field={field}
      data-tone={tone}
      title={`Edit ${label} in Second Brain`}
      onClick={() => editChip(field)}
    >
      <span className="editor-meta-pill__label">{label}</span>
      <strong className="editor-meta-pill__value">{value}</strong>
    </button>
  )
}

/** Compact note intelligence strip shown above the editor body. */
export function EditorConstellationMeta({ content, entry }: { content: string; entry: VaultEntry }) {
  const visibleFields = useVisibleMetadataFields()
  // Only a status the note actually declares — no invented 'active' default.
  const status = propertyText(entry, ['status', 'Status']) ?? entry.status ?? null
  const owner = propertyText(entry, ['owner', 'Owner', 'author', 'Author'])
  const priority = propertyText(entry, ['priority', 'Priority'])
  const modified = formatModified(entry)
  const wordCount = useLiveWordCount(content, entry.wordCount)
  const readingTime = formatReadingTime(wordCount)

  return (
    <div className="editor-meta-strip" aria-label="Note metadata" data-testid="editor-meta-strip">
      {visibleFields.has('type') ? <MetaPill field="type" label="type" value={shortType(entry)} /> : null}
      {visibleFields.has('status') && status ? (
        <MetaPill field="status" label="status" value={status} tone={status.toLowerCase() === 'active' ? 'active' : undefined} />
      ) : null}
      {visibleFields.has('owner') && owner ? (
        <button type="button" className="editor-meta-pill editor-meta-pill--icon editor-meta-pill--button" data-field="owner" title="Edit owner in Second Brain" onClick={() => editChip('owner')}>
          <UserRound className="size-3.5" />
          <strong className="editor-meta-pill__value">{owner}</strong>
        </button>
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
      <span className="editor-meta-strip__wordcount" data-testid="editor-meta-wordcount">
        {wordCount.toLocaleString()} {wordCount === 1 ? 'word' : 'words'}
        {readingTime ? <span data-testid="editor-meta-readingtime"> · {readingTime}</span> : null}
      </span>
    </div>
  )
}
