import type { CSSProperties, ReactNode } from 'react'
import type { IconProps } from '@phosphor-icons/react'

type SidebarGlyphStyle = CSSProperties & Record<`--sidebar-glyph-${string}`, string>

type SidebarGlyphProps = IconProps & {
  children?: ReactNode
  name: string
}

function strokeWidthFor(weight: IconProps['weight']): number {
  if (weight === 'thin') return 1.1
  if (weight === 'light') return 1.3
  if (weight === 'bold' || weight === 'fill') return 2.15
  if (weight === 'duotone') return 1.95
  return 1.65
}

function sidebarGlyphStyle(color: IconProps['color'], mirrored: IconProps['mirrored']): SidebarGlyphStyle {
  return {
    '--sidebar-glyph-aura': 'color-mix(in srgb, var(--accent-teal, currentColor) 72%, currentColor)',
    '--sidebar-glyph-bright': 'color-mix(in srgb, var(--sidebar-primary-foreground, #fff) 72%, currentColor)',
    '--sidebar-glyph-fill': 'color-mix(in srgb, currentColor 14%, transparent)',
    '--sidebar-glyph-primary': color ?? 'currentColor',
    '--sidebar-glyph-route': 'color-mix(in srgb, var(--accent-blue, currentColor) 76%, currentColor)',
    '--sidebar-glyph-shadow': 'color-mix(in srgb, currentColor 20%, transparent)',
    '--sidebar-glyph-soft': 'color-mix(in srgb, currentColor 9%, transparent)',
    '--sidebar-glyph-warm': 'color-mix(in srgb, var(--accent-yellow, currentColor) 78%, currentColor)',
    color: color ?? 'currentColor',
    transform: mirrored ? 'scaleX(-1)' : undefined,
    transformOrigin: 'center',
  }
}

function SidebarGlyphFrame({
  children,
  color,
  mirrored,
  name,
  size = 24,
  style,
  weight,
  ...props
}: SidebarGlyphProps) {
  return (
    <svg
      {...props}
      aria-hidden={props['aria-hidden'] ?? true}
      data-sidebar-glyph={name}
      fill="none"
      height={size}
      stroke="var(--sidebar-glyph-primary)"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidthFor(weight)}
      style={{ ...sidebarGlyphStyle(color, mirrored), ...style }}
      viewBox="0 0 24 24"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      {children}
    </svg>
  )
}

/** Dashboard glyph: a north-star plus orbit for the daily cockpit. */
export function DashboardGlyphIcon(props: IconProps) {
  return (
    <SidebarGlyphFrame {...props} name="dashboard">
      <path d="M5.2 17.9c3.7 2.2 8.7 2.1 12.9-.4M5.8 6.7c3.5-2.5 8.4-2.8 12.4-.8" stroke="var(--sidebar-glyph-aura)" />
      <path d="m12 3.2 1.9 5 5.2.5-4 3.4 1.2 5.3-4.3-2.9-4.3 2.9 1.2-5.3-4-3.4 5.2-.5z" fill="var(--sidebar-glyph-fill)" />
      <path d="m12 3.2 1.9 5 5.2.5-4 3.4 1.2 5.3-4.3-2.9-4.3 2.9 1.2-5.3-4-3.4 5.2-.5z" stroke="var(--sidebar-glyph-warm)" />
      <path d="M12 8.7v5.8M9.4 11.6h5.2" stroke="var(--sidebar-glyph-bright)" />
      <circle cx="19" cy="5.8" fill="var(--sidebar-glyph-aura)" r="1" stroke="none" />
      <circle cx="5.2" cy="16.8" fill="var(--sidebar-glyph-route)" r="0.9" stroke="none" />
    </SidebarGlyphFrame>
  )
}

/** Inbox glyph: a capture tray with one bright incoming thought. */
export function InboxGlyphIcon(props: IconProps) {
  return (
    <SidebarGlyphFrame {...props} name="inbox">
      <path d="M5.1 9.8h3.1l1.5 2.8h4.6l1.5-2.8h3.1l.9 7.5a2.1 2.1 0 0 1-2.1 2.4H6.3a2.1 2.1 0 0 1-2.1-2.4z" fill="var(--sidebar-glyph-fill)" />
      <path d="M5.1 9.8h3.1l1.5 2.8h4.6l1.5-2.8h3.1l.9 7.5a2.1 2.1 0 0 1-2.1 2.4H6.3a2.1 2.1 0 0 1-2.1-2.4z" />
      <path d="M8.1 15.9h7.8M8.9 18h6.2" stroke="var(--sidebar-glyph-aura)" />
      <path d="M12 3.5v7.1M9.5 7.9l2.5 2.7 2.5-2.7" stroke="var(--sidebar-glyph-warm)" />
      <path d="M16 5.1c1.5.4 2.7 1.3 3.6 2.6" stroke="var(--sidebar-glyph-route)" />
      <circle cx="18.8" cy="5.4" fill="var(--sidebar-glyph-aura)" r="1" stroke="none" />
    </SidebarGlyphFrame>
  )
}

/** Notes glyph: open markdown pages with a living backlink line. */
export function NotesGlyphIcon(props: IconProps) {
  return (
    <SidebarGlyphFrame {...props} name="notes">
      <path d="M4.4 5.9c3.5-1.2 6.1-.7 7.6 1.5v11.9c-2.1-1.6-4.7-2-7.6-.9z" fill="var(--sidebar-glyph-fill)" />
      <path d="M19.6 5.9c-3.5-1.2-6.1-.7-7.6 1.5v11.9c2.1-1.6 4.7-2 7.6-.9z" fill="var(--sidebar-glyph-soft)" />
      <path d="M4.4 5.9c3.5-1.2 6.1-.7 7.6 1.5v11.9c-2.1-1.6-4.7-2-7.6-.9zM19.6 5.9c-3.5-1.2-6.1-.7-7.6 1.5v11.9c2.1-1.6 4.7-2 7.6-.9z" />
      <path d="M7.7 10h2.4M7.5 12.6h2.5M14 10h2.3M14 12.6h2.6" stroke="var(--sidebar-glyph-aura)" />
      <path d="M12 7.1v12.1" stroke="var(--sidebar-glyph-warm)" />
      <path d="M7.6 16.1c2.1-.7 3.6-.2 4.4 1.4.8-1.6 2.3-2.1 4.4-1.4" stroke="var(--sidebar-glyph-route)" />
      <circle cx="12" cy="17.5" fill="var(--sidebar-glyph-bright)" r="0.8" stroke="none" />
    </SidebarGlyphFrame>
  )
}

/** Journal glyph: a private check-in page with a small memory pulse. */
export function JournalGlyphIcon(props: IconProps) {
  return (
    <SidebarGlyphFrame {...props} name="journal">
      <path d="M6.3 4.9h9.8a2 2 0 0 1 2 2v12H8.1a2 2 0 0 1-2-2z" fill="var(--sidebar-glyph-fill)" />
      <path d="M6.3 4.9h9.8a2 2 0 0 1 2 2v12H8.1a2 2 0 0 1-2-2z" />
      <path d="M8.8 9.6h5.8M8.8 12.3h4.5" stroke="var(--sidebar-glyph-aura)" />
      <path d="M15.9 7.5c-1.1.4-1.7 1.6-1.2 2.7.4 1 1.5 1.5 2.5 1.2-.5.9-1.8 1.3-2.9.8-1.2-.6-1.7-2.1-1.1-3.3.5-.9 1.5-1.4 2.7-1.4z" stroke="var(--sidebar-glyph-warm)" />
      <path d="M8.4 15.6c2-.7 4.2-.5 6.4.5" stroke="var(--sidebar-glyph-route)" />
      <circle cx="16.6" cy="16.4" fill="var(--sidebar-glyph-bright)" r="0.8" stroke="none" />
    </SidebarGlyphFrame>
  )
}

/** Dream glyph: a moonlit page and symbol thread for the private dream lane. */
export function DreamGlyphIcon(props: IconProps) {
  return (
    <SidebarGlyphFrame {...props} name="dream">
      <path d="M5.5 9.6c2.4-3.3 5.8-4.6 10.2-3.8 2.1.4 3.5 2.3 3.2 4.4-.6 4.6-3.1 7.5-7.6 8.8-4.3-1.7-6.2-4.8-5.8-9.4z" fill="var(--sidebar-glyph-fill)" />
      <path d="M5.5 9.6c2.4-3.3 5.8-4.6 10.2-3.8 2.1.4 3.5 2.3 3.2 4.4-.6 4.6-3.1 7.5-7.6 8.8-4.3-1.7-6.2-4.8-5.8-9.4z" />
      <path d="M15.6 7.9c-1.4.7-2 2.4-1.4 3.8.6 1.3 2.1 1.9 3.4 1.4-.5 1.5-2.2 2.4-3.8 1.8-1.9-.7-2.8-2.8-2-4.6.6-1.5 2-2.3 3.8-2.4z" stroke="var(--sidebar-glyph-warm)" />
      <path d="M7.9 13.2c2.7-.8 5.3-.4 7.8 1.3" stroke="var(--sidebar-glyph-aura)" />
      <path d="M8.5 16.4c1.7.8 3.7.9 6 .2" stroke="var(--sidebar-glyph-route)" />
      <circle cx="8.1" cy="8.1" fill="var(--sidebar-glyph-bright)" r="0.8" stroke="none" />
      <circle cx="18.1" cy="6.7" fill="var(--sidebar-glyph-aura)" r="0.75" stroke="none" />
    </SidebarGlyphFrame>
  )
}

/** Archive glyph: a quiet vault box for settled notes. */
export function ArchiveGlyphIcon(props: IconProps) {
  return (
    <SidebarGlyphFrame {...props} name="archive">
      <path d="M5.1 8.2h13.8v10.2a1.7 1.7 0 0 1-1.7 1.7H6.8a1.7 1.7 0 0 1-1.7-1.7z" fill="var(--sidebar-glyph-fill)" />
      <path d="M4.1 5h15.8v3.2H4.1z" fill="var(--sidebar-glyph-soft)" />
      <path d="M4.1 5h15.8v3.2H4.1zM5.1 8.2h13.8v10.2a1.7 1.7 0 0 1-1.7 1.7H6.8a1.7 1.7 0 0 1-1.7-1.7z" />
      <path d="M9.3 12h5.4" stroke="var(--sidebar-glyph-aura)" />
      <path d="M8.6 16.9c2.2 1.1 4.8 1.1 6.8 0M12 14.1c1.2-.8 2.6-.8 4 0" stroke="var(--sidebar-glyph-warm)" />
      <path d="M17.1 10.9c.8.8 1.2 1.7 1.2 2.7s-.4 2-1.2 2.8" stroke="var(--sidebar-glyph-route)" />
      <circle cx="7.3" cy="11.2" fill="var(--sidebar-glyph-bright)" r="0.8" stroke="none" />
    </SidebarGlyphFrame>
  )
}

/** Expand glyph: a rail-to-sidebar gesture with an opening page. */
export function SidebarExpandGlyphIcon(props: IconProps) {
  return (
    <SidebarGlyphFrame {...props} name="expand-sidebar">
      <path d="M5 5.5h6.5v13H5a1.5 1.5 0 0 1-1.5-1.5V7A1.5 1.5 0 0 1 5 5.5z" fill="var(--sidebar-glyph-fill)" />
      <path d="M5 5.5h6.5v13H5a1.5 1.5 0 0 1-1.5-1.5V7A1.5 1.5 0 0 1 5 5.5zM11.5 5.5V18.5" />
      <path d="M15 8.3l3.7 3.7-3.7 3.7M18.2 12H12.8" stroke="var(--sidebar-glyph-warm)" />
      <path d="M6.5 9h2.2M6.5 12h2.2M6.5 15h2.2" stroke="var(--sidebar-glyph-aura)" />
      <path d="M15.8 5.7c1.5.6 2.8 1.6 3.8 2.9" stroke="var(--sidebar-glyph-route)" />
    </SidebarGlyphFrame>
  )
}
