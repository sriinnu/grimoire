import type { CSSProperties, ReactNode } from 'react'
import type { IconProps } from '@phosphor-icons/react'

type DomainFolderIconStyle = CSSProperties & Record<`--domain-folder-${string}`, string>

type DomainFolderIconProps = IconProps & {
  children?: ReactNode
  name: string
}

function strokeWidthFor(weight: IconProps['weight']): number {
  if (weight === 'thin') return 1.1
  if (weight === 'light') return 1.3
  if (weight === 'bold' || weight === 'fill') return 2.1
  if (weight === 'duotone') return 1.9
  return 1.6
}

function domainFolderIconStyle(color: IconProps['color'], mirrored: IconProps['mirrored']): DomainFolderIconStyle {
  return {
    '--domain-folder-aura': 'color-mix(in srgb, var(--accent-teal, currentColor) 76%, currentColor)',
    '--domain-folder-bright': 'color-mix(in srgb, var(--sidebar-primary-foreground, currentColor) 72%, currentColor)',
    '--domain-folder-fill': 'color-mix(in srgb, currentColor 13%, transparent)',
    '--domain-folder-memory': 'color-mix(in srgb, var(--accent-purple, currentColor) 68%, currentColor)',
    '--domain-folder-primary': color ?? 'currentColor',
    '--domain-folder-route': 'color-mix(in srgb, var(--accent-blue, currentColor) 72%, currentColor)',
    '--domain-folder-soft': 'color-mix(in srgb, currentColor 8%, transparent)',
    '--domain-folder-warm': 'color-mix(in srgb, var(--accent-yellow, currentColor) 80%, currentColor)',
    color: color ?? 'currentColor',
    transform: mirrored ? 'scaleX(-1)' : undefined,
    transformOrigin: 'center',
  }
}

function DomainFolderIconFrame({
  children,
  color,
  mirrored,
  name,
  size = 24,
  style,
  weight,
  ...props
}: DomainFolderIconProps) {
  return (
    <svg
      {...props}
      aria-hidden={props['aria-hidden'] ?? true}
      data-domain-folder-glyph={name}
      fill="none"
      height={size}
      stroke="var(--domain-folder-primary)"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidthFor(weight)}
      style={{ ...domainFolderIconStyle(color, mirrored), ...style }}
      viewBox="0 0 24 24"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      {children}
    </svg>
  )
}

/** Default folder glyph: a quiet authored folder with Grimoire route marks. */
export function DefaultFolderGlyphIcon(props: IconProps) {
  return (
    <DomainFolderIconFrame {...props} name="folder">
      <path d="M5 7.2h5.8l1.3 2h6.9v8a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z" fill="var(--domain-folder-fill)" />
      <path d="M5 7.2h5.8l1.3 2h6.9v8a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z" />
      <path d="M7.5 11.8h7.8M7.5 14.5h5.6" stroke="var(--domain-folder-aura)" />
      <path d="M7.3 17c2.5-.7 5.8-.7 8.5.1" stroke="var(--domain-folder-route)" />
      <circle cx="17.4" cy="6.2" fill="var(--domain-folder-bright)" r="0.75" stroke="none" />
      <path d="M6.8 5.5c1.7-.6 3.8-.5 5.5.2" stroke="var(--domain-folder-memory)" />
    </DomainFolderIconFrame>
  )
}

/** Open folder glyph: the same authored folder, fanned open for active trees. */
export function DefaultFolderOpenGlyphIcon(props: IconProps) {
  return (
    <DomainFolderIconFrame {...props} name="folder-open">
      <path d="M4.6 9h5.6l1.3-2h3.9l1.3 2h2.7l-1.7 8.1a2.2 2.2 0 0 1-2.1 1.8H6.8a2 2 0 0 1-2-1.6z" fill="var(--domain-folder-fill)" />
      <path d="M4.6 9h5.6l1.3-2h3.9l1.3 2h2.7l-1.7 8.1a2.2 2.2 0 0 1-2.1 1.8H6.8a2 2 0 0 1-2-1.6z" />
      <path d="M6.7 11.6c2.8-.8 6.5-.8 9.8.1" stroke="var(--domain-folder-aura)" />
      <path d="M7.3 15.2h7.4" stroke="var(--domain-folder-route)" />
      <path d="M10.7 7 12 5.1h3.7" stroke="var(--domain-folder-warm)" />
      <circle cx="17" cy="14.8" fill="var(--domain-folder-bright)" r="0.8" stroke="none" />
      <path d="M6.4 17.2c2.4.7 5.6.7 8.2 0" stroke="var(--domain-folder-memory)" />
    </DomainFolderIconFrame>
  )
}

/** Dev/source folder glyph: code brackets carried on a small source route. */
export function DevFolderGlyphIcon(props: IconProps) {
  return (
    <DomainFolderIconFrame {...props} name="dev">
      <path d="M4.7 7.2h6.1l1.3 2h7.2v8a2 2 0 0 1-2 2H6.7a2 2 0 0 1-2-2z" fill="var(--domain-folder-fill)" />
      <path d="M4.7 7.2h6.1l1.3 2h7.2v8a2 2 0 0 1-2 2H6.7a2 2 0 0 1-2-2z" />
      <path d="m10.2 12-2 2 2 2M13.8 12l2 2-2 2" stroke="var(--domain-folder-aura)" />
      <path d="M12.9 11.5 11.1 16.5" stroke="var(--domain-folder-warm)" />
      <path d="M6.7 5.2c2.4-.9 5.1-.8 7.4.2" stroke="var(--domain-folder-route)" />
      <circle cx="18.1" cy="6.3" fill="var(--domain-folder-bright)" r="0.8" stroke="none" />
      <path d="M6.9 18.1c2.6-1 5.6-.9 8 .3" stroke="var(--domain-folder-memory)" />
    </DomainFolderIconFrame>
  )
}

/** Docs folder glyph: a manuscript page with a precise guide line. */
export function DocsFolderGlyphIcon(props: IconProps) {
  return (
    <DomainFolderIconFrame {...props} name="docs">
      <path d="M5.2 5.5h8.6l4.9 4.8v8.2H7.1a1.9 1.9 0 0 1-1.9-1.9z" fill="var(--domain-folder-fill)" />
      <path d="M13.8 5.5v4.8h4.9" stroke="var(--domain-folder-warm)" />
      <path d="M5.2 5.5h8.6l4.9 4.8v8.2H7.1a1.9 1.9 0 0 1-1.9-1.9z" />
      <path d="M8.4 11.9h6.7M8.4 14.5h5.5" stroke="var(--domain-folder-aura)" />
      <path d="M7.7 8.4c1.2-.6 2.7-.6 4.1 0" stroke="var(--domain-folder-route)" />
      <circle cx="16.2" cy="16.5" fill="var(--domain-folder-bright)" r="0.8" stroke="none" />
      <path d="M8.3 17.1h4" stroke="var(--domain-folder-memory)" />
    </DomainFolderIconFrame>
  )
}

/** Data folder glyph: local stacks with a tiny constellation route. */
export function DataFolderGlyphIcon(props: IconProps) {
  return (
    <DomainFolderIconFrame {...props} name="data">
      <path d="M5.4 8.1c0-1.8 3-3.1 6.6-3.1s6.6 1.3 6.6 3.1v7.8c0 1.8-3 3.1-6.6 3.1s-6.6-1.3-6.6-3.1z" fill="var(--domain-folder-fill)" />
      <path d="M5.4 8.1c0 1.8 3 3.1 6.6 3.1s6.6-1.3 6.6-3.1M5.4 12c0 1.8 3 3.1 6.6 3.1s6.6-1.3 6.6-3.1M5.4 15.9c0 1.8 3 3.1 6.6 3.1s6.6-1.3 6.6-3.1" />
      <path d="M8.8 8.4h.1M12 8.9h.1M15.1 8.4h.1" stroke="var(--domain-folder-aura)" />
      <path d="M8.9 8.4 12 8.9l3.1-.5" stroke="var(--domain-folder-route)" />
      <circle cx="18.1" cy="5.6" fill="var(--domain-folder-warm)" r="0.8" stroke="none" />
      <path d="M9 17.2c1.9.6 4.1.6 6.1 0" stroke="var(--domain-folder-memory)" />
      <circle cx="6.8" cy="5.8" fill="var(--domain-folder-bright)" r="0.7" stroke="none" />
    </DomainFolderIconFrame>
  )
}

/** Journal/dream folder glyph: private page, moon mark, and one quiet thought line. */
export function JournalFolderGlyphIcon(props: IconProps) {
  return (
    <DomainFolderIconFrame {...props} name="journal">
      <path d="M6.2 5.3h10.1a2 2 0 0 1 2 2v11.2H7.8a2 2 0 0 1-2-2V5.9a.6.6 0 0 1 .4-.6z" fill="var(--domain-folder-fill)" />
      <path d="M6.2 5.3h10.1a2 2 0 0 1 2 2v11.2H7.8a2 2 0 0 1-2-2V5.9a.6.6 0 0 1 .4-.6z" />
      <path d="M8.8 10.6h4.8M8.8 13.1h3.6" stroke="var(--domain-folder-aura)" />
      <path d="M15.6 8.2c-1.2.4-1.9 1.8-1.4 3 .5 1.1 1.7 1.7 2.8 1.3-.6 1.1-2 1.6-3.2 1-1.4-.7-2-2.4-1.3-3.8.5-1.1 1.7-1.7 3.1-1.5z" stroke="var(--domain-folder-warm)" />
      <path d="M8.2 16.2c2.3-.8 4.7-.6 7 .5" stroke="var(--domain-folder-route)" />
      <path d="M7.6 7.4c1.9-.7 4.1-.7 6 0" stroke="var(--domain-folder-memory)" />
      <circle cx="16.9" cy="16.7" fill="var(--domain-folder-bright)" r="0.8" stroke="none" />
    </DomainFolderIconFrame>
  )
}

/** Vault folder glyph: a local notebook arch with a protected memory route. */
export function VaultFolderGlyphIcon(props: IconProps) {
  return (
    <DomainFolderIconFrame {...props} name="vault">
      <path d="M5.1 8.2h5.6l1.3-2h2.7l1.4 2h2.8v8.9a2 2 0 0 1-2 2H7.1a2 2 0 0 1-2-2z" fill="var(--domain-folder-fill)" />
      <path d="M5.1 8.2h5.6l1.3-2h2.7l1.4 2h2.8v8.9a2 2 0 0 1-2 2H7.1a2 2 0 0 1-2-2z" />
      <path d="M8.2 17.2v-4.7a3.8 3.8 0 0 1 7.6 0v4.7" stroke="var(--domain-folder-aura)" />
      <path d="M10 17.2v-4.3a2 2 0 0 1 4 0v4.3" stroke="var(--domain-folder-warm)" />
      <path d="M7.6 10c2.5-1 6.2-.9 8.8.2" stroke="var(--domain-folder-route)" />
      <circle cx="12" cy="14.4" fill="var(--domain-folder-bright)" r="0.8" stroke="none" />
      <path d="M8.1 6.2c1.8-.7 4.1-.7 5.9 0" stroke="var(--domain-folder-memory)" />
    </DomainFolderIconFrame>
  )
}

/** Private folder glyph: a local-only lock mark with a quiet moon signal. */
export function PrivateFolderGlyphIcon(props: IconProps) {
  return (
    <DomainFolderIconFrame {...props} name="private">
      <path d="M5.1 8h5.7l1.3 2h6.8v7.3a2 2 0 0 1-2 2H7.1a2 2 0 0 1-2-2z" fill="var(--domain-folder-fill)" />
      <path d="M5.1 8h5.7l1.3 2h6.8v7.3a2 2 0 0 1-2 2H7.1a2 2 0 0 1-2-2z" />
      <path d="M9 14.2h6v3.2H9z" stroke="var(--domain-folder-aura)" />
      <path d="M10.2 14.2v-1.3a1.8 1.8 0 0 1 3.6 0v1.3" stroke="var(--domain-folder-warm)" />
      <path d="M16.3 5.7c-1 .4-1.5 1.5-1.1 2.4.4.8 1.3 1.2 2.2 1-.5.8-1.6 1.1-2.5.6-1-.6-1.4-1.9-.8-2.9.4-.8 1.2-1.2 2.2-1.1z" stroke="var(--domain-folder-memory)" />
      <circle cx="12" cy="15.8" fill="var(--domain-folder-bright)" r="0.7" stroke="none" />
      <path d="M7.6 6.4c1.1-.4 2.4-.4 3.5 0" stroke="var(--domain-folder-route)" />
    </DomainFolderIconFrame>
  )
}

/** Research folder glyph: source scan, lens, and evidence route. */
export function ResearchFolderGlyphIcon(props: IconProps) {
  return (
    <DomainFolderIconFrame {...props} name="research">
      <path d="M5.2 7.3h5.5l1.4 2h6.7v8a2 2 0 0 1-2 2H7.2a2 2 0 0 1-2-2z" fill="var(--domain-folder-fill)" />
      <path d="M5.2 7.3h5.5l1.4 2h6.7v8a2 2 0 0 1-2 2H7.2a2 2 0 0 1-2-2z" />
      <circle cx="11" cy="13.2" r="2.4" stroke="var(--domain-folder-aura)" />
      <path d="m12.8 15 2.9 2.4" stroke="var(--domain-folder-warm)" />
      <path d="M8.1 10.2h6.4M7.9 17.2c2.3-.7 5-.6 7.8.3" stroke="var(--domain-folder-route)" />
      <circle cx="17.1" cy="6.3" fill="var(--domain-folder-bright)" r="0.8" stroke="none" />
      <path d="M6.9 5.4c2.1-.7 4.5-.6 6.8.3" stroke="var(--domain-folder-memory)" />
    </DomainFolderIconFrame>
  )
}

/** Template folder glyph: reusable stencil cards and a clean creation rail. */
export function TemplateFolderGlyphIcon(props: IconProps) {
  return (
    <DomainFolderIconFrame {...props} name="template">
      <path d="M5 7.4h5.4l1.4 2h7.2v8a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z" fill="var(--domain-folder-fill)" />
      <path d="M5 7.4h5.4l1.4 2h7.2v8a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z" />
      <path d="M8.2 11.8h3.4v3.4H8.2zM13.2 11.8h2.8M13.2 14.8h2.8" stroke="var(--domain-folder-aura)" />
      <path d="M8 17.1h8" stroke="var(--domain-folder-route)" />
      <path d="M16.6 5.2v3M15.1 6.7h3" stroke="var(--domain-folder-warm)" />
      <path d="M7.3 5.7c1.5-.5 3.4-.4 5 .2" stroke="var(--domain-folder-memory)" />
      <circle cx="17.4" cy="16.8" fill="var(--domain-folder-bright)" r="0.8" stroke="none" />
    </DomainFolderIconFrame>
  )
}

/** Agent folder glyph: a local council route with one protected handoff node. */
export function AgentFolderGlyphIcon(props: IconProps) {
  return (
    <DomainFolderIconFrame {...props} name="agent">
      <path d="M5.1 15.5c.9-5.2 3.2-7.8 6.9-7.8s6 2.6 6.9 7.8" fill="var(--domain-folder-fill)" />
      <path d="M5.1 15.5c.9-5.2 3.2-7.8 6.9-7.8s6 2.6 6.9 7.8M7.1 18.7h9.8" />
      <path d="M8.1 14.7c2.2-1.9 5.6-1.9 7.8 0" stroke="var(--domain-folder-aura)" />
      <path d="M12 7.7v8.7M8.9 16.3h6.2" stroke="var(--domain-folder-warm)" />
      <path d="M6.2 7.4 9 10.2M17.8 7.4 15 10.2" stroke="var(--domain-folder-route)" />
      <circle cx="6.2" cy="7.4" fill="var(--domain-folder-bright)" r="0.9" stroke="none" />
      <circle cx="17.8" cy="7.4" fill="var(--domain-folder-memory)" r="0.9" stroke="none" />
    </DomainFolderIconFrame>
  )
}

/** Storage folder glyph: local-first sync shelves with explicit provider routes. */
export function StorageFolderGlyphIcon(props: IconProps) {
  return (
    <DomainFolderIconFrame {...props} name="storage">
      <path d="M5.1 7.2h6.2l1.4 2h6.2v8.2a2 2 0 0 1-2 2H7.1a2 2 0 0 1-2-2z" fill="var(--domain-folder-fill)" />
      <path d="M5.1 7.2h6.2l1.4 2h6.2v8.2a2 2 0 0 1-2 2H7.1a2 2 0 0 1-2-2z" />
      <path d="M8.2 12.3h7.6M8.2 15h5.7" stroke="var(--domain-folder-aura)" />
      <path d="M8 17.2c2.4.8 5.8.8 8.1-.1" stroke="var(--domain-folder-memory)" />
      <path d="M15.3 5.2c1.8.3 3.2 1.3 4.2 2.7M18.6 5.4v2.8M17.2 6.8H20" stroke="var(--domain-folder-route)" />
      <circle cx="7.4" cy="5.9" fill="var(--domain-folder-warm)" r="0.8" stroke="none" />
      <circle cx="18.3" cy="16.4" fill="var(--domain-folder-bright)" r="0.8" stroke="none" />
    </DomainFolderIconFrame>
  )
}

/** Astral folder glyph: star map, orbit, and graha bead for celestial projects. */
export function AstralFolderGlyphIcon(props: IconProps) {
  return (
    <DomainFolderIconFrame {...props} name="astral">
      <path d="m12 4.2 1.7 4.2 4.5.3-3.4 3 1.1 4.4-3.9-2.4-3.9 2.4 1.1-4.4-3.4-3 4.5-.3z" fill="var(--domain-folder-fill)" />
      <path d="m12 4.2 1.7 4.2 4.5.3-3.4 3 1.1 4.4-3.9-2.4-3.9 2.4 1.1-4.4-3.4-3 4.5-.3z" stroke="var(--domain-folder-warm)" />
      <path d="M5.8 17.7c3.6 2 8.1 2 12.4-.2M6.1 6.6c3.4-2 7.6-2.2 11.3-.5" stroke="var(--domain-folder-memory)" />
      <path d="M8.4 11.2h7.2M12 7.8v6.8" stroke="var(--domain-folder-aura)" />
      <path d="M18.2 8.1c1.1 1 1.7 2.3 1.7 3.9" stroke="var(--domain-folder-route)" />
      <circle cx="18.9" cy="7.2" fill="var(--domain-folder-bright)" r="0.8" stroke="none" />
    </DomainFolderIconFrame>
  )
}
