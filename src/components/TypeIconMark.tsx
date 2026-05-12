import type { ComponentType, SVGAttributes } from 'react'
import { resolveNoteIcon } from '../utils/noteIcon'
import { NoteTitleIcon } from './NoteTitleIcon'

interface TypeIconMarkProps {
  ariaHidden?: boolean
  className?: string
  color?: string
  fallbackIcon?: ComponentType<SVGAttributes<SVGSVGElement>>
  iconValue?: string | null
  size?: number
  testId?: string
}

/** Renders a type icon from stored frontmatter, including emoji and image badges. */
export function TypeIconMark({
  ariaHidden = true,
  className,
  color,
  fallbackIcon: FallbackIcon,
  iconValue,
  size = 14,
  testId,
}: TypeIconMarkProps) {
  if (iconValue && resolveNoteIcon(iconValue).kind !== 'none') {
    return (
      <NoteTitleIcon
        className={className}
        color={color}
        icon={iconValue}
        size={size}
        testId={testId}
      />
    )
  }

  if (!FallbackIcon) return null

  return (
    <FallbackIcon
      aria-hidden={ariaHidden}
      className={className}
      data-testid={testId}
      height={size}
      style={color ? { color } : undefined}
      width={size}
    />
  )
}
