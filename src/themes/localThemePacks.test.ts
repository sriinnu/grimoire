import { describe, expect, it, vi } from 'vitest'
import { THEME_PRESET_CATALOG, serializeThemeDefinition } from './themeRegistry'
import {
  clearStoredLocalThemeDefinition,
  DEV_THEME_PACK_ENDPOINT,
  LOCAL_THEME_PACK_STORAGE_KEY,
  parseLocalThemeFile,
  readStoredLocalThemeDefinition,
  refreshDevelopmentThemePack,
  writeStoredLocalThemeDefinition,
} from './localThemePacks'

function makeStorage(initial: Record<string, string> = {}): Storage {
  const values = new Map(Object.entries(initial))
  return {
    get length() { return values.size },
    clear: vi.fn(() => values.clear()),
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    key: vi.fn((index: number) => Array.from(values.keys())[index] ?? null),
    removeItem: vi.fn((key: string) => { values.delete(key) }),
    setItem: vi.fn((key: string, value: string) => { values.set(key, value) }),
  }
}

describe('local theme packs', () => {
  it('stores and reads a validated local theme pack override', () => {
    const storage = makeStorage()

    writeStoredLocalThemeDefinition(storage, THEME_PRESET_CATALOG[0])

    expect(storage.setItem).toHaveBeenCalledWith(
      LOCAL_THEME_PACK_STORAGE_KEY,
      serializeThemeDefinition(THEME_PRESET_CATALOG[0]),
    )
    expect(readStoredLocalThemeDefinition(storage)?.id).toBe(THEME_PRESET_CATALOG[0].id)
  })

  it('fails closed for invalid stored theme JSON', () => {
    const storage = makeStorage({ [LOCAL_THEME_PACK_STORAGE_KEY]: '{"schemaVersion":1}' })

    expect(readStoredLocalThemeDefinition(storage)).toBeNull()
  })

  it('parses a user-selected JSON file through the theme validator', async () => {
    const parsed = await parseLocalThemeFile({
      text: () => Promise.resolve(serializeThemeDefinition(THEME_PRESET_CATALOG[0])),
    })

    expect(parsed.ok).toBe(true)
  })

  it('mirrors a dev hot-reload theme file into local app storage', async () => {
    const storage = makeStorage()
    const fetchThemePack = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(serializeThemeDefinition(THEME_PRESET_CATALOG[0])),
    })

    const result = await refreshDevelopmentThemePack(storage, fetchThemePack)

    expect(fetchThemePack).toHaveBeenCalledWith(DEV_THEME_PACK_ENDPOINT, { cache: 'no-store' })
    expect(result.status).toBe('loaded')
    expect(readStoredLocalThemeDefinition(storage)?.id).toBe(THEME_PRESET_CATALOG[0].id)
  })

  it('clears the local override when the dev theme file is missing', async () => {
    const storage = makeStorage({ [LOCAL_THEME_PACK_STORAGE_KEY]: serializeThemeDefinition(THEME_PRESET_CATALOG[0]) })
    const fetchThemePack = vi.fn().mockResolvedValue({ ok: false, status: 404 })

    const result = await refreshDevelopmentThemePack(storage, fetchThemePack)

    expect(result.status).toBe('missing')
    expect(storage.removeItem).toHaveBeenCalledWith(LOCAL_THEME_PACK_STORAGE_KEY)
    clearStoredLocalThemeDefinition(storage)
    expect(readStoredLocalThemeDefinition(storage)).toBeNull()
  })

  it('reports dev hot-reload fetch failures as invalid instead of throwing', async () => {
    const storage = makeStorage()
    const fetchThemePack = vi.fn().mockRejectedValue(new Error('offline'))

    const result = await refreshDevelopmentThemePack(storage, fetchThemePack)

    expect(result).toEqual({ status: 'invalid', errors: ['offline'] })
    expect(storage.setItem).not.toHaveBeenCalled()
  })
})
