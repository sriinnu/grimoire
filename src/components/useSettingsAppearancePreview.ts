import { useCallback, useEffect, useRef } from 'react'
import {
  applyAppearanceToDocument,
  type EditorFont,
  type ThemePreset,
} from '../lib/appearance'
import { loadFontAssetsForAppearance } from '../lib/fontConfig'
import {
  applyThemeModeToDocument,
  type ThemeMode,
} from '../lib/themeMode'

export interface SettingsAppearanceState {
  themeMode: ThemeMode
  themePreset: ThemePreset
  editorFont: EditorFont
}

interface SettingsAppearancePreviewInput {
  draft: SettingsAppearanceState
  saved: SettingsAppearanceState
}

function applySettingsAppearance(state: SettingsAppearanceState): void {
  const appearance = {
    themePreset: state.themePreset,
    editorFont: state.editorFont,
  }
  applyThemeModeToDocument(document, state.themeMode)
  applyAppearanceToDocument(document, appearance)
  void loadFontAssetsForAppearance(document, appearance)
}

/** Applies settings appearance edits immediately, reverting them on close unless saved. */
export function useSettingsAppearancePreview({
  draft,
  saved,
}: SettingsAppearancePreviewInput): { commitAppearancePreview: () => void } {
  const savedRef = useRef(saved)
  const committedRef = useRef(false)

  useEffect(() => {
    savedRef.current = saved
  }, [saved])

  useEffect(() => {
    applySettingsAppearance(draft)
  }, [draft])

  useEffect(() => () => {
    if (committedRef.current) return
    applySettingsAppearance(savedRef.current)
  }, [])

  const commitAppearancePreview = useCallback(() => {
    committedRef.current = true
  }, [])

  return { commitAppearancePreview }
}
