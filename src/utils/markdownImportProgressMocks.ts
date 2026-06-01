import type { MarkdownFolderImportResult } from '../lib/vaultPortability'
import { mockInvoke } from '../mock-tauri'
import type {
  AppImportSource,
  JournalImportSource,
  MarkdownFolderImportProgressEvent,
} from './markdownFolderImport'

type ProgressSink = (event: MarkdownFolderImportProgressEvent) => void

/** Simulates a cancellable Markdown folder import in browser tests. */
export async function runMockMarkdownFolderImportWithProgress(
  vaultPath: string,
  sourcePath: string,
  previewSignature: string,
  onEvent: ProgressSink,
): Promise<MarkdownFolderImportResult> {
  return runMockImportWithProgress(
    'import_markdown_folder',
    { vaultPath, sourcePath, previewSignature },
    'import-report.md',
    onEvent,
  )
}

/** Simulates a cancellable Markdown ZIP import in browser tests. */
export async function runMockMarkdownZipImportWithProgress(
  vaultPath: string,
  sourcePath: string,
  previewSignature: string,
  onEvent: ProgressSink,
): Promise<MarkdownFolderImportResult> {
  return runMockImportWithProgress(
    'import_markdown_zip',
    { vaultPath, sourcePath, previewSignature },
    'import-report.md',
    onEvent,
  )
}

/** Simulates a cancellable app import in browser tests. */
export async function runMockAppImportWithProgress(
  vaultPath: string,
  sourcePath: string,
  sourceKind: AppImportSource,
  commandSourceKind: string,
  previewSignature: string,
  onEvent: ProgressSink,
): Promise<MarkdownFolderImportResult> {
  return runMockImportWithProgress(
    'import_app_export',
    { vaultPath, sourcePath, sourceKind: commandSourceKind, previewSignature },
    `${sourceKind} import`,
    onEvent,
  )
}

/** Simulates a cancellable journal import in browser tests. */
export async function runMockJournalImportWithProgress(
  vaultPath: string,
  sourcePath: string,
  sourceKind: JournalImportSource,
  previewSignature: string,
  onEvent: ProgressSink,
): Promise<MarkdownFolderImportResult> {
  return runMockImportWithProgress(
    'import_journal_export',
    { vaultPath, sourcePath, sourceKind, previewSignature },
    `${sourceKind} import`,
    onEvent,
  )
}

async function runMockImportWithProgress(
  command: string,
  args: Record<string, string>,
  currentPath: string,
  onEvent: ProgressSink,
): Promise<MarkdownFolderImportResult> {
  onEvent({ event: 'Started', data: { totalFiles: 1 } })
  const result = await mockInvoke<MarkdownFolderImportResult>(command, args)
  const processedFiles = result.notes_copied + result.assets_copied
  const totalFiles = Math.max(1, processedFiles)
  onEvent({ event: 'Progress', data: { processedFiles, totalFiles, currentPath } })
  onEvent({ event: 'Finished', data: { result } })
  return result
}
