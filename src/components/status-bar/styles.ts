import type { CSSProperties } from 'react'

export const STATUS_BAR_FOREGROUND = 'var(--status-bar-foreground, var(--foreground))'
export const STATUS_BAR_MUTED_FOREGROUND = 'var(--status-bar-muted-foreground, var(--muted-foreground))'
export const STATUS_BAR_POPOVER_FOREGROUND = 'var(--status-bar-popover-fg, var(--foreground))'
export const STATUS_BAR_POPOVER_MUTED_FOREGROUND = 'var(--status-bar-popover-muted-foreground, var(--status-bar-muted-foreground, var(--muted-foreground)))'
export const STATUS_BAR_POPOVER_BACKGROUND = 'var(--status-bar-popover-bg, var(--popover))'

/**
 * Status-bar popups float over dense sidebar content, and under the native
 * shell material the surface tokens can be translucent by design. Layering
 * the tinted popover colour over an opaque base keeps the panel readable no
 * matter what the active theme does to its inputs.
 */
export const STATUS_BAR_POPOVER_PANEL_STYLE: CSSProperties = {
  // A literal-backed solid, not a derived mix: WKWebView drops backgrounds
  // whose nested var()/color-mix chains fail to parse, which left this panel
  // transparent over the sidebar in the native app.
  background: 'var(--status-bar-popover-solid, #f7f4ec)',
  backdropFilter: 'blur(12px) saturate(1.1)',
  WebkitBackdropFilter: 'blur(12px) saturate(1.1)',
}

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
