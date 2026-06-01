import { renderHook, act } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useSettingsAppearancePreview } from './useSettingsAppearancePreview'

describe('useSettingsAppearancePreview', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme')
    document.documentElement.removeAttribute('data-theme-preset')
    document.documentElement.removeAttribute('data-editor-font')
    document.documentElement.removeAttribute('data-editor-line-height')
    document.documentElement.removeAttribute('data-native-shell-material')
    document.documentElement.classList.remove('dark')
  })

  it('applies draft appearance immediately and reverts on unmount when unsaved', () => {
    const { unmount } = renderHook(() => useSettingsAppearancePreview({
      draft: {
        themeMode: 'dark',
        themePreset: 'retro-terminal',
        editorFont: 'literary',
        editorLineHeight: 'compact',
        nativeShellMaterial: 'glass-preview',
      },
      saved: {
        themeMode: 'light',
        themePreset: 'living-archive',
        editorFont: 'system',
        editorLineHeight: 'spacious',
        nativeShellMaterial: 'unified',
      },
    }))

    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
    expect(document.documentElement).toHaveAttribute('data-theme-preset', 'retro-terminal')
    expect(document.documentElement).toHaveAttribute('data-editor-font', 'literary')
    expect(document.documentElement).toHaveAttribute('data-editor-line-height', 'compact')
    expect(document.documentElement).toHaveAttribute('data-native-shell-material', 'glass-preview')

    unmount()

    expect(document.documentElement).toHaveAttribute('data-theme', 'light')
    expect(document.documentElement).toHaveAttribute('data-theme-preset', 'living-archive')
    expect(document.documentElement).toHaveAttribute('data-editor-font', 'system')
    expect(document.documentElement).toHaveAttribute('data-editor-line-height', 'spacious')
    expect(document.documentElement).toHaveAttribute('data-native-shell-material', 'unified')
  })

  it('keeps draft appearance on unmount after commit', () => {
    const { result, unmount } = renderHook(() => useSettingsAppearancePreview({
      draft: {
        themeMode: 'dark',
        themePreset: 'living-archive',
        editorFont: 'literary',
        editorLineHeight: 'spacious',
        nativeShellMaterial: 'glass-preview',
      },
      saved: {
        themeMode: 'light',
        themePreset: 'nocturne',
        editorFont: 'system',
        editorLineHeight: 'comfortable',
        nativeShellMaterial: 'unified',
      },
    }))

    act(() => result.current.commitAppearancePreview())
    unmount()

    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
    expect(document.documentElement).toHaveAttribute('data-theme-preset', 'living-archive')
    expect(document.documentElement).toHaveAttribute('data-editor-font', 'literary')
    expect(document.documentElement).toHaveAttribute('data-editor-line-height', 'spacious')
    expect(document.documentElement).toHaveAttribute('data-native-shell-material', 'glass-preview')
  })
})
