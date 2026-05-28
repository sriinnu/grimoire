import { memo } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { VaultRebuildProgressState } from '../hooks/useVaultRebuildProgress'
import { Button } from './ui/button'

interface VaultRebuildProgressNoticeProps {
  progress: VaultRebuildProgressState | null
  onCancel: () => void
}

function describeProgress(progress: VaultRebuildProgressState): string {
  if (progress.phase === 'cancelling') return 'Cancelling vault rebuild...'
  if (!progress.totalFiles) return 'Preparing vault rebuild...'
  const current = progress.currentPath ? ` - ${progress.currentPath}` : ''
  return `Scanning ${progress.processedFiles}/${progress.totalFiles}${current}`
}

export const VaultRebuildProgressNotice = memo(function VaultRebuildProgressNotice({
  progress,
  onCancel,
}: VaultRebuildProgressNoticeProps) {
  if (!progress) return null
  const percent = progress.totalFiles
    ? Math.min(100, Math.round((progress.processedFiles / progress.totalFiles) * 100))
    : 0

  return (
    <div
      className={cn(
        'fixed bottom-32 left-1/2 z-[1095] grid w-[min(520px,calc(100vw-32px))] -translate-x-1/2 gap-2 rounded-lg',
        'border border-[var(--border)] bg-[var(--bg-dialog)] px-4 py-3 text-[13px] text-foreground',
        'shadow-[0_4px_16px_var(--shadow-dialog)] animate-in slide-in-from-bottom-2 fade-in duration-200',
      )}
      data-motion-cancellable="true"
      data-testid="vault-rebuild-progress-notice"
      aria-live="polite"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Loader2 size={14} className="shrink-0 animate-spin text-muted-foreground motion-reduce:animate-none" />
          <span className="truncate">{describeProgress(progress)}</span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          data-motion-cancel-action="true"
          className="relative z-10 pointer-events-auto"
          disabled={progress.phase === 'cancelling'}
          onClick={onCancel}
        >
          Cancel
        </Button>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
        <div
          className="h-full rounded-full bg-primary transition-[width] motion-reduce:transition-none"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
})
