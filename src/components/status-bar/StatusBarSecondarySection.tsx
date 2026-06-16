import {
  AlertTriangle,
  ArrowDown,
  Clock3,
  Ellipsis,
  FilePenLine,
  Megaphone,
  Moon,
  Package,
  RefreshCw,
  RotateCcw,
  Save,
  Settings,
  Sun,
} from 'lucide-react'
import type { ThemeMode } from '../../lib/themeMode'
import { rememberFeedbackDialogOpener } from '../../lib/feedbackDialogOpener'
import { formatShortcutDisplay } from '../../hooks/appCommandCatalog'
import type { GitRemoteStatus, SyncStatus } from '../../types'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { StatusBarHint } from './StatusBarHint'
import { StatusBarGroup } from './StatusBarGroup'

const ZOOM_RESET_TOOLTIP = {
  label: 'Reset the zoom level',
  shortcut: formatShortcutDisplay({ display: '⌘0' }),
} as const
const FEEDBACK_TOOLTIP = { label: 'Send feedback' } as const
const OVERFLOW_TOOLTIP = { label: 'More notebook controls' } as const
const UPDATE_TOOLTIP = { label: 'Updates' } as const
const LIGHT_MODE_TOOLTIP = { label: 'Switch to light mode' } as const
const DARK_MODE_TOOLTIP = { label: 'Switch to dark mode' } as const
const SETTINGS_TOOLTIP = {
  label: 'Settings',
  shortcut: formatShortcutDisplay({ display: '⌘,' }),
} as const
const MENU_ITEM_CLASS = 'h-7 text-xs'

interface StatusBarSecondarySectionProps {
  buildNumber?: string
  conflictCount: number
  isGitVault: boolean
  modifiedCount: number
  noteCount: number
  remoteStatus?: GitRemoteStatus | null
  syncStatus: SyncStatus
  zoomLevel: number
  themeMode?: ThemeMode
  onCheckForUpdates?: () => void
  onClickPending?: () => void
  onClickPulse?: () => void
  onCommitPush?: () => void
  onOpenConflictResolver?: () => void
  onZoomReset?: () => void
  onPullAndPush?: () => void
  onToggleThemeMode?: () => void
  onTriggerSync?: () => void
  onOpenFeedback?: () => void
  onOpenSettings?: () => void
  stacked?: boolean
  compact?: boolean
}

function handleOptionalSelect(action?: () => void) {
  return () => action?.()
}

function StatusUtilityMenu({
  onCheckForUpdates,
  onOpenFeedback,
  onOpenSettings,
  onClickPending,
  onClickPulse,
  onCommitPush,
  onOpenConflictResolver,
  onPullAndPush,
  onTriggerSync,
  onToggleThemeMode,
  onZoomReset,
  conflictCount,
  isGitVault,
  modifiedCount,
  remoteStatus,
  syncStatus,
  themeMode,
  zoomLevel,
}: {
  conflictCount: number
  isGitVault: boolean
  modifiedCount: number
  onCheckForUpdates?: () => void
  onClickPending?: () => void
  onClickPulse?: () => void
  onCommitPush?: () => void
  onOpenFeedback?: () => void
  onOpenConflictResolver?: () => void
  onOpenSettings?: () => void
  onPullAndPush?: () => void
  onToggleThemeMode?: () => void
  onTriggerSync?: () => void
  onZoomReset?: () => void
  remoteStatus?: GitRemoteStatus | null
  syncStatus: SyncStatus
  themeMode: ThemeMode
  zoomLevel: number
}) {
  const ThemeIcon = themeMode === 'dark' ? Sun : Moon
  const themeTooltip = themeMode === 'dark' ? LIGHT_MODE_TOOLTIP : DARK_MODE_TOOLTIP
  const checkpointLabel = remoteStatus?.hasRemote === false ? 'Save local snapshot' : 'Save snapshot'
  const syncLabel = syncStatus === 'pull_required'
    ? 'Bring in remote edits'
    : syncStatus === 'conflict'
      ? 'Resolve conflicts'
      : syncStatus === 'error'
        ? 'Retry notebook sync'
        : 'Refresh notebook'
  const syncAction = syncStatus === 'pull_required'
    ? onPullAndPush
    : syncStatus === 'conflict'
      ? onOpenConflictResolver
      : onTriggerSync
  const showReviewEdits = modifiedCount > 0 && Boolean(onClickPending)
  const showConflicts = conflictCount > 0 && Boolean(onOpenConflictResolver)
  const showCheckpoint = Boolean(onCommitPush)
  const showSync = isGitVault && Boolean(syncAction)
  const showTimeline = isGitVault && Boolean(onClickPulse)
  const showNotebookActions = showReviewEdits || showConflicts || showCheckpoint || showSync || showTimeline
  const showUpdates = Boolean(onCheckForUpdates)
  const showZoomReset = zoomLevel !== 100 && Boolean(onZoomReset)
  const showFeedback = Boolean(onOpenFeedback)
  const showThemeMode = Boolean(onToggleThemeMode)
  const showSettings = Boolean(onOpenSettings)
  const showAppActions = showUpdates || showZoomReset || showFeedback || showThemeMode || showSettings

  return (
    <DropdownMenu>
      <StatusBarHint copy={OVERFLOW_TOOLTIP} align="end">
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="text-muted-foreground hover:bg-[var(--hover)] hover:text-foreground"
            aria-label={OVERFLOW_TOOLTIP.label}
            data-testid="status-overflow-menu"
          >
            <Ellipsis size={14} />
          </Button>
        </DropdownMenuTrigger>
      </StatusBarHint>
      <DropdownMenuContent
        align="end"
        side="top"
        sideOffset={6}
        className="status-bar-overflow-menu min-w-[210px]"
        data-testid="status-overflow-menu-content"
      >
        {showNotebookActions ? (
          <>
            <DropdownMenuLabel className="px-2 py-1 text-[11px]">Notebook</DropdownMenuLabel>
            {showReviewEdits ? (
              <DropdownMenuItem
                className={MENU_ITEM_CLASS}
                data-testid="status-modified-count"
                onSelect={handleOptionalSelect(onClickPending)}
              >
                <FilePenLine size={14} />
                <span>Review edits</span>
                <DropdownMenuShortcut>{modifiedCount}</DropdownMenuShortcut>
              </DropdownMenuItem>
            ) : null}
            {showConflicts ? (
              <DropdownMenuItem
                className={MENU_ITEM_CLASS}
                data-testid="status-conflict-count"
                onSelect={handleOptionalSelect(onOpenConflictResolver)}
              >
                <AlertTriangle size={14} />
                <span>Resolve conflicts</span>
                <DropdownMenuShortcut>{conflictCount}</DropdownMenuShortcut>
              </DropdownMenuItem>
            ) : null}
            {showCheckpoint ? (
              <DropdownMenuItem
                className={MENU_ITEM_CLASS}
                data-testid="status-commit-push"
                onSelect={handleOptionalSelect(onCommitPush)}
              >
                <Save size={14} />
                <span>{checkpointLabel}</span>
              </DropdownMenuItem>
            ) : null}
            {showSync ? (
              <DropdownMenuItem
                className={MENU_ITEM_CLASS}
                data-testid="status-sync"
                onSelect={handleOptionalSelect(syncAction)}
              >
                {syncStatus === 'pull_required' ? <ArrowDown size={14} /> : <RefreshCw size={14} />}
                <span>{syncLabel}</span>
              </DropdownMenuItem>
            ) : null}
            {showTimeline ? (
              <DropdownMenuItem
                className={MENU_ITEM_CLASS}
                data-testid="status-pulse"
                onSelect={handleOptionalSelect(onClickPulse)}
              >
                <Clock3 size={14} />
                <span>Timeline</span>
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuSeparator />
          </>
        ) : null}
        {showAppActions ? (
          <>
            <DropdownMenuLabel className="px-2 py-1 text-[11px]">App</DropdownMenuLabel>
            {showUpdates ? (
              <DropdownMenuItem
                className={MENU_ITEM_CLASS}
                data-testid="status-build-number"
                onSelect={handleOptionalSelect(onCheckForUpdates)}
              >
                <Package size={14} />
                <span>{UPDATE_TOOLTIP.label}</span>
              </DropdownMenuItem>
            ) : null}
            {showZoomReset ? (
              <DropdownMenuItem
                className={MENU_ITEM_CLASS}
                data-testid="status-zoom"
                onSelect={handleOptionalSelect(onZoomReset)}
              >
                <RotateCcw size={14} />
                <span>{ZOOM_RESET_TOOLTIP.label}</span>
                <DropdownMenuShortcut>{ZOOM_RESET_TOOLTIP.shortcut}</DropdownMenuShortcut>
              </DropdownMenuItem>
            ) : null}
            {(showUpdates || showZoomReset) && (showFeedback || showThemeMode || showSettings) ? (
              <DropdownMenuSeparator />
            ) : null}
            {showFeedback ? (
              <DropdownMenuItem
                className={MENU_ITEM_CLASS}
                data-testid="status-feedback"
                onSelect={(event) => {
                  const opener = event.currentTarget instanceof HTMLElement ? event.currentTarget : null
                  rememberFeedbackDialogOpener(opener)
                  onOpenFeedback?.()
                }}
              >
                <Megaphone size={14} />
                <span>{FEEDBACK_TOOLTIP.label}</span>
              </DropdownMenuItem>
            ) : null}
            {showThemeMode ? (
              <DropdownMenuItem
                className={MENU_ITEM_CLASS}
                data-testid="status-theme-mode"
                onSelect={handleOptionalSelect(onToggleThemeMode)}
              >
                <ThemeIcon size={14} />
                <span>{themeTooltip.label}</span>
              </DropdownMenuItem>
            ) : null}
            {showSettings ? (
              <DropdownMenuItem
                className={MENU_ITEM_CLASS}
                data-testid="status-settings"
                onSelect={handleOptionalSelect(onOpenSettings)}
              >
                <Settings size={14} />
                <span>{SETTINGS_TOOLTIP.label}</span>
                <DropdownMenuShortcut>{SETTINGS_TOOLTIP.shortcut}</DropdownMenuShortcut>
              </DropdownMenuItem>
            ) : null}
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Renders low-frequency utility controls on the right side of the bottom bar. */
export function StatusBarSecondarySection({
  conflictCount,
  isGitVault,
  modifiedCount,
  noteCount,
  remoteStatus,
  syncStatus,
  zoomLevel,
  themeMode = 'light',
  onCheckForUpdates,
  onClickPending,
  onClickPulse,
  onCommitPush,
  onOpenConflictResolver,
  onZoomReset,
  onPullAndPush,
  onToggleThemeMode,
  onTriggerSync,
  onOpenFeedback,
  onOpenSettings,
  stacked = false,
  compact = false,
}: StatusBarSecondarySectionProps) {
  void noteCount

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
        <StatusUtilityMenu
          conflictCount={conflictCount}
          isGitVault={isGitVault}
          modifiedCount={modifiedCount}
          onCheckForUpdates={onCheckForUpdates}
          onClickPending={onClickPending}
          onClickPulse={onClickPulse}
          onCommitPush={onCommitPush}
          onOpenFeedback={onOpenFeedback}
          onOpenConflictResolver={onOpenConflictResolver}
          onOpenSettings={onOpenSettings}
          onPullAndPush={onPullAndPush}
          onToggleThemeMode={onToggleThemeMode}
          onTriggerSync={onTriggerSync}
          onZoomReset={onZoomReset}
          remoteStatus={remoteStatus}
          syncStatus={syncStatus}
          themeMode={themeMode}
          zoomLevel={zoomLevel}
        />
      </StatusBarGroup>
    </div>
  )
}
