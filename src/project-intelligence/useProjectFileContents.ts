import { useEffect, useMemo, useRef, useState } from 'react'
import { invoke } from '../lib/tauriRuntime'
import { isTauri, mockInvoke } from '../mock-tauri'
import type { SidebarSelection, VaultEntry } from '../types'
import { shouldScanProjectFile } from './issueParser'

const MAX_PROJECT_FILES = 30
const MAX_PROJECT_FILE_SIZE = 500_000
const EMPTY_CONTENT_BY_PATH: ReadonlyMap<string, string> = new Map()

export interface ProjectFileContentsState {
  /** Full file content keyed by absolute vault entry path. */
  contentByPath: ReadonlyMap<string, string>
  /** Whether a folder content scan is currently running. */
  loading: boolean
  /** Number of eligible files skipped because the folder is too large. */
  skippedCount: number
}

function isReadableProjectEntry(entry: VaultEntry): boolean {
  if (entry.archived || entry.fileKind === 'binary') return false
  if (!shouldScanProjectFile(entry.path.replace(/\\/g, '/'))) return false
  return entry.fileSize <= MAX_PROJECT_FILE_SIZE
}

function isEntryInFolder(entry: VaultEntry, folderPath: string): boolean {
  const normalized = entry.path.replace(/\\/g, '/')
  return normalized.includes(`/${folderPath}/`) || normalized.startsWith(`${folderPath}/`)
}

function projectEntriesForSelection(
  entries: VaultEntry[],
  selection: SidebarSelection,
): { selectedEntries: VaultEntry[]; skippedCount: number } {
  if (selection.kind !== 'folder') return { selectedEntries: [], skippedCount: 0 }
  const readableEntries = entries
    .filter((entry) => isEntryInFolder(entry, selection.path))
    .filter(isReadableProjectEntry)
  return {
    selectedEntries: readableEntries.slice(0, MAX_PROJECT_FILES),
    skippedCount: Math.max(0, readableEntries.length - MAX_PROJECT_FILES),
  }
}

/**
 * Reads a project file through the same Tauri/mock bridge used by the scanner.
 */
export function readProjectFileContent(path: string): Promise<string> {
  const args = { path }
  return isTauri()
    ? invoke<string>('get_note_content', args)
    : mockInvoke<string>('get_note_content', args)
}

/**
 * Loads bounded full-file content for the selected folder so project
 * intelligence can scan real Markdown and source comments instead of snippets.
 */
export function useProjectFileContents(
  entries: VaultEntry[],
  selection: SidebarSelection,
  enabled = false,
): ProjectFileContentsState {
  const { selectedEntries, skippedCount } = useMemo(
    () => projectEntriesForSelection(entries, selection),
    [entries, selection],
  )
  const selectedEntriesRef = useRef(selectedEntries)
  const [contentByPath, setContentByPath] = useState<ReadonlyMap<string, string>>(new Map())
  const [loading, setLoading] = useState(false)
  const signature = selectedEntries.map((entry) => `${entry.path}:${entry.modifiedAt ?? 0}`).join('|')

  useEffect(() => {
    selectedEntriesRef.current = selectedEntries
  }, [selectedEntries])

  useEffect(() => {
    let cancelled = false
    const entriesToLoad = selectedEntriesRef.current
    if (!enabled || entriesToLoad.length === 0) {
      return () => { cancelled = true }
    }

    queueMicrotask(() => {
      if (!cancelled) setLoading(true)
    })
    Promise.all(
      entriesToLoad.map(async (entry) => {
        try {
          return [entry.path, await readProjectFileContent(entry.path)] as const
        } catch {
          return [entry.path, null] as const
        }
      }),
    ).then((results) => {
      if (cancelled) return
      setContentByPath(
        new Map(
          results
            .filter((result): result is readonly [string, string] => result[1] !== null)
            .map(([path, content]) => [path, content]),
        ),
      )
      setLoading(false)
    })

    return () => { cancelled = true }
  }, [enabled, signature])

  return {
    contentByPath: enabled && selectedEntries.length > 0 ? contentByPath : EMPTY_CONTENT_BY_PATH,
    loading: enabled && selectedEntries.length > 0 ? loading : false,
    skippedCount,
  }
}
