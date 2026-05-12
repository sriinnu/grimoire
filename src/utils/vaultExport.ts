import { invoke } from '@tauri-apps/api/core'
import { isTauri, mockInvoke } from '../mock-tauri'
import type { MarkdownZipExportResult } from '../lib/vaultPortability'
import { pickSaveFile } from './vault-dialog'

/** Opens a save dialog for a portable Markdown ZIP export. */
export function pickMarkdownZipExportTarget(): Promise<string | null> {
  return pickSaveFile('Export Markdown ZIP', 'grimoire-vault.zip', [
    { name: 'Markdown ZIP', extensions: ['zip'] },
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

/** Builds concise user feedback for a completed Markdown ZIP export. */
export function formatMarkdownZipExportToast(result: MarkdownZipExportResult): string {
  const fileLabel = result.files_exported === 1 ? 'file' : 'files'
  return `Exported ${result.files_exported} ${fileLabel} to Markdown ZIP`
}
