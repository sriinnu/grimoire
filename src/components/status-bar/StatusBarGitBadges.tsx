import {
  AlertTriangle,
  GitBranch,
  GitCommitHorizontal,
  ShieldCheck,
} from 'lucide-react'
import { GitDiff, Pulse } from '@phosphor-icons/react'
import type { GitRemoteStatus, LastCommitInfo } from '../../types'
import { openExternalUrl } from '../../utils/url'
import type { StatusBarHintCopy } from './StatusBarHint'
import { ICON_STYLE, STATUS_BAR_FOREGROUND, STATUS_BAR_MUTED_FOREGROUND } from './styles'
import { StatusBarAction, StatusBarSeparator } from './StatusBarAction'

function isRemoteMissing(remoteStatus: GitRemoteStatus | null | undefined): boolean {
  return remoteStatus?.hasRemote === false
}

function commitButtonTooltipCopy(remoteStatus: GitRemoteStatus | null | undefined): StatusBarHintCopy {
  return {
    label: isRemoteMissing(remoteStatus)
      ? 'Commit changes locally'
      : 'Commit and push changes',
  }
}

export function CommitBadge({ info }: { info: LastCommitInfo }) {
  const commitUrl = info.commitUrl

  if (commitUrl) {
    return (
      <span
        role="button"
        onClick={() => openExternalUrl(commitUrl)}
        style={{ ...ICON_STYLE, color: STATUS_BAR_MUTED_FOREGROUND, textDecoration: 'none', cursor: 'pointer', padding: '2px 4px', borderRadius: 3 }}
        title={`Open commit ${info.shortHash} on GitHub`}
        data-testid="status-commit-link"
        onMouseEnter={(event) => { event.currentTarget.style.color = STATUS_BAR_FOREGROUND }}
        onMouseLeave={(event) => { event.currentTarget.style.color = STATUS_BAR_MUTED_FOREGROUND }}
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
          color: 'var(--status-bar-danger-fg, var(--destructive))',
          borderRadius: 999,
          padding: '2px 6px',
          fontWeight: 600,
        }}
        data-status-pill-tone="danger"
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
          tone="warning"
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
          borderRadius: 999,
          padding: '2px 6px',
          fontWeight: 600,
        }}
        data-status-pill-tone="warning"
        title="This git vault has no remote configured. Commits stay local until you add one."
        data-testid="status-no-remote"
      >
        <GitBranch size={12} />
        {compact ? null : 'No remote'}
      </span>
    </>
  )
}

export function LocalOnlyBadge({
  showSeparator = true,
  compact = false,
}: {
  showSeparator?: boolean
  compact?: boolean
}) {
  return (
    <>
      <StatusBarSeparator show={showSeparator} />
      <span
        style={{
          ...ICON_STYLE,
          borderRadius: 999,
          padding: '2px 6px',
          fontWeight: 600,
        }}
        data-status-pill-tone="success"
        title="This vault is using local files only. Git, sync, and history are off until you enable them in Settings."
        data-testid="status-local-only"
      >
        <ShieldCheck size={12} />
        {compact ? null : 'Local only'}
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
        tone="danger"
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
      <StatusBarAction copy={{ label: 'View pending changes' }} onClick={onClick} testId="status-modified-count" tone="warning" compact={compact}>
        <span style={ICON_STYLE}>
          <GitDiff size={13} style={{ color: 'var(--status-bar-warning-fg, var(--accent-orange))' }} />
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--status-bar-badge-bg, var(--accent-orange))',
              color: 'var(--status-bar-badge-fg, var(--text-inverse))',
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
