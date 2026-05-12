import type { CSSProperties, MouseEvent as ReactMouseEvent, MouseEventHandler, ReactNode } from 'react'
import type { VaultEntry, NoteStatus } from '../types'
import { cn } from '@/lib/utils'
import { getTypeColor, getTypeLightColor } from '../utils/typeColors'
import { NoteItemContent } from './note-item/NoteItemContent'
import { isOpaqueBinaryEntry } from '../utils/filePreviews'

type NoteItemVisualState = {
  isBinary: boolean
  isSelected: boolean
  isMultiSelected: boolean
  isHighlighted: boolean
}

type NoteItemRowState = 'binary' | 'multiSelected' | 'selected' | 'highlighted' | 'default'

type NoteItemSurfaceProps = {
  className: string
  style: CSSProperties
  onClick: MouseEventHandler<HTMLDivElement>
  onContextMenu?: MouseEventHandler<HTMLDivElement>
  onMouseEnter?: () => void
  title?: string
  testId?: string
}

const NOTE_ITEM_BASE_CLASS_NAME = 'relative border-b border-[var(--border)] transition-colors'
const BINARY_NOTE_STYLE: CSSProperties = { padding: '14px 16px' }
const NOTE_ITEM_ROW_CLASS_NAMES: Record<NoteItemRowState, string> = {
  binary: 'cursor-default opacity-50',
  multiSelected: 'cursor-pointer',
  selected: 'cursor-pointer border-l-[3px]',
  highlighted: 'cursor-pointer bg-muted hover:bg-muted',
  default: 'cursor-pointer hover:bg-muted',
}

function resolveNoteItemRowState({ isBinary, isSelected, isMultiSelected, isHighlighted }: NoteItemVisualState): NoteItemRowState {
  if (isBinary) return 'binary'
  if (isMultiSelected) return 'multiSelected'
  if (isSelected) return 'selected'
  if (isHighlighted) return 'highlighted'
  return 'default'
}

function noteItemClassName(state: NoteItemVisualState) {
  return cn(NOTE_ITEM_BASE_CLASS_NAME, NOTE_ITEM_ROW_CLASS_NAMES[resolveNoteItemRowState(state)])
}

function noteItemStyle(isSelected: boolean, isMultiSelected: boolean, typeColor: string, typeLightColor: string): CSSProperties {
  const base: CSSProperties = { padding: isSelected && !isMultiSelected ? '14px 16px 14px 13px' : '14px 16px' }
  if (isMultiSelected) base.backgroundColor = 'color-mix(in srgb, var(--accent-blue) 10%, transparent)'
  else if (isSelected) { base.borderLeftColor = typeColor; base.backgroundColor = typeLightColor }
  return base
}

function resolveDisplayProps(entry: VaultEntry, typeEntryMap: Record<string, VaultEntry>, displayPropsOverride?: string[] | null): string[] {
  if (displayPropsOverride && displayPropsOverride.length > 0) return displayPropsOverride
  return typeEntryMap[entry.isA ?? '']?.listPropertiesDisplay ?? []
}

type NoteItemProps = {
  entry: VaultEntry
  isSelected: boolean
  isMultiSelected?: boolean
  isHighlighted?: boolean
  noteStatus?: NoteStatus
  /** When set, renders in Changes-view style: filename + change type icon */
  changeStatus?: 'modified' | 'added' | 'deleted' | 'untracked' | 'renamed'
  typeEntryMap: Record<string, VaultEntry>
  allEntries?: VaultEntry[]
  displayPropsOverride?: string[] | null
  onClickNote: (entry: VaultEntry, e: ReactMouseEvent) => void
  onPrefetch?: (path: string) => void
  onContextMenu?: (entry: VaultEntry, e: ReactMouseEvent) => void
}

function createNoteItemClickHandler(
  entry: VaultEntry,
  isBinary: boolean,
  onClickNote: NoteItemProps['onClickNote'],
) {
  if (isBinary) {
    return (event: ReactMouseEvent) => {
      event.preventDefault()
      event.stopPropagation()
    }
  }
  return (event: ReactMouseEvent) => onClickNote(entry, event)
}

function resolveNoteItemSurfaceProps({
  entry,
  isBinary,
  isSelected,
  isMultiSelected,
  isHighlighted,
  onClickNote,
  onPrefetch,
  onContextMenu,
  typeColor,
  typeLightColor,
}: NoteItemVisualState & {
  entry: VaultEntry
  onClickNote: NoteItemProps['onClickNote']
  onPrefetch?: NoteItemProps['onPrefetch']
  onContextMenu?: NoteItemProps['onContextMenu']
  typeColor: string
  typeLightColor: string
}): NoteItemSurfaceProps {
  return {
    className: noteItemClassName({ isBinary, isSelected, isMultiSelected, isHighlighted }),
    style: isBinary ? BINARY_NOTE_STYLE : noteItemStyle(isSelected, isMultiSelected, typeColor, typeLightColor),
    onClick: createNoteItemClickHandler(entry, isBinary, onClickNote),
    onContextMenu: onContextMenu ? (event) => onContextMenu(entry, event) : undefined,
    onMouseEnter: !isBinary && onPrefetch ? () => onPrefetch(entry.path) : undefined,
    testId: isMultiSelected ? 'multi-selected-item' : isBinary ? 'binary-file-item' : undefined,
    title: isBinary ? 'Cannot open this file type' : undefined,
  }
}

function NoteItemRow({
  surfaceProps,
  entryPath,
  isHighlighted,
  changeStatus,
  children,
}: {
  surfaceProps: NoteItemSurfaceProps
  entryPath: string
  isHighlighted: boolean
  changeStatus: NoteItemProps['changeStatus']
  children: ReactNode
}) {
  return (
    <div
      className={surfaceProps.className}
      style={surfaceProps.style}
      onClick={surfaceProps.onClick}
      onContextMenu={surfaceProps.onContextMenu}
      onMouseEnter={surfaceProps.onMouseEnter}
      data-testid={surfaceProps.testId}
      data-highlighted={isHighlighted || undefined}
      data-note-path={entryPath}
      data-change-status={changeStatus}
      title={surfaceProps.title}
    >
      {children}
    </div>
  )
}

/** Renders a vault entry row for note lists, search results, and filtered sidebars. */
export function NoteItem({ entry, isSelected, isMultiSelected = false, isHighlighted = false, noteStatus = 'clean', changeStatus, typeEntryMap, allEntries, displayPropsOverride, onClickNote, onPrefetch, onContextMenu }: NoteItemProps) {
  const isBinary = isOpaqueBinaryEntry(entry)
  const te = typeEntryMap[entry.isA ?? '']
  const displayProps = resolveDisplayProps(entry, typeEntryMap, displayPropsOverride)
  const typeColor = isBinary ? 'var(--muted-foreground)' : getTypeColor(entry.isA ?? 'Note', te?.color)
  const typeLightColor = getTypeLightColor(entry.isA ?? 'Note', te?.color)
  const surfaceProps = resolveNoteItemSurfaceProps({
    entry,
    isBinary,
    isSelected,
    isMultiSelected,
    isHighlighted,
    onClickNote,
    onPrefetch,
    onContextMenu,
    typeColor,
    typeLightColor,
  })

  return (
    <NoteItemRow
      surfaceProps={surfaceProps}
      entryPath={entry.path}
      isHighlighted={isHighlighted}
      changeStatus={changeStatus}
    >
      <NoteItemContent
        entry={entry}
        isBinary={isBinary}
        isSelected={isSelected}
        noteStatus={noteStatus}
        changeStatus={changeStatus}
        typeColor={typeColor}
        displayProps={displayProps}
        allEntries={allEntries ?? [entry]}
        typeEntryMap={typeEntryMap}
        onClickNote={onClickNote}
      />
    </NoteItemRow>
  )
}
