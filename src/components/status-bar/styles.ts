import type { CSSProperties } from 'react'

export const STATUS_BAR_FOREGROUND = 'var(--status-bar-foreground, var(--foreground))'
export const STATUS_BAR_MUTED_FOREGROUND = 'var(--status-bar-muted-foreground, var(--muted-foreground))'
export const STATUS_BAR_POPOVER_FOREGROUND = 'var(--status-bar-popover-fg, var(--foreground))'
export const STATUS_BAR_POPOVER_MUTED_FOREGROUND = 'var(--status-bar-popover-muted-foreground, var(--status-bar-muted-foreground, var(--muted-foreground)))'
export const STATUS_BAR_POPOVER_BACKGROUND = 'var(--status-bar-popover-bg, var(--popover))'

export const ICON_STYLE: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 4,
}

export const DISABLED_STYLE: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  opacity: 0.4,
  cursor: 'not-allowed',
}

export const SEP_STYLE: CSSProperties = {
  color: 'var(--status-bar-control-border, var(--border))',
}
