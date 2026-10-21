import {
  ArrowRight,
  Bell,
  Bold,
  Code,
  Cpu,
  Heading2,
  Image,
  Italic,
  Link,
  List,
  ListOrdered,
  Lock,
  Search,
  ShieldCheck,
  Sparkles,
  Strikethrough,
  Table,
} from 'lucide-react'
import { ThemeFrame } from '../ThemeFrame'
import { ChitLab } from '../chit/ChitLab'
import { RailLab } from '../rail/RailLab'
import { SidebarLab } from '../sidebar/SidebarLab'

function WindowChrome({ title }: { title: string }) {
  return (
    <div className="dl-windowchrome">
      <span className="dl-traffic">
        <i />
        <i />
        <i />
      </span>
      <span className="dl-windowtitle">{title}</span>
      <span className="dl-chip">
        <ShieldCheck size={10} />
        Local vault
      </span>
      <span className="dl-chip">
        <Lock size={10} />
        Private
      </span>
      <span className="dl-searchpill">
        <Search size={11} />
        Search notes, pages, graph
        <kbd>⌘K</kbd>
      </span>
      <Bell size={14} />
      <span className="dl-avatar">S</span>
    </div>
  )
}

function WindowSidebar({ active }: { active: string }) {
  return (
    <div
      style={{
        width: 250,
        flexShrink: 0,
        borderRight: '1px solid var(--border-subtle)',
        overflow: 'hidden',
      }}
    >
      <SidebarLab active={active} />
    </div>
  )
}

const HOME_STATS = [
  { label: 'Saved points', value: '124', delta: '+8 this week', tone: 'dl-tone-teal', spark: [3, 5, 4, 7, 6, 8] },
  { label: 'Notes', value: '127', delta: '+5 this week', tone: 'dl-tone-iris', spark: [6, 7, 9, 8, 11, 12] },
  { label: 'Pages', value: '34', delta: '+1 this week', tone: 'dl-tone-amber', spark: [2, 3, 3, 4, 4, 5] },
  { label: 'Graph nodes', value: '120', delta: '+6 this week', tone: 'dl-tone-coral', spark: [4, 6, 5, 8, 7, 9] },
] as const

const HOME_THREADS = [
  { title: 'Operating Thesis', meta: '10 notes · May 17' },
  { title: 'Second Brain Map', meta: '7 nodes · May 16' },
  { title: 'Project Atlas', meta: '4 notes · May 15' },
] as const

const HOME_MOODS = ['Amazing', 'Good', 'Okay', 'Tired', 'Anxious', 'Stressed']

function HomeWindow() {
  return (
    <div className="dl-window" style={{ minHeight: 640 }}>
      <WindowChrome title="Grimoire — Today" />
      <div className="dl-windowbody">
        <WindowSidebar active="Home" />
        <div className="dl-home">
          <div className="dl-home__daterow">
            <span className="dl-overline">THURSDAY NIGHT · OCTOBER 15</span>
            <span className="dl-chip">
              <Sparkles size={10} />
              Local &amp; Private
            </span>
          </div>

          <div className="dl-hero">
            <div className="dl-hero__title">Capture. Connect. Remember.</div>
            <p className="dl-hero__sub">One living notebook. Private by design. Powered by you.</p>
            <div className="dl-hero__composer">Catch it while it is here…</div>
            <div className="dl-hero__composerow">
              <span className="dl-pchip dl-pchip--on">Note</span>
              <span className="dl-pchip">Journal</span>
              <span className="dl-pchip">Dream</span>
              <span className="dl-pchip">Next</span>
              <span className="dl-pchip">Memory</span>
              <span className="dl-pchip">Ask</span>
              <button
                className="dl-btn dl-btn--primary"
                type="button"
                style={{ marginLeft: 'auto' }}
              >
                Capture
              </button>
            </div>
          </div>

          <div className="dl-home__stats">
            {HOME_STATS.map((s) => {
              const max = Math.max(...s.spark)
              const points = s.spark.map((v, i) => `${i * 6},${13 - (v / max) * 11}`).join(' ')
              return (
                <div className={`dl-stat dl-card ${s.tone}`} key={s.label}>
                  <div className="dl-home__statrow">
                    <div>
                      <div className="dl-stat__value">{s.value}</div>
                      <div className="dl-stat__label">{s.label}</div>
                    </div>
                    <svg className="dl-spark" width={34} height={14} viewBox="0 0 34 14">
                      <polyline points={points} />
                    </svg>
                  </div>
                  <span className="dl-stat__delta">{s.delta}</span>
                </div>
              )
            })}
          </div>

          <div className="dl-home__duo">
            <div className="dl-card dl-body">
              <div className="dl-card__head" style={{ padding: 0 }}>
                <span className="dl-overline">Journal check-in</span>
                <span className="dl-card__link">
                  Open journal
                  <ArrowRight size={11} />
                </span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '10px 0' }}>
                How are you feeling?
              </p>
              <div className="dl-phone__chips" style={{ marginTop: 0 }}>
                <span className="dl-pchip dl-pchip--on">Amazing</span>
                {HOME_MOODS.slice(1).map((mood) => (
                  <span className="dl-pchip" key={mood}>
                    {mood}
                  </span>
                ))}
              </div>
            </div>

            <div className="dl-card dl-body">
              <div className="dl-card__head" style={{ padding: 0 }}>
                <span className="dl-overline">Recent threads</span>
                <span className="dl-card__link">View all</span>
              </div>
              <div style={{ marginTop: 4 }}>
                {HOME_THREADS.map((t) => (
                  <div className="dl-threadrow" key={t.title}>
                    <b>{t.title}</b>
                    <span>{t.meta}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <RailLab />
      </div>
    </div>
  )
}

const NOTE_ROWS = [
  {
    title: 'Srinivas Pendela — useful agents that remember',
    excerpt: 'Memory-native developer tools for terminal agents, prompt compression, model discovery…',
    time: 'just now',
    rel: 'agents',
    relColor: '#57c4bd',
  },
  {
    title: 'Build Grimoire App',
    excerpt: 'This paragraph has bold text, italic text, bold italic, strikethrough, and inline code…',
    time: '1m ago',
    rel: 'memory',
    relColor: '#a99af0',
  },
  {
    title: 'Grimoire Feature Showcase',
    excerpt: 'A shippable in-vault feature showcase for Markdown, journals, dreams, links…',
    time: '2m ago',
    rel: 'ai',
    relColor: '#f0b968',
  },
  {
    title: 'Grimoire Feature Tour',
    excerpt: 'Launch-day checklist mapping every major Grimoire surface to an editable demo note.',
    time: '3m ago',
    rel: 'showcase',
    relColor: '#57c4bd',
  },
  {
    title: 'Markdown Learning',
    excerpt: 'Learn headings, emphasis, lists, tasks, wikilinks, code blocks, and frontmatter…',
    time: '4m ago',
    rel: 'markdown',
    relColor: '#a99af0',
  },
  {
    title: 'Properties and Types',
    excerpt: 'Frontmatter, custom types, icons, colors, owner, status, priority…',
    time: '5m ago',
    rel: 'properties',
    relColor: '#f0b968',
  },
] as const

function EditorWindow() {
  return (
    <div className="dl-window" style={{ minHeight: 720 }}>
      <WindowChrome title="Grimoire — Useful agents that remember" />
      <div className="dl-windowbody">
        <WindowSidebar active="Notebook" />
        <div className="dl-notelist">
          <div className="dl-notelist__head">
            <b>Inbox</b>
            <span className="dl-overline">Modified ↓</span>
          </div>
          {NOTE_ROWS.map((n, i) => (
            <div
              className={i === 0 ? 'dl-noterow dl-noterow--selected' : 'dl-noterow'}
              key={n.title}
            >
              <b>{n.title}</b>
              <p className="dl-noterow__excerpt">{n.excerpt}</p>
              <div className="dl-noterow__meta">
                {n.time} · <span style={{ color: n.relColor }}>{n.rel}</span> · Active
              </div>
            </div>
          ))}
        </div>
        <div className="dl-richeditor">
          <div className="dl-richeditor__crumb">Inbox › srinivas-pendela</div>
          <h1>Srinivas Pendela — useful agents that remember</h1>
          <div className="dl-richeditor__meta">
            <span>type markdown</span>
            <span>status active</span>
            <span>May 17</span>
            <span>vault Local vault</span>
            <span className="dl-tone-teal" style={{ color: 'var(--tone)' }}>
              agents, memory, ai
            </span>
          </div>
          <div className="dl-richeditor__toolbar">
            <Heading2 size={14} />
            <Bold size={14} />
            <Italic size={14} />
            <Strikethrough size={14} />
            <Code size={14} />
            <Link size={14} />
            <List size={14} />
            <ListOrdered size={14} />
            <Table size={14} />
            <Image size={14} />
          </div>
          <p className="dl-richeditor__lead">
            Memory-native developer tools for terminal agents, prompt compression, model
            discovery, observability, and local-first workflows.
          </p>
          <div className="dl-callout">
            <Sparkles size={13} style={{ color: '#57c4bd', flexShrink: 0, marginTop: 2 }} />
            <span>
              The bet is simple: useful agents are more than better chat boxes. They remember
              what matters, stay close to the machine, and earn every bit of context they ask
              for.
            </span>
          </div>
          <h2>Operating Thesis</h2>
          <p>
            Developer work is becoming agentic, but the stack around agents is still catching
            up. The winning layer is memory: identity, context, and intent signal.
          </p>
          <h2>Why Memory Matters</h2>
          <ul className="dl-bulletlist">
            <li>Context is expensive. Tokens, latency, and attention all compound.</li>
            <li>Continuity creates leverage. Each interaction compounds value when remembered.</li>
            <li>Local-first unlocks trust. Your data, your models, your rules.</li>
          </ul>
          <div className="dl-callout dl-callout--mint">
            <Sparkles size={13} style={{ color: '#45b883', flexShrink: 0, marginTop: 2 }} />
            <span>Principle: minimize what you forget. Maximize what you can recall precisely.</span>
          </div>
          <div className="dl-richeditor__status">
            1,127 words · 7,452 characters · Markdown · Saved 2m ago
          </div>
        </div>
        <RailLab />
      </div>
    </div>
  )
}

function AskWindow() {
  return (
    <div className="dl-window" style={{ minHeight: 640 }}>
      <WindowChrome title="Grimoire — Second Brain" />
      <div className="dl-windowbody">
        <WindowSidebar active="Graph" />
        <div className="dl-ask">
          <div className="dl-ask__head">
            <span>Ask your Second Brain</span>
            <span className="dl-chip">
              <Cpu size={10} />
              recall.unified
            </span>
            <span className="dl-chip">
              <Sparkles size={10} />
              Chitragupta
            </span>
          </div>
          <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', marginTop: 4 }}>
            <ChitLab />
          </div>
        </div>
      </div>
    </div>
  )
}

export function FullAppLab() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <ThemeFrame theme="light" label="Pearl Aurora · Home">
        <HomeWindow />
      </ThemeFrame>
      <ThemeFrame theme="dark" label="Nocturne Aurora · Editor">
        <EditorWindow />
      </ThemeFrame>
      <ThemeFrame theme="dark" label="Nocturne Aurora · Ask">
        <AskWindow />
      </ThemeFrame>
    </div>
  )
}
