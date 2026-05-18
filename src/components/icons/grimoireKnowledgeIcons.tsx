import type { ReactNode } from 'react'
import type { IconProps } from '@phosphor-icons/react'

type KnowledgeIconProps = IconProps & {
  children?: ReactNode
}

function KnowledgeIconFrame({
  children,
  color,
  size = 24,
  weight,
  mirrored,
  ...props
}: KnowledgeIconProps) {
  void weight
  void mirrored

  return (
    <svg
      {...props}
      aria-hidden={props['aria-hidden'] ?? true}
      fill="none"
      height={size}
      stroke={color ?? 'currentColor'}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.75"
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
    <KnowledgeIconFrame {...props}>
      <path d="M4 7.5c3.2-1.2 5.7-.9 8 1v9.2c-2.3-1.9-4.8-2.2-8-1z" />
      <path d="M20 7.5c-3.2-1.2-5.7-.9-8 1v9.2c2.3-1.9 4.8-2.2 8-1z" />
      <path d="M8 10.5h1.8M7.6 13h2.2M14.2 10.5H16M14.2 13h2.2" />
      <path d="M12 5.5v3M10.7 6.7c.4-.9 2.2-.9 2.6 0M10.8 5.1c.6-1 1.8-1 2.4 0" />
    </KnowledgeIconFrame>
  )
}

/** Shaastras icon: stacked rule texts with a precise vertical sutra line. */
export function ShaastrasIcon(props: IconProps) {
  return (
    <KnowledgeIconFrame {...props}>
      <path d="M5 6.5h10.5A3.5 3.5 0 0 1 19 10v7.5H8.5A3.5 3.5 0 0 1 5 14z" />
      <path d="M7.5 4.5H17a2 2 0 0 1 2 2V10" />
      <path d="M9 10h6M9 13h5M12 7.5v9" />
    </KnowledgeIconFrame>
  )
}

/** Puranas icon: story scroll with a memory spiral. */
export function PuranasIcon(props: IconProps) {
  return (
    <KnowledgeIconFrame {...props}>
      <path d="M7 5.5h10a2 2 0 0 1 2 2v9.5H8a3 3 0 0 0-3 3V7.5a2 2 0 0 1 2-2z" />
      <path d="M8 17a3 3 0 0 1 3-3h8" />
      <path d="M10.5 9.5c1.8-1.4 4.6-.2 4.5 2.1-.1 2-2.8 2.6-3.8 1.2-.6-.9.1-1.9 1-1.7" />
    </KnowledgeIconFrame>
  )
}

/** Rishi icon: a quiet sage silhouette with a focused star point. */
export function RishiIcon(props: IconProps) {
  return (
    <KnowledgeIconFrame {...props}>
      <path d="M12 7.5a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4z" />
      <path d="M7 20c.8-4 2.5-6 5-6s4.2 2 5 6" />
      <path d="M8.2 13.8c1 .9 2.2 1.4 3.8 1.4s2.8-.5 3.8-1.4" />
      <path d="M18.5 5.5v3M17 7h3M5.5 7.5l1 1M6.5 7.5l-1 1" />
    </KnowledgeIconFrame>
  )
}

/** Second-brain icon: brain memory nodes inside a personal vault outline. */
export function SecondBrainIcon(props: IconProps) {
  return (
    <KnowledgeIconFrame {...props}>
      <path d="M5 10.5a7 7 0 0 1 14 0v6a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3z" />
      <path d="M9.2 9.3a2.1 2.1 0 0 1 3.1-1.8 2.1 2.1 0 0 1 3.5 1.6" />
      <path d="M8.7 13.4c1.2-1 2.6-1 3.7 0 1.1-1 2.5-1 3.6 0" />
      <path d="M12 7.7v8.4M9 16h6" />
    </KnowledgeIconFrame>
  )
}
