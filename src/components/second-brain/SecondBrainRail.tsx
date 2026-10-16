import { useMemo } from 'react'
import {
  BookOpen,
  Brain,
  FileText,
  MoonStar,
  NotebookPen,
  PanelRight,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import type { GitCommit, VaultEntry } from '../../types'
import { parseFrontmatter, detectFrontmatterState } from '../../utils/frontmatter'
import { markdownSemanticsAdapter } from '../../utils/markdownSemanticsAdapter'
import { relativeDate } from '../../utils/noteListHelpers'
import { scrollToNoteHeading } from '../../utils/noteNavigation'
import { useBacklinks, useReferencedBy } from '../inspector/useInspectorData'
import { buildConnections, type ConnectionRow } from '../inspector/connectionsModel'
import './second-brain.css'

export interface SecondBrainRailProps {
  entry: VaultEntry | null
  content: string | null
  entries: VaultEntry[]
  gitHistory: GitCommit[]
  onNavigate: (target: string) => void
  onViewCommitDiff?: (commitHash: string) => void
  onAsk?: () => void
  onShowInspector: () => void
}

/** Vision-palette fills for neighbor nodes, keyed by Type accent color. */
const TYPE_FILL: Record<string, string> = {
  red: '#ea7a61',
  purple: '#7667d8',
  blue: '#5ba8e5',
  green: '#0e7c78',
  yellow: '#e8a23a',
  orange: '#ea7a61',
}

const LANE_TONES = ['sb-tone-teal', 'sb-tone-iris', 'sb-tone-amber', 'sb-tone-coral'] as const

function laneIcon(typeName: string) {
  switch (typeName.trim().toLowerCase()) {
    case 'journal': return BookOpen
    case 'dream': return MoonStar
    case 'memory': return Brain
    case 'note': return NotebookPen
    default: return FileText
  }
}

function truncateLabel(text: string, max = 18): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

function modifiedThisWeek(entries: VaultEntry[]): number {
  const weekAgo = Math.floor(Date.now() / 1000) - 7 * 86400
  return entries.filter((e) => (e.modifiedAt ?? e.createdAt ?? 0) >= weekAgo).length
}

interface GraphNeighbor {
  row: ConnectionRow
  x: number
  y: number
}

const GRAPH_CENTER = { x: 50, y: 31 }
const NEIGHBOR_CAP = 8

function layoutNeighbors(rows: ConnectionRow[]): GraphNeighbor[] {
  const neighbors = rows.filter((row) => row.entry && row.entry.path).slice(0, NEIGHBOR_CAP)
  const count = neighbors.length
  return neighbors.map((row, index) => {
    const angle = (index / Math.max(1, count)) * 2 * Math.PI - Math.PI / 2
    return {
      row,
      x: GRAPH_CENTER.x + 38 * Math.cos(angle),
      y: GRAPH_CENTER.y + 23 * Math.sin(angle),
    }
  })
}

function GraphSnap({ entry, connections }: { entry: VaultEntry; connections: ConnectionRow[] }) {
  const neighbors = useMemo(() => layoutNeighbors(connections), [connections])

  return (
    <>
      <div className="sb-graphsnap">
        <svg viewBox="0 0 100 62" role="img" aria-label="Graph snapshot of linked notes">
          {neighbors.map(({ row, x, y }) => {
            const strength = row.direction === 'both' ? 0.85 : row.direction === 'out' ? 0.55 : 0.5
            return (
              <line
                key={row.key}
                className={row.direction === 'both'
                  ? 'sb-graphsnap__edge sb-graphsnap__edge--hot sb-tone-teal'
                  : 'sb-graphsnap__edge sb-tone-teal'}
                x1={GRAPH_CENTER.x}
                y1={GRAPH_CENTER.y}
                x2={x}
                y2={y}
                strokeWidth={0.3 + strength * 0.5}
                opacity={0.5 + strength * 0.5}
              />
            )
          })}
          <circle
            className="sb-graphsnap__halo sb-tone-teal"
            cx={GRAPH_CENTER.x}
            cy={GRAPH_CENTER.y}
            r={12}
          />
          {neighbors.map(({ row, x, y }) => (
            <circle
              key={`node-${row.key}`}
              className="sb-graphsnap__node"
              cx={x}
              cy={y}
              r={4.2}
              style={{ fill: TYPE_FILL[row.entry?.color ?? ''] ?? '#7667d8' }}
            />
          ))}
          <circle
            className="sb-graphsnap__node sb-tone-teal"
            cx={GRAPH_CENTER.x}
            cy={GRAPH_CENTER.y}
            r={7}
            style={{ fill: '#0e7c78' }}
          />
          <text
            x={GRAPH_CENTER.x}
            y={GRAPH_CENTER.y + 17}
            textAnchor="middle"
            fontSize={3.2}
            fill="currentColor"
            opacity={0.55}
          >
            {truncateLabel(entry.title)}
          </text>
        </svg>
      </div>
      {neighbors.length === 0 && (
        <p className="sb-empty sb-graphsnap__caption">No links yet</p>
      )}
    </>
  )
}

function ConnectionsCard({ connections, onNavigate }: {
  connections: ConnectionRow[]
  onNavigate: (target: string) => void
}) {
  const groups: Array<{ label: string; rows: ConnectionRow[] }> = [
    { label: 'Belongs to', rows: connections.filter((row) => row.direction === 'out') },
    { label: 'Referenced by', rows: connections.filter((row) => row.direction === 'in') },
    { label: 'Related to', rows: connections.filter((row) => row.direction === 'both') },
  ]

  return (
    <div className="sb-card">
      <div className="sb-card__head">
        <span className="sb-overline">Connections</span>
        <span className="sb-card__link" aria-hidden="true">{connections.length}</span>
      </div>
      <div className="sb-body">
        {groups.map((group) => (
          <div className="sb-connsec" key={group.label}>
            <div className="sb-connsec__top">
              <span>{group.label}</span>
              <span className="sb-connsec__count">{group.rows.length}</span>
            </div>
            {group.rows.slice(0, 3).map((row) => (
              <button
                type="button"
                className="sb-quietrow"
                key={row.key}
                onClick={() => onNavigate(row.target)}
              >
                {row.title}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function OutlineCard({ content, onShowInspector }: {
  content: string | null
  onShowInspector: () => void
}) {
  const semantics = useMemo(
    () => markdownSemanticsAdapter.parseDocument(content ?? ''),
    [content],
  )
  const outlineHeadings = useMemo(
    () => semantics.headings.filter((heading) => heading.level >= 2),
    [semantics],
  )

  return (
    <div className="sb-card">
      <div className="sb-card__head">
        <span className="sb-overline">Outline</span>
        <button type="button" className="sb-card__link" onClick={onShowInspector}>
          View full outline
        </button>
      </div>
      <div className="sb-body">
        {outlineHeadings.length === 0 ? (
          <p className="sb-empty">No headings yet.</p>
        ) : (
          outlineHeadings.map((heading, index) => (
            <button
              type="button"
              className={heading.level >= 3 ? 'sb-outline__row sb-outline__row--h3' : 'sb-outline__row'}
              key={`${heading.slug}:${heading.line}`}
              title={`Line ${heading.line}`}
              aria-label={`Jump to H${heading.level} ${heading.text}`}
              onClick={() => scrollToNoteHeading(heading, index, semantics.headings)}
            >
              <span className="sb-outline__level">H{heading.level}</span>
              <span className="sb-outline__text">{heading.text}</span>
            </button>
          ))
        )}
      </div>
    </div>
  )
}

function HistoryCard({ gitHistory, onViewCommitDiff }: {
  gitHistory: GitCommit[]
  onViewCommitDiff?: (commitHash: string) => void
}) {
  if (gitHistory.length === 0) return null

  return (
    <div className="sb-card">
      <div className="sb-card__head">
        <span className="sb-overline">History</span>
        <span className="sb-card__link" aria-hidden="true">{gitHistory.length}</span>
      </div>
      <div className="sb-body">
        {gitHistory.slice(0, 3).map((commit) => {
          const row = (
            <>
              <span className="sb-historyrow__when">{relativeDate(commit.date)}</span>
              <span className="sb-historyrow__message">{commit.message}</span>
              <span className="sb-historyrow__hash">{commit.shortHash}</span>
            </>
          )
          return onViewCommitDiff ? (
            <button
              type="button"
              className="sb-quietrow sb-historyrow"
              key={commit.hash}
              title={`${commit.shortHash} · view diff`}
              onClick={() => onViewCommitDiff(commit.hash)}
            >
              {row}
            </button>
          ) : (
            <div className="sb-historyrow" key={commit.hash}>{row}</div>
          )
        })}
      </div>
    </div>
  )
}

export function SecondBrainRail({
  entry,
  content,
  entries,
  gitHistory,
  onNavigate,
  onViewCommitDiff,
  onAsk,
  onShowInspector,
}: SecondBrainRailProps) {
  const referencedBy = useReferencedBy(entry, entries)
  const backlinks = useBacklinks(entry, entries, referencedBy)

  const frontmatter = useMemo(() => parseFrontmatter(content ?? ''), [content])
  const frontmatterState = useMemo(() => detectFrontmatterState(content ?? ''), [content])

  const connections = useMemo<ConnectionRow[]>(() => {
    if (!entry) return []
    return buildConnections({
      entry,
      entries,
      frontmatter: frontmatterState === 'valid' ? frontmatter : null,
      referencedBy,
      backlinks,
    })
  }, [entry, entries, frontmatter, frontmatterState, referencedBy, backlinks])

  const vaultStats = useMemo(() => {
    const pages = entries.filter((e) => {
      const isA = e.isA?.trim().toLowerCase()
      return !isA || isA === 'page'
    })
    return {
      nodes: entries.length,
      pages: pages.length,
      links: entries.reduce((sum, e) => sum + e.outgoingLinks.length, 0),
      recentNodes: modifiedThisWeek(entries),
      recentPages: modifiedThisWeek(pages),
    }
  }, [entries])

  const lanes = useMemo(() => {
    const counts = new Map<string, number>()
    for (const e of entries) {
      const key = e.isA?.trim() || 'Note'
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    const top = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, LANE_TONES.length)
    const nowSec = Math.floor(Date.now() / 1000)
    return top.map(([type, count], index) => {
      const buckets = new Array<number>(14).fill(0)
      for (const e of entries) {
        if ((e.isA?.trim() || 'Note') !== type) continue
        const ts = e.modifiedAt ?? e.createdAt
        if (!ts) continue
        const day = Math.floor((nowSec - ts) / 86400)
        if (day >= 0 && day < 14) buckets[13 - day] += 1
      }
      return { type, count, buckets, tone: LANE_TONES[index] }
    })
  }, [entries])

  const stats = [
    { label: 'Nodes', value: vaultStats.nodes, delta: `+${vaultStats.recentNodes} this week` },
    { label: 'Pages', value: vaultStats.pages, delta: `+${vaultStats.recentPages} this week` },
    { label: 'Links', value: vaultStats.links, delta: null },
  ]

  return (
    <div className="sb-rail" data-panel-role="second-brain-rail">
      <div className="sb-rail__chrome">
        <div className="sb-rail__glyph">
          <Brain size={16} />
        </div>
        <span className="sb-rail__title">Second Brain</span>
        {onAsk && (
          <button type="button" className="sb-rail__ask" onClick={onAsk}>
            <Sparkles size={12} />
            Ask
          </button>
        )}
        <button
          type="button"
          className="sb-rail__iconbtn"
          onClick={onShowInspector}
          title="Legacy inspector view"
          aria-label="Show legacy inspector"
        >
          <PanelRight size={14} />
        </button>
      </div>

      {entry ? (
        <div className="sb-card sb-tone-teal">
          <div className="sb-card__head">
            <span className="sb-overline">Graph snapshot</span>
            <span className="sb-card__link" aria-hidden="true">
              {connections.length} {connections.length === 1 ? 'link' : 'links'}
            </span>
          </div>
          <GraphSnap entry={entry} connections={connections} />
        </div>
      ) : (
        <div className="sb-card sb-tone-teal">
          <div className="sb-card__head">
            <span className="sb-overline">Graph snapshot</span>
          </div>
          <div className="sb-body">
            <p className="sb-empty">No note selected</p>
          </div>
        </div>
      )}

      <div className="sb-stats">
        {stats.map((stat) => (
          <div className="sb-card sb-stat" key={stat.label}>
            <div className="sb-stat__value">{stat.value.toLocaleString()}</div>
            <div className="sb-stat__label">{stat.label}</div>
            {stat.delta && <span className="sb-stat__delta">{stat.delta}</span>}
          </div>
        ))}
      </div>

      {lanes.length > 0 && (
        <div className="sb-card">
          <div className="sb-card__head">
            <span className="sb-overline">Memory lanes</span>
          </div>
          <div className="sb-body">
            {lanes.map((lane) => {
              const Icon = laneIcon(lane.type)
              const max = Math.max(1, ...lane.buckets)
              const points = lane.buckets
                .map((v, i) => `${(i * 4.3).toFixed(1)},${16 - (v / max) * 14}`)
                .join(' ')
              return (
                <div className={`sb-lane ${lane.tone}`} key={lane.type}>
                  <div className="sb-lane__glyph">
                    <Icon size={13} />
                  </div>
                  <div className="sb-lane__meta">
                    <span className="sb-lane__label">{lane.type}</span>
                    <span className="sb-lane__count">{lane.count} {lane.count === 1 ? 'entry' : 'entries'}</span>
                  </div>
                  <svg className="sb-spark" width={56} height={18} viewBox="0 0 56 18" aria-hidden="true">
                    <polyline points={points} />
                  </svg>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {entry && <ConnectionsCard connections={connections} onNavigate={onNavigate} />}

      {entry && <OutlineCard content={content} onShowInspector={onShowInspector} />}

      <HistoryCard gitHistory={gitHistory} onViewCommitDiff={onViewCommitDiff} />

      <div className="sb-card sb-privacy sb-tone-teal">
        <div className="sb-privacy__icon">
          <ShieldCheck size={14} />
        </div>
        <div className="sb-privacy__body">
          <b>Local by design</b>
          <span>Your vault stays on this device.</span>
        </div>
      </div>
    </div>
  )
}
