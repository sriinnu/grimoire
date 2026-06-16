import { lazy, Suspense } from 'react'
import {
  AlertTriangle,
  ArrowDown,
  CheckCircle2,
  CloudOff,
  FilePenLine,
  HardDrive,
  Loader2,
  LockKeyhole,
  RefreshCw,
  type LucideIcon,
} from 'lucide-react'
import type { AiAgentId, AiAgentsStatus } from '../../lib/aiAgents'
import type { VaultAiGuidanceStatus } from '../../lib/vaultAiGuidance'
import type { ClaudeCodeStatus } from '../../hooks/useClaudeCodeStatus'
import type { McpStatus } from '../../hooks/useMcpStatus'
import { useStatusBarAddRemote } from '../../hooks/useStatusBarAddRemote'
import type { GitRemoteStatus, SyncStatus } from '../../types'
import { StatusBarAction } from './StatusBarAction'
import { StatusBarGroup } from './StatusBarGroup'
import type { VaultOption } from './types'
import type { VaultOpeningState } from './VaultMenu'
import { VaultMenu } from './VaultMenu'

const AddRemoteModalSurface = lazy(async () => ({ default: (await import('../AddRemoteModal')).AddRemoteModal }))

function formatLocalEdits(modifiedCount: number) {
  return modifiedCount === 1 ? 'Edit waiting' : 'Edits waiting'
}

function formatLocalEditsTooltip(modifiedCount: number) {
  return modifiedCount === 1 ? 'Review 1 local edit' : `Review ${modifiedCount} local edits`
}

interface StatusBarPrimarySectionProps {
  modifiedCount: number
  vaultPath: string
  vaults: VaultOption[]
  openingVault?: VaultOpeningState | null
  onSwitchVault: (path: string) => void
  onOpenLocalFolder?: () => void
  onCreateEmptyVault?: () => void
  onCloneVault?: () => void
  onCloneGettingStarted?: () => void
  onAddRemote?: () => void
  onGitInitialized?: () => void
  onClickPending?: () => void
  onClickPulse?: () => void
  onCommitPush?: () => void
  isOffline?: boolean
  isGitVault?: boolean
  syncStatus: SyncStatus
  lastSyncTime: number | null
  conflictCount: number
  remoteStatus?: GitRemoteStatus | null
  onTriggerSync?: () => void
  onPullAndPush?: () => void
  onOpenConflictResolver?: () => void
  onRemoveVault?: (path: string) => void
  mcpStatus?: McpStatus
  onInstallMcp?: () => void
  aiAgentsStatus?: AiAgentsStatus
  vaultAiGuidanceStatus?: VaultAiGuidanceStatus
  defaultAiAgent?: AiAgentId
  defaultAiProvider?: string | null
  defaultAiModel?: string | null
  onSetDefaultAiAgent?: (agent: AiAgentId) => void
  onRestoreVaultAiGuidance?: () => void
  claudeCodeStatus?: ClaudeCodeStatus
  claudeCodeVersion?: string | null
  stacked?: boolean
  compact?: boolean
}

type NotebookStatusSignalTone = 'danger' | 'success' | 'warning'

interface NotebookStatusSignalProps {
  icon: LucideIcon
  label: string
  testId: string
  tooltip: string
  onClick?: () => void
  spin?: boolean
  tone?: NotebookStatusSignalTone
}

function NotebookStatusSignal({
  icon: Icon,
  label,
  onClick,
  spin = false,
  testId,
  tone,
  tooltip,
}: NotebookStatusSignalProps) {
  const content = (
    <span className="status-bar-summary-chip" data-status-summary-tone={tone}>
      <Icon size={12} className={spin ? 'animate-spin' : undefined} />
      <span>{label}</span>
    </span>
  )

  if (onClick) {
    return (
      <StatusBarAction
        className="status-bar-summary-action"
        copy={{ label: tooltip }}
        onClick={onClick}
        testId={testId}
        tone={tone}
      >
        {content}
      </StatusBarAction>
    )
  }

  return (
    <span
      aria-label={tooltip}
      className="status-bar-summary-static"
      data-status-action-tone={tone}
      data-testid={testId}
      title={tooltip}
    >
      {content}
    </span>
  )
}

function getSaveSignal({
  conflictCount,
  isOffline,
  modifiedCount,
  onClickPending,
  onOpenConflictResolver,
  onPullAndPush,
  onTriggerSync,
  syncStatus,
}: Pick<
  StatusBarPrimarySectionProps,
  | 'conflictCount'
  | 'isOffline'
  | 'modifiedCount'
  | 'onClickPending'
  | 'onOpenConflictResolver'
  | 'onPullAndPush'
  | 'onTriggerSync'
  | 'syncStatus'
>): NotebookStatusSignalProps {
  if (conflictCount > 0 || syncStatus === 'conflict') {
    return {
      icon: AlertTriangle,
      label: conflictCount > 0 ? `${conflictCount} conflicts` : 'Conflicts',
      onClick: onOpenConflictResolver,
      testId: 'status-save-signal',
      tone: 'danger',
      tooltip: 'Resolve merge conflicts',
    }
  }

  if (isOffline) {
    return {
      icon: CloudOff,
      label: 'Offline',
      testId: 'status-save-signal',
      tone: 'danger',
      tooltip: 'This notebook is offline',
    }
  }

  if (syncStatus === 'pull_required') {
    return {
      icon: ArrowDown,
      label: 'Pull required',
      onClick: onPullAndPush,
      testId: 'status-save-signal',
      tone: 'warning',
      tooltip: 'Pull from remote before syncing',
    }
  }

  if (syncStatus === 'syncing') {
    return {
      icon: Loader2,
      label: 'Syncing',
      spin: true,
      testId: 'status-save-signal',
      tone: 'warning',
      tooltip: 'Sync in progress',
    }
  }

  if (syncStatus === 'error') {
    return {
      icon: RefreshCw,
      label: 'Sync failed',
      onClick: onTriggerSync,
      testId: 'status-save-signal',
      tone: 'danger',
      tooltip: 'Retry sync',
    }
  }

  if (modifiedCount > 0) {
    return {
      icon: FilePenLine,
      label: formatLocalEdits(modifiedCount),
      onClick: onClickPending,
      testId: 'status-save-signal',
      tone: 'warning',
      tooltip: formatLocalEditsTooltip(modifiedCount),
    }
  }

  return {
    icon: CheckCircle2,
    label: 'Saved here',
    testId: 'status-save-signal',
    tone: 'success',
    tooltip: 'Saved in this notebook',
  }
}

function NotebookStatusSummary({
  conflictCount,
  isGitVault,
  isOffline,
  modifiedCount,
  onAddRemote,
  onClickPending,
  onOpenConflictResolver,
  onPullAndPush,
  onTriggerSync,
  syncStatus,
  visibleRemoteStatus,
}: {
  conflictCount: number
  isGitVault: boolean
  isOffline: boolean
  modifiedCount: number
  onAddRemote: () => void
  onClickPending?: () => void
  onOpenConflictResolver?: () => void
  onPullAndPush?: () => void
  onTriggerSync?: () => void
  syncStatus: SyncStatus
  visibleRemoteStatus: GitRemoteStatus | null
}) {
  const saveSignal = getSaveSignal({
    conflictCount,
    isOffline,
    modifiedCount,
    onClickPending,
    onOpenConflictResolver,
    onPullAndPush,
    onTriggerSync,
    syncStatus,
  })
  const remoteMissing = isGitVault && visibleRemoteStatus?.hasRemote === false
  const localLabel = isGitVault ? 'Local' : 'Only here'
  const localTooltip = remoteMissing
    ? 'Stored on this device. Add a remote only when you choose.'
    : 'Stored on this device.'

  return (
    <>
      <NotebookStatusSignal
        icon={HardDrive}
        label={localLabel}
        onClick={remoteMissing ? onAddRemote : undefined}
        testId="status-local-signal"
        tooltip={localTooltip}
      />
      <NotebookStatusSignal {...saveSignal} />
      <NotebookStatusSignal
        icon={LockKeyhole}
        label="Private"
        testId="status-private-signal"
        tooltip="Nothing leaves this notebook without your action."
      />
    </>
  )
}

/** Renders vault, sync, git, MCP, and local AI status controls in the bottom bar. */
export function StatusBarPrimarySection({
  modifiedCount,
  vaultPath,
  vaults,
  openingVault,
  onSwitchVault,
  onOpenLocalFolder,
  onCreateEmptyVault,
  onCloneVault,
  onCloneGettingStarted,
  onAddRemote,
  onGitInitialized,
  onClickPending,
  isOffline = false,
  isGitVault = true,
  syncStatus,
  conflictCount,
  remoteStatus,
  onTriggerSync,
  onPullAndPush,
  onOpenConflictResolver,
  onRemoveVault,
  stacked = false,
  compact = false,
}: StatusBarPrimarySectionProps) {
  const {
    openAddRemote,
    closeAddRemote,
    showAddRemote,
    visibleRemoteStatus,
    handleRemoteConnected,
  } = useStatusBarAddRemote({
    vaultPath,
    isGitVault,
    remoteStatus,
    onAddRemote,
    onGitInitialized,
  })

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: compact ? 6 : 8,
        rowGap: stacked ? 4 : 0,
        flex: 1,
        minWidth: 0,
        width: stacked ? '100%' : 'auto',
        flexBasis: stacked ? '100%' : 'auto',
        flexWrap: stacked ? 'wrap' : 'nowrap',
      }}
    >
      <StatusBarGroup compact={compact} testId="status-workspace-group">
        <VaultMenu
          vaults={vaults}
          vaultPath={vaultPath}
          openingVault={openingVault}
          onSwitchVault={onSwitchVault}
          onOpenLocalFolder={onOpenLocalFolder}
          onCreateEmptyVault={onCreateEmptyVault}
          onCloneVault={onCloneVault}
          onCloneGettingStarted={onCloneGettingStarted}
          onRemoveVault={onRemoveVault}
          compact={compact}
        />
      </StatusBarGroup>
      <StatusBarGroup compact={compact} grow testId="status-workflow-group">
        <NotebookStatusSummary
          conflictCount={conflictCount}
          isGitVault={isGitVault}
          isOffline={isOffline}
          modifiedCount={modifiedCount}
          onAddRemote={() => {
            void openAddRemote()
          }}
          onClickPending={onClickPending}
          onTriggerSync={onTriggerSync}
          onPullAndPush={onPullAndPush}
          onOpenConflictResolver={onOpenConflictResolver}
          syncStatus={syncStatus}
          visibleRemoteStatus={visibleRemoteStatus}
        />
      </StatusBarGroup>
      {showAddRemote ? (
        <Suspense fallback={null}>
          <AddRemoteModalSurface
            open={showAddRemote}
            vaultPath={vaultPath}
            onClose={closeAddRemote}
            onGitInitialized={onGitInitialized}
            onRemoteConnected={handleRemoteConnected}
          />
        </Suspense>
      ) : null}
    </div>
  )
}
