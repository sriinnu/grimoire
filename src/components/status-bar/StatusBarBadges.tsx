import {
  AlertTriangle,
  Cpu,
  GitBranch,
  GitCommitHorizontal,
  Terminal,
} from 'lucide-react'
import { GitDiff, Pulse } from '@phosphor-icons/react'
import type { ActionTooltipCopy } from '@/components/ui/action-tooltip'
import type { ClaudeCodeStatus } from '../../hooks/useClaudeCodeStatus'
import type { McpStatus } from '../../hooks/useMcpStatus'
import type { GitRemoteStatus, LastCommitInfo } from '../../types'
import { openExternalUrl } from '../../utils/url'
import { ICON_STYLE } from './styles'
import { StatusBarAction, StatusBarSeparator } from './StatusBarAction'
export { SyncBadge } from './SyncBadge'

const MCP_TOOLTIPS: Partial<Record<McpStatus, string>> = {
  not_installed: 'External AI tools not connected — click to set up',
}

const CLAUDE_INSTALL_URL = 'https://docs.anthropic.com/en/docs/claude-code'

function isRemoteMissing(remoteStatus: GitRemoteStatus | null | undefined): boolean {
  return remoteStatus?.hasRemote === false
}

function commitButtonTooltipCopy(remoteStatus: GitRemoteStatus | null | undefined): ActionTooltipCopy {
  return {
    label: isRemoteMissing(remoteStatus)
      ? 'Commit changes locally'
      : 'Commit and push changes',
  }
}

function getMcpBadgeConfig(status: McpStatus, onInstall?: () => void) {
  if (status === 'installed' || status === 'checking') return null
  const clickable = status === 'not_installed' && Boolean(onInstall)
  return {
    clickable,
    tooltip: MCP_TOOLTIPS[status] ?? 'MCP status unknown',
    onClick: clickable ? onInstall : undefined,
  }
}

function getClaudeCodeBadgeConfig(status: ClaudeCodeStatus, version?: string | null) {
  if (status === 'checking') return null
  const missing = status === 'missing'
  return {
    missing,
    label: missing ? 'Claude Code missing' : 'Claude Code',
    tooltip: missing ? 'Claude Code not found — click to install' : `Claude Code${version ? ` ${version}` : ''}`,
    onActivate: missing ? () => openExternalUrl(CLAUDE_INSTALL_URL) : undefined,
  }
}

export function CommitBadge({ info }: { info: LastCommitInfo }) {
  const commitUrl = info.commitUrl

  if (commitUrl) {
    return (
      <span
        role="button"
        onClick={() => openExternalUrl(commitUrl)}
        style={{ ...ICON_STYLE, color: 'var(--muted-foreground)', textDecoration: 'none', cursor: 'pointer', padding: '2px 4px', borderRadius: 3 }}
        title={`Open commit ${info.shortHash} on GitHub`}
        data-testid="status-commit-link"
        onMouseEnter={(event) => { event.currentTarget.style.color = 'var(--foreground)' }}
        onMouseLeave={(event) => { event.currentTarget.style.color = 'var(--muted-foreground)' }}
      >
        <GitCommitHorizontal size={13} />
        {info.shortHash}
      </span>
    )
  }

  return (
    <span style={ICON_STYLE} data-testid="status-commit-hash">
      <GitCommitHorizontal size={13} />
      {info.shortHash}
    </span>
  )
}

export function OfflineBadge({
  isOffline,
  showSeparator = true,
  compact = false,
}: {
  isOffline?: boolean
  showSeparator?: boolean
  compact?: boolean
}) {
  if (!isOffline) return null

  return (
    <>
      <StatusBarSeparator show={showSeparator} />
      <span
        style={{
          ...ICON_STYLE,
          color: 'var(--destructive)',
          background: 'var(--feedback-error-bg)',
          borderRadius: 999,
          padding: '2px 6px',
          fontWeight: 600,
        }}
        title="No internet connection"
        data-testid="status-offline"
      >
        <span aria-hidden="true" style={{ fontSize: 10, lineHeight: 1 }}>
          ●
        </span>
        {compact ? null : 'Offline'}
      </span>
    </>
  )
}

export function NoRemoteBadge({
  remoteStatus,
  onAddRemote,
  showSeparator = true,
  compact = false,
}: {
  remoteStatus?: GitRemoteStatus | null
  onAddRemote?: () => void
  showSeparator?: boolean
  compact?: boolean
}) {
  if (!isRemoteMissing(remoteStatus)) return null

  if (onAddRemote) {
    return (
      <>
        <StatusBarSeparator show={showSeparator} />
        <StatusBarAction
          copy={{ label: 'Add a remote to this vault' }}
          onClick={onAddRemote}
          testId="status-no-remote"
          compact={compact}
        >
          <span style={ICON_STYLE}>
            <GitBranch size={12} />
            {compact ? null : 'No remote'}
          </span>
        </StatusBarAction>
      </>
    )
  }

  return (
    <>
      <StatusBarSeparator show={showSeparator} />
      <span
        style={{
          ...ICON_STYLE,
          color: 'var(--muted-foreground)',
          background: 'var(--hover)',
          borderRadius: 999,
          padding: '2px 6px',
          fontWeight: 600,
        }}
        title="This git vault has no remote configured. Commits stay local until you add one."
        data-testid="status-no-remote"
      >
        <GitBranch size={12} />
        {compact ? null : 'No remote'}
      </span>
    </>
  )
}

export function ConflictBadge({
  count,
  onClick,
  showSeparator = true,
  compact = false,
}: {
  count: number
  onClick?: () => void
  showSeparator?: boolean
  compact?: boolean
}) {
  if (count <= 0) return null

  return (
    <>
      <StatusBarSeparator show={showSeparator} />
      <StatusBarAction
        copy={{ label: 'Resolve merge conflicts' }}
        onClick={onClick}
        testId="status-conflict-count"
        className="text-[var(--destructive)]"
        compact={compact}
      >
        <span style={ICON_STYLE}>
          <AlertTriangle size={13} />
          {compact ? null : `${count} conflict${count > 1 ? 's' : ''}`}
        </span>
      </StatusBarAction>
    </>
  )
}

export function ChangesBadge({
  count,
  onClick,
  showSeparator = true,
  compact = false,
}: {
  count: number
  onClick?: () => void
  showSeparator?: boolean
  compact?: boolean
}) {
  if (count <= 0) return null

  return (
    <>
      <StatusBarSeparator show={showSeparator} />
      <StatusBarAction copy={{ label: 'View pending changes' }} onClick={onClick} testId="status-modified-count" compact={compact}>
        <span style={ICON_STYLE}>
          <GitDiff size={13} style={{ color: 'var(--accent-orange)' }} />
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--accent-orange)',
              color: 'var(--text-inverse)',
              borderRadius: 9,
              padding: '0 5px',
              fontSize: 10,
              fontWeight: 600,
              minWidth: 16,
              lineHeight: '16px',
            }}
          >
            {count}
          </span>
          {compact ? null : 'Changes'}
        </span>
      </StatusBarAction>
    </>
  )
}

export function CommitButton({
  onClick,
  remoteStatus,
  showSeparator = true,
  compact = false,
}: {
  onClick?: () => void
  remoteStatus?: GitRemoteStatus | null
  showSeparator?: boolean
  compact?: boolean
}) {
  if (!onClick) return null

  return (
    <>
      <StatusBarSeparator show={showSeparator} />
      <StatusBarAction copy={commitButtonTooltipCopy(remoteStatus)} onClick={onClick} testId="status-commit-push" compact={compact}>
        <span style={ICON_STYLE}>
          <GitCommitHorizontal size={13} />
          {compact ? null : 'Commit'}
        </span>
      </StatusBarAction>
    </>
  )
}

export function PulseBadge({
  onClick,
  disabled,
  showSeparator = true,
  compact = false,
}: {
  onClick?: () => void
  disabled?: boolean
  showSeparator?: boolean
  compact?: boolean
}) {
  return (
    <>
      <StatusBarSeparator show={showSeparator} />
      <StatusBarAction
        copy={{ label: disabled ? 'History is only available for git-enabled vaults' : 'Open change history' }}
        onClick={disabled ? undefined : onClick}
        testId="status-pulse"
        disabled={Boolean(disabled)}
        compact={compact}
      >
        <span style={ICON_STYLE}>
          <Pulse size={13} />
          {compact ? null : 'History'}
        </span>
      </StatusBarAction>
    </>
  )
}

export function McpBadge({
  status,
  onInstall,
  showSeparator = true,
  compact = false,
}: {
  status: McpStatus
  onInstall?: () => void
  showSeparator?: boolean
  compact?: boolean
}) {
  const config = getMcpBadgeConfig(status, onInstall)
  if (!config) return null

  return (
    <>
      <StatusBarSeparator show={showSeparator} />
      <StatusBarAction
        copy={{ label: config.tooltip }}
        onClick={config.onClick}
        testId="status-mcp"
        className="text-[var(--accent-orange)]"
        compact={compact}
      >
        <span style={ICON_STYLE}>
          <Cpu size={13} />
          {compact ? null : 'MCP'}
          <AlertTriangle size={10} style={{ marginLeft: 2 }} />
        </span>
      </StatusBarAction>
    </>
  )
}

export function ClaudeCodeBadge({
  status,
  version,
  showSeparator = true,
  compact = false,
}: {
  status: ClaudeCodeStatus
  version?: string | null
  showSeparator?: boolean
  compact?: boolean
}) {
  const config = getClaudeCodeBadgeConfig(status, version)
  if (!config) return null

  return (
    <>
      <StatusBarSeparator show={showSeparator} />
      <StatusBarAction
        copy={{ label: config.tooltip }}
        onClick={config.onActivate}
        testId="status-claude-code"
        className={config.missing ? 'text-[var(--accent-orange)]' : undefined}
        compact={compact}
      >
        <span style={ICON_STYLE}>
          <Terminal size={13} />
          {compact ? null : config.label}
          {config.missing && <AlertTriangle size={10} style={{ marginLeft: 2 }} />}
        </span>
      </StatusBarAction>
    </>
  )
}
