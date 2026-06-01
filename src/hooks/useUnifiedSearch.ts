import { useState, useRef, useEffect, useCallback } from 'react'
import type { SearchResult } from '../types'
import { invoke } from '../lib/tauriRuntime'
import { isTauri, mockInvoke } from '../mock-tauri'

interface SearchResultData {
  title: string
  path: string
  snippet: string
  score: number
  note_type: string | null
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

function searchCall(args: Record<string, unknown>): Promise<SearchResponseData> {
  return isTauri()
    ? invoke<SearchResponseData>('search_vault', args)
    : mockInvoke<SearchResponseData>('search_vault', args)
}

function mapResults(raw: SearchResultData[], scope: SearchVaultScope): SearchResult[] {
  const seen = new Set<string>()
  return raw
    .map(r => ({
      title: r.title,
      path: r.path,
      snippet: r.snippet,
      score: r.score,
      noteType: r.note_type,
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

export function useUnifiedSearch(vaultPath: string, active: boolean, vaultScopes?: SearchVaultScope[]) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [elapsedMs, setElapsedMs] = useState<number | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchGenRef = useRef(0)

  const reset = useCallback(() => {
    setQuery('')
    setResults([])
    setSelectedIndex(0)
    setElapsedMs(null)
    setLoading(false)
    searchGenRef.current++
  }, [])

  // On any active change: cancel inflight + debounce, then reset if opening
  useEffect(() => {
    searchGenRef.current++
    clearTimeout(debounceRef.current ?? undefined)
    debounceRef.current = null
    if (active) reset()
  }, [active, reset])

  const performSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); setElapsedMs(null); setLoading(false); return }
    searchGenRef.current++
    const gen = searchGenRef.current
    setLoading(true)
    const scopedResponses = await Promise.all(
      normalizeScopes(vaultPath, vaultScopes).map((scope) => searchScope(scope, q)),
    )
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
    if (gen === searchGenRef.current) setLoading(false)
  }, [vaultPath, vaultScopes])

  useEffect(() => {
    clearTimeout(debounceRef.current ?? undefined)
    debounceRef.current = null
    if (!query.trim()) {
      setResults([])
      setElapsedMs(null)
      searchGenRef.current++
      setLoading(false)
      return
    }
    debounceRef.current = setTimeout(() => performSearch(query), DEBOUNCE_MS)
    return () => {
      clearTimeout(debounceRef.current ?? undefined)
      debounceRef.current = null
    }
  }, [query, performSearch])

  return { query, setQuery, results, selectedIndex, setSelectedIndex, loading, elapsedMs }
}
