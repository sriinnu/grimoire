import { createTauriChannel, invoke } from '../lib/tauriRuntime'
import { isTauri, mockInvoke } from '../mock-tauri'
import type { MarkdownZipExportResult } from '../lib/vaultPortability'
import {
  portabilityCapsuleFormatLabel,
  type PortabilityCapsuleFormat,
  type PortabilityCapsulePreviewResult,
} from '../lib/portabilityCapsule'
import { pickFolder, pickSaveFile } from './vault-dialog'

export type VaultExportProgressEvent =
  | { event: 'Started'; data: { totalFiles: number } }
  | { event: 'Progress'; data: { processedFiles: number; totalFiles: number; currentPath: string } }
  | { event: 'Cancelled' }
  | { event: 'Finished'; data: { result: MarkdownZipExportResult } }

/** Opens a save dialog for a portable Markdown ZIP export. */
export function pickMarkdownZipExportTarget(): Promise<string | null> {
  return pickSaveFile('Export Markdown ZIP', 'grimoire-vault.zip', [
    { name: 'Markdown ZIP', extensions: ['zip'] },
  ])
}

/** Opens a save dialog for a human-diffable JSON portability capsule. */
export function pickJsonSnapshotExportTarget(): Promise<string | null> {
  return pickSaveFile('Export JSON snapshot', 'grimoire-vault.json', [
    { name: 'JSON snapshot', extensions: ['json'] },
  ])
}

/** Opens a save dialog for a local SQLite portability capsule. */
export function pickSqliteSnapshotExportTarget(): Promise<string | null> {
  return pickSaveFile('Export SQLite snapshot', 'grimoire-vault.sqlite', [
    { name: 'SQLite snapshot', extensions: ['sqlite', 'db'] },
  ])
}

/** Exports the current vault to a portable Markdown ZIP archive. */
export function exportMarkdownZip(
  vaultPath: string,
  targetPath: string,
): Promise<MarkdownZipExportResult> {
  const args = { vaultPath, targetPath }
  return isTauri()
    ? invoke<MarkdownZipExportResult>('export_markdown_zip', args)
    : mockInvoke<MarkdownZipExportResult>('export_markdown_zip', args)
}

/** Previews a JSON or SQLite portability capsule before it writes. */
export function previewPortabilityCapsule(
  vaultPath: string,
  format: PortabilityCapsuleFormat,
): Promise<PortabilityCapsulePreviewResult> {
  const args = { vaultPath, format }
  return isTauri()
    ? invoke<PortabilityCapsulePreviewResult>('preview_portability_capsule', args)
    : mockInvoke<PortabilityCapsulePreviewResult>('preview_portability_capsule', args)
}

/** Exports a JSON or SQLite portability capsule from the current vault. */
export function exportPortabilityCapsule(
  vaultPath: string,
  targetPath: string,
  format: PortabilityCapsuleFormat,
  previewSignature: string,
): Promise<MarkdownZipExportResult> {
  const args = { vaultPath, targetPath, format, previewSignature }
  return isTauri()
    ? invoke<MarkdownZipExportResult>('export_portability_capsule', args)
    : mockInvoke<MarkdownZipExportResult>('export_portability_capsule', args)
}

/** Exports the vault to Markdown ZIP while reporting cancellable progress. */
export async function exportMarkdownZipWithProgress(
  vaultPath: string,
  targetPath: string,
  operationId: string,
  onEvent: (event: VaultExportProgressEvent) => void,
): Promise<MarkdownZipExportResult> {
  if (!isTauri()) return runMockMarkdownZipExportWithProgress(vaultPath, targetPath, onEvent)

  const channel = await createTauriChannel<VaultExportProgressEvent>()
  let finishedResult: MarkdownZipExportResult | null = null
  channel.onmessage = (event) => {
    if (event.event === 'Finished') finishedResult = event.data.result
    onEvent(event)
  }

  await invoke<void>('export_markdown_zip_with_progress', {
    vaultPath,
    targetPath,
    operationId,
    onEvent: channel,
  })

  if (!finishedResult) throw new Error('Markdown ZIP export finished without a report')
  return finishedResult
}

/** Opens a folder picker for creating a browsable static HTML archive. */
export async function pickStaticHtmlArchiveTarget(): Promise<string | null> {
  const parent = await pickFolder('Choose where to create HTML archive')
  if (!parent) return null
  return `${parent.replace(/[\\/]+$/, '')}/grimoire-html-archive`
}

/** Exports the current vault to a browsable static HTML archive folder. */
export function exportStaticHtmlArchive(
  vaultPath: string,
  targetPath: string,
): Promise<MarkdownZipExportResult> {
  const args = { vaultPath, targetPath }
  return isTauri()
    ? invoke<MarkdownZipExportResult>('export_static_html_archive', args)
    : mockInvoke<MarkdownZipExportResult>('export_static_html_archive', args)
}

/** Exports the vault to static HTML while reporting cancellable progress. */
export async function exportStaticHtmlArchiveWithProgress(
  vaultPath: string,
  targetPath: string,
  operationId: string,
  onEvent: (event: VaultExportProgressEvent) => void,
): Promise<MarkdownZipExportResult> {
  if (!isTauri()) return runMockExportWithProgress('export_static_html_archive', vaultPath, targetPath, 'index.html', onEvent)

  const channel = await createTauriChannel<VaultExportProgressEvent>()
  let finishedResult: MarkdownZipExportResult | null = null
  channel.onmessage = (event) => {
    if (event.event === 'Finished') finishedResult = event.data.result
    onEvent(event)
  }

  await invoke<void>('export_static_html_archive_with_progress', {
    vaultPath,
    targetPath,
    operationId,
    onEvent: channel,
  })

  if (!finishedResult) throw new Error('Static HTML export finished without a report')
  return finishedResult
}

/** Builds concise user feedback for a completed Markdown ZIP export. */
export function formatMarkdownZipExportToast(result: MarkdownZipExportResult): string {
  const fileLabel = result.files_exported === 1 ? 'file' : 'files'
  return `Exported ${result.files_exported} ${fileLabel} to Markdown ZIP${withheldSuffix(result)}`
}

/** Builds concise user feedback for a completed static HTML export. */
export function formatStaticHtmlExportToast(result: MarkdownZipExportResult): string {
  const fileLabel = result.files_exported === 1 ? 'file' : 'files'
  return `Exported ${result.files_exported} ${fileLabel} to static HTML${withheldSuffix(result)}`
}

/** Builds concise user feedback for a reviewed capsule preview. */
export function formatPortabilityCapsulePreviewToast(
  result: PortabilityCapsulePreviewResult,
): string {
  const label = portabilityCapsuleFormatLabel(result.format)
  const fileLabel = result.files_exportable === 1 ? 'file' : 'files'
  return `Previewed ${label}: ${result.files_exportable} ${fileLabel} exportable${withheldPreviewSuffix(result)}`
}

/** Builds concise user feedback for a completed capsule export. */
export function formatPortabilityCapsuleExportToast(
  result: MarkdownZipExportResult,
  format: PortabilityCapsuleFormat,
): string {
  const label = portabilityCapsuleFormatLabel(format)
  const fileLabel = result.files_exported === 1 ? 'file' : 'files'
  return `Exported ${result.files_exported} ${fileLabel} to ${label}${withheldSuffix(result)}`
}

function withheldSuffix(result: MarkdownZipExportResult): string {
  if (result.skipped_files <= 0) return ''
  const fileLabel = result.skipped_files === 1 ? 'file' : 'files'
  return `; withheld ${result.skipped_files} local-only ${fileLabel}`
}

function withheldPreviewSuffix(result: PortabilityCapsulePreviewResult): string {
  if (result.skipped_files <= 0) return ''
  const fileLabel = result.skipped_files === 1 ? 'file' : 'files'
  return `; will withhold ${result.skipped_files} local-only ${fileLabel}`
}

async function runMockMarkdownZipExportWithProgress(
  vaultPath: string,
  targetPath: string,
  onEvent: (event: VaultExportProgressEvent) => void,
): Promise<MarkdownZipExportResult> {
  return runMockExportWithProgress('export_markdown_zip', vaultPath, targetPath, 'grimoire-vault.zip', onEvent)
}

async function runMockExportWithProgress(
  command: 'export_markdown_zip' | 'export_static_html_archive',
  vaultPath: string,
  targetPath: string,
  currentPath: string,
  onEvent: (event: VaultExportProgressEvent) => void,
): Promise<MarkdownZipExportResult> {
  onEvent({ event: 'Started', data: { totalFiles: 1 } })
  const result = await mockInvoke<MarkdownZipExportResult>(command, {
    vaultPath,
    targetPath,
  })
  const totalFiles = Math.max(1, result.files_exported)
  onEvent({
    event: 'Progress',
    data: { processedFiles: result.files_exported, totalFiles, currentPath },
  })
  onEvent({ event: 'Finished', data: { result } })
  return result
}
