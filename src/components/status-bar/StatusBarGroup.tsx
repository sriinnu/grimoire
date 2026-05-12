import type { CSSProperties, ReactNode } from 'react'

interface StatusBarGroupProps {
  children: ReactNode
  compact?: boolean
  grow?: boolean
  testId: string
}

function getStatusBarGroupStyle(compact: boolean, grow: boolean): CSSProperties {
  return {
    alignItems: 'center',
    background: 'color-mix(in srgb, var(--background) 8%, transparent)',
    border: '1px solid color-mix(in srgb, var(--border) 46%, transparent)',
    borderRadius: 7,
    boxShadow: 'inset 0 1px 0 color-mix(in srgb, var(--foreground) 5%, transparent)',
    display: 'flex',
    flex: grow ? '1 1 auto' : '0 0 auto',
    gap: compact ? 4 : 6,
    minHeight: 22,
    minWidth: 0,
    overflow: 'visible',
    padding: compact ? '0 2px' : '0 4px',
  }
}

/** Groups related status bar controls into a compact, scannable rail segment. */
export function StatusBarGroup({
  children,
  compact = false,
  grow = false,
  testId,
}: StatusBarGroupProps) {
  return (
    <div
      data-testid={testId}
      data-status-compact={compact || undefined}
      style={getStatusBarGroupStyle(compact, grow)}
    >
      {children}
    </div>
  )
}
