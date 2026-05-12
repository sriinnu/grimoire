import type { ComponentType, MouseEvent as ReactMouseEvent, SVGAttributes } from 'react'
import type { NoteStatus, VaultEntry } from '../../types'
import { cn } from '@/lib/utils'
import { getDisplayDate, relativeDate } from '../../utils/noteListHelpers'
import { NoteTitleIcon } from '../NoteTitleIcon'
import { TypeIconMark } from '../TypeIconMark'
import { ChangeNoteContent } from './ChangeNoteContent'
import { PropertyChips } from './PropertyChips'
import { getFileKindIcon, getTypeIcon } from './typeIcon'

type ChangeStatus = 'modified' | 'added' | 'deleted' | 'untracked' | 'renamed'

type NoteItemContentProps = {
  entry: VaultEntry
  isBinary: boolean
  isSelected: boolean
  noteStatus: NoteStatus
  changeStatus?: ChangeStatus
  typeColor: string
  displayProps: string[]
  allEntries: VaultEntry[]
  typeEntryMap: Record<string, VaultEntry>
  onClickNote: (entry: VaultEntry, e: ReactMouseEvent) => void
}

const NOTE_STATUS_DOT: Record<string, { color: string; testId: string; title: string }> = {
  pendingSave: { color: 'var(--accent-green)', testId: 'pending-save-indicator', title: 'Saving to disk…' },
  new: { color: 'var(--accent-green)', testId: 'new-indicator', title: 'New (uncommitted)' },
  modified: { color: 'var(--accent-orange)', testId: 'modified-indicator', title: 'Modified (uncommitted)' },
}

function StatusDot({ noteStatus }: { noteStatus: NoteStatus }) {
  const dot = NOTE_STATUS_DOT[noteStatus]
  if (!dot) return null

  return (
    <span
      className={`mr-1.5 inline-block align-middle${noteStatus === 'pendingSave' ? ' tab-status-pulse' : ''}`}
      data-testid={dot.testId}
      style={{ width: 6, height: 6, borderRadius: '50%', background: dot.color, verticalAlign: 'middle' }}
      title={dot.title}
    />
  )
}

function StateBadge({ archived }: { archived: boolean }) {
  if (!archived) return null

  return (
    <span
      className="ml-1.5 inline-block align-middle text-muted-foreground"
      style={{ fontSize: 9, fontWeight: 500, background: 'var(--muted)', borderRadius: 4, padding: '1px 4px', verticalAlign: 'middle' }}
    >
      ARCHIVED
    </span>
  )
}

function NoteTypeIndicator({
  TypeIcon,
  iconValue,
  typeColor,
}: {
  TypeIcon: ComponentType<SVGAttributes<SVGSVGElement>>
  iconValue?: string | null
  typeColor: string
}) {
  return (
    <TypeIconMark
      className="absolute right-3 top-2.5"
      color={typeColor}
      fallbackIcon={TypeIcon}
      iconValue={iconValue}
      size={14}
      testId="type-icon"
    />
  )
}

function NoteSnippet({ snippet }: { snippet?: string | null }) {
  if (!snippet) return null

  return (
    <div
      className="text-[12px] leading-[1.5] text-muted-foreground"
      data-testid="note-snippet"
      style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
    >
      {snippet}
    </div>
  )
}

function NotePropertySection({
  entry,
  displayProps,
  allEntries,
  typeEntryMap,
  onClickNote,
}: Pick<NoteItemContentProps, 'entry' | 'displayProps' | 'allEntries' | 'typeEntryMap' | 'onClickNote'>) {
  if (displayProps.length === 0) return null

  return (
    <PropertyChips
      entry={entry}
      displayProps={displayProps}
      allEntries={allEntries}
      typeEntryMap={typeEntryMap}
      onOpenNote={onClickNote}
    />
  )
}

function NoteTitleRow({
  entry,
  isBinary,
  isSelected,
  noteStatus,
}: Pick<NoteItemContentProps, 'entry' | 'isBinary' | 'isSelected' | 'noteStatus'>) {
  return (
    <div className={cn('truncate pr-5 text-[13px]', isBinary ? 'text-muted-foreground' : 'text-foreground', isSelected && !isBinary ? 'font-semibold' : 'font-medium')}>
      {noteStatus !== 'clean' && !isBinary && <StatusDot noteStatus={noteStatus} />}
      <NoteTitleIcon icon={entry.icon} size={15} className="mr-1" testId="note-title-icon" />
      {entry.title}
      {!isBinary && <StateBadge archived={entry.archived} />}
    </div>
  )
}

function NoteDateRow({ entry }: { entry: VaultEntry }) {
  const modifiedLabel = relativeDate(getDisplayDate(entry))
  const createdLabel = entry.createdAt ? `Created ${relativeDate(entry.createdAt)}` : null

  if (!modifiedLabel && !createdLabel) return null

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-[10px] text-muted-foreground" data-testid="note-date-row">
      <span>{modifiedLabel}</span>
      {createdLabel && <span className="justify-self-end text-right">{createdLabel}</span>}
    </div>
  )
}

function InteractiveNoteDetails({
  entry,
  noteStatus,
  isSelected,
  displayProps,
  allEntries,
  typeEntryMap,
  onClickNote,
}: Omit<NoteItemContentProps, 'isBinary' | 'changeStatus' | 'typeColor'>) {
  return (
    <>
      <NoteTitleRow entry={entry} isBinary={false} isSelected={isSelected} noteStatus={noteStatus} />
      <NoteSnippet snippet={entry.snippet} />
      <NotePropertySection
        entry={entry}
        displayProps={displayProps}
        allEntries={allEntries}
        typeEntryMap={typeEntryMap}
        onClickNote={onClickNote}
      />
      <NoteDateRow entry={entry} />
    </>
  )
}

function resolveNoteTypeIcon(entry: VaultEntry, customIcon?: string | null): ComponentType<SVGAttributes<SVGSVGElement>> {
  if (entry.fileKind && entry.fileKind !== 'markdown') return getFileKindIcon(entry.fileKind)
  return getTypeIcon(entry.isA, customIcon)
}

function StandardNoteContent({
  entry,
  isBinary,
  noteStatus,
  isSelected,
  typeColor,
  displayProps,
  allEntries,
  typeEntryMap,
  onClickNote,
}: Omit<NoteItemContentProps, 'changeStatus'>) {
  const te = typeEntryMap[entry.isA ?? '']
  const TypeIcon = resolveNoteTypeIcon(entry, te?.icon)
  const typeIconValue = entry.fileKind && entry.fileKind !== 'markdown' ? null : te?.icon ?? null

  return (
    <>
      <NoteTypeIndicator TypeIcon={TypeIcon} iconValue={typeIconValue} typeColor={typeColor} />
      <div className="space-y-2" data-testid="note-content-stack">
        {isBinary ? (
          <NoteTitleRow entry={entry} isBinary={true} isSelected={isSelected} noteStatus={noteStatus} />
        ) : (
          <InteractiveNoteDetails
            entry={entry}
            noteStatus={noteStatus}
            isSelected={isSelected}
            displayProps={displayProps}
            allEntries={allEntries}
            typeEntryMap={typeEntryMap}
            onClickNote={onClickNote}
          />
        )}
      </div>
    </>
  )
}

/** Renders either regular note metadata or change-list metadata inside a note row. */
export function NoteItemContent(props: NoteItemContentProps) {
  if (props.changeStatus) {
    return (
      <ChangeNoteContent
        entry={props.entry}
        changeStatus={props.changeStatus}
        isSelected={props.isSelected}
        isDeletedChange={props.changeStatus === 'deleted'}
      />
    )
  }

  return <StandardNoteContent {...props} />
}
