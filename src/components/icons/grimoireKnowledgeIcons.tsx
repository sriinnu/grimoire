import type { CSSProperties, ReactNode } from 'react'
import type { IconProps } from '@phosphor-icons/react'

type KnowledgeIconStyle = CSSProperties & Record<`--knowledge-icon-${string}`, string>

type KnowledgeIconProps = IconProps & {
  children?: ReactNode
  name: string
}

function strokeWidthFor(weight: IconProps['weight']): number {
  if (weight === 'thin') return 1.05
  if (weight === 'light') return 1.2
  if (weight === 'bold') return 1.9
  return 1.5
}

function knowledgeIconStyle(color: IconProps['color'], mirrored: IconProps['mirrored']): KnowledgeIconStyle {
  return {
    '--knowledge-icon-accent': 'color-mix(in srgb, var(--accent-blue, currentColor) 72%, currentColor)',
    '--knowledge-icon-fill': 'color-mix(in srgb, currentColor 13%, transparent)',
    '--knowledge-icon-memory': 'color-mix(in srgb, var(--accent-purple, currentColor) 74%, currentColor)',
    '--knowledge-icon-primary': color ?? 'currentColor',
    '--knowledge-icon-soft': 'color-mix(in srgb, currentColor 8%, transparent)',
    '--knowledge-icon-warm': 'color-mix(in srgb, var(--accent-yellow, currentColor) 78%, currentColor)',
    color: color ?? 'currentColor',
    transform: mirrored ? 'scaleX(-1)' : undefined,
    transformOrigin: 'center',
  }
}

function KnowledgeIconFrame({
  children,
  color,
  mirrored,
  name,
  size = 24,
  style,
  weight,
  ...props
}: KnowledgeIconProps) {
  return (
    <svg
      {...props}
      aria-hidden={props['aria-hidden'] ?? true}
      data-knowledge-icon={name}
      fill="none"
      height={size}
      stroke="var(--knowledge-icon-primary)"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidthFor(weight)}
      style={{ ...knowledgeIconStyle(color, mirrored), ...style }}
      viewBox="0 0 24 24"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      {children}
    </svg>
  )
}

/** Vedas icon: an open palm-leaf manuscript with a central mantra mark. */
export function VedasIcon(props: IconProps) {
  return (
    <KnowledgeIconFrame {...props} name="vedas">
      <path d="M4 7.5c3.2-1.2 5.7-.9 8 1v9.2c-2.3-1.9-4.8-2.2-8-1z" fill="var(--knowledge-icon-fill)" />
      <path d="M20 7.5c-3.2-1.2-5.7-.9-8 1v9.2c2.3-1.9 4.8-2.2 8-1z" fill="var(--knowledge-icon-soft)" />
      <path d="M4 7.5c3.2-1.2 5.7-.9 8 1v9.2c-2.3-1.9-4.8-2.2-8-1z" />
      <path d="M20 7.5c-3.2-1.2-5.7-.9-8 1v9.2c2.3-1.9 4.8-2.2 8-1z" />
      <path d="M8 10.5h1.8M7.6 13h2.2M14.2 10.5H16M14.2 13h2.2" stroke="var(--knowledge-icon-accent)" />
      <path d="M12 5.5v3" stroke="var(--knowledge-icon-warm)" />
      <path d="M10.7 6.7c.4-.9 2.2-.9 2.6 0M10.8 5.1c.6-1 1.8-1 2.4 0" stroke="var(--knowledge-icon-memory)" />
    </KnowledgeIconFrame>
  )
}

/** Shaastras icon: stacked rule texts with a precise vertical sutra line. */
export function ShaastrasIcon(props: IconProps) {
  return (
    <KnowledgeIconFrame {...props} name="shaastras">
      <path d="M5 6.5h10.5A3.5 3.5 0 0 1 19 10v7.5H8.5A3.5 3.5 0 0 1 5 14z" fill="var(--knowledge-icon-fill)" />
      <path d="M7.5 4.5H17a2 2 0 0 1 2 2V10" stroke="var(--knowledge-icon-memory)" />
      <path d="M5 6.5h10.5A3.5 3.5 0 0 1 19 10v7.5H8.5A3.5 3.5 0 0 1 5 14z" />
      <path d="M9 10h6M9 13h5" stroke="var(--knowledge-icon-accent)" />
      <path d="M12 7.5v9" stroke="var(--knowledge-icon-warm)" />
    </KnowledgeIconFrame>
  )
}

/** Puranas icon: story scroll with a memory spiral. */
export function PuranasIcon(props: IconProps) {
  return (
    <KnowledgeIconFrame {...props} name="puranas">
      <path d="M7 5.5h10a2 2 0 0 1 2 2v9.5H8a3 3 0 0 0-3 3V7.5a2 2 0 0 1 2-2z" fill="var(--knowledge-icon-fill)" />
      <path d="M8 17a3 3 0 0 1 3-3h8" stroke="var(--knowledge-icon-warm)" />
      <path d="M7 5.5h10a2 2 0 0 1 2 2v9.5H8a3 3 0 0 0-3 3V7.5a2 2 0 0 1 2-2z" />
      <path d="M10.5 9.5c1.8-1.4 4.6-.2 4.5 2.1-.1 2-2.8 2.6-3.8 1.2-.6-.9.1-1.9 1-1.7" stroke="var(--knowledge-icon-memory)" />
      <circle cx="16.8" cy="8.4" fill="var(--knowledge-icon-accent)" r="0.7" stroke="none" />
    </KnowledgeIconFrame>
  )
}

/** Rishi icon: a quiet sage silhouette with a focused star point. */
export function RishiIcon(props: IconProps) {
  return (
    <KnowledgeIconFrame {...props} name="rishi">
      <path d="M12 7.5a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4z" fill="var(--knowledge-icon-fill)" />
      <path d="M7 20c.8-4 2.5-6 5-6s4.2 2 5 6" />
      <path d="M8.2 13.8c1 .9 2.2 1.4 3.8 1.4s2.8-.5 3.8-1.4" stroke="var(--knowledge-icon-accent)" />
      <path d="M12 7.5a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4z" />
      <path d="M18.5 5.5v3M17 7h3" stroke="var(--knowledge-icon-warm)" />
      <path d="M5.5 7.5l1 1M6.5 7.5l-1 1" stroke="var(--knowledge-icon-memory)" />
    </KnowledgeIconFrame>
  )
}

/** Brain icon: a living mind mark for memory and thought types. */
export function BrainIcon(props: IconProps) {
  return (
    <KnowledgeIconFrame {...props} name="brain">
      <path d="M7.1 16.6c-1.6-.5-2.7-1.8-2.7-3.4 0-1.3.7-2.4 1.8-3-.1-2 1.4-3.7 3.4-3.7.9 0 1.7.3 2.3.9.6-.6 1.4-.9 2.3-.9 2 0 3.5 1.7 3.4 3.7 1.1.6 1.8 1.7 1.8 3 0 1.6-1.1 2.9-2.7 3.4" fill="var(--knowledge-icon-fill)" />
      <path d="M8.6 17.9c-1.9-.2-3.3-1.6-3.3-3.3 0-1 .5-2 1.3-2.6-.4-2 .9-3.9 3-3.9.9 0 1.7.4 2.3 1 .6-.6 1.4-1 2.3-1 2.1 0 3.4 1.9 3 3.9.8.6 1.3 1.6 1.3 2.6 0 1.7-1.4 3.1-3.3 3.3" />
      <path d="M12 9.1v8.8M8.6 12.7c1.1-.8 2.2-.7 3.4.2 1.2-.9 2.4-1 3.4-.2" stroke="var(--knowledge-icon-accent)" />
      <path d="M9.5 15.7c.9-.4 1.7-.2 2.5.6.8-.8 1.6-1 2.5-.6" stroke="var(--knowledge-icon-memory)" />
      <path d="M19.1 5.4v2.4M17.9 6.6h2.4" stroke="var(--knowledge-icon-warm)" />
    </KnowledgeIconFrame>
  )
}

/** Second-brain icon: brain memory nodes inside a personal vault outline. */
export function SecondBrainIcon(props: IconProps) {
  return (
    <KnowledgeIconFrame {...props} name="second-brain">
      <path d="M5 10.5a7 7 0 0 1 14 0v6a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3z" fill="var(--knowledge-icon-fill)" />
      <path d="M5 10.5a7 7 0 0 1 14 0v6a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3z" />
      <path d="M9.2 9.3a2.1 2.1 0 0 1 3.1-1.8 2.1 2.1 0 0 1 3.5 1.6" stroke="var(--knowledge-icon-accent)" />
      <path d="M8.7 13.4c1.2-1 2.6-1 3.7 0 1.1-1 2.5-1 3.6 0" stroke="var(--knowledge-icon-memory)" />
      <path d="M12 7.7v8.4M9 16h6" stroke="var(--knowledge-icon-warm)" />
    </KnowledgeIconFrame>
  )
}

/** Star icon: a warm north-star marker for favorites, aspiration, and bright ideas. */
export function GrimoireStarIcon(props: IconProps) {
  return (
    <KnowledgeIconFrame {...props} name="star">
      <path d="m12 3.4 2.1 5.2 5.5.4-4.2 3.6 1.3 5.4-4.7-2.9L7.3 18l1.3-5.4L4.4 9l5.5-.4z" fill="var(--knowledge-icon-fill)" />
      <path d="m12 3.4 2.1 5.2 5.5.4-4.2 3.6 1.3 5.4-4.7-2.9L7.3 18l1.3-5.4L4.4 9l5.5-.4z" stroke="var(--knowledge-icon-warm)" />
      <path d="M7.6 5.2c2.2-1.1 4.8-1.2 7.2-.2M5.7 18.8c2.9 1.8 6.6 2 9.8.4" stroke="var(--knowledge-icon-memory)" />
      <circle cx="18.6" cy="5.8" fill="var(--knowledge-icon-accent)" r="0.8" stroke="none" />
    </KnowledgeIconFrame>
  )
}
