import { Database } from '@phosphor-icons/react'
import type { createTranslator } from '../lib/i18n'
import type { ObjectStorageLiveProofReport } from '../lib/portabilityProof'
import { Badge } from './ui/badge'

type Translate = ReturnType<typeof createTranslator>

interface PortabilityProofHistoryStripProps {
  reports: readonly ObjectStorageLiveProofReport[]
  t: Translate
}

/** Summarizes locally cached provider proof history without provider targets or paths. */
export function PortabilityProofHistoryStrip({ reports, t }: PortabilityProofHistoryStripProps) {
  const latest = reports.at(-1)

  return (
    <div
      aria-label={t('settings.portability.proofHistoryAria')}
      className="grimoire-preview-stat grid gap-1 rounded-md border border-border/80 px-2 py-1.5 text-[11px]"
      data-testid="portability-proof-history"
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-muted-foreground"><Database size={14} /></span>
        <span className="font-semibold text-foreground">{t('settings.portability.proofHistoryTitle')}</span>
        <Badge variant="outline" className="rounded-md text-[10px]">
          {reports.length > 0
            ? t('settings.portability.proofHistorySummary', { count: String(reports.length) })
            : t('settings.portability.proofHistoryEmpty')}
        </Badge>
      </div>
      {latest ? (
        <div className="flex flex-wrap gap-x-2 gap-y-1 text-muted-foreground">
          <span>{t('settings.portability.proofHistoryLatest', {
            status: latest.summary.status.replaceAll('_', ' '),
            time: latest.finished_at ?? latest.generated_at,
          })}</span>
          <span>{t('settings.portability.proofHistoryScope', { scope: latest.provider_filter })}</span>
          <span>{t('settings.portability.proofHistoryProviders', {
            providers: providerLabels(reports),
          })}</span>
        </div>
      ) : null}
      <div className="text-muted-foreground">
        {t('settings.portability.proofHistoryLocalOnly')}
      </div>
    </div>
  )
}

function providerLabels(reports: readonly ObjectStorageLiveProofReport[]): string {
  const providers = new Set(reports.flatMap((report) => report.providers.map((provider) => provider.id)))
  const labels = [...providers].map((provider) => provider === 's3' ? 'S3' : 'Azure')
  return labels.length > 0 ? labels.join(' + ') : 'none'
}
