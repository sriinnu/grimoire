import { createTauriChannel, invoke } from '../lib/tauriRuntime'
import { isTauri, mockInvoke } from '../mock-tauri'
import type {
  MarkdownFolderImportPreviewResult,
  MarkdownFolderImportResult,
} from '../lib/vaultPortability'
import { pickFile, pickFolder } from './vault-dialog'

export type JournalImportSource = 'day-one' | 'journey' | 'apple-journal'
export type AppImportSource = 'obsidian' | 'notion-markdown' | 'notion-folder' | 'spanda'

export type MarkdownFolderImportProgressEvent =
  | { event: 'Started'; data: { totalFiles: number } }
  | { event: 'Progress'; data: { processedFiles: number; totalFiles: number; currentPath: string } }
  | { event: 'Cancelled' }
  | { event: 'Finished'; data: { result: MarkdownFolderImportResult } }

/** Opens a folder picker for importing a local Markdown app export. */
export function pickMarkdownImportFolder(): Promise<string | null> {
  return pickFolder('Import Markdown folder')
}

/** Opens a file picker for importing a portable Markdown ZIP export. */
export function pickMarkdownZipImportFile(): Promise<string | null> {
  return pickFile('Import Markdown ZIP', [{ name: 'Markdown ZIP', extensions: ['zip'] }])
}

/** Opens a folder picker for importing a Bear Markdown/TextBundle export. */
export function pickBearImportFolder(): Promise<string | null> {
  return pickFolder('Import Bear Markdown/TextBundle folder')
}

/** Opens a file picker for importing app journal exports. */
export function pickJournalImportSource(source: JournalImportSource): Promise<string | null> {
  const label = journalImportLabel(source)
  const extensions = source === 'apple-journal' ? ['zip', 'json', 'html', 'htm'] : ['zip', 'json']
  return pickFile(`Import ${label}`, [{ name: label, extensions }])
}

/** Opens the right picker for app-specific imports. */
export function pickAppImportSource(source: AppImportSource): Promise<string | null> {
  if (source === 'obsidian') return pickFolder('Import Obsidian vault')
  if (source === 'notion-markdown') {
    return pickFile('Import Notion Markdown ZIP', [
      { name: 'Notion Markdown ZIP', extensions: ['zip'] },
    ])
  }
  if (source === 'notion-folder') return pickFolder('Import Notion Markdown folder')
  return pickFile('Import Spanda export', [
    { name: 'Spanda JSON/ZIP export', extensions: ['json', 'zip'] },
  ])
}

/** Copies a local Markdown folder into the active vault. */
export function importMarkdownFolderIntoVault(
  vaultPath: string,
  sourcePath: string,
): Promise<MarkdownFolderImportResult> {
  const args = { vaultPath, sourcePath }
  return isTauri()
    ? invoke<MarkdownFolderImportResult>('import_markdown_folder', args)
    : mockInvoke<MarkdownFolderImportResult>('import_markdown_folder', args)
}

/** Copies a Markdown folder into the vault while reporting cancellable progress. */
export async function importMarkdownFolderIntoVaultWithProgress(
  vaultPath: string,
  sourcePath: string,
  operationId: string,
  onEvent: (event: MarkdownFolderImportProgressEvent) => void,
): Promise<MarkdownFolderImportResult> {
  if (!isTauri()) {
    return runMockMarkdownFolderImportWithProgress(vaultPath, sourcePath, onEvent)
  }

  const channel = await createTauriChannel<MarkdownFolderImportProgressEvent>()
  let finishedResult: MarkdownFolderImportResult | null = null
  channel.onmessage = (event) => {
    if (event.event === 'Finished') finishedResult = event.data.result
    onEvent(event)
  }

  await invoke<void>('import_markdown_folder_with_progress', {
    vaultPath,
    sourcePath,
    operationId,
    onEvent: channel,
  })

  if (!finishedResult) throw new Error('Markdown import finished without a report')
  return finishedResult
}

/** Requests cancellation for an active Markdown folder import operation. */
export function cancelMarkdownFolderImport(operationId: string): Promise<boolean> {
  const args = { operationId }
  return isTauri()
    ? invoke<boolean>('cancel_markdown_folder_import', args)
    : mockInvoke<boolean>('cancel_markdown_folder_import', args)
}

/** Requests cancellation for any active portability operation. */
export function cancelPortabilityOperation(operationId: string): Promise<boolean> {
  const args = { operationId }
  return isTauri()
    ? invoke<boolean>('cancel_portability_operation', args)
    : mockInvoke<boolean>('cancel_markdown_folder_import', args)
}

/** Previews a local Markdown/Bear folder import without writing to the vault. */
export function previewMarkdownFolderImport(
  vaultPath: string,
  sourcePath: string,
): Promise<MarkdownFolderImportPreviewResult> {
  const args = { vaultPath, sourcePath }
  return isTauri()
    ? invoke<MarkdownFolderImportPreviewResult>('preview_markdown_folder_import', args)
    : mockInvoke<MarkdownFolderImportPreviewResult>('preview_markdown_folder_import', args)
}

/** Previews a Markdown ZIP import without writing to the vault. */
export function previewMarkdownZipImport(
  vaultPath: string,
  sourcePath: string,
): Promise<MarkdownFolderImportPreviewResult> {
  const args = { vaultPath, sourcePath }
  return isTauri()
    ? invoke<MarkdownFolderImportPreviewResult>('preview_markdown_zip_import', args)
    : mockInvoke<MarkdownFolderImportPreviewResult>('preview_markdown_zip_import', args)
}

/** Extracts a Markdown ZIP export into the active vault. */
export function importMarkdownZipIntoVault(
  vaultPath: string,
  sourcePath: string,
): Promise<MarkdownFolderImportResult> {
  const args = { vaultPath, sourcePath }
  return isTauri()
    ? invoke<MarkdownFolderImportResult>('import_markdown_zip', args)
    : mockInvoke<MarkdownFolderImportResult>('import_markdown_zip', args)
}

/** Extracts a Markdown ZIP into the vault while reporting cancellable progress. */
export async function importMarkdownZipIntoVaultWithProgress(
  vaultPath: string,
  sourcePath: string,
  operationId: string,
  onEvent: (event: MarkdownFolderImportProgressEvent) => void,
): Promise<MarkdownFolderImportResult> {
  if (!isTauri()) {
    return runMockMarkdownZipImportWithProgress(vaultPath, sourcePath, onEvent)
  }

  const channel = await createTauriChannel<MarkdownFolderImportProgressEvent>()
  let finishedResult: MarkdownFolderImportResult | null = null
  channel.onmessage = (event) => {
    if (event.event === 'Finished') finishedResult = event.data.result
    onEvent(event)
  }

  await invoke<void>('import_markdown_zip_with_progress', {
    vaultPath,
    sourcePath,
    operationId,
    onEvent: channel,
  })

  if (!finishedResult) throw new Error('Markdown ZIP import finished without a report')
  return finishedResult
}

/** Converts a Day One or Journey export into Markdown notes in the active vault. */
export function importJournalExportIntoVault(
  vaultPath: string,
  sourcePath: string,
  sourceKind: JournalImportSource,
): Promise<MarkdownFolderImportResult> {
  const args = { vaultPath, sourcePath, sourceKind }
  return isTauri()
    ? invoke<MarkdownFolderImportResult>('import_journal_export', args)
    : mockInvoke<MarkdownFolderImportResult>('import_journal_export', args)
}

/** Converts a journal export into Markdown while reporting cancellable progress. */
export async function importJournalExportIntoVaultWithProgress(
  vaultPath: string,
  sourcePath: string,
  sourceKind: JournalImportSource,
  operationId: string,
  onEvent: (event: MarkdownFolderImportProgressEvent) => void,
): Promise<MarkdownFolderImportResult> {
  if (!isTauri()) {
    return runMockJournalImportWithProgress(vaultPath, sourcePath, sourceKind, onEvent)
  }

  const channel = await createTauriChannel<MarkdownFolderImportProgressEvent>()
  let finishedResult: MarkdownFolderImportResult | null = null
  channel.onmessage = (event) => {
    if (event.event === 'Finished') finishedResult = event.data.result
    onEvent(event)
  }

  await invoke<void>('import_journal_export_with_progress', {
    vaultPath,
    sourcePath,
    sourceKind,
    operationId,
    onEvent: channel,
  })

  if (!finishedResult) throw new Error('Journal import finished without a report')
  return finishedResult
}

/** Previews a journal export without writing to the active vault. */
export function previewJournalExportIntoVault(
  vaultPath: string,
  sourcePath: string,
  sourceKind: JournalImportSource,
): Promise<MarkdownFolderImportPreviewResult> {
  const args = { vaultPath, sourcePath, sourceKind }
  return isTauri()
    ? invoke<MarkdownFolderImportPreviewResult>('preview_journal_export', args)
    : mockInvoke<MarkdownFolderImportPreviewResult>('preview_journal_export', args)
}

/** Imports an app-specific export into the active vault. */
export function importAppExportIntoVault(
  vaultPath: string,
  sourcePath: string,
  sourceKind: AppImportSource,
): Promise<MarkdownFolderImportResult> {
  const args = { vaultPath, sourcePath, sourceKind: commandSourceKind(sourceKind) }
  return isTauri()
    ? invoke<MarkdownFolderImportResult>('import_app_export', args)
    : mockInvoke<MarkdownFolderImportResult>('import_app_export', args)
}

/** Imports an app-specific export while reporting cancellable progress. */
export async function importAppExportIntoVaultWithProgress(
  vaultPath: string,
  sourcePath: string,
  sourceKind: AppImportSource,
  operationId: string,
  onEvent: (event: MarkdownFolderImportProgressEvent) => void,
): Promise<MarkdownFolderImportResult> {
  if (!isTauri()) {
    return runMockAppImportWithProgress(vaultPath, sourcePath, sourceKind, onEvent)
  }

  const channel = await createTauriChannel<MarkdownFolderImportProgressEvent>()
  let finishedResult: MarkdownFolderImportResult | null = null
  channel.onmessage = (event) => {
    if (event.event === 'Finished') finishedResult = event.data.result
    onEvent(event)
  }

  await invoke<void>('import_app_export_with_progress', {
    vaultPath,
    sourcePath,
    sourceKind: commandSourceKind(sourceKind),
    operationId,
    onEvent: channel,
  })

  if (!finishedResult) throw new Error('App import finished without a report')
  return finishedResult
}

/** Previews an app-specific export without writing to the active vault. */
export function previewAppExportIntoVault(
  vaultPath: string,
  sourcePath: string,
  sourceKind: AppImportSource,
): Promise<MarkdownFolderImportPreviewResult> {
  const args = { vaultPath, sourcePath, sourceKind: commandSourceKind(sourceKind) }
  return isTauri()
    ? invoke<MarkdownFolderImportPreviewResult>('preview_app_export', args)
    : mockInvoke<MarkdownFolderImportPreviewResult>('preview_app_export', args)
}

function commandSourceKind(source: AppImportSource): string {
  return source === 'notion-folder' ? 'notion-markdown' : source
}

function journalImportLabel(source: JournalImportSource): string {
  if (source === 'day-one') return 'Day One JSON/ZIP export'
  if (source === 'apple-journal') return 'Apple Journal ZIP/HTML/JSON export'
  return 'Journey ZIP/JSON export'
}

async function runMockMarkdownFolderImportWithProgress(
  vaultPath: string,
  sourcePath: string,
  onEvent: (event: MarkdownFolderImportProgressEvent) => void,
): Promise<MarkdownFolderImportResult> {
  onEvent({ event: 'Started', data: { totalFiles: 1 } })
  const result = await mockInvoke<MarkdownFolderImportResult>('import_markdown_folder', {
    vaultPath,
    sourcePath,
  })
  const processedFiles = result.notes_copied + result.assets_copied
  const totalFiles = Math.max(1, processedFiles)
  onEvent({
    event: 'Progress',
    data: { processedFiles, totalFiles, currentPath: 'import-report.md' },
  })
  onEvent({ event: 'Finished', data: { result } })
  return result
}

async function runMockMarkdownZipImportWithProgress(
  vaultPath: string,
  sourcePath: string,
  onEvent: (event: MarkdownFolderImportProgressEvent) => void,
): Promise<MarkdownFolderImportResult> {
  onEvent({ event: 'Started', data: { totalFiles: 1 } })
  const result = await mockInvoke<MarkdownFolderImportResult>('import_markdown_zip', {
    vaultPath,
    sourcePath,
  })
  const processedFiles = result.notes_copied + result.assets_copied
  const totalFiles = Math.max(1, processedFiles)
  onEvent({
    event: 'Progress',
    data: { processedFiles, totalFiles, currentPath: 'import-report.md' },
  })
  onEvent({ event: 'Finished', data: { result } })
  return result
}

async function runMockAppImportWithProgress(
  vaultPath: string,
  sourcePath: string,
  sourceKind: AppImportSource,
  onEvent: (event: MarkdownFolderImportProgressEvent) => void,
): Promise<MarkdownFolderImportResult> {
  onEvent({ event: 'Started', data: { totalFiles: 1 } })
  const result = await mockInvoke<MarkdownFolderImportResult>('import_app_export', {
    vaultPath,
    sourcePath,
    sourceKind: commandSourceKind(sourceKind),
  })
  const processedFiles = result.notes_copied + result.assets_copied
  const totalFiles = Math.max(1, processedFiles)
  onEvent({
    event: 'Progress',
    data: { processedFiles, totalFiles, currentPath: `${sourceKind} import` },
  })
  onEvent({ event: 'Finished', data: { result } })
  return result
}

async function runMockJournalImportWithProgress(
  vaultPath: string,
  sourcePath: string,
  sourceKind: JournalImportSource,
  onEvent: (event: MarkdownFolderImportProgressEvent) => void,
): Promise<MarkdownFolderImportResult> {
  onEvent({ event: 'Started', data: { totalFiles: 1 } })
  const result = await mockInvoke<MarkdownFolderImportResult>('import_journal_export', {
    vaultPath,
    sourcePath,
    sourceKind,
  })
  const processedFiles = result.notes_copied + result.assets_copied
  const totalFiles = Math.max(1, processedFiles)
  onEvent({
    event: 'Progress',
    data: { processedFiles, totalFiles, currentPath: `${sourceKind} import` },
  })
  onEvent({ event: 'Finished', data: { result } })
  return result
}

/** Builds concise user feedback for a completed Markdown folder import. */
export function formatMarkdownImportToast(result: MarkdownFolderImportResult): string {
  const noteLabel = result.notes_copied === 1 ? 'note' : 'notes'
  const assetPart = result.assets_copied > 0
    ? ` and ${result.assets_copied} asset${result.assets_copied === 1 ? '' : 's'}`
    : ''
  const failurePart = result.failed_files > 0 ? `; ${result.failed_files} failed` : ''
  return `Imported ${result.notes_copied} ${noteLabel}${assetPart}${failurePart}`
}

/** Builds concise user feedback for an import autopsy preview. */
export function formatMarkdownImportPreviewToast(
  result: MarkdownFolderImportPreviewResult,
): string {
  const noteLabel = result.notes_to_copy === 1 ? 'note' : 'notes'
  const assetPart = result.assets_to_copy > 0
    ? `, ${result.assets_to_copy} asset${result.assets_to_copy === 1 ? '' : 's'}`
    : ''
  const skippedPart = result.skipped_files > 0 ? `, ${result.skipped_files} skipped` : ''
  const reportPart = result.writes_local_only_report ? '; local-only report will be written' : ''
  return `Preview: ${result.notes_to_copy} ${noteLabel}${assetPart}${skippedPart}${reportPart}`
}
