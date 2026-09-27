import { invoke } from '../tauriRuntime'
import { isTauri, mockInvoke } from '../../mock-tauri'
import type { VaultEntry } from '../../types'
import { pickSaveFile } from '../../utils/vault-dialog'

export type ExportOutcome = { status: 'saved'; path: string } | { status: 'cancelled' } | { status: 'downloaded'; filename: string }

function readNoteContent(path: string): Promise<string> {
  return isTauri() ? invoke<string>('get_note_content', { path }) : mockInvoke<string>('get_note_content', { path })
}

/** A filename the OS will accept, from a title. */
export function exportFilename(title: string, extension = 'html'): string {
  const base = title.trim().replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').slice(0, 120) || 'note'
  return `${base}.${extension}`
}

function downloadInBrowser(filename: string, html: string): void {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * Render the note as a standalone HTML document and save it where the user
 * says. Native: a save dialog and a write to that path. Browser: a download.
 */
export async function exportNoteAsHtml(entry: Pick<VaultEntry, 'path' | 'title'>): Promise<ExportOutcome> {
  const [{ renderNoteHtml }, content] = await Promise.all([import('./renderNoteHtml'), readNoteContent(entry.path)])
  const html = renderNoteHtml({ title: entry.title, content })
  const filename = exportFilename(entry.title)

  if (!isTauri()) {
    downloadInBrowser(filename, html)
    return { status: 'downloaded', filename }
  }

  const target = await pickSaveFile('Export as HTML', filename, [{ name: 'HTML', extensions: ['html'] }])
  if (!target) return { status: 'cancelled' }
  const path = target.toLowerCase().endsWith('.html') || target.toLowerCase().endsWith('.htm') ? target : `${target}.html`
  await invoke('write_export_file', { path, contents: html })
  return { status: 'saved', path }
}

/** Print, or Save as PDF from the print dialog. The print stylesheet does the rest. */
export function printCurrentNote(): void {
  window.print()
}
