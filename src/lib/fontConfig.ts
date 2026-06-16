import type { EditorFont, ResolvedAppearance, ThemePreset } from './appearance'
import { resolveThemePresetDefinition } from '../themes/themeRegistry'

export type FontRole = 'ui' | 'editor' | 'mono' | 'display' | 'label'
export type FontRoleConfig = Record<FontRole, string>

const FONT_ROLE_NAMES: readonly FontRole[] = ['ui', 'editor', 'mono', 'display', 'label']

const SYSTEM_UI_FONT =
  "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI Variable', 'Segoe UI', system-ui, sans-serif"
const SYSTEM_EDITOR_FONT =
  "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI Variable', 'Segoe UI', system-ui, sans-serif"
const SYSTEM_MONO_FONT =
  "'Grimoire Berkeley Mono', 'TX-02 Berkeley Mono', 'Berkeley Mono', 'SF Mono', ui-monospace, Menlo, Consolas, monospace"
const BOOK_SERIF_FONT =
  "'Literata', 'New York', 'Iowan Old Style', Charter, Georgia, ui-serif, serif"
const EDITORIAL_SERIF_FONT =
  "'New York', 'Iowan Old Style', Charter, Georgia, ui-serif, serif"
const MANUSCRIPT_SERIF_FONT =
  "Palatino, 'Palatino Linotype', 'Book Antiqua', 'Hoefler Text', Georgia, ui-serif, serif"
const READABLE_SANS_FONT =
  "'Atkinson Hyperlegible Next', 'Atkinson Hyperlegible', 'Avenir Next', -apple-system, BlinkMacSystemFont, system-ui, sans-serif"
const HUMANIST_SANS_FONT =
  "'Avenir Next', Avenir, 'Gill Sans', 'Trebuchet MS', -apple-system, BlinkMacSystemFont, system-ui, sans-serif"
const SYSTEM_LABEL_FONT = SYSTEM_UI_FONT

const BASE_FONT_ROLES: FontRoleConfig = {
  ui: SYSTEM_UI_FONT,
  editor: BOOK_SERIF_FONT,
  mono: SYSTEM_MONO_FONT,
  display: BOOK_SERIF_FONT,
  label: SYSTEM_LABEL_FONT,
}

const EDITOR_FONT_ROLES: Record<EditorFont, Pick<FontRoleConfig, 'editor'>> = {
  system: { editor: SYSTEM_EDITOR_FONT },
  readable: { editor: READABLE_SANS_FONT },
  humanist: { editor: HUMANIST_SANS_FONT },
  literary: { editor: BOOK_SERIF_FONT },
  editorial: { editor: EDITORIAL_SERIF_FONT },
  manuscript: { editor: MANUSCRIPT_SERIF_FONT },
  mono: { editor: SYSTEM_MONO_FONT },
}

const THEME_FONT_ROLES: Partial<Record<ThemePreset, Partial<FontRoleConfig>>> = {
  'living-archive': {
    display: BOOK_SERIF_FONT,
    label: SYSTEM_LABEL_FONT,
  },
}

/** Resolves the concrete font stacks for each product surface role. */
export function resolveFontRoles(appearance: ResolvedAppearance): FontRoleConfig {
  return {
    ...BASE_FONT_ROLES,
    ...resolveThemePresetDefinition(appearance.themePreset).typography,
    ...THEME_FONT_ROLES[appearance.themePreset],
    ...EDITOR_FONT_ROLES[appearance.editorFont],
    ...appearance.themeDefinition?.typography,
  }
}

/** Returns local font asset IDs needed by the selected appearance. */
export function resolveFontAssetIds(appearance: ResolvedAppearance): never[] {
  void appearance
  return []
}

/** Applies resolved font roles as CSS variables on the root document element. */
export function applyFontRolesToDocument(
  documentObject: Pick<Document, 'documentElement'>,
  appearance: ResolvedAppearance,
): void {
  const roles = resolveFontRoles(appearance)
  for (const role of FONT_ROLE_NAMES) {
    documentObject.documentElement.style.setProperty(
      `--grimoire-${role}-font-family`,
      roles[role],
    )
  }
}

/** Loads local font files for the selected appearance when the browser supports FontFace. */
export async function loadFontAssetsForAppearance(
  documentObject: Document,
  appearance: ResolvedAppearance,
): Promise<boolean> {
  void documentObject
  void appearance
  return true
}
