import { describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_EDITOR_FONT,
  DEFAULT_EDITOR_LINE_HEIGHT,
  DEFAULT_NATIVE_SHELL_MATERIAL,
  DEFAULT_THEME_PRESET,
  EDITOR_FONT_STORAGE_KEY,
  EDITOR_LINE_HEIGHT_STORAGE_KEY,
  NATIVE_SHELL_MATERIAL_STORAGE_KEY,
  THEME_PRESET_STORAGE_KEY,
  applyAppearanceToDocument,
  applyStoredAppearance,
  normalizeEditorFont,
  normalizeEditorLineHeight,
  normalizeNativeShellMaterial,
  normalizeThemePreset,
  readStoredEditorLineHeight,
  readStoredEditorFont,
  readStoredNativeShellMaterial,
  readStoredThemePreset,
  resolveEditorLineHeight,
  resolveEditorFont,
  resolveNativeShellMaterial,
  resolveThemePreset,
  writeStoredEditorLineHeight,
  writeStoredEditorFont,
  writeStoredNativeShellMaterial,
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

    expect(normalizeEditorFont('serif')).toBe('literary')
    expect(normalizeEditorFont('literary')).toBe('literary')
    expect(normalizeEditorFont('editorial')).toBe('editorial')
    expect(normalizeEditorFont('manuscript')).toBe('manuscript')
    expect(normalizeEditorFont('humanist')).toBe('humanist')
    expect(normalizeEditorFont('handwritten')).toBe('literary')
    expect(normalizeEditorFont('compact')).toBe('system')
    expect(normalizeEditorFont('papyrus')).toBeNull()
    expect(resolveEditorFont('papyrus')).toBe(DEFAULT_EDITOR_FONT)

    expect(normalizeEditorLineHeight('compact')).toBe('compact')
    expect(normalizeEditorLineHeight('comfortable')).toBe('comfortable')
    expect(normalizeEditorLineHeight('spacious')).toBe('spacious')
    expect(normalizeEditorLineHeight('huge')).toBeNull()
    expect(resolveEditorLineHeight('huge')).toBe(DEFAULT_EDITOR_LINE_HEIGHT)

    expect(normalizeNativeShellMaterial('standard')).toBe('standard')
    expect(normalizeNativeShellMaterial('unified')).toBe('unified')
    expect(normalizeNativeShellMaterial('glass-preview')).toBe('glass-preview')
    expect(normalizeNativeShellMaterial('transparent-private-api')).toBeNull()
    expect(resolveNativeShellMaterial('transparent-private-api')).toBe(DEFAULT_NATIVE_SHELL_MATERIAL)
  })

  it('reads and writes mirrored startup appearance', () => {
    const storage = makeStorage()

    writeStoredThemePreset(storage, 'retro-terminal')
    writeStoredEditorFont(storage, 'mono')
    writeStoredEditorLineHeight(storage, 'compact')
    writeStoredNativeShellMaterial(storage, 'glass-preview')

    expect(readStoredThemePreset(storage)).toBe('retro-terminal')
    expect(readStoredEditorFont(storage)).toBe('mono')
    expect(readStoredEditorLineHeight(storage)).toBe('compact')
    expect(readStoredNativeShellMaterial(storage)).toBe('glass-preview')
    expect(storage.setItem).toHaveBeenCalledWith(THEME_PRESET_STORAGE_KEY, 'retro-terminal')
    expect(storage.setItem).toHaveBeenCalledWith(EDITOR_FONT_STORAGE_KEY, 'mono')
    expect(storage.setItem).toHaveBeenCalledWith(EDITOR_LINE_HEIGHT_STORAGE_KEY, 'compact')
    expect(storage.setItem).toHaveBeenCalledWith(NATIVE_SHELL_MATERIAL_STORAGE_KEY, 'glass-preview')
  })

  it('applies appearance attributes to the root document', () => {
    document.documentElement.setAttribute('data-theme', 'dark')
    applyAppearanceToDocument(document, {
      themePreset: 'constellation',
      editorFont: 'literary',
      editorLineHeight: 'compact',
      nativeShellMaterial: 'unified',
    })

    expect(document.documentElement).toHaveAttribute('data-theme-preset', 'constellation')
    expect(document.documentElement).toHaveAttribute('data-theme-definition-id', 'constellation')
    expect(document.documentElement).toHaveAttribute('data-theme-definition-mode', 'dark')
    expect(document.documentElement).toHaveAttribute('data-theme-code-block', 'notebook')
    expect(document.documentElement).toHaveAttribute('data-theme-canvas', 'blueprint')
    expect(document.documentElement).toHaveAttribute('data-theme-density', 'comfortable')
    expect(document.documentElement).toHaveAttribute('data-theme-graph', 'constellation')
    expect(document.documentElement).toHaveAttribute('data-theme-heading', 'graph')
    expect(document.documentElement).toHaveAttribute('data-theme-metadata-fields', 'type status owner modified locality')
    expect(document.documentElement).toHaveAttribute('data-theme-metadata-strip', 'badges')
    expect(document.documentElement).toHaveAttribute('data-theme-motion', 'expressive')
    expect(document.documentElement).toHaveAttribute('data-sidebar-artwork', 'grimoire-sigil')
    expect(document.documentElement).toHaveAttribute('data-editor-font', 'literary')
    expect(document.documentElement).toHaveAttribute('data-editor-line-height', 'compact')
    expect(document.documentElement).toHaveAttribute('data-native-shell-material', 'unified')
    expect(document.documentElement.style.getPropertyValue('--surface-editor')).toBe('#07111a')
    expect(document.documentElement.style.getPropertyValue('--editor-line-height')).toBe('1.34')
    expect(document.documentElement.style.getPropertyValue('--background')).toBe('#07111a')
    expect(document.documentElement.style.getPropertyValue('--grimoire-code-block-radius')).toBe('8px')
    expect(document.documentElement.style.getPropertyValue('--grimoire-graph-bg')).toContain('radial-gradient')
    expect(document.documentElement.style.getPropertyValue('--grimoire-canvas-stage-bg')).toContain('var(--primary)')
    expect(document.documentElement.style.getPropertyValue('--sidebar-artwork-opacity')).toBe('0.24')
    expect(document.documentElement.style.getPropertyValue('--motion-duration-panel')).toBe('340ms')
  })

  it('bootstraps stored appearance choices', () => {
    const storage = makeStorage({
      [THEME_PRESET_STORAGE_KEY]: 'nocturne',
      [EDITOR_FONT_STORAGE_KEY]: 'readable',
      [EDITOR_LINE_HEIGHT_STORAGE_KEY]: 'spacious',
      [NATIVE_SHELL_MATERIAL_STORAGE_KEY]: 'unified',
    })

    expect(applyStoredAppearance(document, storage)).toEqual({
      themePreset: 'nocturne',
      editorFont: 'readable',
      editorLineHeight: 'spacious',
      nativeShellMaterial: 'unified',
    })
    expect(document.documentElement).toHaveAttribute('data-theme-preset', 'nocturne')
    expect(document.documentElement).toHaveAttribute('data-editor-font', 'readable')
    expect(document.documentElement).toHaveAttribute('data-editor-line-height', 'spacious')
    expect(document.documentElement).toHaveAttribute('data-native-shell-material', 'unified')
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
