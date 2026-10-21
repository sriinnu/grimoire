import type { ReactNode } from 'react'
import type { LabTheme } from './mockData'

interface ThemeFrameProps {
  theme: LabTheme
  label: string
  children: ReactNode
  /** When true, children render bare (no flex stage) — used for phone frames. */
  plain?: boolean
}

/**
 * A bordered, labeled artboard that forces a theme subtree (`data-theme`)
 * and paints the aurora material behind it.
 */
export function ThemeFrame({ theme, label, children, plain = false }: ThemeFrameProps) {
  return (
    <div className="dl-frame" data-theme={theme}>
      <div className="dl-aurora" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <span className="dl-frame__label">{label}</span>
      {plain ? children : <div className="dl-stage">{children}</div>}
    </div>
  )
}
