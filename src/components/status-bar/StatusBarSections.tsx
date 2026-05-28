import { lazy, Suspense } from 'react'
import type { AiAgentId, AiAgentsStatus } from '../../lib/aiAgents'
import type { VaultAiGuidanceStatus } from '../../lib/vaultAiGuidance'
import type { ClaudeCodeStatus } from '../../hooks/useClaudeCodeStatus'
import type { McpStatus } from '../../hooks/useMcpStatus'
import { useStatusBarAddRemote } from '../../hooks/useStatusBarAddRemote'
import type { GitRemoteStatus, SyncStatus } from '../../types'
import { AiAgentsBadge } from './AiAgentsBadge'
import {
  ClaudeCodeBadge,
  CommitButton,
  ConflictBadge,
  ChangesBadge,
  LocalOnlyBadge,
  McpBadge,
  NoRemoteBadge,
  OfflineBadge,
  PulseBadge,
  SyncBadge,
} from './StatusBarBadges'
import { BuildNumberButton } from './BuildNumberButton'
import { SpandaRailIntent } from './SpandaRailIntent'
import { StatusBarGroup } from './StatusBarGroup'
import type { VaultOption } from './types'
import { VaultMenu } from './VaultMenu'

const AddRemoteModalSurface = lazy(async () => ({ default: (await import('../AddRemoteModal')).AddRemoteModal }))

interface StatusBarPrimarySectionProps {
  modifiedCount: number
  vaultPath: string
  vaults: VaultOption[]
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
  buildNumber?: string
  onCheckForUpdates?: () => void
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

function StatusBarAiBadge({
  aiAgentsStatus,
  vaultAiGuidanceStatus,
  defaultAiAgent,
  defaultAiProvider,
  defaultAiModel,
  onSetDefaultAiAgent,
  onRestoreVaultAiGuidance,
  claudeCodeStatus,
  claudeCodeVersion,
  compact,
}: Pick<
  StatusBarPrimarySectionProps,
  | 'aiAgentsStatus'
  | 'vaultAiGuidanceStatus'
  | 'defaultAiAgent'
  | 'defaultAiProvider'
  | 'defaultAiModel'
  | 'onSetDefaultAiAgent'
  | 'onRestoreVaultAiGuidance'
  | 'claudeCodeStatus'
  | 'claudeCodeVersion'
  | 'compact'
>) {
  if (aiAgentsStatus && defaultAiAgent) {
    return (
      <AiAgentsBadge
        statuses={aiAgentsStatus}
        guidanceStatus={vaultAiGuidanceStatus}
        defaultAgent={defaultAiAgent}
        defaultAgentProvider={defaultAiProvider}
        defaultAgentModel={defaultAiModel}
        onSetDefaultAgent={onSetDefaultAiAgent}
        onRestoreGuidance={onRestoreVaultAiGuidance}
        compact={compact}
      />
    )
  }

  if (!claudeCodeStatus) return null

  return <ClaudeCodeBadge status={claudeCodeStatus} version={claudeCodeVersion} showSeparator={false} compact={compact} />
}

function StatusBarWorkflowBadges({
  modifiedCount,
  visibleRemoteStatus,
  onAddRemote,
  onClickPending,
  onCommitPush,
  syncStatus,
  lastSyncTime,
  onTriggerSync,
  onPullAndPush,
  onOpenConflictResolver,
  conflictCount,
  onClickPulse,
  isGitVault,
  isOffline,
  compact,
}: {
  modifiedCount: number
  visibleRemoteStatus: GitRemoteStatus | null
  onAddRemote: () => void
  onClickPending?: () => void
  onCommitPush?: () => void
  syncStatus: SyncStatus
  lastSyncTime: number | null
  onTriggerSync?: () => void
  onPullAndPush?: () => void
  onOpenConflictResolver?: () => void
  conflictCount: number
  onClickPulse?: () => void
  isGitVault: boolean
  isOffline: boolean
  compact: boolean
}) {
  if (!isGitVault) {
    return (
      <>
        <OfflineBadge isOffline={isOffline} showSeparator={false} compact={compact} />
        <LocalOnlyBadge showSeparator={false} compact={compact} />
        <PulseBadge disabled showSeparator={false} compact={compact} />
      </>
    )
  }

  return (
    <>
      <OfflineBadge isOffline={isOffline} showSeparator={false} compact={compact} />
      <NoRemoteBadge remoteStatus={visibleRemoteStatus} onAddRemote={onAddRemote} showSeparator={false} compact={compact} />
      <ChangesBadge count={modifiedCount} onClick={onClickPending} showSeparator={false} compact={compact} />
      <CommitButton onClick={onCommitPush} remoteStatus={visibleRemoteStatus} showSeparator={false} compact={compact} />
      <SyncBadge
        status={syncStatus}
        lastSyncTime={lastSyncTime}
        remoteStatus={visibleRemoteStatus}
        onTriggerSync={onTriggerSync}
        onPullAndPush={onPullAndPush}
        onOpenConflictResolver={onOpenConflictResolver}
        compact={compact}
      />
      <ConflictBadge count={conflictCount} onClick={onOpenConflictResolver} showSeparator={false} compact={compact} />
      <PulseBadge onClick={onClickPulse} showSeparator={false} compact={compact} />
    </>
  )
}

function StatusBarAgentBadges({
  mcpStatus,
  onInstallMcp,
  aiAgentsStatus,
  vaultAiGuidanceStatus,
  defaultAiAgent,
  defaultAiProvider,
  defaultAiModel,
  onSetDefaultAiAgent,
  onRestoreVaultAiGuidance,
  claudeCodeStatus,
  claudeCodeVersion,
  compact,
}: Pick<
  StatusBarPrimarySectionProps,
  | 'mcpStatus'
  | 'onInstallMcp'
  | 'aiAgentsStatus'
  | 'vaultAiGuidanceStatus'
  | 'defaultAiAgent'
  | 'defaultAiProvider'
  | 'defaultAiModel'
  | 'onSetDefaultAiAgent'
  | 'onRestoreVaultAiGuidance'
  | 'claudeCodeStatus'
  | 'claudeCodeVersion'
  | 'compact'
>) {
  return (
    <>
      {mcpStatus && <McpBadge status={mcpStatus} onInstall={onInstallMcp} showSeparator={false} compact={compact} />}
      <StatusBarAiBadge
        aiAgentsStatus={aiAgentsStatus}
        vaultAiGuidanceStatus={vaultAiGuidanceStatus}
        defaultAiAgent={defaultAiAgent}
        defaultAiProvider={defaultAiProvider}
        defaultAiModel={defaultAiModel}
        onSetDefaultAiAgent={onSetDefaultAiAgent}
        onRestoreVaultAiGuidance={onRestoreVaultAiGuidance}
        claudeCodeStatus={claudeCodeStatus}
        claudeCodeVersion={claudeCodeVersion}
        compact={compact}
      />
    </>
  )
}

/** Renders vault, sync, git, MCP, and local AI status controls in the bottom bar. */
export function StatusBarPrimarySection({
  modifiedCount,
  vaultPath,
  vaults,
  onSwitchVault,
  onOpenLocalFolder,
  onCreateEmptyVault,
  onCloneVault,
  onCloneGettingStarted,
  onAddRemote,
  onGitInitialized,
  onClickPending,
  onClickPulse,
  onCommitPush,
  isOffline = false,
  isGitVault = true,
  syncStatus,
  lastSyncTime,
  conflictCount,
  remoteStatus,
  onTriggerSync,
  onPullAndPush,
  onOpenConflictResolver,
  buildNumber,
  onCheckForUpdates,
  onRemoveVault,
  mcpStatus,
  onInstallMcp,
  aiAgentsStatus,
  vaultAiGuidanceStatus,
  defaultAiAgent,
  defaultAiProvider,
  defaultAiModel,
  onSetDefaultAiAgent,
  onRestoreVaultAiGuidance,
  claudeCodeStatus,
  claudeCodeVersion,
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
  const hasAgentStatus = Boolean(mcpStatus || (aiAgentsStatus && defaultAiAgent) || claudeCodeStatus)

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
          onSwitchVault={onSwitchVault}
          onOpenLocalFolder={onOpenLocalFolder}
          onCreateEmptyVault={onCreateEmptyVault}
          onCloneVault={onCloneVault}
          onCloneGettingStarted={onCloneGettingStarted}
          onRemoveVault={onRemoveVault}
          compact={compact}
        />
        <BuildNumberButton buildNumber={buildNumber} onCheckForUpdates={onCheckForUpdates} compact={compact} />
      </StatusBarGroup>
      <StatusBarGroup compact={compact} grow testId="status-workflow-group">
        <StatusBarWorkflowBadges
          modifiedCount={modifiedCount}
          visibleRemoteStatus={visibleRemoteStatus}
          onAddRemote={() => {
            void openAddRemote()
          }}
          onClickPending={onClickPending}
          onCommitPush={onCommitPush}
          syncStatus={syncStatus}
          lastSyncTime={lastSyncTime}
          onTriggerSync={onTriggerSync}
          onPullAndPush={onPullAndPush}
          onOpenConflictResolver={onOpenConflictResolver}
          conflictCount={conflictCount}
          onClickPulse={onClickPulse}
          isGitVault={isGitVault}
          isOffline={isOffline}
          compact={compact}
        />
      </StatusBarGroup>
      <StatusBarGroup compact={compact} testId="status-spanda-group">
        <SpandaRailIntent
          aiAgentsStatus={aiAgentsStatus}
          compact={compact}
          conflictCount={conflictCount}
          defaultAiAgent={defaultAiAgent}
          isGitVault={isGitVault}
          isOffline={isOffline}
          modifiedCount={modifiedCount}
          onClickPending={onClickPending}
          onClickPulse={onClickPulse}
          onCommitPush={onCommitPush}
          onOpenConflictResolver={onOpenConflictResolver}
          onOpenLocalFolder={onOpenLocalFolder}
          onPullAndPush={onPullAndPush}
          onTriggerSync={onTriggerSync}
          remoteStatus={visibleRemoteStatus}
          syncStatus={syncStatus}
        />
      </StatusBarGroup>
      {hasAgentStatus && (
        <StatusBarGroup compact={compact} testId="status-agent-group">
          <StatusBarAgentBadges
            mcpStatus={mcpStatus}
            onInstallMcp={onInstallMcp}
            aiAgentsStatus={aiAgentsStatus}
            vaultAiGuidanceStatus={vaultAiGuidanceStatus}
            defaultAiAgent={defaultAiAgent}
            defaultAiProvider={defaultAiProvider}
            defaultAiModel={defaultAiModel}
            onSetDefaultAiAgent={onSetDefaultAiAgent}
            onRestoreVaultAiGuidance={onRestoreVaultAiGuidance}
            claudeCodeStatus={claudeCodeStatus}
            claudeCodeVersion={claudeCodeVersion}
            compact={compact}
          />
        </StatusBarGroup>
      )}
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
