import { useCallback, useEffect, useRef } from 'react'
import {
  applyAppearanceToDocument,
  type EditorFont,
  type EditorLineHeight,
  type NativeShellMaterial,
  type ResolvedAppearance,
  type ThemePreset,
} from '../lib/appearance'
import { loadFontAssetsForAppearance } from '../lib/fontConfig'
import {
  applyThemeModeToDocument,
  type ThemeMode,
} from '../lib/themeMode'
import { readStoredLocalThemeDefinition } from '../themes/localThemePacks'

export interface SettingsAppearanceState {
  themeMode: ThemeMode
  themePreset: ThemePreset
  editorFont: EditorFont
  editorLineHeight: EditorLineHeight
  nativeShellMaterial: NativeShellMaterial
}

interface SettingsAppearancePreviewInput {
  draft: SettingsAppearanceState
  saved: SettingsAppearanceState
}

function applySettingsAppearance(state: SettingsAppearanceState): void {
  const appearance: ResolvedAppearance = {
    themePreset: state.themePreset,
    editorFont: state.editorFont,
    editorLineHeight: state.editorLineHeight,
    nativeShellMaterial: state.nativeShellMaterial,
  }
  const localThemeDefinition = readStoredLocalThemeDefinition(window.localStorage)
  if (localThemeDefinition) appearance.themeDefinition = localThemeDefinition
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
