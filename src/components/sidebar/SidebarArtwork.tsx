import darkArtwork from '@/assets/sidebar-art-line-dark.svg'
import lightArtwork from '@/assets/sidebar-art-line-light.svg'
import { cn } from '@/lib/utils'

interface SidebarArtworkProps {
  compact?: boolean
}

/** Renders preset-aware editorial line art in the sidebar and settings preview. */
export function SidebarArtwork({ compact = false }: SidebarArtworkProps) {
  return (
    <div
      aria-hidden="true"
      className={cn('sidebar-artwork', compact && 'sidebar-artwork--compact')}
      data-testid={compact ? 'settings-sidebar-artwork-preview' : 'sidebar-artwork'}
    >
      <img
        alt=""
        className="sidebar-artwork__image sidebar-artwork__image--dark"
        draggable={false}
        src={darkArtwork}
      />
      <img
        alt=""
        className="sidebar-artwork__image sidebar-artwork__image--light"
        draggable={false}
        src={lightArtwork}
      />
      <div className="sidebar-artwork__agent-card">
        <span className="sidebar-artwork__agent-mark" />
        <span className="sidebar-artwork__agent-copy">
          <strong>Vault map</strong>
          <span>Local notes</span>
        </span>
      </div>
    </div>
  )
}
