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
    </div>
  )
}

function GrimoireSigil() {
  return (
    <svg
      className="sidebar-artwork__glyph sidebar-artwork__glyph--sigil sidebar-artwork__glyph--vault-atlas"
      data-sidebar-glyph="grimoire-sigil"
      viewBox="0 0 320 240"
    >
      <path className="sidebar-artwork__wash" d="M42 214c36 9 75 6 118-10 43 16 82 19 118 10v30H42z" />
      <ellipse className="sidebar-artwork__halo" cx="160" cy="139" rx="96" ry="75" />
      <path className="sidebar-artwork__aurora" d="M62 185c38-34 76-47 114-38 30 7 57 2 82-15" />
      <path className="sidebar-artwork__gate" d="M69 185c0-70 36-116 91-116s91 46 91 116" />
      <path className="sidebar-artwork__orbit" d="M70 152c35-45 94-66 180-44M67 178c58 30 126 29 187-11" />
      <path className="sidebar-artwork__page sidebar-artwork__page--left" d="M76 112c35-20 64-14 84 14v82c-27-21-55-26-84-10z" />
      <path className="sidebar-artwork__page sidebar-artwork__page--right" d="M244 112c-35-20-64-14-84 14v82c27-21 55-26 84-10z" />
      <path className="sidebar-artwork__spine" d="M160 126v82" />
      <path className="sidebar-artwork__thin" d="M98 138c18-7 34-5 47 4M98 162c18-6 34-4 47 5M175 138c16-7 32-5 47 4M175 162c17-6 33-4 47 5" />
      <circle className="sidebar-artwork__core-glow" cx="160" cy="146" r="35" />
      <path className="sidebar-artwork__root" d="M160 82c-22 15-37 39-37 64 0 21 13 37 37 48 24-11 37-27 37-48 0-25-15-49-37-64z" />
      <path className="sidebar-artwork__keeper" d="M146 124l14-17 14 17v31c-9 6-19 6-28 0z" />
      <circle className="sidebar-artwork__local-dot" cx="160" cy="145" r="5" />
      <path className="sidebar-artwork__memory-line" d="M143 132c10-9 24-9 34 0M140 148c13-8 27-8 40 0M151 164c6-4 12-4 18 0" />
      <path className="sidebar-artwork__route" d="M182 124l30-26 42 23-32 39-40-19M212 98l-6-24M254 121l16-18M222 160l9 25" />
      <path className="sidebar-artwork__constellation" d="M99 83l39-26 62 27 58-24M100 199l60-25 61 24" />
      <circle className="sidebar-artwork__node" cx="182" cy="124" r="8" />
      <circle className="sidebar-artwork__node sidebar-artwork__node--small" cx="212" cy="98" r="7" />
      <circle className="sidebar-artwork__node sidebar-artwork__node--small" cx="254" cy="121" r="7" />
      <circle className="sidebar-artwork__node" cx="222" cy="160" r="8" />
      <circle className="sidebar-artwork__node sidebar-artwork__node--quiet" cx="206" cy="74" r="5" />
      <circle className="sidebar-artwork__node sidebar-artwork__node--quiet" cx="270" cy="103" r="5" />
      <circle className="sidebar-artwork__node sidebar-artwork__node--quiet" cx="231" cy="185" r="5" />
      <path className="sidebar-artwork__spark" d="M160 35l6 16 17 6-14 10 4 18-13-10-13 10 4-18-14-10 17-6z" />
    </svg>
  )
}
