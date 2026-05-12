import { applyFontRolesToDocument } from './fontConfig'

export const DEFAULT_THEME_PRESET = 'manuscript'
export const DEFAULT_EDITOR_FONT = 'system'
export const THEME_PRESET_STORAGE_KEY = 'grimoire:theme-preset'
export const EDITOR_FONT_STORAGE_KEY = 'grimoire:editor-font'

const THEME_PRESETS = new Set([
  'classic',
  'manuscript',
  'graphite',
  'studio',
  'folio',
  'nocturne',
  'retro',
  'aurora',
  'future',
  'lotus',
  'ember',
])
const EDITOR_FONTS = new Set([
  'system',
  'serif',
  'mono',
  'readable',
  'literary',
  'compact',
  'handwritten',
])

export type ThemePreset =
  | 'classic'
  | 'manuscript'
  | 'graphite'
  | 'studio'
  | 'folio'
  | 'nocturne'
  | 'retro'
  | 'aurora'
  | 'future'
  | 'lotus'
  | 'ember'
export type EditorFont =
  | 'system'
  | 'serif'
  | 'mono'
  | 'readable'
  | 'literary'
  | 'compact'
  | 'handwritten'

type AppearanceStorage = Pick<Storage, 'getItem' | 'setItem'>
type AppearanceDocument = Pick<Document, 'documentElement'>

export interface ResolvedAppearance {
  themePreset: ThemePreset
  editorFont: EditorFont
}

/** Returns a supported theme preset or null for untrusted persisted values. */
export function normalizeThemePreset(value: unknown): ThemePreset | null {
  return typeof value === 'string' && THEME_PRESETS.has(value) ? value as ThemePreset : null
}

/** Returns a supported editor font or null for untrusted persisted values. */
export function normalizeEditorFont(value: unknown): EditorFont | null {
  return typeof value === 'string' && EDITOR_FONTS.has(value) ? value as EditorFont : null
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
  applyFontRolesToDocument(documentObject, appearance)
}

/** Bootstraps mirrored appearance choices before the React settings load completes. */
export function applyStoredAppearance(
  documentObject: AppearanceDocument,
  storage: AppearanceStorage,
): ResolvedAppearance {
  const appearance = {
    themePreset: readStoredThemePreset(storage) ?? DEFAULT_THEME_PRESET,
    editorFont: readStoredEditorFont(storage) ?? DEFAULT_EDITOR_FONT,
  }
  applyAppearanceToDocument(documentObject, appearance)
  return appearance
}
