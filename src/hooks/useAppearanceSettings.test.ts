import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  EDITOR_FONT_STORAGE_KEY,
  EDITOR_LINE_HEIGHT_STORAGE_KEY,
  NATIVE_SHELL_MATERIAL_STORAGE_KEY,
  THEME_PRESET_STORAGE_KEY,
} from '../lib/appearance'
import {
  emitLocalThemePackChange,
  writeStoredLocalThemeDefinition,
} from '../themes/localThemePacks'
import { THEME_PRESET_CATALOG } from '../themes/themeRegistry'
import { useAppearanceSettings } from './useAppearanceSettings'

function createStorageMock(): Storage {
  const values = new Map<string, string>()
  return {
    get length() { return values.size },
    clear: vi.fn(() => { values.clear() }),
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    key: vi.fn((index: number) => Array.from(values.keys())[index] ?? null),
    removeItem: vi.fn((key: string) => { values.delete(key) }),
    setItem: vi.fn((key: string, value: string) => { values.set(key, value) }),
  }
}

describe('useAppearanceSettings', () => {
  const localStorageMock = createStorageMock()

  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', { value: localStorageMock, configurable: true })
    document.documentElement.removeAttribute('data-theme')
    document.documentElement.removeAttribute('data-theme-preset')
    document.documentElement.removeAttribute('data-editor-font')
    document.documentElement.removeAttribute('data-editor-line-height')
    document.documentElement.removeAttribute('data-native-shell-material')
    document.documentElement.classList.remove('dark')
    window.localStorage.clear()
  })

  it('waits until settings have loaded', () => {
    renderHook(() => useAppearanceSettings({
      themeMode: 'dark',
      themePreset: 'morning-notebook',
      editorFont: 'mono',
      loaded: false,
    }))

    expect(document.documentElement).not.toHaveAttribute('data-theme')
    expect(document.documentElement).not.toHaveAttribute('data-theme-preset')
  })

  it('applies and mirrors loaded appearance settings', () => {
    renderHook(() => useAppearanceSettings({
      themeMode: 'dark',
      themePreset: 'morning-notebook',
      editorFont: 'literary',
      editorLineHeight: 'compact',
      nativeShellMaterial: 'glass-preview',
      loaded: true,
    }))

    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
    expect(document.documentElement).toHaveAttribute('data-theme-preset', 'morning-notebook')
    expect(document.documentElement).toHaveAttribute('data-editor-font', 'literary')
    expect(document.documentElement).toHaveAttribute('data-editor-line-height', 'compact')
    expect(document.documentElement).toHaveAttribute('data-native-shell-material', 'glass-preview')
    expect(window.localStorage.getItem(THEME_PRESET_STORAGE_KEY)).toBe('morning-notebook')
    expect(window.localStorage.getItem(EDITOR_FONT_STORAGE_KEY)).toBe('literary')
    expect(window.localStorage.getItem(EDITOR_LINE_HEIGHT_STORAGE_KEY)).toBe('compact')
    expect(window.localStorage.getItem(NATIVE_SHELL_MATERIAL_STORAGE_KEY)).toBe('glass-preview')
  })

  it('uses mirrored appearance when persisted settings are empty', () => {
    window.localStorage.setItem(THEME_PRESET_STORAGE_KEY, 'morning-notebook')
    window.localStorage.setItem(EDITOR_FONT_STORAGE_KEY, 'readable')
    window.localStorage.setItem(EDITOR_LINE_HEIGHT_STORAGE_KEY, 'spacious')
    window.localStorage.setItem(NATIVE_SHELL_MATERIAL_STORAGE_KEY, 'unified')

    renderHook(() => useAppearanceSettings({
      themeMode: null,
      themePreset: null,
      editorFont: null,
      editorLineHeight: null,
      nativeShellMaterial: null,
      loaded: true,
    }))

    expect(document.documentElement).toHaveAttribute('data-theme-preset', 'morning-notebook')
    expect(document.documentElement).toHaveAttribute('data-editor-font', 'readable')
    expect(document.documentElement).toHaveAttribute('data-editor-line-height', 'spacious')
    expect(document.documentElement).toHaveAttribute('data-native-shell-material', 'unified')
  })

  it('refreshes mode-specific theme tokens when light/dark changes', () => {
    const { rerender } = renderHook(
      ({ themeMode }) => useAppearanceSettings({
        themeMode,
        themePreset: 'morning-notebook',
        editorFont: 'system',
        loaded: true,
      }),
      { initialProps: { themeMode: 'light' as 'light' | 'dark' } },
    )

    expect(document.documentElement).toHaveAttribute('data-theme-definition-mode', 'light')
    expect(document.documentElement.style.getPropertyValue('--surface-app')).toBe('#f1e9d8')

    rerender({ themeMode: 'dark' })

    expect(document.documentElement).toHaveAttribute('data-theme-definition-mode', 'dark')
    expect(document.documentElement.style.getPropertyValue('--surface-app')).toBe('#16130d')
  })

  it('applies local-only theme pack changes without changing the saved preset', () => {
    renderHook(() => useAppearanceSettings({
      themeMode: 'dark',
      themePreset: 'morning-notebook',
      editorFont: 'system',
      loaded: true,
    }))

    writeStoredLocalThemeDefinition(window.localStorage, THEME_PRESET_CATALOG[0])
    emitLocalThemePackChange()

    expect(document.documentElement).toHaveAttribute('data-theme-preset', 'morning-notebook')
    expect(document.documentElement).toHaveAttribute('data-theme-definition-id', THEME_PRESET_CATALOG[0].id)
  })

  it('applies local theme density and motion as root runtime tokens', () => {
    const localTheme = {
      ...THEME_PRESET_CATALOG[0],
      editor: { ...THEME_PRESET_CATALOG[0].editor, codeBlockStyle: 'terminal' as const },
      density: { scale: 'spacious' as const },
      motion: { profile: 'calm' as const },
      visuals: { graphStyle: 'terminal' as const, canvasStyle: 'blueprint' as const },
    }

    renderHook(() => useAppearanceSettings({
      themeMode: 'dark',
      themePreset: 'morning-notebook',
      editorFont: 'system',
      loaded: true,
    }))

    writeStoredLocalThemeDefinition(window.localStorage, localTheme)
    emitLocalThemePackChange()

    expect(document.documentElement).toHaveAttribute('data-theme-density', 'spacious')
    expect(document.documentElement).toHaveAttribute('data-theme-motion', 'calm')
    expect(document.documentElement).toHaveAttribute('data-theme-code-block', 'terminal')
    expect(document.documentElement).toHaveAttribute('data-theme-graph', 'terminal')
    expect(document.documentElement).toHaveAttribute('data-theme-canvas', 'blueprint')
    expect(document.documentElement.style.getPropertyValue('--grimoire-density-panel-padding')).toBe('20px')
    expect(document.documentElement.style.getPropertyValue('--grimoire-code-block-radius')).toBe('6px')
    expect(document.documentElement.style.getPropertyValue('--grimoire-graph-edge-relationship')).toBe('var(--primary)')
    expect(document.documentElement.style.getPropertyValue('--grimoire-canvas-stage-bg')).toContain('var(--primary)')
    expect(document.documentElement.style.getPropertyValue('--motion-duration-panel')).toBe('180ms')
  })

  it('lets a local theme pack override heading and body font roles', () => {
    const localTheme = {
      ...THEME_PRESET_CATALOG[0],
      typography: {
        display: "'Theme Display', serif",
        editor: "'Theme Body', system-ui, sans-serif",
      },
    }

    renderHook(() => useAppearanceSettings({
      themeMode: 'dark',
      themePreset: 'morning-notebook',
      editorFont: 'mono',
      loaded: true,
    }))

    writeStoredLocalThemeDefinition(window.localStorage, localTheme)
    emitLocalThemePackChange()

    expect(document.documentElement.style.getPropertyValue('--grimoire-display-font-family')).toContain('Theme Display')
    expect(document.documentElement.style.getPropertyValue('--grimoire-editor-font-family')).toContain('Theme Body')
  })
})
