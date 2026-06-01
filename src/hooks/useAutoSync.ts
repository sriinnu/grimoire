import { useCallback, useEffect, useRef, useState } from 'react'
import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import { invoke } from '../lib/tauriRuntime'
import { isTauri, mockInvoke } from '../mock-tauri'
import type { GitPullResult, GitPushResult, GitRemoteStatus, LastCommitInfo, SyncStatus } from '../types'
import { trackEvent } from '../lib/telemetry'
import { useAutoSyncLifecycle } from './useAutoSyncLifecycle'

type MaybePromise = void | Promise<void>

type SyncCallbacks = Pick<UseAutoSyncOptions, 'onVaultUpdated' | 'onSyncUpdated' | 'onConflict' | 'onToast'>

function tauriCall<T>(cmd: string, args: Record<string, unknown>): Promise<T> {
  return isTauri() ? invoke<T>(cmd, args) : mockInvoke<T>(cmd, args)
}

interface UseAutoSyncOptions {
  vaultPath: string
  enabled?: boolean
  intervalMinutes: number | null
  onVaultUpdated: (updatedFiles: string[]) => MaybePromise
  onSyncUpdated?: () => MaybePromise
  onConflict: (files: string[]) => void
  onToast: (msg: string) => void
}

export interface AutoSyncState {
  syncStatus: SyncStatus
  lastSyncTime: number | null
  conflictFiles: string[]
  lastCommitInfo: LastCommitInfo | null
  remoteStatus: GitRemoteStatus | null
  triggerSync: () => void
  /** Pull from remote, then push if there are local commits ahead. */
  pullAndPush: () => void
  /** Pause auto-pull (e.g. while conflict resolver modal is open). */
  pausePull: () => void
  /** Resume auto-pull after pausing. */
  resumePull: () => void
  /** Notify that a push was rejected so the status updates to pull_required. */
  handlePushRejected: () => void
}

type SyncSetState<T> = Dispatch<SetStateAction<T>>

interface PullErrorResolution {
  checkExistingConflicts: () => Promise<boolean>
  notifyError?: string
  callbacksRef: MutableRefObject<SyncCallbacks>
  setSyncStatus: SyncSetState<SyncStatus>
}

interface SyncTaskOptions {
  blockWhenPaused: boolean
  pauseRef: MutableRefObject<boolean>
  shouldApply: () => boolean
  syncingRef: MutableRefObject<boolean>
  setLastSyncTime: SyncSetState<number | null>
  setSyncStatus: SyncSetState<SyncStatus>
  task: () => Promise<void>
}

function clearConflictState(
  setSyncStatus: SyncSetState<SyncStatus>,
  setConflictFiles: SyncSetState<string[]>,
): void {
  setSyncStatus('idle')
  setConflictFiles([])
}

function setConflictState(
  files: string[],
  setSyncStatus: SyncSetState<SyncStatus>,
  setConflictFiles: SyncSetState<string[]>,
  callbacksRef: MutableRefObject<SyncCallbacks>,
): void {
  setSyncStatus('conflict')
  setConflictFiles(files)
  void callbacksRef.current.onConflict(files)
}

function markPullTimestamp(
  setLastSyncTime: SyncSetState<number | null>,
  refreshCommitInfo: () => void,
): void {
  setLastSyncTime(Date.now())
  refreshCommitInfo()
}

function useRemoteStatusRefresher(
  vaultPath: string,
  setRemoteStatus: SyncSetState<GitRemoteStatus | null>,
  shouldApply: () => boolean,
) {
  return useCallback(async () => {
    try {
      const status = await tauriCall<GitRemoteStatus>('git_remote_status', { vaultPath })
      if (shouldApply()) setRemoteStatus(status)
      return status
    } catch {
      return null
    }
  }, [vaultPath, setRemoteStatus, shouldApply])
}

function useConflictChecker(
  vaultPath: string,
  setSyncStatus: SyncSetState<SyncStatus>,
  setConflictFiles: SyncSetState<string[]>,
  callbacksRef: MutableRefObject<SyncCallbacks>,
  shouldApply: () => boolean,
) {
  return useCallback(async (): Promise<boolean> => {
    try {
      const files = await tauriCall<string[]>('get_conflict_files', { vaultPath })
      if (!shouldApply()) return false
      if (!Array.isArray(files) || files.length === 0) return false
      setConflictState(files, setSyncStatus, setConflictFiles, callbacksRef)
      return true
    } catch {
      return false
    }
  }, [vaultPath, setSyncStatus, setConflictFiles, callbacksRef, shouldApply])
}

function useCommitInfoRefresher(
  vaultPath: string,
  setLastCommitInfo: SyncSetState<LastCommitInfo | null>,
  shouldApply: () => boolean,
) {
  return useCallback(() => {
    tauriCall<LastCommitInfo | null>('get_last_commit_info', { vaultPath })
      .then(info => { if (shouldApply()) setLastCommitInfo(info) })
      .catch((err) => console.warn('[sync] Failed to refresh last commit info:', err))
  }, [vaultPath, setLastCommitInfo, shouldApply])
}

async function handleUpdatedPull(options: {
  result: GitPullResult
  callbacksRef: MutableRefObject<SyncCallbacks>
  shouldApply: () => boolean
  setConflictFiles: SyncSetState<string[]>
  setSyncStatus: SyncSetState<SyncStatus>
}): Promise<void> {
  const {
    result,
    callbacksRef,
    shouldApply,
    setConflictFiles,
    setSyncStatus,
  } = options
  if (!shouldApply()) return
  clearConflictState(setSyncStatus, setConflictFiles)
  await callbacksRef.current.onVaultUpdated(result.updatedFiles)
  if (!shouldApply()) return
  await callbacksRef.current.onSyncUpdated?.()
  if (!shouldApply()) return
  await callbacksRef.current.onToast(`Pulled ${result.updatedFiles.length} update(s) from remote`)
}

async function resolvePullError(options: PullErrorResolution): Promise<void> {
  const {
    checkExistingConflicts,
    notifyError,
    callbacksRef,
    setSyncStatus,
  } = options
  const hasConflicts = await checkExistingConflicts()
  if (hasConflicts) return
  setSyncStatus('error')
  if (notifyError) await callbacksRef.current.onToast(notifyError)
}

function handlePushResult(options: {
  pushResult: GitPushResult
  callbacksRef: MutableRefObject<SyncCallbacks>
  setConflictFiles: SyncSetState<string[]>
  setSyncStatus: SyncSetState<SyncStatus>
}): void {
  const {
    pushResult,
    callbacksRef,
    setConflictFiles,
    setSyncStatus,
  } = options
  if (pushResult.status === 'ok') {
    clearConflictState(setSyncStatus, setConflictFiles)
    void callbacksRef.current.onToast('Pulled and pushed successfully')
    return
  }
  if (pushResult.status === 'rejected') {
    setSyncStatus('pull_required')
    void callbacksRef.current.onToast('Push still rejected after pull — try again')
    return
  }
  setSyncStatus('error')
  void callbacksRef.current.onToast(pushResult.message)
}

async function runSyncTask(options: SyncTaskOptions): Promise<void> {
  const {
    blockWhenPaused,
    pauseRef,
    shouldApply,
    syncingRef,
    setLastSyncTime,
    setSyncStatus,
    task,
  } = options
  if (syncingRef.current || (blockWhenPaused && pauseRef.current) || !shouldApply()) return
  syncingRef.current = true
  setSyncStatus('syncing')

  try {
    await task()
  } catch {
    if (shouldApply()) {
      setSyncStatus('error')
      setLastSyncTime(Date.now())
    }
  } finally {
    syncingRef.current = false
  }
}

export function useAutoSync({
  vaultPath,
  enabled = true,
  intervalMinutes,
  onVaultUpdated,
  onSyncUpdated,
  onConflict,
  onToast,
}: UseAutoSyncOptions): AutoSyncState {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle')
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null)
  const [conflictFiles, setConflictFiles] = useState<string[]>([])
  const [lastCommitInfo, setLastCommitInfo] = useState<LastCommitInfo | null>(null)
  const [remoteStatus, setRemoteStatus] = useState<GitRemoteStatus | null>(null)
  const syncingRef = useRef(false)
  const pauseRef = useRef(false)
  const activeSyncRef = useRef({ enabled, vaultPath })
  const syncSnapshotRef = useRef({ syncStatus, conflictFiles, remoteStatus, lastCommitInfo })
  const callbacksRef = useRef<SyncCallbacks>({ onVaultUpdated, onSyncUpdated, onConflict, onToast })
  useEffect(() => {
    activeSyncRef.current = { enabled, vaultPath }
  }, [enabled, vaultPath])
  useEffect(() => {
    syncSnapshotRef.current = { syncStatus, conflictFiles, remoteStatus, lastCommitInfo }
  }, [conflictFiles, lastCommitInfo, remoteStatus, syncStatus])
  useEffect(() => {
    callbacksRef.current = { onVaultUpdated, onSyncUpdated, onConflict, onToast }
  }, [onVaultUpdated, onSyncUpdated, onConflict, onToast])
  const shouldApply = useCallback(
    () => activeSyncRef.current.enabled && activeSyncRef.current.vaultPath === vaultPath,
    [vaultPath],
  )
  const refreshRemoteStatus = useRemoteStatusRefresher(vaultPath, setRemoteStatus, shouldApply)
  const checkExistingConflicts = useConflictChecker(vaultPath, setSyncStatus, setConflictFiles, callbacksRef, shouldApply)
  const refreshCommitInfo = useCommitInfoRefresher(vaultPath, setLastCommitInfo, shouldApply)

  useEffect(() => {
    if (enabled) return
    syncingRef.current = false
    queueMicrotask(() => {
      if (activeSyncRef.current.enabled || activeSyncRef.current.vaultPath !== vaultPath) return
      const snapshot = syncSnapshotRef.current
      if (snapshot.syncStatus !== 'idle') setSyncStatus('idle')
      if (snapshot.conflictFiles.length > 0) setConflictFiles([])
      if (snapshot.remoteStatus !== null) setRemoteStatus(null)
      if (snapshot.lastCommitInfo !== null) setLastCommitInfo(null)
    })
  }, [enabled, vaultPath])

  const performPull = useCallback(async () => {
    if (!enabled) return

    await runSyncTask({
      blockWhenPaused: true,
      pauseRef,
      shouldApply,
      syncingRef,
      setLastSyncTime,
      setSyncStatus,
      task: async () => {
        const result = await tauriCall<GitPullResult>('git_pull', { vaultPath })
        if (!shouldApply()) return
        markPullTimestamp(setLastSyncTime, refreshCommitInfo)

        if (result.status === 'updated') {
          await handleUpdatedPull({
            result,
            callbacksRef,
            shouldApply,
            setConflictFiles,
            setSyncStatus,
          })
        } else if (result.status === 'conflict') {
          setConflictState(result.conflictFiles, setSyncStatus, setConflictFiles, callbacksRef)
        } else if (result.status === 'error') {
          await resolvePullError({
            checkExistingConflicts,
            callbacksRef,
            setSyncStatus,
          })
        } else {
          clearConflictState(setSyncStatus, setConflictFiles)
        }

        void refreshRemoteStatus()
      },
    })
  }, [enabled, vaultPath, refreshCommitInfo, checkExistingConflicts, refreshRemoteStatus, shouldApply])

  /** Pull from remote, then auto-push if successful. Used for divergence recovery. */
  const pullAndPush = useCallback(async () => {
    if (!enabled) return

    await runSyncTask({
      blockWhenPaused: false,
      pauseRef,
      shouldApply,
      syncingRef,
      setLastSyncTime,
      setSyncStatus,
      task: async () => {
        const pullResult = await tauriCall<GitPullResult>('git_pull', { vaultPath })
        if (!shouldApply()) return
        markPullTimestamp(setLastSyncTime, refreshCommitInfo)

        if (pullResult.status === 'conflict') {
          setConflictState(pullResult.conflictFiles, setSyncStatus, setConflictFiles, callbacksRef)
          return
        }

        if (pullResult.status === 'error') {
          await resolvePullError({
            checkExistingConflicts,
            notifyError: `Pull failed: ${pullResult.message}`,
            callbacksRef,
            setSyncStatus,
          })
          return
        }

        if (pullResult.status === 'updated') {
          await callbacksRef.current.onVaultUpdated(pullResult.updatedFiles)
          if (!shouldApply()) return
          await callbacksRef.current.onSyncUpdated?.()
        }

        const pushResult = await tauriCall<GitPushResult>('git_push', { vaultPath })
        if (!shouldApply()) return
        handlePushResult({
          pushResult,
          callbacksRef,
          setConflictFiles,
          setSyncStatus,
        })

        void refreshRemoteStatus()
      },
    })
  }, [enabled, vaultPath, refreshCommitInfo, checkExistingConflicts, refreshRemoteStatus, shouldApply])

  const handlePushRejected = useCallback(() => {
    if (!enabled) return
    setSyncStatus('pull_required')
  }, [enabled])

  useAutoSyncLifecycle({
    checkExistingConflicts,
    enabled,
    intervalMinutes,
    performPull,
    refreshRemoteStatus,
  })

  const pausePull = useCallback(() => { pauseRef.current = true }, [])
  const resumePull = useCallback(() => { pauseRef.current = false }, [])

  const triggerSync = useCallback(() => {
    if (!enabled) return
    trackEvent('sync_triggered')
    void performPull()
  }, [enabled, performPull])

  return { syncStatus, lastSyncTime, conflictFiles, lastCommitInfo, remoteStatus, triggerSync, pullAndPush, pausePull, resumePull, handlePushRejected }
}
