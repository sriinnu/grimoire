import { finishNoteOpenTrace } from '../utils/noteOpenPerformance'

export function signalEditorTabSwapped(path: string): void {
  window.dispatchEvent(new CustomEvent('grimoire:editor-tab-swapped', {
    detail: { path },
  }))
  finishNoteOpenTrace(path)
}

export function signalTabSwap(options: { path: string }) {
  const { path } = options
  requestAnimationFrame(() => signalEditorTabSwapped(path))
}
