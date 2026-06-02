import { cn } from '@/lib/utils'

interface SidebarArtworkProps {
  compact?: boolean
}

/** Renders the ambient Grimoire vault-atlas sigil in the sidebar and settings preview. */
export function SidebarArtwork({ compact = false }: SidebarArtworkProps) {
  return (
    <div
      aria-hidden="true"
      className={cn('sidebar-artwork', compact && 'sidebar-artwork--compact')}
      data-testid={compact ? 'settings-sidebar-artwork-preview' : 'sidebar-artwork'}
    >
      <GrimoireSigil />
      <PouchIntakeOverlay />
    </div>
  )
}

function PouchIntakeOverlay() {
  return (
    <svg
      className="sidebar-artwork__pouch-overlay"
      data-sidebar-art-channel="foreground-pouch-intake"
      viewBox="0 120 320 120"
    >
      <path className="sidebar-pouch-overlay__aura" d="M53 160c37-38 80-49 127-31 37 14 68 6 94-23v120H53z" />
      <path className="sidebar-pouch-overlay__cloud sidebar-pouch-overlay__cloud--upper" d="M98 149c10-20 33-22 47-5 13-17 39-12 47 8 19-1 33 16 28 33-51 12-94 5-128-20 0-7 2-12 6-16z" />
      <path className="sidebar-pouch-overlay__cloud sidebar-pouch-overlay__cloud--left" d="M44 158c7-15 24-18 34-6 8-11 26-9 31 4 13 0 22 11 18 24-35 6-63-1-84-20z" />
      <path className="sidebar-pouch-overlay__cloud sidebar-pouch-overlay__cloud--right" d="M277 159c-8-15-25-18-35-6-8-11-26-8-31 5-13 1-22 12-17 25 34 5 62-3 83-24z" />
      <path className="sidebar-pouch-overlay__wisp" d="M47 174c35-7 64 3 86 29 15 18 36 22 62 10" />
      <path className="sidebar-pouch-overlay__wisp sidebar-pouch-overlay__wisp--right" d="M273 175c-36-6-65 5-86 31-15 19-36 24-62 12" />
      <path className="sidebar-pouch-overlay__funnel" d="M69 184c38 11 72 25 101 42 25-17 55-30 91-39" />
      <path className="sidebar-pouch-overlay__stream sidebar-pouch-overlay__stream--left" d="M74 164c36 19 66 43 90 72" />
      <path className="sidebar-pouch-overlay__stream sidebar-pouch-overlay__stream--center" d="M161 160c3 24 3 49 0 76" />
      <path className="sidebar-pouch-overlay__stream sidebar-pouch-overlay__stream--right" d="M237 165c-36 19-66 43-90 72" />
      <circle className="sidebar-pouch-overlay__particle sidebar-pouch-overlay__particle--left" cx="113" cy="195" r="4.2" />
      <circle className="sidebar-pouch-overlay__particle sidebar-pouch-overlay__particle--center" cx="160" cy="200" r="4.8" />
      <circle className="sidebar-pouch-overlay__particle sidebar-pouch-overlay__particle--right" cx="209" cy="196" r="4.2" />
      <path className="sidebar-pouch-overlay__body" d="M80 224c15-27 38-37 69-29 19 5 39 5 62-1 28-7 50 4 65 30-58 23-137 23-196 0z" />
      <path className="sidebar-pouch-overlay__mouth" d="M71 207c43 22 88 24 138 6 26-9 49-5 73 13-58 23-158 23-216 0 0-7 2-14 5-19z" />
      <path className="sidebar-pouch-overlay__throat" d="M112 219c34 9 72 8 113-1-19 10-38 16-58 17-24 1-47-4-67-14 4-1 8-2 12-2z" />
      <path className="sidebar-pouch-overlay__cavity" d="M94 216c38 11 79 11 122 0 23-5 41-2 57 10-53 14-134 14-187 0 2-4 5-8 8-10z" />
      <path className="sidebar-pouch-overlay__swallow" d="M106 220c39 12 82 11 129-1M126 226c29 6 59 6 91-1" />
      <path className="sidebar-pouch-overlay__lip" d="M72 206c47 18 89 16 139 1 26-8 49-2 72 13" />
    </svg>
  )
}

function GrimoireSigil() {
  return (
    <svg
      className="sidebar-artwork__glyph sidebar-artwork__glyph--sigil sidebar-artwork__glyph--vault-atlas sidebar-artwork__glyph--living-grimoire"
      data-sidebar-glyph="grimoire-sigil"
      viewBox="0 0 320 240"
    >
      <path className="sidebar-artwork__wash" d="M43 215c34 12 75 10 117-9 42 19 83 21 117 9v29H43z" />
      <ellipse className="sidebar-artwork__halo" cx="160" cy="143" rx="106" ry="78" />
      <path className="sidebar-artwork__atlas-frame" d="M54 200c20-60 55-99 106-119 51 20 86 59 106 119" />
      <path className="sidebar-artwork__atlas-ridge" d="M68 210c32-20 63-22 92-8 29-14 60-12 92 8" />
      <path className="sidebar-artwork__atlas-shadow" d="M59 213c27-28 61-42 101-42s74 14 101 42c-35-9-69-8-101 6-32-14-66-15-101-6z" />
      <path className="sidebar-artwork__aurora" d="M54 174c37-40 80-53 128-38 29 9 57 0 84-27" />
      <path className="sidebar-artwork__ribbon sidebar-artwork__ribbon--veda" d="M83 80c40-20 82-24 126-13 14 4 26 9 36 16" />
      <path className="sidebar-artwork__ribbon sidebar-artwork__ribbon--shastra" d="M68 204c49-25 96-29 139-13 22 8 43 4 65-11" />
      <g className="sidebar-artwork__signal" data-sidebar-art-channel="living-routes">
        <path className="sidebar-artwork__signal-line sidebar-artwork__signal-line--warm" d="M83 82c24 37 50 58 77 64 28-6 56-27 85-62" />
        <path className="sidebar-artwork__signal-line sidebar-artwork__signal-line--cool" d="M78 179c32-20 60-27 82-20 24-7 52-.1 84 19" />
        <circle className="sidebar-artwork__signal-orb sidebar-artwork__signal-orb--veda" cx="83" cy="82" r="4.5" />
        <circle className="sidebar-artwork__signal-orb sidebar-artwork__signal-orb--rishi" cx="160" cy="146" r="4.5" />
        <circle className="sidebar-artwork__signal-orb sidebar-artwork__signal-orb--brain" cx="244" cy="178" r="4.5" />
      </g>
      <path className="sidebar-artwork__gate" d="M67 191c4-70 41-116 93-116s89 46 93 116" />
      <path className="sidebar-artwork__vault-arch" d="M88 193c7-52 34-86 72-86s65 34 72 86" />
      <path className="sidebar-artwork__compass" d="M160 96v39M141 116h38M148 103l25 26M173 103l-25 26" />
      <path className="sidebar-artwork__orbit" d="M71 154c46-36 105-44 178-25M72 181c58 24 120 22 176-9" />
      <path className="sidebar-artwork__palm-leaf sidebar-artwork__palm-leaf--veda" d="M83 113c31-12 61-12 90 0" />
      <path className="sidebar-artwork__palm-leaf sidebar-artwork__palm-leaf--shastra" d="M88 128c27-8 54-7 80 2" />
      <circle className="sidebar-artwork__scripture-bind" cx="121" cy="120" r="4" />
      <path className="sidebar-artwork__page sidebar-artwork__page--left" d="M72 124c37-19 67-13 88 18v73c-28-19-58-22-88-9z" />
      <path className="sidebar-artwork__page sidebar-artwork__page--right" d="M248 124c-37-19-67-13-88 18v73c28-19 58-22 88-9z" />
      <path className="sidebar-artwork__spine" d="M160 140v75" />
      <path className="sidebar-artwork__thin" d="M97 151c16-6 31-4 45 5M98 171c16-5 31-3 45 6M177 151c16-6 31-4 45 5M177 171c16-5 31-3 45 6" />
      <circle className="sidebar-artwork__core-glow" cx="160" cy="146" r="43" />
      <path className="sidebar-artwork__root" d="M160 91c-21 15-35 36-35 59 0 20 12 36 35 49 23-13 35-29 35-49 0-23-14-44-35-59z" />
      <path className="sidebar-artwork__living-crest" d="M135 153c6-17 14-26 25-26s19 9 25 26c-6 12-14 20-25 26-11-6-19-14-25-26z" />
      <path className="sidebar-artwork__rishi-aura" d="M138 131c5-15 12-23 22-23s17 8 22 23" />
      <circle className="sidebar-artwork__rishi-head" cx="160" cy="118" r="6" />
      <path className="sidebar-artwork__rishi-seat" d="M143 153c10-8 24-8 34 0M134 164c17 11 35 11 52 0" />
      <circle className="sidebar-artwork__local-dot" cx="160" cy="146" r="5" />
      <path className="sidebar-artwork__brain-loop" d="M137 144c-6-13 5-25 19-20 10-9 26 0 22 14 10 6 7 22-6 25-7 10-22 10-29 0-12-1-20-10-16-19" />
      <path className="sidebar-artwork__second-brain" d="M145 138c12-10 29-9 40 2M145 153c16-8 32-7 46 5" />
      <circle className="sidebar-artwork__brain-node" cx="151" cy="131" r="3.4" />
      <circle className="sidebar-artwork__brain-node" cx="174" cy="139" r="3.4" />
      <circle className="sidebar-artwork__brain-node" cx="149" cy="158" r="3" />
      <circle className="sidebar-artwork__brain-node" cx="184" cy="158" r="3" />
      <path className="sidebar-artwork__memory-line" d="M145 133c10-8 22-8 32 0M141 149c13-7 27-7 40 0M152 166c6-4 12-4 18 0" />
      <path className="sidebar-artwork__route" d="M190 121l27-24 38 21-29 38-36-19M217 97l-5-24M255 118l16-18M226 156l9 24" />
      <g className="sidebar-artwork__route-bloom" data-sidebar-art-channel="source-routes">
        <path className="sidebar-artwork__route-beam" d="M116 92c19 8 34 20 44 36 10-16 25-28 44-36" />
        <path className="sidebar-artwork__route-beam sidebar-artwork__route-beam--lower" d="M112 187c23-15 39-20 48-14 9-6 25-1 48 14" />
        <circle className="sidebar-artwork__route-node" cx="116" cy="92" r="3.8" />
        <circle className="sidebar-artwork__route-node" cx="204" cy="92" r="3.8" />
        <circle className="sidebar-artwork__route-node sidebar-artwork__route-node--warm" cx="160" cy="173" r="4.2" />
      </g>
      <path className="sidebar-artwork__purana-scroll" d="M86 192c21 11 45 10 70-2M87 202c22 7 45 6 69-2M236 189c-19 11-40 11-63 0" />
      <path className="sidebar-artwork__constellation" d="M99 85l39-25 61 27 59-25M99 199l60-24 61 22" />
      <circle className="sidebar-artwork__node" cx="190" cy="121" r="8" />
      <circle className="sidebar-artwork__node sidebar-artwork__node--small" cx="217" cy="97" r="7" />
      <circle className="sidebar-artwork__node sidebar-artwork__node--small" cx="255" cy="118" r="7" />
      <circle className="sidebar-artwork__node" cx="226" cy="156" r="8" />
      <circle className="sidebar-artwork__node sidebar-artwork__node--quiet" cx="206" cy="73" r="5" />
      <circle className="sidebar-artwork__node sidebar-artwork__node--quiet" cx="271" cy="100" r="5" />
      <circle className="sidebar-artwork__node sidebar-artwork__node--quiet" cx="235" cy="180" r="5" />
      <path className="sidebar-artwork__spark" d="M160 35l6 16 17 6-14 10 4 18-13-10-13 10 4-18-14-10 17-6z" />
      <path className="sidebar-artwork__spark-crown" d="M130 59c18-12 42-12 60 0M121 73c23-9 55-9 78 0" />
      <g className="sidebar-artwork__token sidebar-artwork__token--rishi" data-sidebar-art-mark="rishi">
        <circle className="sidebar-artwork__token-aura" cx="160" cy="65" r="17" />
        <circle className="sidebar-artwork__token-disc" cx="160" cy="65" r="12" />
        <circle className="sidebar-artwork__token-spark" cx="160" cy="61" r="3.2" />
        <path className="sidebar-artwork__token-mark" d="M153 73c2-5 4.3-7.4 7-7.4s5 2.4 7 7.4" />
      </g>
      <g className="sidebar-artwork__token sidebar-artwork__token--veda" data-sidebar-art-mark="vedas">
        <circle className="sidebar-artwork__token-aura" cx="83" cy="82" r="17" />
        <circle className="sidebar-artwork__token-disc" cx="83" cy="82" r="12" />
        <path className="sidebar-artwork__token-mark" d="M76 79c6-3 11-2 14 2M76 85c6-2 11-1 14 2M83 75v14" />
      </g>
      <g className="sidebar-artwork__token sidebar-artwork__token--shaastra" data-sidebar-art-mark="shaastras">
        <circle className="sidebar-artwork__token-aura" cx="245" cy="84" r="17" />
        <circle className="sidebar-artwork__token-disc" cx="245" cy="84" r="12" />
        <path className="sidebar-artwork__token-mark" d="M239 77h10c2 0 4 2 4 4v8h-10c-2 0-4-2-4-4zM246 78v11M241 82h8M241 86h7" />
      </g>
      <g className="sidebar-artwork__token sidebar-artwork__token--purana" data-sidebar-art-mark="puranas">
        <circle className="sidebar-artwork__token-aura" cx="78" cy="179" r="17" />
        <circle className="sidebar-artwork__token-disc" cx="78" cy="179" r="12" />
        <path className="sidebar-artwork__token-mark" d="M72 184c4 3 12 3 16 0M74 177c4-5 12-1 10 4-1 3-6 3-7 1-.8-1 .2-2 1.4-1.8" />
      </g>
      <g className="sidebar-artwork__token sidebar-artwork__token--second-brain" data-sidebar-art-mark="second-brain">
        <circle className="sidebar-artwork__token-aura" cx="244" cy="178" r="17" />
        <circle className="sidebar-artwork__token-disc" cx="244" cy="178" r="12" />
        <path className="sidebar-artwork__token-mark" d="M238 181c1.6-4 3.6-6 6-6s4.4 2 6 6M244 174v10M239 184h10" />
        <circle className="sidebar-artwork__token-node" cx="239" cy="174" r="1.9" />
        <circle className="sidebar-artwork__token-node" cx="250" cy="176" r="1.9" />
      </g>
    </svg>
  )
}
