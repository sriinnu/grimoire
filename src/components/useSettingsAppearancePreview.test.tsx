import { renderHook, act } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useSettingsAppearancePreview } from './useSettingsAppearancePreview'

describe('useSettingsAppearancePreview', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme')
    document.documentElement.removeAttribute('data-theme-preset')
    document.documentElement.removeAttribute('data-editor-font')
    document.documentElement.classList.remove('dark')
  })

  it('applies draft appearance immediately and reverts on unmount when unsaved', () => {
    const { unmount } = renderHook(() => useSettingsAppearancePreview({
      draft: {
        themeMode: 'dark',
        themePreset: 'retro-terminal',
        editorFont: 'handwritten',
      },
      saved: {
        themeMode: 'light',
        themePreset: 'manuscript',
        editorFont: 'system',
      },
    }))

    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
    expect(document.documentElement).toHaveAttribute('data-theme-preset', 'retro-terminal')
    expect(document.documentElement).toHaveAttribute('data-editor-font', 'handwritten')

    unmount()

    expect(document.documentElement).toHaveAttribute('data-theme', 'light')
    expect(document.documentElement).toHaveAttribute('data-theme-preset', 'manuscript')
    expect(document.documentElement).toHaveAttribute('data-editor-font', 'system')
  })

  it('keeps draft appearance on unmount after commit', () => {
    const { result, unmount } = renderHook(() => useSettingsAppearancePreview({
      draft: {
        themeMode: 'dark',
        themePreset: 'manuscript',
        editorFont: 'serif',
      },
      saved: {
        themeMode: 'light',
        themePreset: 'nocturne',
        editorFont: 'system',
      },
    }))

    act(() => result.current.commitAppearancePreview())
    unmount()

    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
    expect(document.documentElement).toHaveAttribute('data-theme-preset', 'manuscript')
    expect(document.documentElement).toHaveAttribute('data-editor-font', 'serif')
  })
})
