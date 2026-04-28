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
    expect(normalizeThemePreset('manuscript')).toBe('manuscript')
    expect(normalizeThemePreset('neon')).toBeNull()
    expect(resolveThemePreset('neon')).toBe(DEFAULT_THEME_PRESET)

    expect(normalizeEditorFont('serif')).toBe('serif')
    expect(normalizeEditorFont('papyrus')).toBeNull()
    expect(resolveEditorFont('papyrus')).toBe(DEFAULT_EDITOR_FONT)
  })

  it('reads and writes mirrored startup appearance', () => {
    const storage = makeStorage()

    writeStoredThemePreset(storage, 'graphite')
    writeStoredEditorFont(storage, 'mono')

    expect(readStoredThemePreset(storage)).toBe('graphite')
    expect(readStoredEditorFont(storage)).toBe('mono')
    expect(storage.setItem).toHaveBeenCalledWith(THEME_PRESET_STORAGE_KEY, 'graphite')
    expect(storage.setItem).toHaveBeenCalledWith(EDITOR_FONT_STORAGE_KEY, 'mono')
  })

  it('applies appearance attributes to the root document', () => {
    applyAppearanceToDocument(document, {
      themePreset: 'manuscript',
      editorFont: 'serif',
    })

    expect(document.documentElement).toHaveAttribute('data-theme-preset', 'manuscript')
    expect(document.documentElement).toHaveAttribute('data-editor-font', 'serif')
  })

  it('bootstraps stored appearance choices', () => {
    const storage = makeStorage({
      [THEME_PRESET_STORAGE_KEY]: 'graphite',
      [EDITOR_FONT_STORAGE_KEY]: 'readable',
    })

    expect(applyStoredAppearance(document, storage)).toEqual({
      themePreset: 'graphite',
      editorFont: 'readable',
    })
    expect(document.documentElement).toHaveAttribute('data-theme-preset', 'graphite')
    expect(document.documentElement).toHaveAttribute('data-editor-font', 'readable')
  })
})
