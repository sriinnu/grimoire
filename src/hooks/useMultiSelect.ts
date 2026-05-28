import { useState, useCallback, useMemo, useRef } from 'react'
import type { VaultEntry } from '../types'

export interface MultiSelectState {
  selectedPaths: Set<string>
  isMultiSelecting: boolean
  toggle: (path: string) => void
  selectRange: (toPath: string) => void
  clear: () => void
  pruneToVisible: () => void
  setAnchor: (path: string) => void
  selectAll: () => void
}

export function useMultiSelect(visibleEntries: VaultEntry[], activePath: string | null = null): MultiSelectState {
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set())
  const lastClickedRef = useRef<string | null>(null)
  const visiblePathSet = useMemo(
    () => new Set(visibleEntries.map((entry) => entry.path)),
    [visibleEntries],
  )

  const toggle = useCallback((path: string) => {
    setSelectedPaths((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
    lastClickedRef.current = path
  }, [])

  const selectRange = useCallback((toPath: string) => {
    const fromPath = lastClickedRef.current ?? activePath
    if (!fromPath) {
      toggle(toPath)
      return
    }
    const paths = visibleEntries.map((e) => e.path)
    const fromIdx = paths.indexOf(fromPath)
    const toIdx = paths.indexOf(toPath)
    if (fromIdx === -1 || toIdx === -1) {
      toggle(toPath)
      return
    }
    const start = Math.min(fromIdx, toIdx)
    const end = Math.max(fromIdx, toIdx)
    setSelectedPaths((prev) => {
      const next = new Set(prev)
      for (let i = start; i <= end; i++) next.add(paths[i])
      return next
    })
    lastClickedRef.current = toPath
  }, [visibleEntries, activePath, toggle])

  const clear = useCallback(() => {
    setSelectedPaths(new Set())
    lastClickedRef.current = null
  }, [])

  const pruneToVisible = useCallback(() => {
    setSelectedPaths((prev) => {
      let changed = false
      const next = new Set<string>()
      for (const path of prev) {
        if (visiblePathSet.has(path)) {
          next.add(path)
        } else {
          changed = true
        }
      }
      if (lastClickedRef.current && !visiblePathSet.has(lastClickedRef.current)) {
        lastClickedRef.current = null
      }
      return changed ? next : prev
    })
  }, [visiblePathSet])

  const setAnchor = useCallback((path: string) => {
    lastClickedRef.current = path
  }, [])

  const selectAll = useCallback(() => {
    setSelectedPaths(new Set(visibleEntries.map((e) => e.path)))
  }, [visibleEntries])

  return {
    selectedPaths,
    isMultiSelecting: selectedPaths.size > 0,
    toggle,
    selectRange,
    clear,
    pruneToVisible,
    setAnchor,
    selectAll,
  }
}
