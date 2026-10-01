import type { MouseEvent as ReactMouseEvent, SVGAttributes, ComponentType } from 'react'
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
    <span
      className="note-meta-item note-location-chip min-w-0 truncate"
      data-testid="note-location-chip"
      title={locationLabel}
    >
      {location.parent ? <span>{location.parent} / </span> : null}
      <span>{location.leaf}</span>
    </span>
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
        'note-meta-item note-project-chip inline-flex min-w-0 items-center gap-1',
        project.entry && 'cursor-pointer',
      )}
      data-testid="note-project-chip"
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        if (event.metaKey && project.entry) onClickNote(project.entry, event)
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
          className="note-meta-item note-project-chip note-project-chip--more"
          data-testid="note-project-chip-more"
          title={hiddenProjects.map((project) => project.label).join(', ')}
        >
          +{hiddenProjects.length}
        </span>
      ) : null}
    </>
  )
}

/**
 * Folder + project ownership as inline meta items (rendered inside the note's
 * single meta line, not as a separate chip row). Root notes skip the folder.
 */
export function NoteOwnershipChips({
  locationLabel,
  projects,
  typeEntryMap,
  onClickNote,
}: NoteOwnershipChipsProps) {
  if (!locationLabel && projects.length === 0) return null

  return (
    <span className="note-meta-group" data-testid="note-ownership-chips">
      <NoteProjectChips projects={projects} typeEntryMap={typeEntryMap} onClickNote={onClickNote} />
      {locationLabel ? <NoteLocationChip locationLabel={locationLabel} /> : null}
    </span>
  )
}
