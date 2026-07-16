import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, LockKeyhole } from 'lucide-react'
import { cn } from '@/lib/utils'
import { resolveEntryLocalityPolicy } from '../lib/localityPolicy'
import type { VaultEntry } from '../types'
import type { NeighborhoodLink, NoteNeighborhood } from '../utils/noteNeighborhood'

interface NeighborhoodMapProps {
  neighborhood: NoteNeighborhood
  entries: VaultEntry[]
  onNavigate: (target: string) => void
}

/**
 * The active note's one-hop neighborhood as an ambient two-column map:
 * pages linking here on the left, pages this note reaches on the right.
 * Real relationships only — it navigates, it never decorates.
 */
export function NeighborhoodMap({ neighborhood, entries, onNavigate }: NeighborhoodMapProps) {
  if (neighborhood.total === 0) return null
  const localOnlyPaths = new Set(
    entries.filter((entry) => resolveEntryLocalityPolicy(entry).localOnly).map((entry) => entry.path),
  )

  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-1" data-testid="neighborhood-map">
      <NeighborhoodColumn
        direction="incoming"
        title="Linked here"
        links={neighborhood.incoming}
        overflow={neighborhood.incomingOverflow}
        localOnlyPaths={localOnlyPaths}
        onNavigate={onNavigate}
      />
      <NeighborhoodColumn
        direction="outgoing"
        title="Links out"
        links={neighborhood.outgoing}
        overflow={neighborhood.outgoingOverflow}
        localOnlyPaths={localOnlyPaths}
        onNavigate={onNavigate}
      />
    </div>
  )
}

function NeighborhoodColumn({
  direction,
  title,
  links,
  overflow,
  localOnlyPaths,
  onNavigate,
}: {
  direction: 'incoming' | 'outgoing'
  title: string
  links: NeighborhoodLink[]
  overflow: number
  localOnlyPaths: ReadonlySet<string>
  onNavigate: (target: string) => void
}) {
  return (
    <div className="min-w-0" data-testid={`neighborhood-${direction}`}>
      <div className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
        {direction === 'incoming'
          ? <ArrowDownLeft className="size-3 shrink-0" aria-hidden="true" />
          : <ArrowUpRight className="size-3 shrink-0" aria-hidden="true" />}
        <span className="truncate">{title}</span>
        <span className="ml-auto tabular-nums">{links.length + overflow}</span>
      </div>
      {links.length === 0 ? (
        <p className="mt-1.5 text-[11px] leading-4 text-muted-foreground/80">
          {direction === 'incoming' ? 'No page links here yet.' : 'No links out yet.'}
        </p>
      ) : (
        <div className="mt-1.5 space-y-0.5">
          {links.map((link) => (
            <NeighborhoodChip
              key={link.path}
              link={link}
              localOnly={localOnlyPaths.has(link.path)}
              onNavigate={onNavigate}
            />
          ))}
          {overflow > 0 ? (
            <p className="px-1.5 pt-0.5 text-[10px] text-muted-foreground/70">+{overflow} more in the graph</p>
          ) : null}
        </div>
      )}
    </div>
  )
}

function NeighborhoodChip({
  link,
  localOnly,
  onNavigate,
}: {
  link: NeighborhoodLink
  localOnly: boolean
  onNavigate: (target: string) => void
}) {
  const relationship = link.kind === 'relationship'
  const detail = relationship ? link.label : 'Wikilink'

  return (
    <button
      type="button"
      className="flex w-full min-w-0 items-center gap-1.5 rounded-md px-1.5 py-1 text-left transition-colors hover:bg-muted/60"
      title={`${link.title} · ${detail}`}
      onClick={() => onNavigate(link.title)}
      data-testid="neighborhood-link"
      data-kind={link.kind}
    >
      <span
        aria-hidden="true"
        className={cn(
          'size-1.5 shrink-0 rounded-full',
          relationship ? 'bg-primary/70' : 'border border-muted-foreground/60 bg-transparent',
        )}
      />
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-1">
          <span className="truncate text-xs text-foreground">{link.title}</span>
          {link.mutual ? (
            <ArrowLeftRight className="size-3 shrink-0 text-muted-foreground" aria-label="Links both ways" />
          ) : null}
          {localOnly ? (
            <LockKeyhole className="size-3 shrink-0 text-muted-foreground" aria-label="Private/local" />
          ) : null}
        </span>
        {relationship ? (
          <span className="block truncate text-[10px] text-muted-foreground">{link.label}</span>
        ) : null}
      </span>
    </button>
  )
}
