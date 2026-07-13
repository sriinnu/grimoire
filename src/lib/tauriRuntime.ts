type TauriCoreModule = typeof import('@tauri-apps/api/core')
type TauriWindowModule = typeof import('@tauri-apps/api/window')
type InvokeArgs = Parameters<TauriCoreModule['invoke']>[1]

interface TauriRuntimeGlobal {
  __TAURI_INTERNALS__?: { invoke?: unknown }
}

/** Returns true only when this webview is running inside the Tauri host. */
export function isTauriRuntimeAvailable(): boolean {
  const runtime = (globalThis as TauriRuntimeGlobal).__TAURI_INTERNALS__
  return typeof runtime === 'object' && runtime !== null && typeof runtime.invoke === 'function'
}

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

let homeDirCache: Promise<string | null> | undefined

/**
 * Resolves the user's home directory once, lazily, for native path display
 * (collapsing `/Users/me/…` to `~/…`). Returns null outside Tauri or on error,
 * so callers degrade to the absolute path. Cached after the first call.
 */
export function getHomeDir(): Promise<string | null> {
  if (homeDirCache) return homeDirCache
  if (!isTauriRuntimeAvailable()) {
    homeDirCache = Promise.resolve(null)
    return homeDirCache
  }
  homeDirCache = import('@tauri-apps/api/path')
    .then(({ homeDir }) => homeDir())
    .then((dir) => dir.replace(/[\\/]+$/u, ''))
    .catch(() => null)
  return homeDirCache
}
