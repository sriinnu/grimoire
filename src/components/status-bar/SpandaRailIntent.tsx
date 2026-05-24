import { useCallback, useRef, useState, type CSSProperties, type FocusEvent as ReactFocusEvent, type ReactNode } from 'react'
import { Activity, AlertTriangle, FolderOpen, GitBranch, GitCommitHorizontal, HardDrive, PenLine, RefreshCw, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  getAiAgentDefinition,
  hasAnyInstalledAiAgent,
  isAiAgentInstalled,
  isAiAgentsStatusChecking,
  isBrowserPreviewAiAgentsStatus,
  type AiAgentId,
  type AiAgentsStatus,
} from '../../lib/aiAgents'
import type { GitRemoteStatus, SyncStatus } from '../../types'
import { StatusBarHint } from './StatusBarHint'
import { useDismissibleLayer } from './useDismissibleLayer'

type SpandaIntentKind = 'agent' | 'commit' | 'local' | 'resolve' | 'sync' | 'write'

interface SpandaRailIntentProps {
  aiAgentsStatus?: AiAgentsStatus
  compact: boolean
  conflictCount: number
  defaultAiAgent?: AiAgentId
  isGitVault: boolean
  isOffline: boolean
  modifiedCount: number
  onClickPending?: () => void
  onClickPulse?: () => void
  onCommitPush?: () => void
  onOpenConflictResolver?: () => void
  onOpenLocalFolder?: () => void
  onPullAndPush?: () => void
  onTriggerSync?: () => void
  remoteStatus?: GitRemoteStatus | null
  syncStatus: SyncStatus
}

interface SpandaIntent {
  action?: () => void
  description: string
  icon: ReactNode
  kind: SpandaIntentKind
  label: string
}

interface SpandaCommand {
  description: string
  icon: ReactNode
  label: string
  onRun?: () => void
}

const INTENT_TONE: Record<SpandaIntentKind, { accent: string; bg: string; ring: string }> = {
  agent: {
    accent: 'var(--status-bar-agent-fg, var(--accent-purple))',
    bg: 'color-mix(in srgb, var(--status-bar-agent-fg, var(--accent-purple)) 14%, transparent)',
    ring: 'color-mix(in srgb, var(--status-bar-agent-fg, var(--accent-purple)) 42%, transparent)',
  },
  commit: {
    accent: 'var(--status-bar-warning-fg, var(--accent-orange))',
    bg: 'color-mix(in srgb, var(--status-bar-warning-fg, var(--accent-orange)) 14%, transparent)',
    ring: 'color-mix(in srgb, var(--status-bar-warning-fg, var(--accent-orange)) 42%, transparent)',
  },
  local: {
    accent: 'var(--status-bar-accent-fg, var(--accent-blue))',
    bg: 'color-mix(in srgb, var(--status-bar-accent-fg, var(--accent-blue)) 12%, transparent)',
    ring: 'color-mix(in srgb, var(--status-bar-accent-fg, var(--accent-blue)) 38%, transparent)',
  },
  resolve: {
    accent: 'var(--status-bar-danger-fg, var(--accent-red))',
    bg: 'color-mix(in srgb, var(--status-bar-danger-fg, var(--accent-red)) 14%, transparent)',
    ring: 'color-mix(in srgb, var(--status-bar-danger-fg, var(--accent-red)) 46%, transparent)',
  },
  sync: {
    accent: 'var(--status-bar-accent-fg, var(--accent-blue))',
    bg: 'color-mix(in srgb, var(--status-bar-accent-fg, var(--accent-blue)) 12%, transparent)',
    ring: 'color-mix(in srgb, var(--status-bar-accent-fg, var(--accent-blue)) 38%, transparent)',
  },
  write: {
    accent: 'var(--status-bar-success-fg, var(--accent-green))',
    bg: 'color-mix(in srgb, var(--status-bar-success-fg, var(--accent-green)) 12%, transparent)',
    ring: 'color-mix(in srgb, var(--status-bar-success-fg, var(--accent-green)) 38%, transparent)',
  },
}

function pluralize(count: number, singular: string) {
  return `${count} ${singular}${count === 1 ? '' : 's'}`
}

function hasRemote(remoteStatus: GitRemoteStatus | null | undefined): boolean {
  return remoteStatus?.hasRemote ?? false
}

function storageLabel(isGitVault: boolean, remoteStatus: GitRemoteStatus | null | undefined): string {
  if (!isGitVault) return 'Files'
  if (hasRemote(remoteStatus)) return remoteStatus?.branch ? `Git · ${remoteStatus.branch}` : 'Git remote'
  if (remoteStatus?.hasRemote === false) return 'Local Git'
  return 'Git'
}

function agentLabel(statuses: AiAgentsStatus | undefined, defaultAgent: AiAgentId | undefined): string {
  if (!statuses || !defaultAgent) return 'Agent quiet'
  if (isBrowserPreviewAiAgentsStatus(statuses)) return 'Native app required'
  if (isAiAgentsStatusChecking(statuses)) return 'Checking agents'
  if (isAiAgentInstalled(statuses, defaultAgent)) return `${getAiAgentDefinition(defaultAgent).shortLabel} ready`
  if (hasAnyInstalledAiAgent(statuses)) return 'Agents ready'
  return 'No agents'
}

function resolveIntent({
  conflictCount,
  defaultAiAgent,
  isOffline,
  modifiedCount,
  onClickPending,
  onClickPulse,
  onCommitPush,
  onOpenConflictResolver,
  onOpenLocalFolder,
  onPullAndPush,
  onTriggerSync,
  remoteStatus,
  syncStatus,
}: SpandaRailIntentProps): SpandaIntent {
  if (isOffline || conflictCount > 0 || syncStatus === 'conflict' || syncStatus === 'error') {
    return {
      action: conflictCount > 0 ? onOpenConflictResolver : onTriggerSync,
      description: conflictCount > 0 ? `${pluralize(conflictCount, 'conflict')} needs a decision` : 'Connection or sync needs attention',
      icon: <AlertTriangle size={13} />,
      kind: 'resolve',
      label: conflictCount > 0 ? 'Resolve' : 'Offline',
    }
  }
  if (syncStatus === 'pull_required' || syncStatus === 'syncing') {
    return {
      action: syncStatus === 'pull_required' ? (onPullAndPush ?? onTriggerSync) : undefined,
      description: syncStatus === 'syncing' ? 'Sync is moving now' : 'Remote changes are waiting',
      icon: <RefreshCw size={13} />,
      kind: 'sync',
      label: syncStatus === 'syncing' ? 'Syncing' : 'Pull',
    }
  }
  if (modifiedCount > 0) {
    return {
      action: onCommitPush ?? onClickPending,
      description: `${pluralize(modifiedCount, 'change')} ready to land`,
      icon: <GitCommitHorizontal size={13} />,
      kind: 'commit',
      label: 'Commit',
    }
  }
  if (remoteStatus?.hasRemote === false) {
    return {
      action: onOpenLocalFolder,
      description: 'This vault is local until a remote is added',
      icon: <HardDrive size={13} />,
      kind: 'local',
      label: 'Local',
    }
  }
  if (defaultAiAgent) {
    return {
      action: undefined,
      description: `${getAiAgentDefinition(defaultAiAgent).shortLabel} can assist when needed`,
      icon: <Sparkles size={13} />,
      kind: 'agent',
      label: 'Agent',
    }
  }
  return {
    action: onClickPulse,
    description: 'Clean slate for writing',
    icon: <PenLine size={13} />,
    kind: 'write',
    label: 'Write',
  }
}

function buildCommands({
  conflictCount,
  modifiedCount,
  onClickPending,
  onClickPulse,
  onCommitPush,
  onOpenConflictResolver,
  onOpenLocalFolder,
  onPullAndPush,
  onTriggerSync,
  syncStatus,
}: SpandaRailIntentProps): SpandaCommand[] {
  const syncAction = syncStatus === 'pull_required' ? (onPullAndPush ?? onTriggerSync) : onTriggerSync
  const commands: SpandaCommand[] = [
    {
      description: conflictCount > 0 ? 'Open the conflict resolver' : 'No conflicts waiting',
      icon: <AlertTriangle size={12} />,
      label: 'Resolve',
      onRun: conflictCount > 0 ? onOpenConflictResolver : undefined,
    },
    {
      description: modifiedCount > 0 ? `${pluralize(modifiedCount, 'change')} in the vault` : 'Working tree is calm',
      icon: <GitCommitHorizontal size={12} />,
      label: 'Commit',
      onRun: modifiedCount > 0 ? (onCommitPush ?? onClickPending) : undefined,
    },
    {
      description: syncStatus === 'pull_required' ? 'Pull remote changes, then push' : 'Refresh sync state',
      icon: <RefreshCw size={12} />,
      label: syncStatus === 'pull_required' ? 'Pull' : 'Sync',
      onRun: syncAction,
    },
    {
      description: 'Open the vault activity pulse',
      icon: <Activity size={12} />,
      label: 'Pulse',
      onRun: onClickPulse,
    },
    {
      description: 'Reveal this vault on disk',
      icon: <FolderOpen size={12} />,
      label: 'Folder',
      onRun: onOpenLocalFolder,
    },
  ]

  return commands.filter((command) => command.onRun).slice(0, 4)
}

function containsFocusTarget(currentTarget: HTMLElement, relatedTarget: EventTarget | null) {
  return relatedTarget instanceof Node && currentTarget.contains(relatedTarget)
}

function triggerStyle(kind: SpandaIntentKind): CSSProperties {
  const tone = INTENT_TONE[kind]
  return {
    background: tone.bg,
    border: `1px solid ${tone.ring}`,
    boxShadow: `0 0 0 1px ${tone.bg}, inset 0 1px 0 color-mix(in srgb, var(--foreground) 8%, transparent)`,
    color: 'var(--foreground)',
    transition: 'transform 160ms cubic-bezier(.2,.9,.2,1), background 160ms ease, border-color 160ms ease',
  }
}

function MetaChip({ children }: { children: ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-sm px-2 py-1 text-[11px] font-medium"
      style={{
        background: 'color-mix(in srgb, var(--popover) 78%, var(--popover-foreground) 8%)',
        border: '1px solid color-mix(in srgb, var(--popover-foreground) 16%, var(--border))',
        color: 'var(--popover-foreground)',
      }}
    >
      {children}
    </span>
  )
}

function CommandButton({ command, onRun }: { command: SpandaCommand; onRun: () => void }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="xs"
      className="h-auto w-full justify-start gap-2 rounded-sm px-2 py-1 text-left text-xs font-medium text-foreground hover:bg-[var(--hover)]"
      onClick={onRun}
    >
      {command.icon}
      <span className="flex min-w-0 flex-col">
        <span>{command.label}</span>
        <span className="truncate text-[10px] font-normal text-muted-foreground">{command.description}</span>
      </span>
    </Button>
  )
}

/** Renders Grimoire's intent-aware Spanda chip and contextual command bloom. */
export function SpandaRailIntent(props: SpandaRailIntentProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const closeBloom = useCallback(() => setOpen(false), [])
  const intent = resolveIntent(props)
  const commands = buildCommands(props)
  const currentStorageLabel = storageLabel(props.isGitVault, props.remoteStatus)
  const currentAgentLabel = agentLabel(props.aiAgentsStatus, props.defaultAiAgent)

  useDismissibleLayer(open, containerRef, closeBloom)

  const runCommand = (command: SpandaCommand) => {
    command.onRun?.()
    setOpen(false)
  }
  const handleBlur = (event: ReactFocusEvent<HTMLDivElement>) => {
    if (!containsFocusTarget(event.currentTarget, event.relatedTarget)) setOpen(false)
  }

  return (
    <div
      ref={containerRef}
      data-testid="spanda-rail-intent"
      data-spanda-intent-kind={intent.kind}
      onBlur={handleBlur}
      onFocus={() => setOpen(true)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onKeyDown={(event) => {
        if (event.key === 'Escape') setOpen(false)
      }}
      style={{ position: 'relative' }}
    >
      <StatusBarHint copy={{ label: intent.description }}>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          className="h-6 gap-1 rounded-sm px-2 text-[11px] font-semibold"
          data-testid="spanda-intent-trigger"
          onClick={() => {
            if (intent.action) {
              intent.action()
              setOpen(false)
              return
            }
            setOpen(true)
          }}
          style={triggerStyle(intent.kind)}
        >
          <span style={{ color: INTENT_TONE[intent.kind].accent, display: 'inline-flex' }}>{intent.icon}</span>
          {props.compact ? null : (
            <>
              <span>Spanda</span>
              <span style={{ opacity: 0.52 }}>·</span>
              <span>{intent.label}</span>
            </>
          )}
        </Button>
      </StatusBarHint>
      {open && (
        <div
          data-testid="spanda-command-bloom"
          role="menu"
          style={{
            background: 'var(--popover)',
            border: '1px solid color-mix(in srgb, var(--border) 86%, transparent)',
            borderRadius: 8,
            bottom: 'calc(100% + 8px)',
            boxShadow: '0 14px 34px color-mix(in srgb, #000 18%, transparent)',
            color: 'var(--popover-foreground)',
            minWidth: 288,
            padding: 8,
            position: 'absolute',
            right: 0,
            zIndex: 1200,
          }}
        >
          <div className="mb-2 flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-semibold">Spanda Rail</div>
              <div className="text-[11px] text-muted-foreground">{intent.description}</div>
            </div>
            <span style={{ color: INTENT_TONE[intent.kind].accent }}>{intent.icon}</span>
          </div>
          <div className="mb-2 flex flex-wrap gap-1.5">
            <MetaChip><GitBranch size={11} /> <span data-testid="spanda-storage-state">{currentStorageLabel}</span></MetaChip>
            <MetaChip><Sparkles size={11} /> <span data-testid="spanda-agent-state">{currentAgentLabel}</span></MetaChip>
          </div>
          {commands.length > 0 ? (
            <div className="flex flex-col gap-1">
              {commands.map((command) => (
                <CommandButton key={command.label} command={command} onRun={() => runCommand(command)} />
              ))}
            </div>
          ) : (
            <div className="rounded-sm border border-dashed border-border px-2 py-2 text-xs text-muted-foreground">
              Nothing urgent. Keep writing.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
