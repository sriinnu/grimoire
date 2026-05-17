import { useRef, useState } from 'react'
import {
  AlertTriangle,
  ArrowDown,
  GitBranch,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ActionTooltipCopy } from '@/components/ui/action-tooltip'
import type { GitRemoteStatus, SyncStatus } from '../../types'
import { ICON_STYLE } from './styles'
import { StatusBarAction } from './StatusBarAction'
import { useDismissibleLayer } from './useDismissibleLayer'

const SYNC_ICON_MAP: Record<string, typeof RefreshCw> = {
  syncing: Loader2,
  conflict: AlertTriangle,
  pull_required: ArrowDown,
}

const SYNC_LABELS: Record<string, string> = {
  syncing: 'Syncing…',
  conflict: 'Conflict',
  error: 'Sync failed',
  pull_required: 'Pull required',
}

const SYNC_COLORS: Record<string, string> = {
  conflict: 'var(--accent-orange)',
  error: 'var(--muted-foreground)',
  pull_required: 'var(--accent-orange)',
}

function formatElapsedSync(lastSyncTime: number | null): string {
  if (!lastSyncTime) return 'Not synced'
  const secs = Math.round((Date.now() - lastSyncTime) / 1000)
  return secs < 60 ? 'Synced just now' : `Synced ${Math.floor(secs / 60)}m ago`
}

function formatSyncLabel(status: SyncStatus, lastSyncTime: number | null): string {
  return SYNC_LABELS[status] ?? formatElapsedSync(lastSyncTime)
}

function syncIconColor(status: SyncStatus): string {
  return SYNC_COLORS[status] ?? 'var(--accent-green)'
}

function syncBadgeTooltipCopy(status: SyncStatus): ActionTooltipCopy {
  if (status === 'conflict') return { label: 'Resolve merge conflicts' }
  if (status === 'syncing') return { label: 'Sync in progress' }
  if (status === 'pull_required') return { label: 'Pull from remote and push' }
  if (status === 'error') return { label: 'Retry sync' }
  return { label: 'Sync now' }
}

function syncStatusText(status: SyncStatus): string {
  if (status === 'idle') return 'Synced'
  if (status === 'pull_required') return 'Pull required'
  if (status === 'conflict') return 'Conflicts'
  if (status === 'error') return 'Error'
  if (status === 'syncing') return 'Syncing…'
  return status
}

function hasRemote(remoteStatus: GitRemoteStatus | null): boolean {
  return remoteStatus?.hasRemote ?? false
}

function RemoteStatusSummary({ remoteStatus }: { remoteStatus: GitRemoteStatus | null }) {
  if (!hasRemote(remoteStatus)) {
    return <div style={{ color: 'var(--muted-foreground)', marginBottom: 6 }}>No remote configured</div>
  }

  const ahead = remoteStatus?.ahead ?? 0
  const behind = remoteStatus?.behind ?? 0

  if (ahead === 0 && behind === 0) {
    return <div style={{ display: 'flex', gap: 12, marginBottom: 6, color: 'var(--muted-foreground)' }}>In sync with remote</div>
  }

  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 6, color: 'var(--muted-foreground)' }}>
      {ahead > 0 && <span title={`${ahead} commit${ahead > 1 ? 's' : ''} ahead of remote`}>↑ {ahead} ahead</span>}
      {behind > 0 && (
        <span title={`${behind} commit${behind > 1 ? 's' : ''} behind remote`} style={{ color: 'var(--accent-orange)' }}>
          ↓ {behind} behind
        </span>
      )}
    </div>
  )
}

function SyncPanelRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '5px 0', borderBottom: '1px solid color-mix(in srgb, var(--border) 58%, transparent)' }}>
      <span style={{ color: 'var(--muted-foreground)' }}>{label}</span>
      <span style={{ color: 'var(--foreground)', fontWeight: 600 }}>{value}</span>
    </div>
  )
}

function PullAction({
  remoteStatus,
  onPull,
  onClose,
}: {
  remoteStatus: GitRemoteStatus | null
  onPull?: () => void
  onClose: () => void
}) {
  if (!hasRemote(remoteStatus)) return null

  return (
    <div style={{ display: 'flex', gap: 4, marginTop: 6, borderTop: '1px solid var(--border)', paddingTop: 6 }}>
      <Button
        type="button"
        variant="outline"
        size="xs"
        onClick={() => {
          onPull?.()
          onClose()
        }}
        className="h-auto gap-1 rounded-sm px-2 py-1 text-[11px]"
        data-testid="git-status-pull-btn"
      >
        <ArrowDown size={11} />Pull
      </Button>
    </div>
  )
}

function GitStatusPopup({
  status,
  remoteStatus,
  onPull,
  onClose,
}: {
  status: SyncStatus
  remoteStatus: GitRemoteStatus | null
  onPull?: () => void
  onClose: () => void
}) {
  return (
    <div
      data-testid="git-status-popup"
      style={{
        position: 'absolute',
        bottom: '100%',
        left: 0,
        marginBottom: 4,
        background: 'var(--sidebar)',
        border: '1px solid var(--border)',
        borderRadius: 6,
        padding: 10,
        minWidth: 280,
        boxShadow: '0 4px 12px var(--shadow-dialog)',
        zIndex: 1000,
        fontSize: 12,
        color: 'var(--foreground)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <GitBranch size={13} style={{ color: 'var(--muted-foreground)' }} />
        <span style={{ fontWeight: 650 }}>Sync Panel</span>
      </div>
      <SyncPanelRow label="Files" value="Local" />
      <SyncPanelRow label="Personal sync" value={hasRemote(remoteStatus) ? 'Git remote' : 'Folder-owned'} />
      <SyncPanelRow label="Agents" value="Gate required" />
      <SyncPanelRow label="Export" value="Gate required" />
      <div style={{ marginTop: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <GitBranch size={13} style={{ color: 'var(--muted-foreground)' }} />
          <span style={{ fontWeight: 500 }}>{remoteStatus?.branch || 'No Git remote'}</span>
        </div>
      </div>
      <RemoteStatusSummary remoteStatus={remoteStatus} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, color: 'var(--muted-foreground)' }}>
        Status: {syncStatusText(status)}
      </div>
      <PullAction remoteStatus={remoteStatus} onPull={onPull} onClose={onClose} />
    </div>
  )
}

export function SyncBadge({
  status,
  lastSyncTime,
  remoteStatus,
  onTriggerSync,
  onPullAndPush,
  onOpenConflictResolver,
  compact = false,
}: {
  status: SyncStatus
  lastSyncTime: number | null
  remoteStatus?: GitRemoteStatus | null
  onTriggerSync?: () => void
  onPullAndPush?: () => void
  onOpenConflictResolver?: () => void
  compact?: boolean
}) {
  const [showPopup, setShowPopup] = useState(false)
  const popupRef = useRef<HTMLDivElement>(null)
  const SyncIcon = SYNC_ICON_MAP[status] ?? RefreshCw
  const isSyncing = status === 'syncing'

  useDismissibleLayer(showPopup, popupRef, () => setShowPopup(false))

  const handleClick = () => {
    if (status === 'conflict') {
      onOpenConflictResolver?.()
      return
    }

    if (status === 'pull_required') {
      onPullAndPush?.()
      return
    }

    setShowPopup((value) => !value)
  }

  return (
    <div ref={popupRef} style={{ position: 'relative' }}>
      <StatusBarAction copy={syncBadgeTooltipCopy(status)} onClick={handleClick} testId="status-sync" compact={compact}>
        <span style={ICON_STYLE}>
          <SyncIcon size={13} style={{ color: syncIconColor(status) }} className={isSyncing ? 'animate-spin' : ''} />
          {compact ? null : formatSyncLabel(status, lastSyncTime)}
        </span>
      </StatusBarAction>
      {showPopup && (
        <GitStatusPopup
          status={status}
          remoteStatus={remoteStatus ?? null}
          onPull={onTriggerSync}
          onClose={() => setShowPopup(false)}
        />
      )}
    </div>
  )
}
