import { GitBranch, Link2 } from 'lucide-react'
import { useMemo } from 'react'
import { Button } from '@/components/ui/button'
import type { SidebarSelection, VaultEntry } from '../types'
import { buildNoteGraph } from '../utils/noteGraph'

interface ProjectLinkGraphProps {
  entries: VaultEntry[]
  selection: SidebarSelection
  onSelectNote: (entry: VaultEntry) => void
}

function isMarkdownEntry(entry: VaultEntry): boolean {
  return entry.fileKind === 'markdown' || !entry.fileKind
}

function isEntryInFolder(entry: VaultEntry, folderPath: string): boolean {
  const normalized = entry.path.replace(/\\/g, '/')
  return normalized.includes(`/${folderPath}/`) || normalized.startsWith(`${folderPath}/`)
}

/** Compact folder-local doc graph for the project workspace strip. */
export function ProjectLinkGraph({ entries, selection, onSelectNote }: ProjectLinkGraphProps) {
  const folderEntries = useMemo(() => {
    if (selection.kind !== 'folder') return []
    return entries.filter((entry) =>
      !entry.archived && isMarkdownEntry(entry) && isEntryInFolder(entry, selection.path),
    )
  }, [entries, selection])
  const entryByPath = useMemo(() => new Map(folderEntries.map((entry) => [entry.path, entry])), [folderEntries])
  const graph = useMemo(() => buildNoteGraph(folderEntries), [folderEntries])
  const linkedEdges = graph.edges.slice(0, 12)

  if (folderEntries.length === 0) return null

  return (
    <div className="mt-2 rounded-md border border-border bg-background px-2 py-2" data-testid="project-link-graph">
      <div className="mb-1.5 flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
        <GitBranch className="size-3.5" />
        <span>{graph.nodes.length} docs</span>
        <span>{graph.edges.length} links</span>
      </div>
      {linkedEdges.length > 0 ? (
        <div className="grid gap-1">
          {linkedEdges.map((edge) => {
            const source = entryByPath.get(edge.source)
            const target = entryByPath.get(edge.target)
            if (!source || !target) return null
            return (
              <div key={edge.id} className="flex min-w-0 items-center gap-1 text-[11px] text-muted-foreground">
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  className="h-6 min-w-0 flex-1 justify-start px-1.5 text-[11px]"
                  title={source.path}
                  onClick={() => onSelectNote(source)}
                >
                  <span className="truncate">{source.title}</span>
                </Button>
                <Link2 className="size-3 shrink-0" />
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  className="h-6 min-w-0 flex-1 justify-start px-1.5 text-[11px]"
                  title={target.path}
                  onClick={() => onSelectNote(target)}
                >
                  <span className="truncate">{target.title}</span>
                </Button>
              </div>
            )
          })}
        </div>
      ) : (
        <p className="m-0 text-[11px] text-muted-foreground">No project doc links yet.</p>
      )}
    </div>
  )
}
