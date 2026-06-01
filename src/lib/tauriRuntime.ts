type TauriCoreModule = typeof import('@tauri-apps/api/core')
type TauriWindowModule = typeof import('@tauri-apps/api/window')
type InvokeArgs = Parameters<TauriCoreModule['invoke']>[1]

/**
 * Invokes a Tauri command without pulling the Tauri API package into startup.
 */
export async function invoke<T = unknown>(command: string, args?: InvokeArgs): Promise<T> {
  const { invoke: tauriInvoke } = await import('@tauri-apps/api/core')
  if (args === undefined) return tauriInvoke<T>(command)
  return tauriInvoke<T>(command, args)
}

/**
 * Creates a Tauri event channel only when an updater flow actually needs one.
 */
export async function createTauriChannel<T>(): Promise<import('@tauri-apps/api/core').Channel<T>> {
  const { Channel } = await import('@tauri-apps/api/core')
  return new Channel<T>()
}

/**
 * Resolves the current native window lazily for titlebar and Linux-menu actions.
 */
export async function getCurrentTauriWindow(): Promise<ReturnType<TauriWindowModule['getCurrentWindow']>> {
  const { getCurrentWindow } = await import('@tauri-apps/api/window')
  return getCurrentWindow()
}
