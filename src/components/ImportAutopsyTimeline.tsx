import { type CSSProperties } from 'react'
import type { ImportAutopsyPreviewState, MarkdownFolderImportPreviewResult } from '../lib/vaultPortability'
import { Badge } from './ui/badge'

interface ImportAutopsyTimelineProps {
  preview: ImportAutopsyPreviewState | null
  vaultPath?: string
  isRefreshing?: boolean
}

interface TimelineStep {
  label: string
  value: string
  tone?: 'default' | 'warn'
}

interface DestinationSummary {
  value: string
  insideVault: boolean
  tone?: 'warn'
}

/** Shows the last no-write import preview as a local-only category timeline. */
export function ImportAutopsyTimeline({ preview, vaultPath = '', isRefreshing = false }: ImportAutopsyTimelineProps) {
  if (!preview) return null

  const sourceLabel = importPreviewLabel(preview.sourceId)
  const steps = buildTimelineSteps(preview, vaultPath)

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
      </div>
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {livePreviewSummary(sourceLabel, preview.result, isRefreshing)}
      </p>
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
            <div className={step.tone === 'warn' ? 'text-xs text-amber-600' : 'text-xs text-foreground'}>
              {step.value}
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

function buildTimelineSteps(preview: ImportAutopsyPreviewState, vaultPath: string): TimelineStep[] {
  const result = preview.result
  const sourceLabel = importPreviewLabel(preview.sourceId)
  const destination = destinationSummary(result.planned_import_root, vaultPath)
  return [
    { label: 'Source', value: `${sourceLabel} selected: ${compactSourcePath(result.source_path)}` },
    { label: 'Destination', value: destination.value, tone: destination.tone },
    { label: 'Metadata', value: metadataSummary(result) },
    { label: 'Notes', value: countSummary(result.notes_to_copy, 'note') },
    { label: 'Attachments', value: countSummary(result.assets_to_copy, 'asset') },
    {
      label: 'Skipped',
      value: skippedSummary(result),
      tone: result.skipped_files > 0 || result.failed_files > 0 ? 'warn' : 'default',
    },
    {
      label: 'Local Report',
      value: localReportSummary(result, destination.insideVault),
      tone: destination.insideVault ? 'default' : 'warn',
    },
  ]
}

function importPreviewLabel(sourceId: ImportAutopsyPreviewState['sourceId']): string {
  if (sourceId === 'bear-preview') return 'Bear export'
  if (sourceId === 'markdown-zip-preview') return 'Markdown ZIP'
  if (sourceId === 'obsidian-preview') return 'Obsidian vault'
  if (sourceId === 'notion-markdown-preview') return 'Notion Markdown ZIP'
  if (sourceId === 'notion-folder-preview') return 'Notion Markdown folder'
  if (sourceId === 'spanda-preview') return 'Spanda export'
  if (sourceId === 'apple-journal-preview') return 'Apple Journal'
  if (sourceId === 'day-one-preview') return 'Day One'
  if (sourceId === 'journey-preview') return 'Journey'
  return 'Markdown folder'
}

function metadataSummary(result: MarkdownFolderImportPreviewResult): string {
  const report = result.writes_local_only_report ? 'local-only import report planned' : 'no report needed'
  return `Frontmatter and source metadata will be mapped; ${report}.`
}

function skippedSummary(result: MarkdownFolderImportPreviewResult): string {
  if (result.skipped_files === 0 && result.failed_files === 0) return 'No skipped or failed files in this preview.'
  const skipped = countSummary(result.skipped_files, 'skipped file')
  const failed = countSummary(result.failed_files, 'failed preview')
  return `${skipped}; ${failed}.`
}

function localReportSummary(result: MarkdownFolderImportPreviewResult, destinationInsideVault: boolean): string {
  if (result.writes_local_only_report && !destinationInsideVault) {
    return 'Local-only report is planned, but destination is outside the active vault.'
  }
  return result.writes_local_only_report
    ? 'A local-only report will stay inside the vault import lane.'
    : 'No local-only report will be written for this preview.'
}

function countSummary(count: number, singular: string): string {
  const plural = singular.endsWith('y') ? `${singular.slice(0, -1)}ies` : `${singular}s`
  return `${count} ${count === 1 ? singular : plural}`
}

function compactSourcePath(path: string): string {
  return basename(path) || 'selected source'
}

function destinationSummary(path: string, vaultPath: string): DestinationSummary {
  const relativePath = compactVaultPath(path, vaultPath)
  if (vaultPath.trim() && relativePath === null) {
    return {
      value: `Warning: planned destination is outside the active vault (${basename(path) || 'selected folder'}).`,
      insideVault: false,
      tone: 'warn',
    }
  }
  return {
    value: `Will land in ${relativePath ?? (basename(path) || 'planned import folder')}`,
    insideVault: true,
  }
}

function compactVaultPath(path: string, vaultPath: string): string | null {
  const normalizedVault = normalizePath(vaultPath)
  const normalizedPath = normalizePath(path)
  if (normalizedVault && normalizedPath.startsWith(`${normalizedVault}/`)) {
    return `./${normalizedPath.slice(normalizedVault.length + 1)}`
  }
  return normalizedVault ? null : basename(path) || 'planned import folder'
}

function livePreviewSummary(sourceLabel: string, result: MarkdownFolderImportPreviewResult, isRefreshing: boolean): string {
  const staleNote = isRefreshing ? ' A newer import preview is running.' : ''
  return `${sourceLabel} import preview ready: ${countSummary(result.notes_to_copy, 'note')}, ${
    countSummary(result.assets_to_copy, 'asset')
  }; ${skippedSummary(result)}${staleNote}`
}

function basename(path: string): string {
  return path.split(/[\\/]/u).filter(Boolean).pop() ?? ''
}

function normalizePath(path: string): string {
  return path.replace(/[\\/]+/gu, '/').replace(/\/$/u, '')
}
