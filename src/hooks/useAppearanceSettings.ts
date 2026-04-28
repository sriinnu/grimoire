import { useEffect } from 'react'
import {
  applyAppearanceToDocument,
  readStoredEditorFont,
  readStoredThemePreset,
  resolveEditorFont,
  resolveThemePreset,
  writeStoredEditorFont,
  writeStoredThemePreset,
} from '../lib/appearance'
import type { EditorFont, ThemePreset } from '../lib/appearance'
import type { ThemeMode } from '../lib/themeMode'
import { useThemeMode } from './useThemeMode'

interface AppearanceSettingsInput {
  themeMode: ThemeMode | null | undefined
  themePreset: ThemePreset | null | undefined
  editorFont: EditorFont | null | undefined
  loaded: boolean
}

/** Applies persisted appearance settings to the root document once settings are loaded. */
export function useAppearanceSettings({
  themeMode,
  themePreset,
  editorFont,
  loaded,
}: AppearanceSettingsInput): void {
  useThemeMode(themeMode, loaded)

  useEffect(() => {
    if (!loaded) return

    const resolvedThemePreset = resolveThemePreset(
      themePreset ?? readStoredThemePreset(window.localStorage),
    )
    const resolvedEditorFont = resolveEditorFont(
      editorFont ?? readStoredEditorFont(window.localStorage),
    )

    applyAppearanceToDocument(document, {
      themePreset: resolvedThemePreset,
      editorFont: resolvedEditorFont,
    })
    writeStoredThemePreset(window.localStorage, resolvedThemePreset)
    writeStoredEditorFont(window.localStorage, resolvedEditorFont)
  }, [editorFont, loaded, themePreset])
}
