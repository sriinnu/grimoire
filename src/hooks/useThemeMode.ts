import { useEffect } from 'react'
import {
  applyThemeModeToDocument,
  DEFAULT_THEME_MODE,
  resolveInitialThemeMode,
  writeStoredThemeMode,
  type ThemeMode,
} from '../lib/themeMode'

function resolveRuntimeThemeMode(themeMode: ThemeMode | null | undefined): ThemeMode {
  if (themeMode) return themeMode
  if (typeof window === 'undefined') return DEFAULT_THEME_MODE
  return resolveInitialThemeMode(window.localStorage)
}

export function useThemeMode(
  themeMode: ThemeMode | null | undefined,
  loaded: boolean,
): void {
  useEffect(() => {
    if (!loaded || typeof document === 'undefined') return

    const resolvedMode = resolveRuntimeThemeMode(themeMode)
    applyThemeModeToDocument(document, resolvedMode)

    if (typeof window !== 'undefined') {
      writeStoredThemeMode(window.localStorage, resolvedMode)
    }
  }, [loaded, themeMode])
}
