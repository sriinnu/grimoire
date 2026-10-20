import { useCallback, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react'
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
import {
  ConstellationCanvas,
  type ConstellationNode,
} from '../ambient/ConstellationCanvas'
import { isWebGLAvailable, prefersReducedMotion, useDocumentTheme } from '../ambient/webgl'
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

/** Tones for types without an accent color; teal stays reserved for the active note. */
const TYPE_TONE_FILLS = ['#7667d8', '#e8a23a', '#ea7a61', '#5ba8e5', '#a878e6']

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
  r: number
  fill: string
  typeName: string
  degree: number
}

const GRAPH_CENTER = { x: 50, y: 31 }
const NEIGHBOR_CAP = 8

const RELATION_LABEL: Record<ConnectionRow['direction'], string> = {
  both: 'mutual',
  out: 'this note links',
  in: 'backlink',
}

/**
 * Stable type → fill map, one distinct tone per type. Types present in the current
 * neighborhood rank first (maximally distinct colors where it matters), then by vault
 * frequency. Teal stays reserved for the active note.
 */
function buildTypeFills(entries: VaultEntry[], preferred: string[]): Map<string, string> {
  const counts = new Map<string, number>()
  for (const e of entries) {
    const name = e.isA ?? 'Note'
    counts.set(name, (counts.get(name) ?? 0) + 1)
  }
  const preferredSet = new Set(preferred)
  const names = [...counts.entries()]
    .sort((a, b) => {
      const rank = (entry: [string, number]) => (preferredSet.has(entry[0]) ? 0 : 1)
      return rank(a) - rank(b) || b[1] - a[1] || a[0].localeCompare(b[0])
    })
    .map(([name]) => name)
  return new Map(names.map((name, index) => [name, TYPE_TONE_FILLS[index % TYPE_TONE_FILLS.length]]))
}

function layoutNeighbors(rows: ConnectionRow[], fills: Map<string, string>): GraphNeighbor[] {
  const neighbors = rows.filter((row) => row.entry && row.entry.path).slice(0, NEIGHBOR_CAP)
  const count = neighbors.length
  return neighbors.map((row, index) => {
    const angle = (index / Math.max(1, count)) * 2 * Math.PI - Math.PI / 2
    const degree = row.entry?.outgoingLinks?.length ?? 0
    const typeName = row.entry?.isA ?? 'Note'
    return {
      row,
      x: GRAPH_CENTER.x + 38 * Math.cos(angle),
      y: GRAPH_CENTER.y + 23 * Math.sin(angle),
      r: 3.1 + Math.min(2.2, degree * 0.4),
      fill: fills.get(typeName) ?? TYPE_TONE_FILLS[0],
      typeName,
      degree,
    }
  })
}

function GraphSnap({ entry, connections, entries, onNavigate }: {
  entry: VaultEntry
  connections: ConnectionRow[]
  entries: VaultEntry[]
  onNavigate: (target: string) => void
}) {
  const preferredTypes = useMemo(
    () => [...new Set(connections.filter((row) => row.entry).map((row) => row.entry?.isA ?? 'Note'))],
    [connections],
  )
  const fills = useMemo(() => buildTypeFills(entries, preferredTypes), [entries, preferredTypes])
  const neighbors = useMemo(() => layoutNeighbors(connections, fills), [connections, fills])

  const [canvasFailed, setCanvasFailed] = useState(false)
  const handleCanvasUnavailable = useCallback(() => setCanvasFailed(true), [])
  const theme = useDocumentTheme()
  const borderColor = useMemo(() => {
    // `theme` is read (below) only to re-run this memo after the
    // MutationObserver flips it — getComputedStyle then returns the new
    // token value for the freshly applied data-theme.
    void theme
    const value = getComputedStyle(document.documentElement).getPropertyValue('--border-strong').trim()
    return value || '#8a8f98'
  }, [theme])

  const constellationNodes: ConstellationNode[] = useMemo(() => neighbors.map((neighbor) => ({
    key: neighbor.row.key,
    title: neighbor.row.entry?.title ?? 'Note',
    typeName: neighbor.typeName,
    fill: neighbor.fill,
    direction: neighbor.row.direction,
    degree: neighbor.degree,
    target: neighbor.row.target,
  })), [neighbors])

  const useCanvas = neighbors.length > 0 &&
    !canvasFailed &&
    isWebGLAvailable() &&
    !prefersReducedMotion()

  const counts = { both: 0, out: 0, in: 0 }
  for (const { row } of neighbors) counts[row.direction] += 1
  const hub = neighbors.length > 1 ? [...neighbors].sort((a, b) => b.degree - a.degree)[0] : null
  const legendTypes = [...new Set(neighbors.map((n) => n.typeName))].slice(0, 4)
  const extraTypes = new Set(neighbors.map((n) => n.typeName)).size - legendTypes.length
  const hubLabelCount = neighbors.length <= 4 ? neighbors.length : 2
  const hubLabels = new Set(
    [...neighbors].sort((a, b) => b.degree - a.degree).slice(0, hubLabelCount).map((n) => n.row.key),
  )

  const insightParts = [
    counts.out > 0 ? `${counts.out} linked` : null,
    counts.in > 0 ? `${counts.in} backlink${counts.in === 1 ? '' : 's'}` : null,
    counts.both > 0 ? `${counts.both} mutual` : null,
  ].filter(Boolean)

  return (
    <>
      <div className="sb-graphsnap">
        {useCanvas ? (
          <ConstellationCanvas
            centerTitle={entry.title}
            nodes={constellationNodes}
            centerFill="#0e7c78"
            borderColor={borderColor}
            onSelect={onNavigate}
            onUnavailable={handleCanvasUnavailable}
          />
        ) : (
        <svg viewBox="0 0 100 62" role="img" aria-label="Graph snapshot of linked notes">
          <circle
            className="sb-graphsnap__halo sb-tone-teal"
            cx={GRAPH_CENTER.x}
            cy={GRAPH_CENTER.y}
            r={12}
          />
          {neighbors.map(({ row, x, y }) => {
            const strength = row.direction === 'both' ? 0.9 : row.direction === 'out' ? 0.6 : 0.5
            return (
              <line
                key={`edge-${row.key}`}
                className={`sb-graphsnap__edge sb-graphsnap__edge--${row.direction}`}
                x1={GRAPH_CENTER.x}
                y1={GRAPH_CENTER.y}
                x2={x}
                y2={y}
                strokeWidth={0.3 + strength * 0.5}
                opacity={0.45 + strength * 0.55}
              />
            )
          })}
          {neighbors.map((neighbor) => (
            <g
              key={neighbor.row.key}
              className="sb-graphsnap__group"
              role="link"
              tabIndex={0}
              aria-label={`${neighbor.row.entry?.title ?? 'Note'} · ${neighbor.typeName} · ${RELATION_LABEL[neighbor.row.direction]}`}
              onClick={() => neighbor.row.target && onNavigate(neighbor.row.target)}
              onKeyDown={(event) => {
                if ((event.key === 'Enter' || event.key === ' ') && neighbor.row.target) {
                  event.preventDefault()
                  onNavigate(neighbor.row.target)
                }
              }}
            >
              <title>{`${neighbor.row.entry?.title ?? 'Note'} · ${neighbor.typeName} · ${RELATION_LABEL[neighbor.row.direction]}`}</title>
              <circle
                className="sb-graphsnap__node"
                cx={neighbor.x}
                cy={neighbor.y}
                r={neighbor.r}
                style={{ fill: neighbor.fill }}
              />
              {hubLabels.has(neighbor.row.key) && (
                <text
                  className="sb-graphsnap__nodelabel"
                  x={neighbor.x}
                  y={neighbor.y + neighbor.r + 3.4}
                  textAnchor="middle"
                >
                  {truncateLabel(neighbor.row.entry?.title ?? '', 14)}
                </text>
              )}
            </g>
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
        )}
      </div>
      {neighbors.length === 0 ? (
        <p className="sb-empty sb-graphsnap__caption">
          No links yet — mention another note with [[ ]] to start this note&apos;s graph.
        </p>
      ) : (
        <>
          <div className="sb-graphsnap__legend">
            {legendTypes.map((typeName) => (
              <span key={typeName} className="sb-graphsnap__legenditem">
                <i style={{ background: fills.get(typeName) ?? TYPE_TONE_FILLS[0] }} />
                {typeName}
              </span>
            ))}
            {extraTypes > 0 && <span className="sb-graphsnap__legenditem">+{extraTypes}</span>}
            <span className="sb-graphsnap__edgekey">
              <svg viewBox="0 0 12 4" aria-hidden="true"><line x1="0" y1="2" x2="12" y2="2" className="sb-graphsnap__edge sb-graphsnap__edge--both" strokeWidth="0.9" /></svg>
              mutual
            </span>
            <span className="sb-graphsnap__edgekey">
              <svg viewBox="0 0 12 4" aria-hidden="true"><line x1="0" y1="2" x2="12" y2="2" className="sb-graphsnap__edge sb-graphsnap__edge--out" strokeWidth="0.9" /></svg>
              this note links
            </span>
            <span className="sb-graphsnap__edgekey">
              <svg viewBox="0 0 12 4" aria-hidden="true"><line x1="0" y1="2" x2="12" y2="2" className="sb-graphsnap__edge sb-graphsnap__edge--in" strokeWidth="0.9" /></svg>
              backlink
            </span>
          </div>
          <p className="sb-graphsnap__insight">
            {insightParts.join(' · ')}
            {hub && hub.degree > 0 && (
              <> · hub <strong>{truncateLabel(hub.row.entry?.title ?? '', 18)}</strong>{'\u00A0'}({hub.degree}{'\u00A0'}links)</>
            )}
          </p>
        </>
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

function TimeTravelCard({ gitHistory, onViewCommitDiff }: {
  gitHistory: GitCommit[]
  onViewCommitDiff?: (commitHash: string) => void
}) {
  // gitHistory is newest-first; position 0 (rightmost on the track) is "now".
  const [position, setPosition] = useState(0)
  const trackRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef(false)
  const count = gitHistory.length
  const commit = gitHistory[Math.min(position, count - 1)]
  const positionLabel = position === 0 ? 'now' : relativeDate(commit.date)

  const positionFromClientX = (clientX: number): number => {
    const track = trackRef.current
    if (!track || count < 2) return 0
    const rect = track.getBoundingClientRect()
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
    return Math.round((1 - ratio) * (count - 1))
  }

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    draggingRef.current = true
    event.currentTarget.setPointerCapture(event.pointerId)
    setPosition(positionFromClientX(event.clientX))
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return
    setPosition(positionFromClientX(event.clientX))
  }

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    draggingRef.current = false
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
      event.preventDefault()
      setPosition((current) => Math.max(0, current - 1))
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
      event.preventDefault()
      setPosition((current) => Math.min(count - 1, current + 1))
    } else if (event.key === 'Home') {
      event.preventDefault()
      setPosition(0)
    } else if (event.key === 'End') {
      event.preventDefault()
      setPosition(count - 1)
    }
  }

  return (
    <div className="sb-card sb-tone-teal">
      <div className="sb-card__head">
        <span className="sb-overline">Time travel</span>
        <span className="sb-card__link" aria-hidden="true">{positionLabel}</span>
      </div>
      <div className="sb-body">
        <div
          ref={trackRef}
          className="sb-tt__track"
          role="slider"
          tabIndex={0}
          data-testid="history-scrubber"
          aria-label="Version history"
          aria-valuemin={0}
          aria-valuemax={count - 1}
          aria-valuenow={position}
          aria-valuetext={`${positionLabel} · ${commit.shortHash} · ${commit.message}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onKeyDown={handleKeyDown}
        >
          <span className="sb-tt__line" aria-hidden="true" />
          {gitHistory.map((item, index) => (
            <span
              key={item.hash}
              aria-hidden="true"
              className={index === position ? 'sb-tt__dot sb-tt__dot--active' : 'sb-tt__dot'}
              style={{ left: `${count > 1 ? ((count - 1 - index) / (count - 1)) * 100 : 50}%` }}
            />
          ))}
        </div>
        <p className="sb-tt__readout" data-testid="history-readout">
          <span className="sb-tt__when">{positionLabel}</span>
          <span className="sb-tt__hash">{commit.shortHash}</span>
          <span className="sb-tt__msg">{commit.message}</span>
        </p>
        <button
          type="button"
          className="sb-quietrow sb-tt__open"
          disabled={!onViewCommitDiff}
          title={onViewCommitDiff ? `${commit.shortHash} · view diff` : 'Diff view unavailable'}
          onClick={() => onViewCommitDiff?.(commit.hash)}
          data-testid="history-open-version"
        >
          View this version
        </button>
        <ul className="sb-sr-only">
          {gitHistory.map((item) => (
            <li key={item.hash}>{`${item.shortHash} · ${relativeDate(item.date)} · ${item.message}`}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function HistoryCard({ gitHistory, onViewCommitDiff }: {
  gitHistory: GitCommit[]
  onViewCommitDiff?: (commitHash: string) => void
}) {
  if (gitHistory.length === 0) return null
  if (gitHistory.length >= 2) {
    return <TimeTravelCard gitHistory={gitHistory} onViewCommitDiff={onViewCommitDiff} />
  }

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
          <GraphSnap entry={entry} connections={connections} entries={entries} onNavigate={onNavigate} />
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
