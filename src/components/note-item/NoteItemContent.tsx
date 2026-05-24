import type { ComponentType, MouseEvent as ReactMouseEvent, SVGAttributes } from 'react'
import { FolderTree } from 'lucide-react'
import type { NoteStatus, VaultEntry } from '../../types'
import { cn } from '@/lib/utils'
import { getDisplayDate, relativeDate } from '../../utils/noteListHelpers'
import { getTypeColor } from '../../utils/typeColors'
import { NoteTitleIcon } from '../NoteTitleIcon'
import { TypeIconMark } from '../TypeIconMark'
import { ChangeNoteContent } from './ChangeNoteContent'
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

function splitLocationLabel(locationLabel: string): { parent: string | null; leaf: string } {
  const parts = locationLabel.split(' / ').map((part) => part.trim()).filter(Boolean)
  const leaf = parts.pop() ?? locationLabel
  return { parent: parts.length > 0 ? parts.join(' / ') : null, leaf }
}

function NoteLocationChip({ locationLabel }: { locationLabel: string }) {
  const location = splitLocationLabel(locationLabel)

  return (
    <div
      className="note-context-chip note-location-chip inline-flex min-w-0 max-w-full items-center gap-1 self-start rounded border border-border bg-muted/55 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
      data-testid="note-location-chip"
      title={locationLabel}
    >
      <FolderTree className="size-3 shrink-0" aria-hidden="true" />
      {location.parent ? <span className="min-w-0 truncate text-muted-foreground">{location.parent} / </span> : null}
      <span className="min-w-0 truncate font-semibold text-foreground/85">{location.leaf}</span>
    </div>
  )
}

function NoteProjectChips({
  projects,
  typeEntryMap,
  onClickNote,
}: {
  projects: NoteProjectContext[]
  typeEntryMap: NoteItemContentProps['typeEntryMap']
  onClickNote: NoteItemContentProps['onClickNote']
}) {
  if (projects.length === 0) return null

  const projectType = typeEntryMap.Project ?? typeEntryMap.project
  const ProjectIcon = getTypeIcon('Project', projectType?.icon)
  const color = getTypeColor('Project', projectType?.color)

  return (
    <>
      {projects.map((project) => (
        <span
          key={project.key}
          className={cn(
            'note-context-chip note-project-chip inline-flex min-w-0 max-w-full items-center gap-1 self-start rounded border px-1.5 py-0.5 text-[10px] font-semibold',
            project.entry && 'cursor-pointer',
          )}
          data-testid="note-project-chip"
          onClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
            if (event.metaKey && project.entry) onClickNote(project.entry, event)
          }}
          style={{
            backgroundColor: 'var(--muted)',
            borderColor: `color-mix(in srgb, ${color} 42%, var(--border))`,
            color: 'var(--foreground)',
          }}
          title={project.entry ? `${project.entry.path} - Cmd-click to open project` : project.label}
        >
          <TypeIconMark
            className="shrink-0"
            color={color}
            fallbackIcon={ProjectIcon}
            iconValue={projectType?.icon ?? null}
            size={11}
          />
          <span className="truncate">{`Project · ${project.label}`}</span>
        </span>
      ))}
    </>
  )
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
    <div className="flex max-w-full flex-wrap gap-1.5">
      <NoteLocationChip locationLabel={locationLabel} />
      {showProjectChips ? <NoteProjectChips projects={projects} typeEntryMap={typeEntryMap} onClickNote={onClickNote} /> : null}
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
}: Pick<NoteItemContentProps, 'entry' | 'isBinary' | 'isSelected' | 'noteStatus'>) {
  return (
    <div
      className={cn('truncate pr-5 text-[13px]', isBinary ? 'text-muted-foreground' : 'text-foreground', isSelected && !isBinary ? 'font-semibold' : 'font-medium')}
      data-testid="note-title"
    >
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
  locationLabel,
  noteStatus,
  isSelected,
  displayProps,
  allEntries,
  typeEntryMap,
  onClickNote,
}: Omit<NoteItemContentProps, 'isBinary' | 'changeStatus' | 'typeColor'>) {
  const projects = getNoteProjectContexts(entry, allEntries)

  return (
    <>
      <NoteTitleRow entry={entry} isBinary={false} isSelected={isSelected} noteStatus={noteStatus} />
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
    <>
      <NoteTypeIndicator TypeIcon={TypeIcon} iconValue={typeIconValue} typeColor={typeColor} />
      <div className="space-y-2" data-testid="note-content-stack">
        {isBinary ? (
          <NoteTitleRow entry={entry} isBinary={true} isSelected={isSelected} noteStatus={noteStatus} />
        ) : (
          <InteractiveNoteDetails
            entry={entry}
            locationLabel={locationLabel}
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
