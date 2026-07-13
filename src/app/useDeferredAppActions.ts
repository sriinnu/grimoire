import { useRef, type MutableRefObject } from 'react'

export interface DeferredAppActions {
  closeAllTabs: MutableRefObject<() => void>
  flushEditorState: MutableRefObject<(path: string) => Promise<void>>
  markContentPending: MutableRefObject<(path: string, content: string) => void>
  onConflictsResolved: MutableRefObject<() => void>
  openConflictFile: MutableRefObject<(relativePath: string) => void>
  trackRenamedPath: MutableRefObject<(oldPath: string, newPath: string) => void>
}

export function useDeferredAppActions(): DeferredAppActions {
  return {
    closeAllTabs: useRef(() => {}),
    flushEditorState: useRef(async () => {}),
    markContentPending: useRef(() => {}),
    onConflictsResolved: useRef(() => {}),
    openConflictFile: useRef(() => {}),
    trackRenamedPath: useRef(() => {}),
  }
}
