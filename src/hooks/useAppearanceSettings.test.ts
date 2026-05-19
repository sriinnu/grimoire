import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  EDITOR_FONT_STORAGE_KEY,
  THEME_PRESET_STORAGE_KEY,
} from '../lib/appearance'
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
      themePreset: 'manuscript',
      editorFont: 'serif',
      loaded: true,
    }))

    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
    expect(document.documentElement).toHaveAttribute('data-theme-preset', 'manuscript')
    expect(document.documentElement).toHaveAttribute('data-editor-font', 'serif')
    expect(window.localStorage.getItem(THEME_PRESET_STORAGE_KEY)).toBe('manuscript')
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
})
