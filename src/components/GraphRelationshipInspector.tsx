import type React from 'react'
import { ArrowDownLeft, ArrowUpRight, BookOpen, Link2, LockKeyhole } from 'lucide-react'
import type { VaultEntry } from '../types'
import type { PositionedGraphNode } from '../utils/graphDisplay'
import type { NoteGraphEdge } from '../utils/noteGraph'
import { resolveEntryLocalityPolicy } from '../lib/localityPolicy'
import { Button } from './ui/button'

interface GraphRelationshipInspectorProps {
  entries: VaultEntry[]
  edges: NoteGraphEdge[]
  selectedNode: PositionedGraphNode | null
  onHighlightNode: (id: string | null) => void
  onOpenNode: (path: string) => void
}

interface RelationshipRow {
  direction: 'incoming' | 'outgoing'
  edge: NoteGraphEdge
  entry: VaultEntry
}

/**
 * Makes a page's actual Markdown relationships legible without asking users to
 * reverse-engineer a force-directed drawing. The canvas is navigation; this is
 * the explanation of what each connection means.
 */
export function GraphRelationshipInspector({
  entries,
  edges,
  selectedNode,
  onHighlightNode,
  onOpenNode,
}: GraphRelationshipInspectorProps) {
  if (!selectedNode) {
    return (
      <section className="rounded-md border border-border bg-background/80 p-3" data-testid="graph-relationship-inspector">
        <InspectorHeading />
        <p className="mt-3 text-sm text-muted-foreground">Select a page to inspect its links and backlinks.</p>
      </section>
    )
  }

  const entryByPath = new Map(entries.map((entry) => [entry.path, entry]))
  const relationships = edges.flatMap((edge): RelationshipRow[] => {
    if (edge.source === selectedNode.id) {
      const entry = entryByPath.get(edge.target)
      return entry ? [{ direction: 'outgoing', edge, entry }] : []
    }
    if (edge.target === selectedNode.id) {
      const entry = entryByPath.get(edge.source)
      return entry ? [{ direction: 'incoming', edge, entry }] : []
    }
    return []
  })
  const outgoing = relationships.filter((relationship) => relationship.direction === 'outgoing')
  const incoming = relationships.filter((relationship) => relationship.direction === 'incoming')
  const selectedEntry = entryByPath.get(selectedNode.path)
  const selectedLocalOnly = selectedEntry ? resolveEntryLocalityPolicy(selectedEntry).localOnly : false

  return (
    <section className="rounded-md border border-border bg-background/80 p-3" data-testid="graph-relationship-inspector">
      <InspectorHeading />
      <div className="mt-3 rounded-md border border-border bg-muted/30 px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <BookOpen className="size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-foreground">{selectedNode.title}</div>
            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>{selectedNode.type}</span>
              {selectedLocalOnly ? <><span>·</span><LockKeyhole className="size-3" /><span>Private/local</span></> : null}
            </div>
          </div>
        </div>
      </div>

      <RelationshipGroup
        icon={<ArrowUpRight className="size-3.5" />}
        title="Links from this page"
        empty="This page does not link to another page yet."
        rows={outgoing}
        onHighlightNode={onHighlightNode}
        onOpenNode={onOpenNode}
      />
      <RelationshipGroup
        icon={<ArrowDownLeft className="size-3.5" />}
        title="Mentioned by"
        empty="No other page links here yet."
        rows={incoming}
        onHighlightNode={onHighlightNode}
        onOpenNode={onOpenNode}
      />
    </section>
  )
}

function InspectorHeading() {
  return (
    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
      <Link2 className="size-3.5" />
      Document relationships
    </div>
  )
}

function RelationshipGroup({
  empty,
  icon,
  onHighlightNode,
  onOpenNode,
  rows,
  title,
}: {
  empty: string
  icon: React.ReactNode
  onHighlightNode: (id: string | null) => void
  onOpenNode: (path: string) => void
  rows: RelationshipRow[]
  title: string
}) {
  return (
    <div className="mt-4">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        {icon}
        <span>{title}</span>
        <span className="ml-auto rounded-full bg-muted px-1.5 py-0.5 text-[10px]">{rows.length}</span>
      </div>
      {rows.length === 0 ? <p className="mt-2 text-xs leading-5 text-muted-foreground">{empty}</p> : (
        <div className="mt-2 space-y-1">
          {rows.map((row) => (
            <RelationshipButton key={row.edge.id} row={row} onHighlightNode={onHighlightNode} onOpenNode={onOpenNode} />
          ))}
        </div>
      )}
    </div>
  )
}

function RelationshipButton({
  row,
  onHighlightNode,
  onOpenNode,
}: {
  row: RelationshipRow
  onHighlightNode: (id: string | null) => void
  onOpenNode: (path: string) => void
}) {
  const localOnly = resolveEntryLocalityPolicy(row.entry).localOnly
  const relationship = row.edge.kind === 'relationship'
  const detail = relationship ? row.edge.label : 'Wikilink'

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-auto w-full justify-start gap-2 rounded-md px-2 py-1.5 text-left"
      onClick={() => onOpenNode(row.entry.path)}
      onPointerEnter={() => onHighlightNode(row.entry.path)}
      onPointerLeave={() => onHighlightNode(null)}
      onFocus={() => onHighlightNode(row.entry.path)}
      onBlur={() => onHighlightNode(null)}
      data-testid="graph-relationship-row"
    >
      <span className="shrink-0 text-sm text-muted-foreground" aria-hidden="true">
        {row.direction === 'outgoing' ? '→' : '←'}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-xs font-semibold text-foreground">{row.entry.title}</span>
          {localOnly ? <LockKeyhole className="size-3 shrink-0 text-muted-foreground" aria-label="Private/local" /> : null}
        </span>
        <span className="block truncate text-[11px] text-muted-foreground">{detail} · {row.entry.isA ?? 'Note'}</span>
      </span>
    </Button>
  )
}
