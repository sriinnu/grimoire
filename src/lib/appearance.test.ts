import { describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_EDITOR_FONT,
  DEFAULT_THEME_PRESET,
  EDITOR_FONT_STORAGE_KEY,
  THEME_PRESET_STORAGE_KEY,
  applyAppearanceToDocument,
  applyStoredAppearance,
  normalizeEditorFont,
  normalizeThemePreset,
  readStoredEditorFont,
  readStoredThemePreset,
  resolveEditorFont,
  resolveThemePreset,
  writeStoredEditorFont,
  writeStoredThemePreset,
} from './appearance'
import { writeStoredLocalThemeDefinition } from '../themes/localThemePacks'
import { THEME_PRESET_CATALOG } from '../themes/themeRegistry'

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

describe('appearance', () => {
  it('normalizes only supported appearance values', () => {
    expect(normalizeThemePreset('constellation')).toBe('constellation')
    expect(normalizeThemePreset('daylight-atelier')).toBe('daylight-atelier')
    expect(normalizeThemePreset('living-archive')).toBe('living-archive')
    expect(normalizeThemePreset('nocturne')).toBe('nocturne')
    expect(normalizeThemePreset('retro-terminal')).toBe('retro-terminal')
    expect(normalizeThemePreset('research-cockpit')).toBeNull()
    expect(normalizeThemePreset('manuscript')).toBeNull()
    expect(normalizeThemePreset('classic')).toBeNull()
    expect(normalizeThemePreset('graphite')).toBeNull()
    expect(normalizeThemePreset('aether')).toBeNull()
    expect(normalizeThemePreset('ion')).toBeNull()
    expect(normalizeThemePreset('moss')).toBeNull()
    expect(normalizeThemePreset('lumen')).toBeNull()
    expect(normalizeThemePreset('future')).toBeNull()
    expect(normalizeThemePreset('aurora')).toBeNull()
    expect(normalizeThemePreset('retro')).toBeNull()
    expect(normalizeThemePreset('neon')).toBeNull()
    expect(resolveThemePreset('neon')).toBe(DEFAULT_THEME_PRESET)

    expect(normalizeEditorFont('serif')).toBe('serif')
    expect(normalizeEditorFont('literary')).toBe('literary')
    expect(normalizeEditorFont('handwritten')).toBe('handwritten')
    expect(normalizeEditorFont('papyrus')).toBeNull()
    expect(resolveEditorFont('papyrus')).toBe(DEFAULT_EDITOR_FONT)
  })

  it('reads and writes mirrored startup appearance', () => {
    const storage = makeStorage()

    writeStoredThemePreset(storage, 'retro-terminal')
    writeStoredEditorFont(storage, 'mono')

    expect(readStoredThemePreset(storage)).toBe('retro-terminal')
    expect(readStoredEditorFont(storage)).toBe('mono')
    expect(storage.setItem).toHaveBeenCalledWith(THEME_PRESET_STORAGE_KEY, 'retro-terminal')
    expect(storage.setItem).toHaveBeenCalledWith(EDITOR_FONT_STORAGE_KEY, 'mono')
  })

  it('applies appearance attributes to the root document', () => {
    document.documentElement.setAttribute('data-theme', 'dark')
    applyAppearanceToDocument(document, {
      themePreset: 'constellation',
      editorFont: 'serif',
    })

    expect(document.documentElement).toHaveAttribute('data-theme-preset', 'constellation')
    expect(document.documentElement).toHaveAttribute('data-theme-definition-id', 'constellation')
    expect(document.documentElement).toHaveAttribute('data-theme-definition-mode', 'dark')
    expect(document.documentElement).toHaveAttribute('data-sidebar-artwork', 'grimoire-sigil')
    expect(document.documentElement).toHaveAttribute('data-editor-font', 'serif')
    expect(document.documentElement.style.getPropertyValue('--surface-editor')).toBe('#07111a')
    expect(document.documentElement.style.getPropertyValue('--background')).toBe('#07111a')
    expect(document.documentElement.style.getPropertyValue('--sidebar-artwork-opacity')).toBe('0.24')
  })

  it('bootstraps stored appearance choices', () => {
    const storage = makeStorage({
      [THEME_PRESET_STORAGE_KEY]: 'nocturne',
      [EDITOR_FONT_STORAGE_KEY]: 'readable',
    })

    expect(applyStoredAppearance(document, storage)).toEqual({
      themePreset: 'nocturne',
      editorFont: 'readable',
    })
    expect(document.documentElement).toHaveAttribute('data-theme-preset', 'nocturne')
    expect(document.documentElement).toHaveAttribute('data-editor-font', 'readable')
  })

  it('bootstraps a local-only theme pack override over the saved preset', () => {
    const storage = makeStorage({
      [THEME_PRESET_STORAGE_KEY]: 'nocturne',
      [EDITOR_FONT_STORAGE_KEY]: 'readable',
    })
    writeStoredLocalThemeDefinition(storage, THEME_PRESET_CATALOG[0])

    applyStoredAppearance(document, storage)

    expect(document.documentElement).toHaveAttribute('data-theme-preset', 'nocturne')
    expect(document.documentElement).toHaveAttribute('data-theme-definition-id', THEME_PRESET_CATALOG[0].id)
  })
})
