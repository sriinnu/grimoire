import { type CSSProperties, useState } from 'react'
import { ClipboardCheck, Copy } from 'lucide-react'
import type { ImportAutopsyPreviewState } from '../lib/vaultPortability'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import {
  buildExactManifestRows,
  buildPortableManifestMarkdown,
  buildPreflightBuckets,
  buildTimelineSteps,
  exactManifestDisclosure,
  importPreviewLabel,
  livePreviewSummary,
} from './import-autopsy/importAutopsyTimelineModel'

interface ImportAutopsyTimelineProps {
  preview: ImportAutopsyPreviewState | null
  vaultPath?: string
  isRefreshing?: boolean
}

type CopyState = 'idle' | 'copied' | 'failed' | 'unavailable'

interface CopyStateSnapshot {
  preview: ImportAutopsyPreviewState | null
  state: CopyState
  vaultPath: string
}

/** Shows the last no-write import preview as a local-only category timeline. */
export function ImportAutopsyTimeline({ preview, vaultPath = '', isRefreshing = false }: ImportAutopsyTimelineProps) {
  const [copySnapshot, setCopySnapshot] = useState<CopyStateSnapshot>(() => ({
    preview,
    state: 'idle',
    vaultPath,
  }))
  const copyState = copySnapshot.preview === preview && copySnapshot.vaultPath === vaultPath ? copySnapshot.state : 'idle'
  const setCurrentCopyState = (state: CopyState) => {
    setCopySnapshot({ preview, state, vaultPath })
  }

  if (!preview) return null

  const sourceLabel = importPreviewLabel(preview.sourceId)
  const manifest = buildPreflightBuckets(preview.result)
  const exactManifest = buildExactManifestRows(preview.result, vaultPath)
  const exactManifestTotal = preview.result.manifest_rows?.length ?? exactManifest.length
  const exactDisclosure = exactManifestDisclosure(exactManifestTotal, exactManifest.length)
  const steps = buildTimelineSteps(preview, vaultPath)
  const portableManifest = buildPortableManifestMarkdown(sourceLabel, manifest, exactManifest, steps, exactManifestTotal)

  async function copyPortableManifest() {
    if (!navigator.clipboard?.writeText) {
      setCurrentCopyState('unavailable')
      return
    }
    try {
      await navigator.clipboard.writeText(portableManifest)
      setCurrentCopyState('copied')
    } catch {
      setCurrentCopyState('failed')
    }
  }

  return (
    <section
      className="grimoire-import-autopsy grimoire-panel-reveal grid gap-2 rounded-md border border-border bg-muted/25 p-3"
      data-testid="import-autopsy-timeline"
      aria-label={`Import Autopsy preview for ${sourceLabel}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="rounded-md">Import Autopsy</Badge>
        <Badge variant="outline" className="rounded-md">No writes yet</Badge>
        {isRefreshing ? <Badge variant="outline" className="rounded-md">Refreshing...</Badge> : null}
        <span className="text-xs font-medium text-foreground">{sourceLabel}</span>
        <Button
          type="button"
          variant="outline"
          size="xs"
          className="ml-auto"
          onClick={copyPortableManifest}
          data-testid="import-autopsy-copy-manifest"
        >
          {copyState === 'copied' ? <ClipboardCheck className="size-3" /> : <Copy className="size-3" />}
          {copyButtonLabel(copyState)}
        </Button>
      </div>
      <p
        className="text-[11px] text-muted-foreground"
        aria-live="polite"
        data-testid="import-autopsy-copy-status"
      >
        {copyStatus(copyState)}
      </p>
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {livePreviewSummary(sourceLabel, preview.result, isRefreshing)}
      </p>
      <div
        className="grid gap-2 sm:grid-cols-2"
        data-testid="import-autopsy-manifest"
        aria-label="Source-safe import manifest"
      >
        {manifest.map((bucket) => (
          <div
            key={bucket.label}
            className="rounded border border-border bg-background/60 px-2.5 py-2"
            data-tone={bucket.tone ?? 'default'}
          >
            <div className="text-[11px] font-semibold uppercase text-muted-foreground">{bucket.label}</div>
            <div className="grimoire-import-autopsy__value text-xs font-medium">{bucket.value}</div>
            <div className="mt-1 text-[11px] leading-snug text-muted-foreground">{bucket.detail}</div>
          </div>
        ))}
      </div>
      {exactManifest.length > 0 ? (
        <div
          className="grid gap-1.5 rounded-md border border-border bg-background/60 p-2"
          data-testid="import-autopsy-exact-manifest"
          aria-label="Exact redacted import manifest"
        >
          <div className="text-[11px] font-semibold uppercase text-muted-foreground">Exact manifest</div>
          {exactDisclosure ? (
            <div className="text-[11px] leading-snug text-muted-foreground">{exactDisclosure}</div>
          ) : null}
          {exactManifest.map((row) => (
            <div
              key={`${row.kind}:${row.source}:${row.destination}:${row.detail}`}
              className="grid gap-1 rounded border border-border bg-background/70 px-2 py-1.5 text-[11px] sm:grid-cols-[6rem_minmax(0,1fr)]"
              data-tone={row.tone ?? 'default'}
            >
              <span className="font-semibold uppercase text-muted-foreground">{row.kind}</span>
              <span className="min-w-0 text-foreground">
                <span className="font-medium">{row.source}</span>
                <span className="text-muted-foreground">{' -> '}</span>
                <span>{row.destination}</span>
                <span className="text-muted-foreground"> / {row.detail}</span>
              </span>
            </div>
          ))}
        </div>
      ) : null}
      <ol className="grimoire-import-autopsy__rail grid gap-2" aria-label="Import preview steps">
        {steps.map((step, index) => (
          <li
            key={step.label}
            className="grimoire-import-autopsy__step grimoire-control-entrance grid gap-0.5 rounded border border-border bg-background/70 px-2.5 py-2"
            data-tone={step.tone ?? 'default'}
            style={{ '--motion-stagger-delay': `${index * 35}ms` } as CSSProperties}
          >
            <div className="text-[11px] font-semibold uppercase text-muted-foreground">
              {step.label}
            </div>
            <div className="grimoire-import-autopsy__value text-xs">
              {step.value}
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

function copyButtonLabel(state: CopyState): string {
  if (state === 'copied') return 'Copied'
  if (state === 'failed') return 'Retry copy'
  return 'Copy manifest'
}

function copyStatus(state: CopyState): string {
  if (state === 'copied') return 'Redacted manifest copied locally.'
  if (state === 'failed') return 'Copy failed. Full paths stayed local.'
  if (state === 'unavailable') return 'Clipboard unavailable. Full paths stayed local.'
  return 'Copies the redacted no-write manifest only.'
}
