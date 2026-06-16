import { cn } from '@/lib/utils'

interface SidebarArtworkProps {
  compact?: boolean
}

/** Renders the quiet notebook mark in the sidebar and settings preview. */
export function SidebarArtwork({ compact = false }: SidebarArtworkProps) {
  return (
    <div
      aria-hidden="true"
      className={cn('sidebar-artwork', compact && 'sidebar-artwork--compact')}
      data-testid={compact ? 'settings-sidebar-artwork-preview' : 'sidebar-artwork'}
    >
      <NotebookMark />
    </div>
  )
}

function NotebookMark() {
  return (
    <svg
      className="sidebar-artwork__glyph sidebar-artwork__glyph--notebook-mark sidebar-artwork__glyph--notebook-thread"
      data-sidebar-glyph="notebook-mark"
      viewBox="0 0 320 240"
    >
      <path className="sidebar-artwork__page-shadow" d="M58 206c35-14 68-11 102 8 34-19 67-22 102-8v16c-35-12-68-9-102 9-34-18-67-21-102-9z" />
      <path className="sidebar-artwork__page sidebar-artwork__page--left" d="M64 68c37-18 69-14 96 12v128c-28-23-60-28-96-14z" />
      <path className="sidebar-artwork__page sidebar-artwork__page--right" d="M256 68c-37-18-69-14-96 12v128c28-23 60-28 96-14z" />
      <path className="sidebar-artwork__spine" d="M160 80v128" />
      <path className="sidebar-artwork__note-rule sidebar-artwork__note-rule--left" d="M87 102c19-7 37-6 54 3M87 128c19-6 37-5 54 4M87 154c19-5 37-3 54 5" />
      <path className="sidebar-artwork__note-rule sidebar-artwork__note-rule--right" d="M179 102c19-7 37-6 54 3M179 128c19-6 37-5 54 4M179 154c19-5 37-3 54 5" />
      <path className="sidebar-artwork__page-thread sidebar-artwork__page-thread--primary" d="M74 190c35-16 66-14 94 5 27-19 58-21 92-5" />
      <path className="sidebar-artwork__page-thread sidebar-artwork__page-thread--secondary" d="M86 84c27-8 52-4 74 13 22-17 47-21 74-13" />
      <path className="sidebar-artwork__memory-line" d="M125 132c21-14 49-14 70 0M133 151c16-8 38-8 54 0" />
      <circle className="sidebar-artwork__thought-node" cx="127" cy="132" r="4" />
      <circle className="sidebar-artwork__thought-node" cx="160" cy="122" r="4" />
      <circle className="sidebar-artwork__thought-node" cx="193" cy="132" r="4" />
      <path className="sidebar-artwork__context-loop" d="M127 132c10-12 22-16 33-10 11-6 23-2 33 10" />
      <circle className="sidebar-artwork__local-dot" cx="160" cy="151" r="5" />
    </svg>
  )
}
