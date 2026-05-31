import { ClipboardCheck } from 'lucide-react'
import { useState } from 'react'
import type { createTranslator } from '../lib/i18n'
import {
  parseObjectStorageLiveProofReport,
  type ObjectStorageLiveProofReport,
} from '../lib/portabilityProof'
import { Button } from './ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { Textarea } from './ui/textarea'

type Translate = ReturnType<typeof createTranslator>

interface PortabilityProofReportDialogProps {
  hasPastedReport: boolean
  onClear: () => void
  onLoad: (report: ObjectStorageLiveProofReport) => void
  t: Translate
}

/** Loads redacted live-provider proof reports into local Settings cache. */
export function PortabilityProofReportDialog({
  hasPastedReport,
  onClear,
  onLoad,
  t,
}: PortabilityProofReportDialogProps) {
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  function loadReport() {
    const report = parseObjectStorageLiveProofReport(draft)
    if (!report) {
      setError(t('settings.portability.proofReportInvalid'))
      return
    }

    onLoad(report)
    setDraft('')
    setError(null)
    setOpen(false)
  }

  function clearReport() {
    onClear()
    setError(null)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        aria-label={t('settings.portability.proofReportButtonAria')}
        className="h-7 shrink-0 px-2 text-[11px]"
        onClick={() => setOpen(true)}
        size="xs"
        type="button"
        variant="outline"
      >
        <ClipboardCheck className="size-3" />
        {t('settings.portability.proofReportButton')}
      </Button>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t('settings.portability.proofReportDialogTitle')}</DialogTitle>
          <DialogDescription>
            {t('settings.portability.proofReportDialogDescription')}
          </DialogDescription>
        </DialogHeader>
        <Textarea
          aria-label={t('settings.portability.proofReportTextareaAria')}
          className="min-h-36 font-mono text-xs"
          onChange={(event) => setDraft(event.currentTarget.value)}
          placeholder='{"schema":"grimoire-object-storage-live-proof-v1",...}'
          value={draft}
        />
        {error ? <div className="text-xs text-destructive">{error}</div> : null}
        <DialogFooter>
          <Button disabled={!hasPastedReport} onClick={clearReport} type="button" variant="outline">
            {t('settings.portability.proofReportClear')}
          </Button>
          <Button onClick={loadReport} type="button">
            {t('settings.portability.proofReportLoad')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
