import { lazy, Suspense, useEffect } from 'react'
import { ThemeFrame } from './ThemeFrame'
import './design-lab.css'

const RailLab = lazy(() => import('./rail/RailLab').then((m) => ({ default: m.RailLab })))
const SidebarLab = lazy(() => import('./sidebar/SidebarLab').then((m) => ({ default: m.SidebarLab })))
const ChitLab = lazy(() => import('./chit/ChitLab').then((m) => ({ default: m.ChitLab })))
const MobileLab = lazy(() => import('./mobile/MobileLab').then((m) => ({ default: m.MobileLab })))
const FullAppLab = lazy(() => import('./fullapp/FullAppLab').then((m) => ({ default: m.FullAppLab })))

function EditorGhost() {
  return (
    <div className="dl-editorghost" aria-hidden="true">
      <div className="dl-editorghost__crumb">Inbox › Useful agents that remember</div>
      <div className="dl-editorghost__title">Srinivas Pendela — useful agents that remember</div>
      <div className="dl-editorghost__line mid" />
      <div className="dl-editorghost__line" />
      <div className="dl-editorghost__line short" />
    </div>
  )
}

export default function DesignLab() {
  // The app shell locks body scroll; the lab is a normal scrolling document.
  useEffect(() => {
    const { overflow, height } = document.body.style
    document.body.style.overflow = 'auto'
    document.body.style.height = 'auto'
    return () => {
      document.body.style.overflow = overflow
      document.body.style.height = height
    }
  }, [])

  return (
    <div className="dl">
      <header className="dl-topbar">
        <span className="dl-topbar__wordmark">Grimoire</span>
        <span className="dl-topbar__badge">Design Lab · Envision</span>
        <nav className="dl-nav">
          <a href="#dl-rail">Second Brain</a>
          <a href="#dl-sidebar">Sidebar</a>
          <a href="#dl-chitragupta">Chitragupta</a>
          <a href="#dl-mobile">iPhone</a>
        </nav>
        <span className="dl-topbar__note">dev-only artifact · #design-lab · real tokens &amp; fonts</span>
      </header>

      <section className="dl-section" id="dl-rail">
        <div className="dl-section__kicker">Pillar 01 · Intelligence rail</div>
        <h1>The Second Brain rail</h1>
        <p className="dl-section__lede">
          A persistent 356px intelligence rail — graph snapshot, living stats, relationship scan,
          memory lanes, and AI summaries — so the second brain is a place, not a chatbot bolted on.
          Rendered with the app&apos;s real fonts and theme tokens in both modes.
        </p>
        <div className="dl-frames">
          <ThemeFrame theme="light" label="Pearl Aurora · Light">
            <EditorGhost />
            <RailLab />
          </ThemeFrame>
          <ThemeFrame theme="dark" label="Nocturne Aurora · Dark">
            <EditorGhost />
            <RailLab />
          </ThemeFrame>
        </div>
      </section>

      <section className="dl-section" id="dl-sidebar">
        <div className="dl-section__kicker">Pillar 02 · Navigation</div>
        <h1>The sidebar, dressed for the part</h1>
        <p className="dl-section__lede">
          Brand lockup with the Fraunces wordmark, sea-glass active states, count pills, colored
          space glyphs, and a calm status footer — the front door of the vault.
        </p>
        <div className="dl-frames">
          <ThemeFrame theme="light" label="Pearl Aurora · Light">
            <SidebarLab />
            <EditorGhost />
          </ThemeFrame>
          <ThemeFrame theme="dark" label="Nocturne Aurora · Dark">
            <SidebarLab />
            <EditorGhost />
          </ThemeFrame>
        </div>
      </section>

      <section className="dl-section" id="dl-chitragupta">
        <div className="dl-section__kicker">Pillar 03 · Agent communication</div>
        <h1>Talking with Chitragupta</h1>
        <p className="dl-section__lede">
          The conversation protocol as a designed surface: route disclosure with a live daemon orb,
          tool traces, source-backed citations with scores, explicit memory write-backs you approve,
          and a crystallize loop that turns threads into notes.
        </p>
        <div className="dl-frames">
          <ThemeFrame theme="light" label="Pearl Aurora · Light">
            <ChitLab />
          </ThemeFrame>
          <ThemeFrame theme="dark" label="Nocturne Aurora · Dark">
            <ChitLab />
          </ThemeFrame>
        </div>
      </section>

      <section className="dl-section" id="dl-fullapp">
        <div className="dl-section__kicker">Pillar 05 · The whole app</div>
        <h1>Full app, dressed in the vision</h1>
        <p className="dl-section__lede">
          Complete windows — chrome, sidebar, working columns, and rail together — in both modes.
          This is the distance between today&apos;s app and the one we are building.
        </p>
        <Suspense fallback={null}>
          <FullAppLab />
        </Suspense>
      </section>

      <section className="dl-section" id="dl-mobile">
        <div className="dl-section__kicker">Pillar 04 · Everywhere</div>
        <h1>The same brain, in your hand</h1>
        <p className="dl-section__lede">
          iPhone shell concept — capture-first home, condensed second-brain cards, and a thumb-zone
          tab bar with a raised capture button. Same tokens, same identity, smaller glass.
        </p>
        <div className="dl-frames">
          <ThemeFrame theme="light" label="iOS · Pearl Aurora" plain>
            <MobileLab />
          </ThemeFrame>
          <ThemeFrame theme="dark" label="iOS · Nocturne Aurora" plain>
            <MobileLab />
          </ThemeFrame>
        </div>
      </section>

      <Suspense fallback={null} />
    </div>
  )
}
