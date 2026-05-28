import { useEffect } from 'react'
import {
  applyAppearanceToDocument,
  readStoredEditorFont,
  readStoredNativeShellMaterial,
  readStoredThemePreset,
  resolveEditorFont,
  resolveNativeShellMaterial,
  resolveThemePreset,
  type ResolvedAppearance,
  writeStoredEditorFont,
  writeStoredNativeShellMaterial,
  writeStoredThemePreset,
} from '../lib/appearance'
import type { EditorFont, NativeShellMaterial, ThemePreset } from '../lib/appearance'
import { loadFontAssetsForAppearance } from '../lib/fontConfig'
import type { ThemeMode } from '../lib/themeMode'
import {
  LOCAL_THEME_PACK_CHANGE_EVENT,
  LOCAL_THEME_PACK_STORAGE_KEY,
  readStoredLocalThemeDefinition,
  refreshDevelopmentThemePack,
} from '../themes/localThemePacks'
import { useThemeMode } from './useThemeMode'

interface AppearanceSettingsInput {
  themeMode: ThemeMode | null | undefined
  themePreset: ThemePreset | null | undefined
  editorFont: EditorFont | null | undefined
  nativeShellMaterial?: NativeShellMaterial | null | undefined
  loaded: boolean
}

function buildResolvedAppearance(
  themePreset: ThemePreset,
  editorFont: EditorFont,
  nativeShellMaterial: NativeShellMaterial,
): ResolvedAppearance {
  const appearance: ResolvedAppearance = { themePreset, editorFont, nativeShellMaterial }
  const localThemeDefinition = readStoredLocalThemeDefinition(window.localStorage)
  if (localThemeDefinition) appearance.themeDefinition = localThemeDefinition
  return appearance
}

/** Applies persisted appearance settings to the root document once settings are loaded. */
export function useAppearanceSettings({
  themeMode,
  themePreset,
  editorFont,
  nativeShellMaterial,
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
    const resolvedNativeShellMaterial = resolveNativeShellMaterial(
      nativeShellMaterial ?? readStoredNativeShellMaterial(window.localStorage),
    )

    const applyResolvedAppearance = () => {
      const appearance = buildResolvedAppearance(
        resolvedThemePreset,
        resolvedEditorFont,
        resolvedNativeShellMaterial,
      )
      applyAppearanceToDocument(document, appearance)
      void loadFontAssetsForAppearance(document, appearance)
    }

    applyResolvedAppearance()
    writeStoredThemePreset(window.localStorage, resolvedThemePreset)
    writeStoredEditorFont(window.localStorage, resolvedEditorFont)
    writeStoredNativeShellMaterial(window.localStorage, resolvedNativeShellMaterial)

    const handleStorage = (event: StorageEvent) => {
      if (event.key === LOCAL_THEME_PACK_STORAGE_KEY) applyResolvedAppearance()
    }
    const handleLocalThemePackChange = () => applyResolvedAppearance()
    window.addEventListener('storage', handleStorage)
    window.addEventListener(LOCAL_THEME_PACK_CHANGE_EVENT, handleLocalThemePackChange)

    const hot = import.meta.hot
    if (hot && typeof hot.on === 'function' && typeof fetch === 'function') {
      const refreshDevThemePack = () => {
        void refreshDevelopmentThemePack(window.localStorage).then((result) => {
          if (result.status !== 'invalid') applyResolvedAppearance()
        })
      }
      hot.on('grimoire:local-theme-pack-changed', refreshDevThemePack)
      refreshDevThemePack()
      return () => {
        window.removeEventListener('storage', handleStorage)
        window.removeEventListener(LOCAL_THEME_PACK_CHANGE_EVENT, handleLocalThemePackChange)
        if (typeof hot.off === 'function') {
          hot.off('grimoire:local-theme-pack-changed', refreshDevThemePack)
        }
      }
    }

    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener(LOCAL_THEME_PACK_CHANGE_EVENT, handleLocalThemePackChange)
    }
  }, [editorFont, loaded, nativeShellMaterial, themeMode, themePreset])
}
