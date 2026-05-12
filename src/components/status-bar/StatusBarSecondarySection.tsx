import { Moon, Settings, Sun } from 'lucide-react'
import { Megaphone } from '@phosphor-icons/react'
import type { ThemeMode } from '../../lib/themeMode'
import { rememberFeedbackDialogOpener } from '../../lib/feedbackDialogOpener'
import { formatShortcutDisplay } from '../../hooks/appCommandCatalog'
import { ActionTooltip } from '@/components/ui/action-tooltip'
import { Button } from '@/components/ui/button'
import { ICON_STYLE } from './styles'
import { StatusBarGroup } from './StatusBarGroup'

const ZOOM_RESET_TOOLTIP = {
  label: 'Reset the zoom level',
  shortcut: formatShortcutDisplay({ display: '⌘0' }),
} as const
const FEEDBACK_TOOLTIP = { label: 'Contribute to Grimoire' } as const
const LIGHT_MODE_TOOLTIP = { label: 'Switch to light mode' } as const
const DARK_MODE_TOOLTIP = { label: 'Switch to dark mode' } as const
const SETTINGS_TOOLTIP = {
  label: 'Open settings',
  shortcut: formatShortcutDisplay({ display: '⌘,' }),
} as const

interface StatusBarSecondarySectionProps {
  noteCount: number
  zoomLevel: number
  themeMode?: ThemeMode
  onZoomReset?: () => void
  onToggleThemeMode?: () => void
  onOpenFeedback?: () => void
  onOpenSettings?: () => void
  stacked?: boolean
  compact?: boolean
}

function FeedbackButton({
  compact,
  onOpenFeedback,
}: {
  compact: boolean
  onOpenFeedback: () => void
}) {
  const className = compact
    ? 'h-6 w-6 rounded-sm p-0 text-muted-foreground hover:text-foreground'
    : 'h-6 px-2 text-[11px] font-medium text-muted-foreground hover:text-foreground'

  return (
    <ActionTooltip copy={FEEDBACK_TOOLTIP} side="top">
      <Button
        type="button"
        variant="ghost"
        size="xs"
        className={className}
        onClick={(event) => {
          rememberFeedbackDialogOpener(event.currentTarget)
          onOpenFeedback()
        }}
        aria-label={FEEDBACK_TOOLTIP.label}
        data-testid="status-feedback"
      >
        <Megaphone size={14} />
        {compact ? null : 'Contribute'}
      </Button>
    </ActionTooltip>
  )
}

/** Renders low-frequency utility controls on the right side of the bottom bar. */
export function StatusBarSecondarySection({
  noteCount,
  zoomLevel,
  themeMode = 'light',
  onZoomReset,
  onToggleThemeMode,
  onOpenFeedback,
  onOpenSettings,
  stacked = false,
  compact = false,
}: StatusBarSecondarySectionProps) {
  void noteCount
  const ThemeIcon = themeMode === 'dark' ? Sun : Moon
  const themeTooltip = themeMode === 'dark' ? LIGHT_MODE_TOOLTIP : DARK_MODE_TOOLTIP

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: stacked ? 'flex-end' : 'flex-start',
        gap: compact ? 8 : 12,
        flexShrink: 0,
        width: stacked ? '100%' : 'auto',
      }}
    >
      <StatusBarGroup compact={compact} testId="status-utility-group">
        {zoomLevel === 100 ? null : (
          <ActionTooltip copy={ZOOM_RESET_TOOLTIP} side="top">
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className="h-auto rounded-sm px-1 py-0.5 text-[11px] font-medium text-muted-foreground hover:bg-[var(--hover)] hover:text-foreground"
              onClick={onZoomReset}
              aria-label={ZOOM_RESET_TOOLTIP.label}
              data-testid="status-zoom"
            >
              <span style={ICON_STYLE}>{zoomLevel}%</span>
            </Button>
          </ActionTooltip>
        )}
        {onOpenFeedback && <FeedbackButton compact={compact} onOpenFeedback={onOpenFeedback} />}
        <ActionTooltip copy={themeTooltip} side="top">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="text-muted-foreground hover:bg-[var(--hover)] hover:text-foreground"
            onClick={onToggleThemeMode}
            disabled={!onToggleThemeMode}
            aria-label={themeTooltip.label}
            data-testid="status-theme-mode"
          >
            <ThemeIcon size={14} />
          </Button>
        </ActionTooltip>
        <ActionTooltip copy={SETTINGS_TOOLTIP} side="top" align="end">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="text-muted-foreground hover:bg-[var(--hover)] hover:text-foreground"
            onClick={onOpenSettings}
            aria-label={SETTINGS_TOOLTIP.label}
            data-testid="status-settings"
          >
            <Settings size={14} />
          </Button>
        </ActionTooltip>
      </StatusBarGroup>
    </div>
  )
}
