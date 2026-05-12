import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react'
import { invoke } from '@tauri-apps/api/core'
import type { GitPushResult, GitRemoteStatus, ModifiedFile } from '../types'
import { trackEvent } from '../lib/telemetry'
import { isTauri, mockInvoke } from '../mock-tauri'
import { generateAutomaticCommitMessage } from '../utils/automaticCommitMessage'

export type CommitMode = 'push' | 'local'

interface LocalCommitResult {
  status: 'local_only'
  message: string
}

type CommitResult = GitPushResult | LocalCommitResult
type CheckpointAction = 'commit' | 'push_only'

interface AutomaticCheckpointOptions {
  savePendingBeforeCommit?: boolean
}

interface CommitFlowConfig {
  enabled?: boolean
  savePending: () => Promise<void | boolean>
  loadModifiedFiles: () => Promise<void>
  resolveRemoteStatus: () => Promise<GitRemoteStatus | null>
  setToastMessage: (msg: string | null) => void
  onPushRejected?: () => void
  vaultPath: string
}

interface VaultPathArgs {
  vaultPath: string
}

interface CommitArgs extends VaultPathArgs {
  message: string
}

interface CommitExecutionArgs extends CommitArgs {
  commitMode: CommitMode
  shouldContinue: () => boolean
}

interface AutomaticCheckpointContext extends VaultPathArgs {
  remoteStatus: GitRemoteStatus | null
}

interface AutomaticCheckpointCommand extends AutomaticCheckpointContext {
  action: CheckpointAction
  message?: string
}

interface ExecutedCheckpoint {
  action: CheckpointAction
  result: CommitResult
}

const GIT_DISABLED_MESSAGE = 'Git is not enabled for this vault'

function commitModeFromRemoteStatus(remoteStatus: GitRemoteStatus | null): CommitMode {
  return remoteStatus?.hasRemote === false ? 'local' : 'push'
}

async function commitLocally({ vaultPath, message }: CommitArgs): Promise<void> {
  if (!isTauri()) {
    await mockInvoke<string>('git_commit', { vaultPath, message })
    return
  }

  await invoke<string>('git_commit', { vaultPath, message })
}

async function pushCommittedChanges({ vaultPath }: VaultPathArgs): Promise<GitPushResult> {
  if (!isTauri()) {
    return mockInvoke<GitPushResult>('git_push', { vaultPath })
  }

  return invoke<GitPushResult>('git_push', { vaultPath })
}

async function readModifiedFiles({ vaultPath }: VaultPathArgs): Promise<ModifiedFile[]> {
  if (!isTauri()) {
    return mockInvoke<ModifiedFile[]>('get_modified_files', { vaultPath })
  }

  return invoke<ModifiedFile[]>('get_modified_files', { vaultPath })
}

async function executeCommitAction({
  vaultPath,
  message,
  commitMode,
  shouldContinue,
}: CommitExecutionArgs): Promise<CommitResult | null> {
  if (!shouldContinue()) return null
  await commitLocally({ vaultPath, message })
  if (!shouldContinue()) return null
  if (commitMode === 'local') {
    return { status: 'local_only', message: 'Committed locally (no remote configured)' }
  }

  const result = await pushCommittedChanges({ vaultPath })
  return shouldContinue() ? result : null
}

function commitToastMessage(result: CommitResult): string {
  if (result.status === 'ok') return 'Committed and pushed'
  if (result.status === 'local_only') return result.message
  if (result.status === 'rejected') return 'Committed, but push rejected — remote has new commits. Pull first.'
  return result.message
}

function isPushRejected(result: CommitResult): boolean {
  return result.status === 'rejected'
}

function formatCommitError(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function shouldRetryPush(remoteStatus: GitRemoteStatus | null): boolean {
  return remoteStatus?.hasRemote === true && remoteStatus.ahead > 0
}

function nothingToCommitToast(remoteStatus: GitRemoteStatus | null): string {
  return remoteStatus?.hasRemote === false ? 'Nothing to commit' : 'Nothing to commit or push'
}

function checkpointToastMessage(result: CommitResult, action: CheckpointAction): string {
  if (action === 'push_only') {
    if (result.status === 'ok') return 'Pushed committed changes'
    if (result.status === 'rejected') return 'Push rejected — remote has new commits. Pull first.'
    return result.message
  }

  return commitToastMessage(result)
}

function createAutomaticCheckpointCommand({
  remoteStatus,
  vaultPath,
  message,
}: AutomaticCheckpointContext & { message: string }): AutomaticCheckpointCommand | null {
  if (message.length > 0) {
    return { action: 'commit', remoteStatus, vaultPath, message }
  }

  if (shouldRetryPush(remoteStatus)) {
    return { action: 'push_only', remoteStatus, vaultPath }
  }

  return null
}

async function executeAutomaticCheckpoint(
  command: AutomaticCheckpointCommand,
  shouldContinue: () => boolean,
): Promise<ExecutedCheckpoint | null> {
  if (!shouldContinue()) return null
  if (command.action === 'push_only') {
    const result = await pushCommittedChanges({ vaultPath: command.vaultPath })
    if (!shouldContinue()) return null
    return {
      action: 'push_only',
      result,
    }
  }

  const result = await executeCommitAction({
    vaultPath: command.vaultPath,
    message: command.message ?? '',
    commitMode: commitModeFromRemoteStatus(command.remoteStatus),
    shouldContinue,
  })
  if (!result) return null
  trackEvent('commit_made')
  return { action: 'commit', result }
}

async function runCheckpointRefresh({
  loadModifiedFiles,
  resolveRemoteStatus,
}: Pick<CommitFlowConfig, 'loadModifiedFiles' | 'resolveRemoteStatus'>): Promise<void> {
  await loadModifiedFiles()
  await resolveRemoteStatus()
}

async function finalizeCheckpoint({
  result,
  toastMessage,
  loadModifiedFiles,
  resolveRemoteStatus,
  setToastMessage,
  onPushRejected,
}: Pick<CommitFlowConfig, 'loadModifiedFiles' | 'resolveRemoteStatus' | 'setToastMessage' | 'onPushRejected'> & {
  result: CommitResult
  toastMessage: string
}): Promise<void> {
  setToastMessage(toastMessage)
  if (isPushRejected(result)) {
    onPushRejected?.()
  }

  await runCheckpointRefresh({ loadModifiedFiles, resolveRemoteStatus })
}

function useAutomaticCheckpointAction({
  checkpointInFlightRef,
  savePending,
  loadModifiedFiles,
  resolveRemoteStatus,
  setToastMessage,
  onPushRejected,
  vaultPath,
  enabled = true,
  shouldContinue,
}: CommitFlowConfig & {
  checkpointInFlightRef: MutableRefObject<boolean>
  shouldContinue: () => boolean
}) {
  return useCallback(async ({
    savePendingBeforeCommit = false,
  }: AutomaticCheckpointOptions = {}): Promise<boolean> => {
    if (!enabled || !shouldContinue()) return false
    if (checkpointInFlightRef.current) return false
    checkpointInFlightRef.current = true

    try {
      if (savePendingBeforeCommit) {
        await savePending()
        if (!shouldContinue()) return false
      }

      const remoteStatus = await resolveRemoteStatus()
      if (!shouldContinue()) return false
      const modifiedFiles = await readModifiedFiles({ vaultPath })
      if (!shouldContinue()) return false
      const message = generateAutomaticCommitMessage(modifiedFiles)
      const command = createAutomaticCheckpointCommand({ remoteStatus, vaultPath, message })
      if (!command) {
        setToastMessage(nothingToCommitToast(remoteStatus))
        return false
      }

      const checkpoint = await executeAutomaticCheckpoint(command, shouldContinue)
      if (!checkpoint) return false
      await finalizeCheckpoint({
        result: checkpoint.result,
        toastMessage: checkpointToastMessage(checkpoint.result, checkpoint.action),
        loadModifiedFiles,
        resolveRemoteStatus,
        setToastMessage,
        onPushRejected,
      })
      return true
    } catch (err) {
      console.error('Commit failed:', err)
      if (shouldContinue()) setToastMessage(`Commit failed: ${formatCommitError(err)}`)
      return false
    } finally {
      checkpointInFlightRef.current = false
    }
  }, [checkpointInFlightRef, enabled, loadModifiedFiles, onPushRejected, resolveRemoteStatus, savePending, setToastMessage, shouldContinue, vaultPath])
}

function useManualCommitPushAction({
  checkpointInFlightRef,
  savePending,
  loadModifiedFiles,
  resolveRemoteStatus,
  setToastMessage,
  onPushRejected,
  vaultPath,
  setShowCommitDialog,
  enabled = true,
  shouldContinue,
}: CommitFlowConfig & {
  checkpointInFlightRef: MutableRefObject<boolean>
  setShowCommitDialog: (open: boolean) => void
  shouldContinue: () => boolean
}) {
  return useCallback(async (message: string) => {
    setShowCommitDialog(false)
    if (!enabled || !shouldContinue()) {
      setToastMessage(GIT_DISABLED_MESSAGE)
      return
    }
    if (checkpointInFlightRef.current) return
    checkpointInFlightRef.current = true

    try {
      await savePending()
      if (!shouldContinue()) return
      const remoteStatus = await resolveRemoteStatus()
      if (!shouldContinue()) return
      const result = await executeCommitAction({
        vaultPath,
        message,
        commitMode: commitModeFromRemoteStatus(remoteStatus),
        shouldContinue,
      })
      if (!result) return

      trackEvent('commit_made')
      await finalizeCheckpoint({
        result,
        toastMessage: commitToastMessage(result),
        loadModifiedFiles,
        resolveRemoteStatus,
        setToastMessage,
        onPushRejected,
      })
    } catch (err) {
      console.error('Commit failed:', err)
      if (shouldContinue()) setToastMessage(`Commit failed: ${formatCommitError(err)}`)
    } finally {
      checkpointInFlightRef.current = false
    }
  }, [checkpointInFlightRef, enabled, loadModifiedFiles, onPushRejected, resolveRemoteStatus, savePending, setShowCommitDialog, setToastMessage, shouldContinue, vaultPath])
}

/** Manages the commit dialog state and the save→commit→push/local flow. */
export function useCommitFlow({
  enabled = true,
  savePending,
  loadModifiedFiles,
  resolveRemoteStatus,
  setToastMessage,
  onPushRejected,
  vaultPath,
}: CommitFlowConfig) {
  const [showCommitDialog, setShowCommitDialog] = useState(false)
  const [commitMode, setCommitMode] = useState<CommitMode>('push')
  const checkpointInFlightRef = useRef(false)
  const activeFlowRef = useRef({ enabled, vaultPath })

  useEffect(() => {
    activeFlowRef.current = { enabled, vaultPath }
  }, [enabled, vaultPath])

  const shouldContinue = useCallback(
    () => activeFlowRef.current.enabled && activeFlowRef.current.vaultPath === vaultPath,
    [vaultPath],
  )

  const openCommitDialog = useCallback(async () => {
    if (!enabled || !shouldContinue()) {
      setToastMessage(GIT_DISABLED_MESSAGE)
      return
    }
    await savePending()
    if (!shouldContinue()) return
    await loadModifiedFiles()
    if (!shouldContinue()) return
    const remoteStatus = await resolveRemoteStatus()
    if (!shouldContinue()) return
    setCommitMode(commitModeFromRemoteStatus(remoteStatus))
    setShowCommitDialog(true)
  }, [enabled, loadModifiedFiles, resolveRemoteStatus, savePending, setToastMessage, shouldContinue])

  const runAutomaticCheckpoint = useAutomaticCheckpointAction({
    checkpointInFlightRef,
    enabled,
    shouldContinue,
    savePending,
    loadModifiedFiles,
    resolveRemoteStatus,
    setToastMessage,
    onPushRejected,
    vaultPath,
  })

  const handleCommitPush = useManualCommitPushAction({
    checkpointInFlightRef,
    enabled,
    shouldContinue,
    savePending,
    loadModifiedFiles,
    resolveRemoteStatus,
    setToastMessage,
    onPushRejected,
    vaultPath,
    setShowCommitDialog,
  })

  const closeCommitDialog = useCallback(() => setShowCommitDialog(false), [])

  return { showCommitDialog, commitMode, openCommitDialog, handleCommitPush, closeCommitDialog, runAutomaticCheckpoint }
}
