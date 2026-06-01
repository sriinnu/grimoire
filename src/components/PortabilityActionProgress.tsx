import type { createTranslator } from '../lib/i18n'
import type { PortabilityProgressState } from '../lib/vaultPortability'
import { Button } from './ui/button'

type Translate = ReturnType<typeof createTranslator>

interface PortabilityActionProgressProps {
  progress: PortabilityProgressState
  onCancel?: () => void
  t: Translate
}

/** Compact cancellable progress surface for long-running portability work. */
export function PortabilityActionProgress({
  progress,
  onCancel,
  t,
}: PortabilityActionProgressProps) {
  const percent = progress.totalFiles && progress.totalFiles > 0
    ? Math.min(100, Math.round((progress.processedFiles / progress.totalFiles) * 100))
    : 0
  const progressText = progress.totalFiles
    ? t(progressCountKey(progress.actionId), {
        processed: progress.processedFiles,
        total: progress.totalFiles,
      })
    : t(progressStartingKey(progress.actionId))

  return (
    <div
      className="grimoire-portability-inline-panel grid gap-2 rounded-md border border-border p-3 pointer-events-auto"
      data-motion-cancellable="true"
      data-testid="settings-portability-progress"
      aria-live="polite"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs font-semibold text-foreground">{progress.label}</div>
          <div className="truncate text-[11px] text-muted-foreground">
            {progress.phase === 'cancelling'
              ? t(progressCancellingKey(progress.actionId))
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
      <div className="grimoire-portability-progress-track h-1.5 overflow-hidden rounded-full" aria-hidden="true">
        <div
          className="grimoire-portability-progress-bar h-full rounded-full transition-[width] motion-reduce:transition-none"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}

function progressCountKey(actionId: PortabilityProgressState['actionId']) {
  if (actionId.startsWith('export-')) return 'settings.portability.progressExportCount'
  if (actionId.startsWith('storage-')) return 'settings.portability.progressStorageCount'
  return 'settings.portability.progressImportCount'
}

function progressStartingKey(actionId: PortabilityProgressState['actionId']) {
  if (actionId.startsWith('export-')) return 'settings.portability.progressExportStarting'
  if (actionId.startsWith('storage-')) return 'settings.portability.progressStorageStarting'
  return 'settings.portability.progressImportStarting'
}

function progressCancellingKey(actionId: PortabilityProgressState['actionId']) {
  if (actionId.startsWith('export-')) return 'settings.portability.progressExportCancelling'
  if (actionId.startsWith('storage-')) return 'settings.portability.progressStorageCancelling'
  return 'settings.portability.progressImportCancelling'
}
