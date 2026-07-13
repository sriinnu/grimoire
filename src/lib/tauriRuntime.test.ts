import { describe, expect, it } from 'vitest'
import { getHomeDir, isTauriRuntimeAvailable } from './tauriRuntime'

describe('getHomeDir', () => {
  it('resolves to null outside the Tauri host and caches the result', async () => {
    // jsdom has no __TAURI_INTERNALS__, so the runtime is unavailable here.
    expect(isTauriRuntimeAvailable()).toBe(false)
    await expect(getHomeDir()).resolves.toBeNull()
    // Second call returns the same cached promise rather than re-probing.
    expect(getHomeDir()).toBe(getHomeDir())
  })
})
