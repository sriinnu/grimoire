import type { ComponentType, MouseEvent as ReactMouseEvent, SVGAttributes } from 'react'
import type { NoteStatus, VaultEntry } from '../../types'
import { cn } from '@/lib/utils'
import { getDisplayDate, relativeDate } from '../../utils/noteListHelpers'
import { resolveNoteIcon } from '../../utils/noteIcon'
import { NoteTitleIcon } from '../NoteTitleIcon'
import { TypeIconMark } from '../TypeIconMark'
import { ChangeNoteContent } from './ChangeNoteContent'
import { NoteOwnershipChips } from './NoteOwnershipChips'
import { PropertyChips } from './PropertyChips'
import { getNoteProjectContexts, isProjectContextPropertyName, type NoteProjectContext } from './noteContext'
import { getFileKindIcon, getTypeIcon } from './typeIcon'

type ChangeStatus = 'modified' | 'added' | 'deleted' | 'untracked' | 'renamed'

type NoteItemContentProps = {
  entry: VaultEntry
  isBinary: boolean
  isSelected: boolean
  locationLabel: string
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
  className,
  size = 14,
}: {
  TypeIcon: ComponentType<SVGAttributes<SVGSVGElement>>
  iconValue?: string | null
  typeColor: string
  className?: string
  size?: number
}) {
  return (
    <TypeIconMark
      className={cn('note-type-indicator', className)}
      color={typeColor}
      fallbackIcon={TypeIcon}
      iconValue={iconValue}
      size={size}
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

function hasVisibleNoteTitleIcon(icon: VaultEntry['icon']): boolean {
  return resolveNoteIcon(icon).kind !== 'none'
}

function NoteContextChips({
  locationLabel,
  projects,
  displayProps,
  typeEntryMap,
  onClickNote,
}: Pick<NoteItemContentProps, 'locationLabel' | 'displayProps' | 'typeEntryMap' | 'onClickNote'> & {
  projects: NoteProjectContext[]
}) {
  const showProjectChips = !displayProps.some(isProjectContextPropertyName)

  return (
    <NoteOwnershipChips
      locationLabel={locationLabel}
      projects={showProjectChips ? projects : []}
      typeEntryMap={typeEntryMap}
      onClickNote={onClickNote}
    />
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

function normalizeChipValue(value: VaultEntry['properties'][string]): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean)
  if (value === null || value === undefined || value === false) return []
  return [String(value)]
}

function getProjectSignalExclusions(projects: NoteProjectContext[]): Set<string> {
  return new Set(projects.flatMap((project) => [
    project.label.toLowerCase(),
    project.target.toLowerCase(),
    project.entry?.title.toLowerCase() ?? '',
  ]).filter(Boolean))
}

function belongsToSignalChips(entry: VaultEntry, projects: NoteProjectContext[]): string[] {
  const exclusions = getProjectSignalExclusions(projects)
  return entry.belongsTo
    .map((target) => target.replace(/^\[\[|\]\]$/gu, ''))
    .filter((target) => {
      const normalizedTarget = target.toLowerCase()
      const label = target.includes('|') ? target.split('|').at(-1)?.toLowerCase() : ''
      return !exclusions.has(normalizedTarget) && (!label || !exclusions.has(label))
    })
}

function getSignalChips(entry: VaultEntry, projects: NoteProjectContext[]): string[] {
  const source = [
    entry.isA,
    entry.status,
    ...normalizeChipValue(entry.properties.status),
    ...normalizeChipValue(entry.properties.Status),
    ...normalizeChipValue(entry.properties.tags),
    ...normalizeChipValue(entry.properties.Tags),
    ...belongsToSignalChips(entry, projects),
  ]

  return [...new Set(source.map((chip) => chip?.trim()).filter(Boolean) as string[])].slice(0, 4)
}

function NoteSignalChips({ entry, isSelected, projects }: { entry: VaultEntry; isSelected: boolean; projects: NoteProjectContext[] }) {
  const chips = getSignalChips(entry, projects).slice(0, isSelected ? 4 : 2)
  if (chips.length === 0) return null

  return (
    <div className="note-signal-chips flex flex-wrap gap-1.5" aria-label="Note signals">
      {chips.map((chip) => (
        <span key={chip} className="note-signal-chip" data-note-chip>
          {chip}
        </span>
      ))}
    </div>
  )
}

function NoteTitleRow({
  entry,
  isBinary,
  isSelected,
  noteStatus,
  TypeIcon,
  typeIconValue,
  typeColor,
}: Pick<NoteItemContentProps, 'entry' | 'isBinary' | 'isSelected' | 'noteStatus' | 'typeColor'> & {
  TypeIcon: ComponentType<SVGAttributes<SVGSVGElement>>
  typeIconValue?: string | null
}) {
  const hasTitleIcon = hasVisibleNoteTitleIcon(entry.icon)
  const titleText = (
    <span className="note-title-text min-w-0 truncate" data-testid="note-title-text">
      {noteStatus !== 'clean' && !isBinary && <StatusDot noteStatus={noteStatus} />}
      {entry.title}
      {!isBinary && <StateBadge archived={entry.archived} />}
    </span>
  )

  return (
    <div
      className={cn(
        'note-title-row truncate text-[13px] leading-[1.35]',
        'note-title-row--with-icon grid',
        isBinary ? 'text-muted-foreground' : 'text-foreground',
        isSelected && !isBinary ? 'font-semibold' : 'font-medium',
      )}
      data-title-icon="true"
      data-testid="note-title"
    >
      <span className="note-title-icon-cell flex items-center justify-center" data-testid="note-title-icon-cell">
        {hasTitleIcon ? (
          <NoteTitleIcon icon={entry.icon} size={15} testId="note-title-icon" />
        ) : (
          <NoteTypeIndicator
            TypeIcon={TypeIcon}
            className="note-title-leading-type-icon"
            iconValue={typeIconValue}
            size={15}
            typeColor={typeColor}
          />
        )}
      </span>
      {titleText}
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
  locationLabel,
  noteStatus,
  isSelected,
  displayProps,
  allEntries,
  typeEntryMap,
  onClickNote,
  TypeIcon,
  typeIconValue,
  typeColor,
}: Omit<NoteItemContentProps, 'isBinary' | 'changeStatus'> & {
  TypeIcon: ComponentType<SVGAttributes<SVGSVGElement>>
  typeIconValue?: string | null
}) {
  const projects = getNoteProjectContexts(entry, allEntries)

  return (
    <>
      <NoteTitleRow
        TypeIcon={TypeIcon}
        entry={entry}
        isBinary={false}
        isSelected={isSelected}
        noteStatus={noteStatus}
        typeColor={typeColor}
        typeIconValue={typeIconValue}
      />
      <NoteContextChips
        locationLabel={locationLabel}
        projects={projects}
        displayProps={displayProps}
        typeEntryMap={typeEntryMap}
        onClickNote={onClickNote}
      />
      <NoteSnippet snippet={entry.snippet} />
      <NoteSignalChips entry={entry} isSelected={isSelected} projects={projects} />
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
  locationLabel,
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
    <div className="note-content-stack space-y-2" data-title-icon="true" data-testid="note-content-stack">
      {isBinary ? (
        <NoteTitleRow
          TypeIcon={TypeIcon}
          entry={entry}
          isBinary={true}
          isSelected={isSelected}
          noteStatus={noteStatus}
          typeColor={typeColor}
          typeIconValue={typeIconValue}
        />
      ) : (
        <InteractiveNoteDetails
          TypeIcon={TypeIcon}
          entry={entry}
          locationLabel={locationLabel}
          noteStatus={noteStatus}
          isSelected={isSelected}
          typeColor={typeColor}
          typeIconValue={typeIconValue}
          displayProps={displayProps}
          allEntries={allEntries}
          typeEntryMap={typeEntryMap}
          onClickNote={onClickNote}
        />
      )}
    </div>
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
