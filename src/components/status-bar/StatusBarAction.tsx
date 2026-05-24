import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { StatusBarHint, type StatusBarHintCopy } from './StatusBarHint'
import { SEP_STYLE } from './styles'

function handleStatusBarActionKeyDown(
  event: ReactKeyboardEvent<HTMLButtonElement>,
  onClick?: () => void,
) {
  if (!onClick) return
  if (event.key !== 'Enter' && event.key !== ' ') return
  event.preventDefault()
  onClick()
}

export function StatusBarAction({
  copy,
  children,
  onClick,
  testId,
  ariaLabel,
  className,
  style,
  disabled = false,
  compact = false,
}: {
  copy: StatusBarHintCopy
  children: ReactNode
  onClick?: () => void
  testId?: string
  ariaLabel?: string
  className?: string
  style?: CSSProperties
  disabled?: boolean
  compact?: boolean
}) {
  return (
    <StatusBarHint copy={copy}>
      <Button
        type="button"
        variant="ghost"
        size="xs"
        className={cn(
          'h-auto gap-1 rounded-sm px-1 py-0.5 text-[11px] font-medium text-muted-foreground hover:bg-[var(--hover)] hover:text-foreground',
          compact && 'h-6 gap-0.5 px-0.5',
          disabled && 'cursor-not-allowed opacity-40 hover:bg-transparent hover:text-muted-foreground',
          className,
        )}
        style={style}
        onClick={disabled ? undefined : onClick}
        onKeyDown={(event) => handleStatusBarActionKeyDown(event, disabled ? undefined : onClick)}
        aria-label={ariaLabel ?? copy.label}
        aria-disabled={disabled || undefined}
        data-testid={testId}
      >
        {children}
      </Button>
    </StatusBarHint>
  )
}

export function StatusBarSeparator({ show = true }: { show?: boolean }) {
  if (!show) return null
  return <span style={SEP_STYLE}>|</span>
}
