import { Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ICON_STYLE } from './styles'
import { StatusBarHint } from './StatusBarHint'

const UPDATE_TOOLTIP = { label: 'Check for updates' } as const

/** Renders the app build chip without loading the full tooltip stack. */
export function BuildNumberButton({
  buildNumber,
  onCheckForUpdates,
  compact,
}: {
  buildNumber?: string
  onCheckForUpdates?: () => void
  compact: boolean
}) {
  const className = compact
    ? 'h-6 min-w-0 gap-1 rounded-sm px-1 py-0.5 text-[11px] font-medium text-muted-foreground hover:bg-[var(--hover)] hover:text-foreground'
    : 'h-auto gap-1 rounded-sm px-1 py-0.5 text-[11px] font-medium text-muted-foreground hover:bg-[var(--hover)] hover:text-foreground'

  return (
    <StatusBarHint copy={UPDATE_TOOLTIP}>
      <Button
        type="button"
        variant="ghost"
        size="xs"
        className={className}
        onClick={onCheckForUpdates}
        aria-label={UPDATE_TOOLTIP.label}
        aria-disabled={onCheckForUpdates ? undefined : true}
        data-testid="status-build-number"
      >
        <span style={ICON_STYLE}>
          <Package size={13} />
          {compact ? null : buildNumber ?? 'b?'}
        </span>
      </Button>
    </StatusBarHint>
  )
}
