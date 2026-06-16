import type React from 'react'
import { cn } from '@/lib/utils'
import type { GraphEdgeFilter, GraphScope, GraphTypeStat } from '../utils/graphDisplay'
import { Button } from './ui/button'

const EDGE_FILTERS: ReadonlyArray<{ value: GraphEdgeFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'relationship', label: 'Relations' },
  { value: 'body-link', label: 'Note links' },
  { value: 'incoming', label: 'Incoming' },
  { value: 'outgoing', label: 'Outgoing' },
]

interface GraphControlPanelProps {
  activePath: string | null
  edgeFilter: GraphEdgeFilter
  hiddenTypes: ReadonlySet<string>
  onEdgeFilterChange: (filter: GraphEdgeFilter) => void
  onScopeChange: (scope: GraphScope) => void
  onToggleType: (type: string) => void
  scope: GraphScope
  shownEdges: number
  shownNodes: number
  stats: { relationships: number; wikilinks: number }
  totalMatches: number
  typeStats: GraphTypeStat[]
}

/** Renders graph scope, edge, and type filter controls. */
export function GraphControlPanel({
  activePath,
  scope,
  onScopeChange,
  edgeFilter,
  onEdgeFilterChange,
  hiddenTypes,
  onToggleType,
  shownNodes,
  totalMatches,
  shownEdges,
  stats,
  typeStats,
}: GraphControlPanelProps) {
  return (
    <div className="rounded-md border border-border bg-background/80 p-3" data-testid="graph-control-panel">
      <div className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Graph</div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <Metric label="Notes" value={shownNodes} />
        <Metric label="Links" value={shownEdges} />
      </div>
      <div className="mt-2 text-xs text-muted-foreground">
        {shownNodes === totalMatches ? `${totalMatches} matching notes` : `${shownNodes} of ${totalMatches} matching notes`}
      </div>

      <RadioControlGroup label="Scope">
        <SegmentButton selected={scope === 'neighborhood'} disabled={!activePath} onClick={() => onScopeChange('neighborhood')}>
          Nearby
        </SegmentButton>
        <SegmentButton selected={scope === 'vault'} onClick={() => onScopeChange('vault')}>
          Notebook
        </SegmentButton>
      </RadioControlGroup>

      <RadioControlGroup label="Edges">
        {EDGE_FILTERS.map((filter) => (
          <SegmentButton
            key={filter.value}
            selected={edgeFilter === filter.value}
            disabled={!activePath && (filter.value === 'incoming' || filter.value === 'outgoing')}
            onClick={() => onEdgeFilterChange(filter.value)}
          >
            {filter.label}
          </SegmentButton>
        ))}
      </RadioControlGroup>

      <div className="mt-4 space-y-2">
        <div className="text-xs font-medium text-muted-foreground">Types</div>
        <div className="space-y-1" aria-label="Types">
          {typeStats.map((stat) => (
            <TypeToggle
              key={stat.type}
              hidden={hiddenTypes.has(stat.type)}
              stat={stat}
              onToggle={() => onToggleType(stat.type)}
            />
          ))}
        </div>
      </div>

      <div className="mt-4 space-y-2 text-xs text-muted-foreground">
        <LegendSwatch color="var(--primary)" label={`${stats.relationships} relationships`} />
        <LegendSwatch color="var(--muted-foreground)" dashed={true} label={`${stats.wikilinks} note links`} />
      </div>
    </div>
  )
}

function RadioControlGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-4 space-y-2">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="grid gap-1 rounded-md bg-muted p-1" role="radiogroup" aria-label={label}>
        {children}
      </div>
    </div>
  )
}

function SegmentButton({
  children,
  disabled = false,
  selected,
  onClick,
}: {
  children: React.ReactNode
  disabled?: boolean
  selected: boolean
  onClick: () => void
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      className={cn(
        'h-7 justify-start px-2 text-xs',
        selected ? 'bg-background text-foreground shadow-xs hover:bg-background' : 'text-muted-foreground',
      )}
      onClick={onClick}
    >
      {children}
    </Button>
  )
}

function TypeToggle({ hidden, stat, onToggle }: { hidden: boolean; stat: GraphTypeStat; onToggle: () => void }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      aria-label={`${stat.type} ${stat.count}`}
      aria-pressed={!hidden}
      className={cn('h-7 w-full justify-between px-2 text-xs', hidden && 'opacity-50')}
      onClick={onToggle}
    >
      <span className="flex min-w-0 items-center gap-2">
        <span className="size-2.5 rounded-full" style={{ background: stat.color }} />
        <span className="truncate">{stat.type}</span>
      </span>
      <span className="text-muted-foreground">{stat.count}</span>
    </Button>
  )
}

function LegendSwatch({ color, dashed = false, label }: { color: string; dashed?: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="h-0.5 w-7 rounded-full"
        style={{ background: dashed ? `repeating-linear-gradient(90deg, ${color} 0 5px, transparent 5px 10px)` : color }}
      />
      <span>{label}</span>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-muted p-2">
      <div className="text-lg font-semibold text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  )
}
