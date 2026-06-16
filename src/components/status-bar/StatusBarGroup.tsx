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
    background: 'transparent',
    border: '1px solid transparent',
    borderRadius: 7,
    boxShadow: 'none',
    display: 'flex',
    flex: grow ? '1 1 auto' : '0 0 auto',
    gap: compact ? 4 : 6,
    minHeight: 22,
    minWidth: 0,
    overflow: 'visible',
    padding: compact ? '0 1px' : '0 2px',
  }
}

/** Groups related bottom-bar controls without drawing heavy rail chrome. */
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
