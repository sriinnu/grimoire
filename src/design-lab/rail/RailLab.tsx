import {
  ArrowUpRight,
  Bookmark,
  Brain,
  CheckCircle2,
  Lightbulb,
  Link2,
  Plus,
  Settings2,
  Sparkle,
  Sparkles,
  Sun,
  FolderKanban,
} from 'lucide-react'
import {
  graphEdges,
  graphNodes,
  memoryCues,
  memoryLanes,
  railHighlights,
  railStats,
  railSummary,
  reflectionHighlights,
  reflectionSignals,
  relationshipScan,
} from '../mockData'
import type { GraphNodeDatum } from '../mockData'

const NODE_FILL: Record<GraphNodeDatum['kind'], string> = {
  active: '#0e7c78',
  page: '#7667d8',
  journal: '#e8a23a',
  dream: '#a878e6',
  reference: '#5ba8e5',
  idea: '#45b883',
}

const LANE_GLYPH: Record<string, typeof Sun> = {
  'Daily notes': Sun,
  Ideas: Lightbulb,
  Projects: FolderKanban,
  References: Bookmark,
}

const CUE_ICON: Record<string, typeof Sparkle> = {
  sparkle: Sparkle,
  link: Link2,
  bookmark: Bookmark,
}

const CUE_TONE: Record<string, string> = {
  sparkle: 'dl-tone-amber',
  link: 'dl-tone-teal',
  bookmark: 'dl-tone-iris',
}

function GraphSnap() {
  const byId = new Map(graphNodes.map((n) => [n.id, n]))
  const active = graphNodes.find((n) => n.kind === 'active')
  return (
    <div className="dl-graphsnap">
      <svg viewBox="0 0 100 62">
        {graphEdges.map((e) => {
          const a = byId.get(e.from)
          const b = byId.get(e.to)
          if (!a || !b) return null
          const hot = e.strength >= 0.7
          return (
            <line
              key={`${e.from}-${e.to}`}
              className={hot ? 'dl-graphsnap__edge dl-graphsnap__edge--hot' : 'dl-graphsnap__edge'}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              strokeWidth={0.3 + e.strength * 0.5}
              opacity={0.5 + e.strength * 0.5}
            />
          )
        })}
        {active && <circle className="dl-graphsnap__halo" cx={active.x} cy={active.y} r={12} />}
        {graphNodes.map((n) => (
          <circle
            key={n.id}
            className="dl-graphsnap__node"
            cx={n.x}
            cy={n.y}
            r={n.r}
            style={{ fill: NODE_FILL[n.kind] }}
          />
        ))}
        {active && (
          <text
            x={active.x}
            y={active.y + 16}
            textAnchor="middle"
            fontSize={3.2}
            fill="currentColor"
            opacity={0.55}
          >
            Operating Thesis
          </text>
        )}
      </svg>
    </div>
  )
}

function Crystal() {
  return (
    <span className="dl-crystal">
      <svg width="46" height="52" viewBox="0 0 46 52" aria-hidden="true">
        <polygon points="23,2 37,16 23,22 9,16" fill="#0e7c78" opacity={0.28} stroke="#0e7c78" strokeWidth={0.8} />
        <polygon points="9,16 23,22 23,38 9,30" fill="#0e7c78" opacity={0.38} stroke="#0e7c78" strokeWidth={0.8} />
        <polygon points="37,16 23,22 23,38 37,30" fill="#0e7c78" opacity={0.5} stroke="#0e7c78" strokeWidth={0.8} />
        <polygon points="9,30 23,38 37,30 23,50" fill="#0e7c78" opacity={0.38} stroke="#0e7c78" strokeWidth={0.8} />
      </svg>
    </span>
  )
}

export function RailLab() {
  return (
    <div className="dl-rail">
      <div className="dl-rail__chrome">
        <div className="dl-rail__glyph">
          <Brain size={16} />
        </div>
        <span className="dl-rail__title">Second Brain</span>
        <button className="dl-rail__ask" type="button">
          <Sparkles size={12} />
          Ask
        </button>
        <span className="dl-rail__configure">
          <Settings2 size={11} />
          Configure
        </span>
      </div>

      <div className="dl-card">
        <div className="dl-card__head">
          <span className="dl-overline">Graph snapshot</span>
          <span className="dl-card__link">
            Live view
            <ArrowUpRight size={11} />
          </span>
        </div>
        <GraphSnap />
      </div>

      <div className="dl-stats">
        {railStats.map((s) => (
          <div className="dl-stat dl-card" key={s.label}>
            <div className="dl-stat__value">{s.value}</div>
            <div className="dl-stat__label">{s.label}</div>
            <span className="dl-stat__delta">{s.delta}</span>
          </div>
        ))}
      </div>

      <div className="dl-card">
        <div className="dl-card__head">
          <span className="dl-overline">Relationship scan</span>
          <span className="dl-card__link">View all</span>
        </div>
        <div className="dl-body">
          {relationshipScan.map((r) => (
            <div className={`dl-scanrow dl-tone-${r.tone}`} key={r.tier}>
              <div className="dl-scanrow__top">
                <span className="dl-scanrow__tier">{r.tier}</span>
                <span>{r.pct}%</span>
              </div>
              <div className="dl-meter">
                <i style={{ width: `${r.pct}%` }} />
              </div>
              <div className="dl-scanrow__notes">{r.notes}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="dl-card">
        <div className="dl-card__head">
          <span className="dl-overline">Memory lanes</span>
          <span className="dl-card__link">View all</span>
        </div>
        <div className="dl-body">
          {memoryLanes.map((lane) => {
            const Icon = LANE_GLYPH[lane.label] ?? Sun
            const max = Math.max(...lane.spark)
            const points = lane.spark.map((v, i) => `${i * 6.2},${16 - (v / max) * 14}`).join(' ')
            return (
              <div className={`dl-lane dl-tone-${lane.tone}`} key={lane.label}>
                <div className="dl-lane__glyph">
                  <Icon size={13} />
                </div>
                <div className="dl-lane__meta">
                  <span className="dl-lane__label">{lane.label}</span>
                  <span className="dl-lane__count">{lane.count} notes</span>
                </div>
                <svg className="dl-spark" width={56} height={18} viewBox="0 0 56 18">
                  <polyline points={points} />
                </svg>
              </div>
            )
          })}
        </div>
      </div>

      <div className="dl-card">
        <div className="dl-card__head">
          <span className="dl-overline">Summary</span>
        </div>
        <div className="dl-body">
          <p className="dl-summary__text">{railSummary.text}</p>
          <button className="dl-summary__more" type="button">
            Show more
          </button>
          <div className="dl-attrib">
            <span className="dl-attrib__dot" />
            {railSummary.model}
          </div>
        </div>
      </div>

      <div className="dl-card">
        <div className="dl-card__head">
          <span className="dl-overline">Highlights</span>
          <span className="dl-card__link">4</span>
        </div>
        <div className="dl-body">
          {railHighlights.map((h) => (
            <div className={`dl-hl dl-tone-${h.tone}`} key={h.quote}>
              {h.quote}
            </div>
          ))}
          <span className="dl-addlink">
            <Plus size={11} />
            Add highlight
          </span>
        </div>
      </div>

      <div className="dl-card">
        <div className="dl-card__head">
          <span className="dl-overline">Memory cues</span>
          <span className="dl-card__link">View all</span>
        </div>
        <div className="dl-body">
          {memoryCues.map((cue) => {
            const Icon = CUE_ICON[cue.icon] ?? Sparkle
            return (
              <div className={`dl-cue ${CUE_TONE[cue.icon] ?? ''}`} key={cue.text}>
                <div className="dl-cue__icon">
                  <Icon size={12} />
                </div>
                <div>
                  <span className="dl-cue__text">{cue.text}</span>
                  <span className="dl-cue__date">{cue.date}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="dl-card">
        <div className="dl-card__head">
          <span className="dl-overline">Reflection signals</span>
          <span className="dl-insightpill">3 new</span>
        </div>
        <div className="dl-body">
          {reflectionSignals.map((sig) => (
            <div className={`dl-signal__row dl-tone-${sig.tone}`} key={sig.label}>
              <span>{sig.label}</span>
              <div className="dl-meter">
                <i style={{ width: `${sig.pct}%` }} />
              </div>
              <span className="dl-signal__pct">{sig.pct}%</span>
            </div>
          ))}
        </div>
      </div>

      <div className="dl-card">
        <div className="dl-card__head">
          <span className="dl-overline">Reflection highlights</span>
          <span className="dl-card__link">This week</span>
        </div>
        <div className="dl-body">
          {reflectionHighlights.map((text) => (
            <div className="dl-cue dl-tone-teal" key={text}>
              <div className="dl-cue__icon">
                <CheckCircle2 size={12} />
              </div>
              <span className="dl-cue__text">{text}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="dl-card dl-privacy">
        <div className="dl-privacy__body">
          <b>Secure by design</b>
          <span>100% local. Your data stays on your device.</span>
        </div>
        <Crystal />
      </div>
    </div>
  )
}
