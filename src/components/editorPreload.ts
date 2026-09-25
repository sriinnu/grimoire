let editorModule: Promise<typeof import('./Editor')> | null = null

/**
 * Starts fetching the editor engine without rendering it. main.tsx calls this
 * at boot when a note is about to be restored, so the ~470KB chunk downloads
 * alongside the vault load instead of after it. LazyEditor shares the promise.
 */
export function preloadEditor(): Promise<typeof import('./Editor')> {
  editorModule ??= import('./Editor')
  return editorModule
}
