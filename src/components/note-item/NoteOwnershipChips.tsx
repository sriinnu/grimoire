import type { MouseEvent as ReactMouseEvent, SVGAttributes, ComponentType } from 'react'
import { FolderTree } from 'lucide-react'
import type { VaultEntry } from '../../types'
import { cn } from '@/lib/utils'
import { getTypeColor } from '../../utils/typeColors'
import { TypeIconMark } from '../TypeIconMark'
import { getTypeIcon } from './typeIcon'
import type { NoteProjectContext } from './noteContext'

interface NoteOwnershipChipsProps {
  locationLabel: string
  projects: NoteProjectContext[]
  typeEntryMap: Record<string, VaultEntry>
  onClickNote: (entry: VaultEntry, e: ReactMouseEvent) => void
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

function projectTypeVisuals(typeEntryMap: Record<string, VaultEntry>): {
  ProjectIcon: ComponentType<SVGAttributes<SVGSVGElement>>
  color: string
  iconValue?: string | null
} {
  const projectType = typeEntryMap.Project ?? typeEntryMap.project
  return {
    ProjectIcon: getTypeIcon('Project', projectType?.icon),
    color: getTypeColor('Project', projectType?.color),
    iconValue: projectType?.icon ?? null,
  }
}

function NoteProjectChip({
  project,
  ProjectIcon,
  color,
  iconValue,
  onClickNote,
}: {
  project: NoteProjectContext
  ProjectIcon: ComponentType<SVGAttributes<SVGSVGElement>>
  color: string
  iconValue?: string | null
  onClickNote: NoteOwnershipChipsProps['onClickNote']
}) {
  return (
    <span
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
      aria-label={`Project ${project.label}`}
    >
      <TypeIconMark
        className="shrink-0"
        color={color}
        fallbackIcon={ProjectIcon}
        iconValue={iconValue}
        size={11}
      />
      <span className="truncate">{project.label}</span>
    </span>
  )
}

function NoteProjectChips({
  projects,
  typeEntryMap,
  onClickNote,
}: Pick<NoteOwnershipChipsProps, 'projects' | 'typeEntryMap' | 'onClickNote'>) {
  if (projects.length === 0) return null

  const [primaryProject, ...hiddenProjects] = projects
  const { ProjectIcon, color, iconValue } = projectTypeVisuals(typeEntryMap)

  return (
    <>
      <NoteProjectChip
        project={primaryProject}
        ProjectIcon={ProjectIcon}
        color={color}
        iconValue={iconValue}
        onClickNote={onClickNote}
      />
      {hiddenProjects.length > 0 ? (
        <span
          className="note-context-chip note-project-chip note-project-chip--more inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground"
          data-testid="note-project-chip-more"
          title={hiddenProjects.map((project) => project.label).join(', ')}
        >
          +{hiddenProjects.length}
        </span>
      ) : null}
    </>
  )
}

/** Shows a compact folder + project ownership row for each note card. */
export function NoteOwnershipChips({
  locationLabel,
  projects,
  typeEntryMap,
  onClickNote,
}: NoteOwnershipChipsProps) {
  return (
    <div className="flex max-w-full flex-wrap gap-1.5" data-testid="note-ownership-chips">
      <NoteLocationChip locationLabel={locationLabel} />
      <NoteProjectChips projects={projects} typeEntryMap={typeEntryMap} onClickNote={onClickNote} />
    </div>
  )
}
