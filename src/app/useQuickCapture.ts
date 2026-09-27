import { useCallback, useEffect, useState } from 'react'
import { isTauri } from '../mock-tauri'
import type { NoteWorkspace } from './useNoteWorkspace'
import type { VaultFoundation } from './useVaultFoundation'

/** Native global-shortcut handler emits this after showing the main window. */
export const QUICK_CAPTURE_OPEN_EVENT = 'quick-capture-open'

/** Cmd+Shift+Space on macOS, Ctrl+Shift+Space elsewhere. */
export function isQuickCaptureShortcut(event: Pick<KeyboardEvent, 'altKey' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'code' | 'key'>): boolean {
  if (event.altKey || !event.shiftKey || !(event.metaKey || event.ctrlKey)) return false
  return event.code === 'Space' || event.key === ' '
}

function useQuickCaptureTriggers(openQuickCapture: () => void, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isQuickCaptureShortcut(event)) return
      event.preventDefault()
      event.stopPropagation()
      openQuickCapture()
    }
    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [enabled, openQuickCapture])

  useEffect(() => {
    if (!enabled || !isTauri()) return
    let disposed = false
    let unlisten: (() => void) | null = null
    import('@tauri-apps/api/event')
      .then(({ listen }) => listen(QUICK_CAPTURE_OPEN_EVENT, () => openQuickCapture()))
      .then((teardown) => {
        if (disposed) teardown()
        else unlisten = teardown
      })
      .catch(() => { /* event bridge unavailable */ })
    return () => {
      disposed = true
      unlisten?.()
    }
  }, [enabled, openQuickCapture])
}

/** Open state, triggers and the save path for the quick-capture sheet. */
export function useQuickCapture(foundation: VaultFoundation, workspace: NoteWorkspace) {
  const { noteWindowParams, resolvedPath, setToastMessage, vault } = foundation
  const { appSave, flushPendingRawContentRef, notes } = workspace
  const [showQuickCapture, setShowQuickCapture] = useState(false)
  const openQuickCapture = useCallback(() => setShowQuickCapture(true), [])
  const closeQuickCapture = useCallback(() => setShowQuickCapture(false), [])
  // Detached note windows keep their own focus; capture belongs to the main window.
  useQuickCaptureTriggers(openQuickCapture, !noteWindowParams)

  const { setTabs, tabs } = notes
  const saveQuickCapture = useCallback(async (text: string): Promise<boolean> => {
    if (!resolvedPath) {
      setToastMessage('Open a vault to capture')
      return false
    }
    try {
      const { appendQuickCaptureToTodayJournal } = await import('../utils/quickCaptureJournal')
      const result = await appendQuickCaptureToTodayJournal(text, {
        entries: vault.entries,
        vaultPath: resolvedPath,
        openPaths: tabs.map((tab) => tab.entry.path),
        flushBeforeWrite: async (path) => {
          flushPendingRawContentRef.current?.(path)
          await appSave.flushBeforeAction(path)
        },
        addEntry: vault.addEntry,
        removeEntry: vault.removeEntry,
        updateEntry: vault.updateEntry,
        updateTabContent: (path, content) => {
          setTabs((prev) => prev.map((tab) => (tab.entry.path === path ? { ...tab, content } : tab)))
        },
        addPendingSave: vault.addPendingSave,
        removePendingSave: vault.removePendingSave,
        loadModifiedFiles: vault.loadModifiedFiles,
      })
      if (result.status === 'blocked') {
        setToastMessage(result.message)
        return false
      }
      if (result.status === 'empty') return false
      setToastMessage(`Captured to ${result.entry.title}`)
      return true
    } catch (error) {
      setToastMessage(`Capture failed: ${error instanceof Error ? error.message : String(error)}`)
      return false
    }
  }, [appSave, flushPendingRawContentRef, resolvedPath, setTabs, setToastMessage, tabs, vault])

  return { showQuickCapture, openQuickCapture, closeQuickCapture, saveQuickCapture }
}
