import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  EDITOR_FONT_STORAGE_KEY,
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
    document.documentElement.classList.remove('dark')
    window.localStorage.clear()
  })

  it('waits until settings have loaded', () => {
    renderHook(() => useAppearanceSettings({
      themeMode: 'dark',
      themePreset: 'nocturne',
      editorFont: 'mono',
      loaded: false,
    }))

    expect(document.documentElement).not.toHaveAttribute('data-theme')
    expect(document.documentElement).not.toHaveAttribute('data-theme-preset')
  })

  it('applies and mirrors loaded appearance settings', () => {
    renderHook(() => useAppearanceSettings({
      themeMode: 'dark',
      themePreset: 'living-archive',
      editorFont: 'serif',
      loaded: true,
    }))

    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
    expect(document.documentElement).toHaveAttribute('data-theme-preset', 'living-archive')
    expect(document.documentElement).toHaveAttribute('data-editor-font', 'serif')
    expect(window.localStorage.getItem(THEME_PRESET_STORAGE_KEY)).toBe('living-archive')
    expect(window.localStorage.getItem(EDITOR_FONT_STORAGE_KEY)).toBe('serif')
  })

  it('uses mirrored appearance when persisted settings are empty', () => {
    window.localStorage.setItem(THEME_PRESET_STORAGE_KEY, 'nocturne')
    window.localStorage.setItem(EDITOR_FONT_STORAGE_KEY, 'readable')

    renderHook(() => useAppearanceSettings({
      themeMode: null,
      themePreset: null,
      editorFont: null,
      loaded: true,
    }))

    expect(document.documentElement).toHaveAttribute('data-theme-preset', 'nocturne')
    expect(document.documentElement).toHaveAttribute('data-editor-font', 'readable')
  })

  it('refreshes mode-specific theme tokens when light/dark changes', () => {
    const { rerender } = renderHook(
      ({ themeMode }) => useAppearanceSettings({
        themeMode,
        themePreset: 'nocturne',
        editorFont: 'system',
        loaded: true,
      }),
      { initialProps: { themeMode: 'light' as 'light' | 'dark' } },
    )

    expect(document.documentElement).toHaveAttribute('data-theme-definition-mode', 'light')
    expect(document.documentElement.style.getPropertyValue('--surface-app')).toBe('#f7faf8')

    rerender({ themeMode: 'dark' })

    expect(document.documentElement).toHaveAttribute('data-theme-definition-mode', 'dark')
    expect(document.documentElement.style.getPropertyValue('--surface-app')).toBe('#141513')
  })

  it('applies local-only theme pack changes without changing the saved preset', () => {
    renderHook(() => useAppearanceSettings({
      themeMode: 'dark',
      themePreset: 'nocturne',
      editorFont: 'system',
      loaded: true,
    }))

    writeStoredLocalThemeDefinition(window.localStorage, THEME_PRESET_CATALOG[0])
    emitLocalThemePackChange()

    expect(document.documentElement).toHaveAttribute('data-theme-preset', 'nocturne')
    expect(document.documentElement).toHaveAttribute('data-theme-definition-id', THEME_PRESET_CATALOG[0].id)
  })
})
