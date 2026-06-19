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
    // Grimoire ships exactly one theme preset now: morning-notebook (Warm Paper).
    expect(DEFAULT_THEME_PRESET).toBe('morning-notebook')
    expect(normalizeThemePreset('morning-notebook')).toBe('morning-notebook')
    // Legacy aliases that collapsed into the single warm-paper soul are coerced.
    expect(normalizeThemePreset('prabhat-studio')).toBe('morning-notebook')
    // Every retired preset id is no longer a valid value and normalizes to null.
    expect(normalizeThemePreset('constellation')).toBeNull()
    expect(normalizeThemePreset('daylight-notebook')).toBeNull()
    expect(normalizeThemePreset('living-archive')).toBeNull()
    expect(normalizeThemePreset('nocturne')).toBeNull()
    expect(normalizeThemePreset('code-notebook')).toBeNull()
    expect(normalizeThemePreset('research-cockpit')).toBeNull()
    expect(normalizeThemePreset('manuscript')).toBeNull()
    expect(normalizeThemePreset('classic')).toBeNull()
    expect(normalizeThemePreset('graphite')).toBeNull()
    expect(normalizeThemePreset('neon')).toBeNull()
    // Anything unknown — including retired presets — resolves to the warm-paper default.
    expect(resolveThemePreset('neon')).toBe(DEFAULT_THEME_PRESET)
    expect(resolveThemePreset('nocturne')).toBe('morning-notebook')

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

    writeStoredThemePreset(storage, 'morning-notebook')
    writeStoredEditorFont(storage, 'mono')
    writeStoredEditorLineHeight(storage, 'compact')
    writeStoredNativeShellMaterial(storage, 'glass-preview')

    expect(readStoredThemePreset(storage)).toBe('morning-notebook')
    expect(readStoredEditorFont(storage)).toBe('mono')
    expect(readStoredEditorLineHeight(storage)).toBe('compact')
    expect(readStoredNativeShellMaterial(storage)).toBe('glass-preview')
    expect(storage.setItem).toHaveBeenCalledWith(THEME_PRESET_STORAGE_KEY, 'morning-notebook')
    expect(storage.setItem).toHaveBeenCalledWith(EDITOR_FONT_STORAGE_KEY, 'mono')
    expect(storage.setItem).toHaveBeenCalledWith(EDITOR_LINE_HEIGHT_STORAGE_KEY, 'compact')
    expect(storage.setItem).toHaveBeenCalledWith(NATIVE_SHELL_MATERIAL_STORAGE_KEY, 'glass-preview')
  })

  it('applies appearance attributes to the root document', () => {
    // data-theme=dark selects the midnight-navy mode of the aurora preset.
    document.documentElement.setAttribute('data-theme', 'dark')
    applyAppearanceToDocument(document, {
      themePreset: 'morning-notebook',
      editorFont: 'literary',
      editorLineHeight: 'compact',
      nativeShellMaterial: 'unified',
    })

    expect(document.documentElement).toHaveAttribute('data-theme-preset', 'morning-notebook')
    expect(document.documentElement).toHaveAttribute('data-theme-definition-id', 'morning-notebook')
    expect(document.documentElement).toHaveAttribute('data-theme-definition-mode', 'dark')
    expect(document.documentElement).toHaveAttribute('data-theme-code-block', 'notebook')
    expect(document.documentElement).toHaveAttribute('data-theme-canvas', 'paper')
    expect(document.documentElement).toHaveAttribute('data-theme-density', 'comfortable')
    expect(document.documentElement).toHaveAttribute('data-theme-graph', 'ledger')
    expect(document.documentElement).toHaveAttribute('data-theme-heading', 'system')
    expect(document.documentElement).toHaveAttribute('data-theme-metadata-fields', 'type status modified locality')
    expect(document.documentElement).toHaveAttribute('data-theme-metadata-strip', 'badges')
    expect(document.documentElement).toHaveAttribute('data-theme-motion', 'standard')
    expect(document.documentElement).toHaveAttribute('data-sidebar-artwork', 'notebook-mark')
    expect(document.documentElement).toHaveAttribute('data-editor-font', 'literary')
    expect(document.documentElement).toHaveAttribute('data-editor-line-height', 'compact')
    expect(document.documentElement).toHaveAttribute('data-native-shell-material', 'unified')
    // Midnight-navy aurora surfaces — cool deep navy, no warm parchment anywhere.
    expect(document.documentElement.style.getPropertyValue('--surface-editor')).toBe('#0a0f14')
    expect(document.documentElement.style.getPropertyValue('--background')).toBe('#0a0f14')
    expect(document.documentElement.style.getPropertyValue('--editor-line-height')).toBe('1.34')
    // Aurora teal accent (#5ee0c8) is bright enough that filled controls take dark ink.
    expect(document.documentElement.style.getPropertyValue('--accent-blue')).toBe('#5ee0c8')
    expect(document.documentElement.style.getPropertyValue('--primary')).toBe('#5ee0c8')
    expect(document.documentElement.style.getPropertyValue('--primary-foreground')).toBe('#061217')
    expect(document.documentElement.style.getPropertyValue('--grimoire-code-block-radius')).toBe('8px')
    // Ledger graph uses a flat linear wash, not the old constellation radial glow.
    expect(document.documentElement.style.getPropertyValue('--grimoire-graph-bg')).toContain('linear-gradient')
    expect(document.documentElement.style.getPropertyValue('--grimoire-canvas-stage-bg')).toBe('var(--surface-editor)')
    expect(document.documentElement.style.getPropertyValue('--sidebar-artwork-opacity')).toBe('0.16')
    expect(document.documentElement.style.getPropertyValue('--motion-duration-panel')).toBe('260ms')
  })

  it('bootstraps stored appearance choices', () => {
    // A retired preset id in storage is coerced to the single warm-paper preset,
    // while the rest of the mirrored choices are bootstrapped verbatim.
    const storage = makeStorage({
      [THEME_PRESET_STORAGE_KEY]: 'morning-notebook',
      [EDITOR_FONT_STORAGE_KEY]: 'readable',
      [EDITOR_LINE_HEIGHT_STORAGE_KEY]: 'spacious',
      [NATIVE_SHELL_MATERIAL_STORAGE_KEY]: 'unified',
    })

    expect(applyStoredAppearance(document, storage)).toEqual({
      themePreset: 'morning-notebook',
      editorFont: 'readable',
      editorLineHeight: 'spacious',
      nativeShellMaterial: 'unified',
    })
    expect(document.documentElement).toHaveAttribute('data-theme-preset', 'morning-notebook')
    expect(document.documentElement).toHaveAttribute('data-editor-font', 'readable')
    expect(document.documentElement).toHaveAttribute('data-editor-line-height', 'spacious')
    expect(document.documentElement).toHaveAttribute('data-native-shell-material', 'unified')
  })

  it('coerces a retired stored preset id to the warm-paper default', () => {
    const storage = makeStorage({
      [THEME_PRESET_STORAGE_KEY]: 'nocturne',
      [EDITOR_FONT_STORAGE_KEY]: 'readable',
    })

    expect(applyStoredAppearance(document, storage)).toMatchObject({
      themePreset: 'morning-notebook',
      editorFont: 'readable',
    })
    expect(document.documentElement).toHaveAttribute('data-theme-preset', 'morning-notebook')
    expect(document.documentElement).toHaveAttribute('data-theme-definition-id', 'morning-notebook')
  })

  it('migrates legacy mirrored theme preset ids during startup', () => {
    const storage = makeStorage({
      [THEME_PRESET_STORAGE_KEY]: 'prabhat-studio',
      [EDITOR_FONT_STORAGE_KEY]: 'readable',
    })

    expect(applyStoredAppearance(document, storage)).toMatchObject({
      themePreset: 'morning-notebook',
      editorFont: 'readable',
    })
    expect(document.documentElement).toHaveAttribute('data-theme-preset', 'morning-notebook')
    expect(document.documentElement).toHaveAttribute('data-theme-definition-id', 'morning-notebook')
  })

  it('bootstraps a local-only theme pack override over the saved preset', () => {
    const storage = makeStorage({
      [THEME_PRESET_STORAGE_KEY]: 'nocturne',
      [EDITOR_FONT_STORAGE_KEY]: 'readable',
    })
    // A local pack is a custom definition with its own id, distinct from the
    // single built-in warm-paper preset, so the override is observable.
    const localPack = { ...THEME_PRESET_CATALOG[0], id: 'sriinnu-local-pack' }
    writeStoredLocalThemeDefinition(storage, localPack)

    applyStoredAppearance(document, storage)

    // The retired stored preset id still coerces to the warm-paper default...
    expect(document.documentElement).toHaveAttribute('data-theme-preset', 'morning-notebook')
    // ...but the local theme pack wins for the live definition that renders.
    expect(document.documentElement).toHaveAttribute('data-theme-definition-id', 'sriinnu-local-pack')
  })
})
