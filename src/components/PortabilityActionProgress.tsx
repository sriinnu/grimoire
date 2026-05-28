import type { createTranslator } from '../lib/i18n'
import type { PortabilityProgressState } from '../lib/vaultPortability'
import { Button } from './ui/button'

type Translate = ReturnType<typeof createTranslator>

interface PortabilityActionProgressProps {
  progress: PortabilityProgressState
  onCancel?: () => void
  t: Translate
}

/** Compact cancellable progress surface for long-running import work. */
export function PortabilityActionProgress({
  progress,
  onCancel,
  t,
}: PortabilityActionProgressProps) {
  const percent = progress.totalFiles && progress.totalFiles > 0
    ? Math.min(100, Math.round((progress.processedFiles / progress.totalFiles) * 100))
    : 0
  const progressText = progress.totalFiles
    ? t('settings.portability.progressCount', {
        processed: progress.processedFiles,
        total: progress.totalFiles,
      })
    : t('settings.portability.progressStarting')

  return (
    <div
      className="grid gap-2 rounded-md border border-border bg-background/70 p-3 pointer-events-auto"
      data-motion-cancellable="true"
      data-testid="settings-portability-progress"
      aria-live="polite"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs font-semibold text-foreground">{progress.label}</div>
          <div className="truncate text-[11px] text-muted-foreground">
            {progress.phase === 'cancelling'
              ? t('settings.portability.progressCancelling')
              : progressText}
            {progress.currentPath ? ` - ${progress.currentPath}` : ''}
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          data-testid="settings-portability-cancel"
          data-motion-cancel-action="true"
          className="relative z-10 pointer-events-auto"
          disabled={!onCancel || progress.phase === 'cancelling'}
          onClick={onCancel}
        >
          {t('settings.portability.cancel')}
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
}
