import type {
  ImportAutopsyManifestRow,
  ImportAutopsyPreviewState,
  MarkdownFolderImportPreviewResult,
} from '../../lib/vaultPortability'

/** One rendered timeline step in the import autopsy preview. */
export interface ImportAutopsyTimelineStep {
  label: string
  value: string
  tone?: 'default' | 'warn'
}

/** Summary bucket shown above the exact import manifest. */
export interface ImportAutopsyPreflightBucket {
  label: string
  value: string
  detail: string
  tone?: 'default' | 'warn'
}

interface DestinationSummary {
  value: string
  insideVault: boolean
  tone?: 'warn'
}

/** Source-safe row rendered in the exact import manifest. */
export interface ImportAutopsyManifestRowView {
  destination: string
  detail: string
  kind: string
  source: string
  tone?: 'default' | 'warn'
}

/** Builds the clipboard-safe Markdown form of a no-write import preview. */
export function buildPortableManifestMarkdown(
  sourceLabel: string,
  manifest: ImportAutopsyPreflightBucket[],
  exactManifest: ImportAutopsyManifestRowView[],
  steps: ImportAutopsyTimelineStep[],
): string {
  return [
    '# Import Autopsy Manifest',
    '',
    `Source: ${sourceLabel}`,
    'Mode: no writes yet',
    'Privacy: absolute local paths are redacted from this portable copy.',
    '',
    '## Summary',
    ...manifest.map((bucket) => `- ${bucket.label}: ${bucket.value}; ${bucket.detail}`),
    '',
    '## Exact Manifest',
    ...(exactManifest.length > 0
      ? exactManifest.map((row) => `- ${row.kind}: ${row.source} -> ${row.destination}; ${row.detail}`)
      : ['- No exact rows reported by this preview.']),
    '',
    '## Timeline',
    ...steps.map((step) => `- ${step.label}: ${step.value}`),
    '',
    '## Locality Contract',
    '- Original import reports with absolute source paths stay local-only.',
    '- Review this manifest before importing, exporting, syncing, or deleting the original export.',
  ].join('\n')
}

/** Builds redacted source-to-destination rows for the import autopsy UI. */
export function buildExactManifestRows(
  result: MarkdownFolderImportPreviewResult,
  vaultPath: string,
): ImportAutopsyManifestRowView[] {
  return (result.manifest_rows ?? []).slice(0, 8).map((row) => ({
    destination: manifestDestination(row, vaultPath),
    detail: sanitizeManifestText(row.detail, vaultPath, [row.source_path, row.destination_path]),
    kind: manifestKind(row.kind),
    source: compactSourcePath(row.source_path),
    tone: row.kind === 'withheld' ? 'warn' : 'default',
  }))
}

/** Builds the local-only timeline narrative for an import preview. */
export function buildTimelineSteps(
  preview: ImportAutopsyPreviewState,
  vaultPath: string,
): ImportAutopsyTimelineStep[] {
  const result = preview.result
  const sourceLabel = importPreviewLabel(preview.sourceId)
  const destination = destinationSummary(result.planned_import_root, vaultPath)
  return [
    { label: 'Source', value: `${sourceLabel} selected: ${compactSourcePath(result.source_path)}` },
    { label: 'Destination', value: destination.value, tone: destination.tone },
    { label: 'File Plan', value: `${countSummary(result.notes_to_copy, 'note')} queued for Markdown copy.` },
    { label: 'Metadata Map', value: metadataSummary(result) },
    { label: 'Attachments', value: attachmentSummary(result) },
    {
      label: 'Locality Firewall',
      value: withheldSummary(result),
      tone: result.skipped_files > 0 || result.failed_files > 0 ? 'warn' : 'default',
    },
    {
      label: 'Local Report',
      value: localReportSummary(result, destination.insideVault),
      tone: destination.insideVault ? 'default' : 'warn',
    },
  ]
}

/** Names the import source in user-facing preview copy. */
export function importPreviewLabel(sourceId: ImportAutopsyPreviewState['sourceId']): string {
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

/** Builds the top-level no-write preview buckets. */
export function buildPreflightBuckets(result: MarkdownFolderImportPreviewResult): ImportAutopsyPreflightBucket[] {
  const guardedCount = result.skipped_files + result.failed_files
  return [
    {
      label: 'Files',
      value: countSummary(result.notes_to_copy, 'note'),
      detail: 'Markdown entries planned for vault copy.',
    },
    {
      label: 'Metadata',
      value: 'frontmatter map',
      detail: 'Source metadata becomes visible Markdown/frontmatter, not hidden state.',
    },
    {
      label: 'Attachments',
      value: countSummary(result.assets_to_copy, 'asset'),
      detail: 'Referenced media is staged beside imported notes when present.',
    },
    {
      label: 'Withheld',
      value: guardedCount > 0 ? countSummary(guardedCount, 'guarded item') : 'none blocked',
      detail: result.writes_local_only_report
        ? 'Skips, failures, and audit report stay inside the local import lane.'
        : 'No skipped or failed files in this preview.',
      tone: guardedCount > 0 ? 'warn' : 'default',
    },
  ]
}

/** Builds an aria-live status summary for the import preview. */
export function livePreviewSummary(
  sourceLabel: string,
  result: MarkdownFolderImportPreviewResult,
  isRefreshing: boolean,
): string {
  const staleNote = isRefreshing ? ' A newer import preview is running.' : ''
  return `${sourceLabel} import preview ready: ${countSummary(result.notes_to_copy, 'note')}, ${
    countSummary(result.assets_to_copy, 'asset')
  }; ${skippedSummary(result)}${staleNote}`
}

function manifestDestination(row: ImportAutopsyManifestRow, vaultPath: string): string {
  if (!row.destination_path) return 'withheld'
  return compactVaultPath(row.destination_path, vaultPath) ?? (basename(row.destination_path) || 'planned destination')
}

function manifestKind(kind: ImportAutopsyManifestRow['kind']): string {
  if (kind === 'asset') return 'Asset'
  if (kind === 'metadata') return 'Metadata'
  if (kind === 'withheld') return 'Withheld'
  return 'Note'
}

function metadataSummary(result: MarkdownFolderImportPreviewResult): string {
  const report = result.writes_local_only_report ? 'local-only import report planned' : 'no report needed'
  return `Frontmatter and source metadata stay inspectable; ${report}.`
}

function attachmentSummary(result: MarkdownFolderImportPreviewResult): string {
  if (result.assets_to_copy === 0) return 'No attachments will be copied for this preview.'
  return `${countSummary(result.assets_to_copy, 'asset')} queued beside imported notes.`
}

function withheldSummary(result: MarkdownFolderImportPreviewResult): string {
  if (result.skipped_files === 0 && result.failed_files === 0) {
    return result.writes_local_only_report
      ? 'No file is withheld; the local-only audit report is still planned.'
      : 'No withheld local-only content in this preview.'
  }
  return `${skippedSummary(result)} Skipped or failed content will not be imported silently.`
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

function sanitizeManifestText(text: string, vaultPath: string, knownPaths: Array<string | null | undefined>): string {
  const redactedKnownPaths = replaceKnownManifestPaths(text, vaultPath, knownPaths)
  const redactedQuotedPaths = redactedKnownPaths.replace(
    /(["'`])([A-Za-z]:\\[^"'`\r\n]+|\/(?:Users|Volumes|private|tmp|var)\/[^"'`\r\n]+)\1/gu,
    (_match, quote: string, rawPath: string) => {
      const compact = compactVaultPath(rawPath, vaultPath) ?? basename(rawPath) ?? 'local path'
      return `${quote}${compact}${quote}`
    },
  )
  return redactedQuotedPaths
    .split(/\s+/u)
    .map((token) => sanitizeManifestToken(token, vaultPath))
    .join(' ')
}

function replaceKnownManifestPaths(
  text: string,
  vaultPath: string,
  knownPaths: Array<string | null | undefined>,
): string {
  return [...new Set(knownPaths.filter((path): path is string => Boolean(path?.trim())))]
    .sort((left, right) => right.length - left.length)
    .reduce((current, rawPath) => {
      const compact = compactVaultPath(rawPath, vaultPath) ?? basename(rawPath) ?? 'local path'
      const normalizedPath = normalizePath(rawPath)
      const replacedRaw = current.split(rawPath).join(compact)
      return normalizedPath === rawPath ? replacedRaw : replacedRaw.split(normalizedPath).join(compact)
    }, text)
}

function sanitizeManifestToken(token: string, vaultPath: string): string {
  const match = token.match(/[`"']?([A-Za-z]:\\[^\s`"']+|\/(?:Users|Volumes|private|tmp|var)\/[^\s`"']+)[`"']?/u)
  if (!match) return token
  const rawPath = match[1]
  const compact = compactVaultPath(rawPath, vaultPath) ?? basename(rawPath) ?? 'local path'
  return token.replace(rawPath, compact)
}

function basename(path: string): string {
  return path.split(/[\\/]/u).filter(Boolean).pop() ?? ''
}

function normalizePath(path: string): string {
  return path.replace(/[\\/]+/gu, '/').replace(/\/$/u, '')
}
