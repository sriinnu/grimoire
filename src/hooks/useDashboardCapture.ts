import { useCallback } from 'react'
import { addMockEntry, isTauri } from '../mock-tauri'
import type { VaultEntry } from '../types'
import { queueAiPrompt, requestOpenAiChat } from '../utils/aiPromptBridge'
import { resolveDashboardCapture, type CaptureKind } from '../utils/dashboardCapture'
import { persistNewNote } from './useNoteCreation'

export type DashboardCaptureResult =
  | { status: 'created'; entry: VaultEntry; captureKind: CaptureKind }
  | { status: 'ask'; prompt: string }
  | { status: 'blocked' }

interface DashboardCaptureConfig {
  addEntry: (entry: VaultEntry) => void
  addPendingSave?: (path: string) => void
  createTypeEntry?: (typeName: string) => Promise<VaultEntry>
  entries: VaultEntry[]
  loadModifiedFiles?: () => Promise<unknown>
  openTabWithContent: (entry: VaultEntry, content: string) => void
  removeEntry: (path: string) => void
  removePendingSave?: (path: string) => void
  setToastMessage: (message: string | null) => void
  vaultPath: string
}

async function persistCapturedNote({
  addEntry,
  addPendingSave,
  content,
  entry,
  loadModifiedFiles,
  openTabWithContent,
  removeEntry,
  removePendingSave,
}: Pick<
  DashboardCaptureConfig,
  'addEntry' | 'addPendingSave' | 'loadModifiedFiles' | 'openTabWithContent' | 'removeEntry' | 'removePendingSave'
> & {
  content: string
  entry: VaultEntry
}) {
  openTabWithContent(entry, content)
  if (!isTauri()) addMockEntry(entry, content)
  addEntry(entry)
  addPendingSave?.(entry.path)

  try {
    await persistNewNote(entry.path, content)
    await loadModifiedFiles?.()
  } catch (error) {
    removeEntry(entry.path)
    throw error
  } finally {
    removePendingSave?.(entry.path)
  }
}

/** Creates local dashboard captures and routes /ask to the AI panel without writing a note. */
export function useDashboardCapture({
  addEntry,
  addPendingSave,
  createTypeEntry,
  entries,
  loadModifiedFiles,
  openTabWithContent,
  removeEntry,
  removePendingSave,
  setToastMessage,
  vaultPath,
}: DashboardCaptureConfig) {
  return useCallback(async (input: string, selectedKind: CaptureKind): Promise<DashboardCaptureResult> => {
    const plan = resolveDashboardCapture({ entries, input, selectedKind, vaultPath })
    if (plan.kind === 'error') {
      setToastMessage(plan.message)
      return { status: 'blocked' }
    }

    if (plan.kind === 'ask') {
      queueAiPrompt(plan.prompt, plan.references, plan.contextPackage)
      requestOpenAiChat()
      return { status: 'ask', prompt: plan.prompt }
    }

    try {
      if (plan.typeName !== 'Note') {
        await createTypeEntry?.(plan.typeName)
      }
      await persistCapturedNote({
        addEntry,
        addPendingSave,
        content: plan.content,
        entry: plan.entry,
        loadModifiedFiles,
        openTabWithContent,
        removeEntry,
        removePendingSave,
      })
      setToastMessage(`${plan.typeName} captured locally`)
      return { status: 'created', entry: plan.entry, captureKind: plan.captureKind }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      setToastMessage(`Capture failed: ${message}`)
      return { status: 'blocked' }
    }
  }, [
    addEntry,
    addPendingSave,
    createTypeEntry,
    entries,
    loadModifiedFiles,
    openTabWithContent,
    removeEntry,
    removePendingSave,
    setToastMessage,
    vaultPath,
  ])
}
