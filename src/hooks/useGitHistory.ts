import { useEffect, useState } from 'react'
import type { GitCommit } from '../types'
import { scheduleVisibleWork } from './visibleDocument'

const GIT_HISTORY_LOAD_DELAY_MS = 200

export function useGitHistory(
  activeTabPath: string | null,
  loadGitHistory: (path: string) => Promise<GitCommit[]>,
  enabled = true,
) {
  const [loadedHistory, setLoadedHistory] = useState<{
    path: string | null
    commits: GitCommit[]
  }>({
    path: null,
    commits: [],
  })

  useEffect(() => {
    if (!enabled || !activeTabPath) return

    let cancelled = false

    const cancelVisibleWork = scheduleVisibleWork(() => {
      void loadGitHistory(activeTabPath).then((history) => {
        if (cancelled) return
        setLoadedHistory({
          path: activeTabPath,
          commits: history,
        })
      })
    }, { delayMs: GIT_HISTORY_LOAD_DELAY_MS })

    return () => {
      cancelled = true
      cancelVisibleWork()
    }
  }, [activeTabPath, enabled, loadGitHistory])

  return enabled && activeTabPath && loadedHistory.path === activeTabPath
    ? loadedHistory.commits
    : []
}
