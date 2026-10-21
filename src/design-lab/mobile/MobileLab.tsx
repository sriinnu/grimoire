import {
  ArrowUpRight,
  BatteryFull,
  Bell,
  House,
  Image,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Signal,
  Sparkle,
  Sun,
  Waypoints,
  Wifi,
} from 'lucide-react'

export function MobileLab() {
  return (
    <div className="dl-phone">
      <div className="dl-phone__notch" />
      <div className="dl-phone__screen">
        <div className="dl-phone__statusbar">
          <span>9:41</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <Signal size={12} />
            <Wifi size={12} />
            <BatteryFull size={12} />
          </span>
        </div>

        <div className="dl-phone__body">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span className="dl-chip">
              <ShieldCheck size={10} />
              Local vault
            </span>
            <span className="dl-chip" style={{ marginLeft: 'auto' }}>
              <Bell size={10} />
            </span>
          </div>

          <h2 className="dl-phone__greet">Good morning, Srinivas</h2>
          <p className="dl-phone__date">Shukla Panchami · Thursday, October 15</p>

          <div className="dl-card dl-phone__capture">
            <div className="dl-body">
              <span className="dl-overline">Capture a thought</span>
              <div
                style={{
                  fontFamily: "var(--grimoire-wordmark-font-family, 'Fraunces', serif)",
                  fontSize: 15,
                  fontWeight: 600,
                  margin: '8px 0',
                }}
              >
                Catch it while it is here.
              </div>
              <div className="dl-phone__textarea">Start with one thought…</div>
              <div className="dl-phone__chips">
                <span className="dl-pchip dl-pchip--on">Note</span>
                <span className="dl-pchip">Journal</span>
                <span className="dl-pchip">Dream</span>
                <span className="dl-pchip">Memory</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
                <span className="dl-addlink">
                  <Image size={11} />
                  Add
                </span>
                <button className="dl-btn dl-btn--primary" type="button">
                  Capture
                </button>
              </div>
            </div>
          </div>

          <div className="dl-phone__minirail">
            <div className="dl-card dl-mini">
              <b>Journal · Today</b>
              <span>2 saved points</span>
            </div>
            <div className="dl-card dl-mini">
              <b>Inbox</b>
              <span>2 waiting</span>
            </div>
          </div>

          <div className="dl-card">
            <div className="dl-card__head">
              <span className="dl-overline">Second Brain</span>
              <span className="dl-card__link">Ask</span>
            </div>
            <div className="dl-body">
              <div className="dl-cue dl-tone-amber">
                <div className="dl-cue__icon">
                  <Sparkle size={12} />
                </div>
                <span className="dl-cue__text">Clarity compounds when captured</span>
              </div>
              <div className="dl-cue dl-tone-teal">
                <div className="dl-cue__icon">
                  <Sun size={12} />
                </div>
                <span className="dl-cue__text">Daily note streak · 6 days</span>
              </div>
            </div>
          </div>

          <div className="dl-card dl-privacy">
            <div className="dl-privacy__body">
              <b>Secure by design</b>
              <span>100% local · on-device</span>
            </div>
            <ArrowUpRight size={12} style={{ marginLeft: 'auto', color: 'var(--text-tertiary)' }} />
          </div>
        </div>

        <div className="dl-phone__tabbar">
          <div className="dl-tab dl-tab--on">
            <House size={18} />
            Home
          </div>
          <div className="dl-tab">
            <Search size={18} />
            Search
          </div>
          <div className="dl-tab dl-tab--fab">
            <Plus size={20} />
          </div>
          <div className="dl-tab">
            <Waypoints size={18} />
            Graph
          </div>
          <div className="dl-tab">
            <Settings2 size={18} />
            Settings
          </div>
        </div>
      </div>
    </div>
  )
}
