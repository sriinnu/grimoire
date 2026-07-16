import { useCallback, useEffect, useRef, useState } from 'react'
import type { VaultEntry } from '../types'
import { invoke } from '../lib/tauriRuntime'
import { isTauri, mockInvoke } from '../mock-tauri'

export interface UnlinkedMention {
  /** Absolute path of the source note containing the mention. */
  path: string
  /** Display title of the source note. */
  title: string
  /** 1-based line number of the mention. */
  line: number
  /** The matched line, trimmed and capped for preview display. */
  context: string
  /** The exact matched text, preserving the source note's casing. */
  matchedText: string
}

type MentionEntry = Pick<VaultEntry, 'path' | 'title' | 'aliases' | 'modifiedAt'>

/** A scan result pinned to the note (path + title) it was produced for. */
interface ScanResult {
  entryPath: string
  targetTitle: string
  hits: UnlinkedMention[]
}

const DEBOUNCE_MS = 250
const NO_MENTIONS: UnlinkedMention[] = []

function mentionCall<T>(command: string, args: Record<string, unknown>): Promise<T> {
  return isTauri() ? invoke<T>(command, args) : mockInvoke<T>(command, args)
}

function relativeToVault(path: string, vaultPath: string): string {
  const prefix = `${vaultPath.replace(/\/+$/u, '')}/`
  return path.startsWith(prefix) ? path.slice(prefix.length) : path
}

/**
 * Scans the vault (in Rust) for unlinked mentions of the active note's title
 * or aliases. `linkMention` rewrites the source note on disk, notifies the
 * vault refresh path, and re-scans. Degrades to an empty list when the scan
 * command is unavailable (browser/mock mode).
 *
 * Scans are keyed on stable entry values (path, title, aliases, modifiedAt)
 * rather than object identity, so agent writes that mint fresh VaultEntry
 * objects for unchanged notes neither clear the list nor re-run the scan.
 */
export function useUnlinkedMentions(
  entry: MentionEntry | null,
  vaultPath?: string,
  onFileModified?: (relativePath: string) => void,
) {
  const [scan, setScan] = useState<ScanResult | null>(null)
  const scanGenRef = useRef(0)
  const entryRef = useRef(entry)
  entryRef.current = entry

  const fetchMentions = useCallback(async (entryPath: string) => {
    const current = entryRef.current
    if (!current || !vaultPath || current.path !== entryPath) return
    scanGenRef.current++
    const gen = scanGenRef.current
    const targetTitle = current.title
    const stillCurrent = () =>
      gen === scanGenRef.current && entryRef.current?.path === entryPath
    try {
      const hits = await mentionCall<UnlinkedMention[]>('find_note_mentions', {
        vaultPath,
        notePath: entryPath,
        title: targetTitle,
        aliases: current.aliases ?? [],
      })
      if (stillCurrent()) setScan({ entryPath, targetTitle, hits })
    } catch {
      if (stillCurrent()) setScan(null)
    }
  }, [vaultPath])

  const entryPath = entry?.path ?? null
  const entryTitle = entry?.title ?? null
  const entryAliasesKey = entry?.aliases?.join('\u0000') ?? ''
  const entryModifiedAt = entry?.modifiedAt ?? null

  useEffect(() => {
    scanGenRef.current++
    setScan(null)
    if (!entryPath || !vaultPath) return
    const timer = setTimeout(() => { void fetchMentions(entryPath) }, DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [entryPath, entryTitle, entryAliasesKey, entryModifiedAt, vaultPath, fetchMentions])

  const linkMention = useCallback(async (mention: UnlinkedMention) => {
    if (!scan || !vaultPath) return
    const { entryPath: scannedPath, targetTitle } = scan
    // The mention belongs to the note whose scan produced it; if the active
    // note changed since, linking would write the wrong wikilink target.
    if (entryRef.current?.path !== scannedPath) return
    try {
      await mentionCall('link_unlinked_mention', {
        vaultPath,
        sourcePath: mention.path,
        targetTitle,
        matchedText: mention.matchedText,
        line: mention.line,
      })
      onFileModified?.(relativeToVault(mention.path, vaultPath))
    } catch {
      // The re-scan below drops mentions that are stale or failed to link.
    }
    // Bail if the active note changed while the link call was in flight —
    // otherwise the trailing re-scan would overwrite the new note's list.
    if (entryRef.current?.path !== scannedPath) return
    await fetchMentions(scannedPath)
  }, [scan, vaultPath, onFileModified, fetchMentions])

  return { mentions: scan?.hits ?? NO_MENTIONS, linkMention }
}
