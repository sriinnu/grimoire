import { cn } from '@/lib/utils'

interface SidebarArtworkProps {
  compact?: boolean
}

/** Renders the ambient Grimoire sigil in the sidebar and settings preview. */
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
      className="sidebar-artwork__glyph sidebar-artwork__glyph--vault-map"
      data-sidebar-glyph="grimoire-sigil"
      viewBox="0 0 320 240"
    >
      <path className="sidebar-artwork__wash" d="M46 204c34 10 72 8 114-7 42 15 80 17 114 7v36H46z" />
      <ellipse className="sidebar-artwork__halo" cx="160" cy="128" rx="78" ry="72" />
      <path className="sidebar-artwork__orbit" d="M88 129c31-45 85-63 144-34M82 153c54 33 112 29 156-13" />
      <path className="sidebar-artwork__page" d="M70 91c32-19 64-15 90 11v103c-28-22-58-26-90-8V91z" />
      <path className="sidebar-artwork__page" d="M250 91c-32-19-64-15-90 11v103c28-22 58-26 90-8V91z" />
      <path className="sidebar-artwork__spine" d="M160 102v103" />
      <path className="sidebar-artwork__thin" d="M91 118c19-7 36-5 52 5M91 141c19-6 36-4 52 5M91 164c19-5 36-3 52 6" />
      <path className="sidebar-artwork__circuit" d="M177 123l26-22 31 23-23 33-34-15M191 83l12 18M234 124l19-16M211 157l10 25" />
      <circle className="sidebar-artwork__node" cx="177" cy="123" r="8" />
      <circle className="sidebar-artwork__node sidebar-artwork__node--small" cx="203" cy="101" r="7" />
      <circle className="sidebar-artwork__node sidebar-artwork__node--small" cx="234" cy="124" r="7" />
      <circle className="sidebar-artwork__node" cx="211" cy="157" r="8" />
      <circle className="sidebar-artwork__node sidebar-artwork__node--tiny" cx="191" cy="83" r="5" />
      <circle className="sidebar-artwork__node sidebar-artwork__node--tiny" cx="253" cy="108" r="5" />
      <circle className="sidebar-artwork__node sidebar-artwork__node--tiny" cx="221" cy="182" r="5" />
      <path className="sidebar-artwork__spark" d="M160 38l7 17 18 5-14 11 4 18-15-10-15 10 4-18-14-11 18-5z" />
      <path className="sidebar-artwork__root" d="M160 68c-17 16-27 34-27 54 0 13 8 23 27 30 19-7 27-17 27-30 0-20-10-38-27-54z" />
      <path className="sidebar-artwork__memory-line" d="M145 113c8-9 22-9 30 0M141 131c12-9 26-9 38 0M151 149c6-4 12-4 18 0" />
    </svg>
  )
}
