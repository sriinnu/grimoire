import darkArtwork from '@/assets/sidebar-art-manuscript-dark.svg'
import lightArtwork from '@/assets/sidebar-art-manuscript-light.svg'
import { cn } from '@/lib/utils'

interface SidebarArtworkProps {
  compact?: boolean
}

/** Renders preset-aware sidebar artwork inspired by the Grimoire manuscript mocks. */
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
      <div className="sidebar-rosy" data-testid="sidebar-rosy-mascot">
        <span className="sidebar-rosy__antenna" />
        <span className="sidebar-rosy__halo" />
        <span className="sidebar-rosy__head">
          <span className="sidebar-rosy__eye sidebar-rosy__eye--left" />
          <span className="sidebar-rosy__eye sidebar-rosy__eye--right" />
          <span className="sidebar-rosy__cheek sidebar-rosy__cheek--left" />
          <span className="sidebar-rosy__cheek sidebar-rosy__cheek--right" />
          <span className="sidebar-rosy__mouth" />
        </span>
        <span className="sidebar-rosy__body">
          <span className="sidebar-rosy__core" />
        </span>
        <span className="sidebar-rosy__spark sidebar-rosy__spark--one" />
        <span className="sidebar-rosy__spark sidebar-rosy__spark--two" />
      </div>
    </div>
  )
}
