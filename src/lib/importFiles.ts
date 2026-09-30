import type { SidebarSelection } from '../types'

/** One file after import, as the Rust side reports it. */
export interface ImportedFile {
  source: string
  path: string
  kind: 'note' | 'attachment' | 'duplicate'
}

/** The folder an import lands in: the selected sidebar folder, else the vault root (null). */
export function importTargetFolder(selection: SidebarSelection | null | undefined): string | null {
  if (selection && selection.kind === 'folder' && selection.path) return selection.path
  return null
}

/** The last path segment, for toasts. */
export function folderLabel(folder: string | null, vaultPath: string): string {
  const path = folder ?? vaultPath
  const segment = path.replace(/[\\/]+$/u, '').split(/[\\/]/u).pop()
  return segment || 'the vault'
}

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`
}

/** One line for the toast: what came in, what was already there. */
export function summarizeImport(results: ImportedFile[], folder: string | null, vaultPath: string): string {
  const notes = results.filter((file) => file.kind === 'note').length
  const attachments = results.filter((file) => file.kind === 'attachment').length
  const duplicates = results.filter((file) => file.kind === 'duplicate').length
  const parts: string[] = []
  if (notes) parts.push(plural(notes, 'note'))
  if (attachments) parts.push(plural(attachments, 'attachment'))
  const where = folderLabel(folder, vaultPath)
  let line = parts.length ? `Imported ${parts.join(' and ')} into ${where}` : `Nothing new to import into ${where}`
  if (duplicates) line += ` · ${plural(duplicates, 'file')} already there`
  return line
}

/** Absolute paths from the native picker, normalized from file:// URLs where needed. */
export function normalizePickedPaths(selected: string | string[] | null): string[] {
  const list = selected === null ? [] : Array.isArray(selected) ? selected : [selected]
  return list
    .filter((value): value is string => typeof value === 'string' && value.length > 0)
    .map((value) => {
      if (!value.startsWith('file://')) return value
      try {
        const parsed = new URL(value)
        const decoded = decodeURIComponent(parsed.pathname)
        return /^\/[A-Za-z]:/u.test(decoded) ? decoded.slice(1) : decoded
      } catch {
        return value
      }
    })
}

/** Opens the native multi-file picker. Returns [] when cancelled. */
export async function pickFilesToImport(): Promise<string[]> {
  const { open } = await import('@tauri-apps/plugin-dialog')
  const selected = await open({ directory: false, multiple: true, title: 'Import into Grimoire' })
  return normalizePickedPaths(selected)
}
