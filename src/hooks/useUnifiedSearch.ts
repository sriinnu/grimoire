import { useState, useRef, useEffect, useCallback } from 'react'
import type { SearchMode, SearchResult } from '../types'
import { invoke } from '../lib/tauriRuntime'
import { isTauri, mockInvoke } from '../mock-tauri'
import {
  buildChitraguptaContext,
  createChitraguptaRecallAttachment,
  type ChitraguptaRecallAttachment,
} from '../lib/chitraguptaContext'

interface SearchResultData {
  title: string
  path: string
  snippet: string
  snippet_matches?: { start: number; end: number }[]
  score: number
  note_type: string | null
  file_kind?: SearchResult['fileKind']
}

interface SearchResponseData {
  results: SearchResultData[]
  elapsed_ms: number
}

export interface SearchVaultScope {
  path: string
  label?: string
}

const DEBOUNCE_MS = 300

export interface SearchRecallState {
  status: 'ready' | 'loading' | 'unavailable'
  attachment: ChitraguptaRecallAttachment | null
}

export interface UseUnifiedSearchOptions {
  /**
   * 'hybrid' keeps the keyword scopes unchanged and adds the agent-backed
   * Chitragupta recall seam alongside them. 'semantic' is reserved and
   * behaves like 'keyword' until it is wired.
   */
  mode?: SearchMode
}

const EMPTY_RECALL: SearchRecallState = { status: 'ready', attachment: null }

function newRecallRequestId(): string {
  const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return `grimoire:search:${id}`
}

/** Native: the SQLite FTS index, ranked and highlighted; the walking scanner only if the index errors. */
async function searchCall(args: { vaultPath: string; query: string; mode: string; limit: number }): Promise<SearchResponseData> {
  if (!isTauri()) return mockInvoke<SearchResponseData>('search_vault', args)
  try {
    return await invoke<SearchResponseData>('index_search', { vaultPath: args.vaultPath, query: args.query, limit: args.limit })
  } catch (error) {
    console.warn('[search] index unavailable, scanning instead:', error)
    return invoke<SearchResponseData>('search_vault', args)
  }
}

function mapResults(raw: SearchResultData[], scope: SearchVaultScope): SearchResult[] {
  const seen = new Set<string>()
  return raw
    .map(r => ({
      title: r.title,
      path: r.path,
      snippet: r.snippet,
      snippetMatches: r.snippet_matches ?? [],
      score: r.score,
      noteType: r.note_type,
      fileKind: r.file_kind,
      vaultPath: scope.path,
      vaultLabel: scope.label,
    }))
    .filter(r => {
      const key = `${scope.path}:${r.path}`
      if (seen.has(key)) return false
      if (r.noteType === 'Config') return false
      seen.add(key)
      return true
    })
}

function normalizeScopes(vaultPath: string, vaultScopes?: SearchVaultScope[]): SearchVaultScope[] {
  const seen = new Set<string>()
  const scopes = [
    { path: vaultPath },
    ...(vaultScopes ?? []),
  ].filter((scope) => scope.path.trim().length > 0)

  return scopes.filter((scope) => {
    if (seen.has(scope.path)) return false
    seen.add(scope.path)
    return true
  })
}

async function searchScope(scope: SearchVaultScope, query: string) {
  try {
    const response = await searchCall({
      vaultPath: scope.path,
      query,
      mode: 'keyword',
      limit: 20,
    })
    return { response, scope }
  } catch {
    return null
  }
}

export function useUnifiedSearch(
  vaultPath: string,
  active: boolean,
  vaultScopes?: SearchVaultScope[],
  initialQuery = '',
  openKey = 0,
  options?: UseUnifiedSearchOptions,
) {
  const mode = options?.mode ?? 'keyword'
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [elapsedMs, setElapsedMs] = useState<number | null>(null)
  const [recall, setRecall] = useState<SearchRecallState>(EMPTY_RECALL)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchGenRef = useRef(0)

  const reset = useCallback((nextQuery = '') => {
    setQuery(nextQuery)
    setResults([])
    setSelectedIndex(0)
    setElapsedMs(null)
    setLoading(false)
    setRecall(EMPTY_RECALL)
    searchGenRef.current++
  }, [])

  // On any active change: cancel inflight + debounce, then reset if opening
  useEffect(() => {
    searchGenRef.current++
    clearTimeout(debounceRef.current ?? undefined)
    debounceRef.current = null
    if (active) reset(initialQuery)
  }, [active, initialQuery, openKey, reset])

  const performSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); setElapsedMs(null); setLoading(false); setRecall(EMPTY_RECALL); return }
    searchGenRef.current++
    const gen = searchGenRef.current
    setLoading(true)

    // In hybrid mode the recall seam runs in parallel with the keyword
    // scopes. It sends the question and vault path only — note bodies never
    // leave the Rust privacy contract. A failure downgrades to 'unavailable'
    // and never touches the keyword results.
    const recallPromise = mode === 'hybrid'
      ? buildChitraguptaContext({
          query: q,
          project: vaultPath,
          requestId: newRecallRequestId(),
          intent: 'recall',
          limit: 5,
        })
          .then(createChitraguptaRecallAttachment)
          .catch(() => null)
      : null
    if (recallPromise) setRecall({ status: 'loading', attachment: null })

    const [scopedResponses, recallAttachment] = await Promise.all([
      Promise.all(normalizeScopes(vaultPath, vaultScopes).map((scope) => searchScope(scope, q))),
      recallPromise ?? Promise.resolve<ChitraguptaRecallAttachment | null>(null),
    ])
    if (gen !== searchGenRef.current) return

    const successfulResponses = scopedResponses.filter((result): result is {
      response: SearchResponseData
      scope: SearchVaultScope
    } => result !== null)

    const mergedResults = successfulResponses
      .flatMap(({ response, scope }) => mapResults(response.results, scope))
      .sort((a, b) => b.score - a.score)
      .slice(0, 20)

    const elapsed = successfulResponses
      .reduce((max, { response }) => Math.max(max, response.elapsed_ms), 0)

    setResults(mergedResults)
    setElapsedMs(elapsed)
    setSelectedIndex(0)
    setRecall(recallPromise
      ? { status: recallAttachment === null ? 'unavailable' : 'ready', attachment: recallAttachment }
      : EMPTY_RECALL)
    if (gen === searchGenRef.current) setLoading(false)
  }, [vaultPath, vaultScopes, mode])

  useEffect(() => {
    clearTimeout(debounceRef.current ?? undefined)
    debounceRef.current = null
    if (!query.trim()) {
      setResults([])
      setElapsedMs(null)
      searchGenRef.current++
      setLoading(false)
      setRecall(EMPTY_RECALL)
      return
    }
    debounceRef.current = setTimeout(() => performSearch(query), DEBOUNCE_MS)
    return () => {
      clearTimeout(debounceRef.current ?? undefined)
      debounceRef.current = null
    }
  }, [query, performSearch])

  return { query, setQuery, results, selectedIndex, setSelectedIndex, loading, elapsedMs, recall }
}
