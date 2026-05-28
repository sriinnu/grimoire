import { useCallback, useEffect, useRef } from 'react'
import { trackEvent } from '../lib/telemetry'
import type { VaultEntry } from '../types'
import {
  buildNewEntry,
  buildNoteContent,
  resolveTemplate,
  slugify,
  slugToTitle,
} from './noteCreationModel'
import { addEntryWithMock } from './noteCreationPersistence'

interface ImmediateCreateDeps {
  entries: VaultEntry[]
  vaultPath: string
  pendingSlugs: Set<string>
  openTabWithContent: (entry: VaultEntry, content: string) => void
  addEntry: (entry: VaultEntry) => void
  trackUnsaved?: (path: string) => void
  markContentPending?: (path: string, content: string) => void
}

interface ImmediateCreateRequest {
  type?: string
}

export interface ImmediateCreateQueueConfig {
  entries: VaultEntry[]
  vaultPath: string
  addEntry: (entry: VaultEntry) => void
  openTabWithContent: (entry: VaultEntry, content: string) => void
  trackUnsaved?: (path: string) => void
  markContentPending?: (path: string, content: string) => void
}

// Rapid Cmd+N bursts can outpace the note-list render path on desktop. Keep
// the first create immediate, then serialize the rest so each new note settles
// before the next one is opened.
export const RAPID_CREATE_NOTE_SETTLE_MS = 200

/** Generate a unique untitled filename using a timestamp. */
function generateUntitledFilename(entries: VaultEntry[], type: string, pendingSlugs?: Set<string>): string {
  const ts = Math.floor(Date.now() / 1000)
  const typeSlug = type === 'Note' ? 'note' : slugify(type)
  const base = `untitled-${typeSlug}-${ts}`
  const existingSlugs = new Set(entries.map((entry) => entry.filename.replace(/\.md$/, '')))

  let candidate = base
  let suffix = 2
  while (existingSlugs.has(candidate) || pendingSlugs?.has(candidate)) {
    candidate = `${base}-${suffix}`
    suffix += 1
  }

  pendingSlugs?.add(candidate)
  return candidate
}

/** Dispatch focus-editor event with perf timing marker. */
function signalFocusEditor(opts?: { selectTitle?: boolean; path?: string }): void {
  window.dispatchEvent(new CustomEvent('grimoire:focus-editor', {
    detail: { t0: performance.now(), selectTitle: opts?.selectTitle ?? false, path: opts?.path ?? null },
  }))
}

/** Create an untitled note without persisting to disk; the editor save path owns durability. */
function createNoteImmediate(deps: ImmediateCreateDeps, type?: string): void {
  const noteType = type || 'Note'
  const slug = generateUntitledFilename(deps.entries, noteType, deps.pendingSlugs)
  const title = slugToTitle(slug)
  const template = resolveTemplate({ entries: deps.entries, typeName: noteType })
  const status = null
  const entry = buildNewEntry({ path: `${deps.vaultPath}/${slug}.md`, slug, title, type: noteType, status })
  const content = buildNoteContent({ title: null, type: noteType, status, template, initialEmptyHeading: true })
  deps.openTabWithContent(entry, content)
  addEntryWithMock(entry, content, deps.addEntry)
  deps.trackUnsaved?.(entry.path)
  deps.markContentPending?.(entry.path, content)
  signalFocusEditor({ path: entry.path, selectTitle: true })
}

/** Queue rapid immediate note creates so desktop focus/open timing stays stable. */
export function useImmediateCreateQueue(config: ImmediateCreateQueueConfig): (type?: string) => void {
  const pendingSlugsRef = useRef<Set<string>>(new Set())
  const queuedImmediateCreatesRef = useRef<ImmediateCreateRequest[]>([])
  const immediateCreateLockedRef = useRef(false)
  const immediateCreateTimerRef = useRef<number | null>(null)
  const latestDepsRef = useRef<ImmediateCreateDeps | null>(null)

  const syncDeps = useCallback(() => {
    latestDepsRef.current = {
      entries: config.entries,
      vaultPath: config.vaultPath,
      pendingSlugs: pendingSlugsRef.current,
      openTabWithContent: config.openTabWithContent,
      addEntry: config.addEntry,
      trackUnsaved: config.trackUnsaved,
      markContentPending: config.markContentPending,
    }
  }, [
    config.entries,
    config.vaultPath,
    config.openTabWithContent,
    config.addEntry,
    config.trackUnsaved,
    config.markContentPending,
  ])

  useEffect(() => {
    syncDeps()
  }, [syncDeps])

  const executeRequest = useCallback((request: ImmediateCreateRequest) => {
    const deps = latestDepsRef.current
    if (!deps) return
    createNoteImmediate(deps, request.type)
    trackEvent('note_created', {
      has_type: request.type ? 1 : 0,
      creation_path: request.type ? 'type_section' : 'cmd_n',
    })
  }, [])

  const scheduleQueuedBurst = useCallback(function scheduleQueuedBurst() {
    if (immediateCreateTimerRef.current !== null) return

    immediateCreateTimerRef.current = window.setTimeout(() => {
      immediateCreateTimerRef.current = null
      const next = queuedImmediateCreatesRef.current.shift()
      if (!next) {
        immediateCreateLockedRef.current = false
        return
      }

      executeRequest(next)
      scheduleQueuedBurst()
    }, RAPID_CREATE_NOTE_SETTLE_MS)
  }, [executeRequest])

  useEffect(() => () => {
    if (immediateCreateTimerRef.current !== null) {
      window.clearTimeout(immediateCreateTimerRef.current)
    }
  }, [])

  return useCallback((type?: string) => {
    syncDeps()
    const request = { type }
    if (immediateCreateLockedRef.current) {
      queuedImmediateCreatesRef.current.push(request)
      return
    }

    immediateCreateLockedRef.current = true
    executeRequest(request)
    scheduleQueuedBurst()
  }, [syncDeps, executeRequest, scheduleQueuedBurst])
}
