import type { AiAgentId, AiAgentsStatus } from '../lib/aiAgents'
import type { VaultAiGuidanceStatus } from '../lib/vaultAiGuidance'
import { useEffect, useState } from 'react'
import type { ClaudeCodeStatus } from '../hooks/useClaudeCodeStatus'
import type { McpStatus } from '../hooks/useMcpStatus'
import type { ThemeMode } from '../lib/themeMode'
import type { GitRemoteStatus, SyncStatus } from '../types'
import { TooltipProvider } from '@/components/ui/tooltip'
import { StatusBarPrimarySection } from './status-bar/StatusBarSections'
import { StatusBarSecondarySection } from './status-bar/StatusBarSecondarySection'
import type { VaultOption } from './status-bar/types'

export type { VaultOption } from './status-bar/types'

const COMPACT_STATUS_BAR_MAX_WIDTH = 1180

function getWindowWidth() {
  return typeof window === 'undefined' ? Number.POSITIVE_INFINITY : window.innerWidth
}

function getStatusBarLayout(windowWidth: number) {
  const compact = windowWidth <= COMPACT_STATUS_BAR_MAX_WIDTH

  return {
    compact,
    stacked: false,
  }
}

function useStatusBarTicker() {
  const [, setTick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setTick((tick) => tick + 1), 30_000)
    return () => clearInterval(id)
  }, [])
}

function useStatusBarLayout() {
  const [windowWidth, setWindowWidth] = useState(() => getWindowWidth())

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleResize = () => setWindowWidth(getWindowWidth())

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return getStatusBarLayout(windowWidth)
}

interface StatusBarProps {
  noteCount: number
  modifiedCount?: number
  vaultPath: string
  vaults: VaultOption[]
  onSwitchVault: (path: string) => void
  onOpenSettings?: () => void
  onOpenLocalFolder?: () => void
  onCreateEmptyVault?: () => void
  onCloneVault?: () => void
  onCloneGettingStarted?: () => void
  onGitInitialized?: () => void
  onClickPending?: () => void
  onClickPulse?: () => void
  onCommitPush?: () => void
  isOffline?: boolean
  isGitVault?: boolean
  syncStatus?: SyncStatus
  lastSyncTime?: number | null
  conflictCount?: number
  remoteStatus?: GitRemoteStatus | null
  onTriggerSync?: () => void
  onPullAndPush?: () => void
  onOpenConflictResolver?: () => void
  zoomLevel?: number
  themeMode?: ThemeMode
  onZoomReset?: () => void
  onToggleThemeMode?: () => void
  onOpenFeedback?: () => void
  buildNumber?: string
  onCheckForUpdates?: () => void
  onRemoveVault?: (path: string) => void
  mcpStatus?: McpStatus
  onInstallMcp?: () => void
  aiAgentsStatus?: AiAgentsStatus
  vaultAiGuidanceStatus?: VaultAiGuidanceStatus
  defaultAiAgent?: AiAgentId
  onSetDefaultAiAgent?: (agent: AiAgentId) => void
  onRestoreVaultAiGuidance?: () => void
  claudeCodeStatus?: ClaudeCodeStatus
  claudeCodeVersion?: string | null
}

interface StatusBarFooterProps extends StatusBarProps {
  compact: boolean
  stacked: boolean
}

type StatusBarTone = 'healthy' | 'attention' | 'danger' | 'neutral'

const STATUS_TONE_COLOR: Record<StatusBarTone, string> = {
  healthy: 'color-mix(in srgb, var(--accent-green) 58%, transparent)',
  attention: 'color-mix(in srgb, var(--accent-orange) 70%, transparent)',
  danger: 'color-mix(in srgb, var(--destructive) 70%, transparent)',
  neutral: 'color-mix(in srgb, var(--border) 82%, transparent)',
}

function getStatusBarTone({
  conflictCount,
  isOffline,
  modifiedCount,
  syncStatus,
}: {
  conflictCount: number
  isOffline: boolean
  modifiedCount: number
  syncStatus: SyncStatus
}): StatusBarTone {
  if (isOffline || conflictCount > 0 || syncStatus === 'conflict' || syncStatus === 'error') return 'danger'
  if (modifiedCount > 0 || syncStatus === 'pull_required' || syncStatus === 'syncing') return 'attention'
  if (syncStatus === 'idle') return 'healthy'
  return 'neutral'
}

function getStatusBarLabel({
  conflictCount,
  isOffline,
  modifiedCount,
  syncStatus,
}: {
  conflictCount: number
  isOffline: boolean
  modifiedCount: number
  syncStatus: SyncStatus
}) {
  const parts = ['Grimoire status']
  if (isOffline) parts.push('offline')
  if (modifiedCount > 0) parts.push(`${modifiedCount} pending change${modifiedCount > 1 ? 's' : ''}`)
  if (conflictCount > 0) parts.push(`${conflictCount} conflict${conflictCount > 1 ? 's' : ''}`)
  parts.push(`sync ${syncStatus.replace(/_/g, ' ')}`)
  return parts.join(', ')
}

function StatusBarFooter({
  noteCount,
  modifiedCount = 0,
  vaultPath,
  vaults,
  onSwitchVault,
  onOpenSettings,
  onOpenLocalFolder,
  onCreateEmptyVault,
  onCloneVault,
  onCloneGettingStarted,
  onGitInitialized,
  onClickPending,
  onClickPulse,
  onCommitPush,
  isOffline = false,
  isGitVault = true,
  syncStatus = 'idle',
  lastSyncTime = null,
  conflictCount = 0,
  remoteStatus,
  onTriggerSync,
  onPullAndPush,
  onOpenConflictResolver,
  zoomLevel = 100,
  themeMode = 'light',
  onZoomReset,
  onToggleThemeMode,
  onOpenFeedback,
  buildNumber,
  onCheckForUpdates,
  onRemoveVault,
  mcpStatus,
  onInstallMcp,
  aiAgentsStatus,
  vaultAiGuidanceStatus,
  defaultAiAgent,
  onSetDefaultAiAgent,
  onRestoreVaultAiGuidance,
  claudeCodeStatus,
  claudeCodeVersion,
  compact,
  stacked,
}: StatusBarFooterProps) {
  const statusTone = getStatusBarTone({ conflictCount, isOffline, modifiedCount, syncStatus })

  return (
    <footer
      className="status-bar"
      data-testid="status-bar"
      data-panel-role="status-bar"
      data-status-tone={statusTone}
      aria-label={getStatusBarLabel({ conflictCount, isOffline, modifiedCount, syncStatus })}
      style={{
        minHeight: 30,
        height: stacked ? 'auto' : 30,
        flexShrink: 0,
        display: 'flex',
        flexWrap: stacked ? 'wrap' : 'nowrap',
        alignItems: stacked ? 'flex-start' : 'center',
        justifyContent: stacked ? 'flex-start' : 'space-between',
        rowGap: stacked ? 4 : 0,
        columnGap: compact ? 8 : 12,
        background: 'linear-gradient(180deg, color-mix(in srgb, var(--sidebar) 96%, var(--background)), var(--sidebar))',
        borderTop: '1px solid color-mix(in srgb, var(--border) 84%, transparent)',
        boxShadow: `inset 0 1px 0 ${STATUS_TONE_COLOR[statusTone]}, 0 -10px 24px color-mix(in srgb, #000 5%, transparent)`,
        boxSizing: 'border-box',
        overflow: 'visible',
        padding: stacked ? '4px 8px' : '0 8px',
        fontSize: 11,
        color: 'var(--muted-foreground)',
        position: 'relative',
        zIndex: 50,
        backdropFilter: 'blur(12px)',
      }}
    >
      <StatusBarPrimarySection
        modifiedCount={modifiedCount}
        vaultPath={vaultPath}
        vaults={vaults}
        onSwitchVault={onSwitchVault}
        onOpenLocalFolder={onOpenLocalFolder}
        onCreateEmptyVault={onCreateEmptyVault}
        onCloneVault={onCloneVault}
        onCloneGettingStarted={onCloneGettingStarted}
        onGitInitialized={onGitInitialized}
        onClickPending={onClickPending}
        onClickPulse={onClickPulse}
        onCommitPush={onCommitPush}
        isOffline={isOffline}
        isGitVault={isGitVault}
        syncStatus={syncStatus}
        lastSyncTime={lastSyncTime}
        conflictCount={conflictCount}
        remoteStatus={remoteStatus}
        onTriggerSync={onTriggerSync}
        onPullAndPush={onPullAndPush}
        onOpenConflictResolver={onOpenConflictResolver}
        buildNumber={buildNumber}
        onCheckForUpdates={onCheckForUpdates}
        onRemoveVault={onRemoveVault}
        mcpStatus={mcpStatus}
        onInstallMcp={onInstallMcp}
        aiAgentsStatus={aiAgentsStatus}
        vaultAiGuidanceStatus={vaultAiGuidanceStatus}
        defaultAiAgent={defaultAiAgent}
        onSetDefaultAiAgent={onSetDefaultAiAgent}
        onRestoreVaultAiGuidance={onRestoreVaultAiGuidance}
        claudeCodeStatus={claudeCodeStatus}
        claudeCodeVersion={claudeCodeVersion}
        stacked={stacked}
        compact={compact}
      />
      <StatusBarSecondarySection
        noteCount={noteCount}
        zoomLevel={zoomLevel}
        themeMode={themeMode}
        onZoomReset={onZoomReset}
        onToggleThemeMode={onToggleThemeMode}
        onOpenFeedback={onOpenFeedback}
        onOpenSettings={onOpenSettings}
        stacked={stacked}
        compact={compact}
      />
    </footer>
  )
}

/** Renders the persistent bottom command and system-status strip. */
export function StatusBar(props: StatusBarProps) {
  useStatusBarTicker()
  const { compact, stacked } = useStatusBarLayout()

  return (
    <TooltipProvider>
      <StatusBarFooter {...props} compact={compact} stacked={stacked} />
    </TooltipProvider>
  )
}
