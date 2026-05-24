import { applyFontRolesToDocument } from './fontConfig'
import {
  applyThemeDefinitionToRoot,
  resolveThemePresetDefinition,
  type ThemeDefinition,
  type ThemeDefinitionMode,
} from '../themes/themeRegistry'
import { readStoredLocalThemeDefinition } from '../themes/localThemePacks'
export {
  SUPPORTED_THEME_PRESETS,
  type ThemePreset,
} from '../themes/themePresetIds'
import { SUPPORTED_THEME_PRESETS } from '../themes/themePresetIds'
import type { ThemePreset } from '../themes/themePresetIds'

export const DEFAULT_THEME_PRESET = 'constellation'
export const DEFAULT_EDITOR_FONT = 'system'
export const THEME_PRESET_STORAGE_KEY = 'grimoire:theme-preset'
export const EDITOR_FONT_STORAGE_KEY = 'grimoire:editor-font'

export const SUPPORTED_EDITOR_FONTS = [
  'system',
  'serif',
  'mono',
  'readable',
  'literary',
  'compact',
  'handwritten',
] as const

const THEME_PRESETS = new Set<string>(SUPPORTED_THEME_PRESETS)
const EDITOR_FONTS = new Set<string>(SUPPORTED_EDITOR_FONTS)

export type EditorFont = typeof SUPPORTED_EDITOR_FONTS[number]

type AppearanceStorage = Pick<Storage, 'getItem' | 'setItem'>
type AppearanceDocument = Pick<Document, 'documentElement'>

export interface ResolvedAppearance {
  themePreset: ThemePreset
  editorFont: EditorFont
  themeDefinition?: ThemeDefinition
}

function isSupportedValue<T extends string>(
  values: ReadonlySet<string>,
  value: unknown,
): value is T {
  return typeof value === 'string' && values.has(value)
}

function readDocumentThemeMode(root: Element): ThemeDefinitionMode {
  return root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'
}

/** Returns a supported theme preset or null for untrusted persisted values. */
export function normalizeThemePreset(value: unknown): ThemePreset | null {
  return isSupportedValue<ThemePreset>(THEME_PRESETS, value) ? value : null
}

/** Returns a supported editor font or null for untrusted persisted values. */
export function normalizeEditorFont(value: unknown): EditorFont | null {
  return isSupportedValue<EditorFont>(EDITOR_FONTS, value) ? value : null
}

/** Resolves any theme preset input to the product default when it is missing or invalid. */
export function resolveThemePreset(value: unknown): ThemePreset {
  return normalizeThemePreset(value) ?? DEFAULT_THEME_PRESET
}

/** Resolves any editor font input to the product default when it is missing or invalid. */
export function resolveEditorFont(value: unknown): EditorFont {
  return normalizeEditorFont(value) ?? DEFAULT_EDITOR_FONT
}

function safeRead<T extends string>(
  storage: AppearanceStorage,
  key: string,
  normalize: (value: unknown) => T | null,
): T | null {
  try {
    return normalize(storage.getItem(key))
  } catch {
    return null
  }
}

function safeWrite(storage: AppearanceStorage, key: string, value: string): void {
  try {
    storage.setItem(key, value)
  } catch {
    // Storage can be unavailable in restricted browser contexts.
  }
}

/** Reads the mirrored theme preset used before native settings finish loading. */
export function readStoredThemePreset(storage: AppearanceStorage): ThemePreset | null {
  return safeRead(storage, THEME_PRESET_STORAGE_KEY, normalizeThemePreset)
}

/** Reads the mirrored editor font used before native settings finish loading. */
export function readStoredEditorFont(storage: AppearanceStorage): EditorFont | null {
  return safeRead(storage, EDITOR_FONT_STORAGE_KEY, normalizeEditorFont)
}

/** Mirrors the resolved theme preset for flash-free startup. */
export function writeStoredThemePreset(storage: AppearanceStorage, preset: ThemePreset): void {
  safeWrite(storage, THEME_PRESET_STORAGE_KEY, preset)
}

/** Mirrors the resolved editor font for flash-free startup. */
export function writeStoredEditorFont(storage: AppearanceStorage, font: EditorFont): void {
  safeWrite(storage, EDITOR_FONT_STORAGE_KEY, font)
}

/** Applies appearance choices as root attributes consumed by CSS tokens. */
export function applyAppearanceToDocument(
  documentObject: AppearanceDocument,
  appearance: ResolvedAppearance,
): void {
  const root = documentObject.documentElement
  root.setAttribute('data-theme-preset', appearance.themePreset)
  root.setAttribute('data-editor-font', appearance.editorFont)
  applyThemeDefinitionToRoot(
    root,
    appearance.themeDefinition ?? resolveThemePresetDefinition(appearance.themePreset),
    readDocumentThemeMode(root),
  )
  applyFontRolesToDocument(documentObject, appearance)
}

/** Bootstraps mirrored appearance choices before the React settings load completes. */
export function applyStoredAppearance(
  documentObject: AppearanceDocument,
  storage: AppearanceStorage,
): ResolvedAppearance {
  const appearance: ResolvedAppearance = {
    themePreset: readStoredThemePreset(storage) ?? DEFAULT_THEME_PRESET,
    editorFont: readStoredEditorFont(storage) ?? DEFAULT_EDITOR_FONT,
  }
  const localThemeDefinition = readStoredLocalThemeDefinition(storage)
  if (localThemeDefinition) appearance.themeDefinition = localThemeDefinition
  applyAppearanceToDocument(documentObject, appearance)
  return appearance
}
