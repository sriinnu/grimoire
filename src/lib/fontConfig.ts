import caveatFontUrl from '../../assets/fonts/Caveat-VariableFont_wght.ttf?url'
import type { EditorFont, ResolvedAppearance, ThemePreset } from './appearance'

export type FontRole = 'ui' | 'editor' | 'mono' | 'display' | 'label'
export type FontRoleConfig = Record<FontRole, string>
export type FontAssetId = 'caveat'

export interface FontAssetDefinition {
  id: FontAssetId
  family: string
  source: string
  format: string
  descriptors: FontFaceDescriptors
}

const FONT_ROLE_NAMES: readonly FontRole[] = ['ui', 'editor', 'mono', 'display', 'label']

const SYSTEM_UI_FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif"
const SYSTEM_EDITOR_FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif"
const SYSTEM_MONO_FONT =
  "'SF Mono', ui-monospace, 'Cascadia Mono', Menlo, Consolas, monospace"
const SYSTEM_LABEL_FONT =
  "'Avenir Next Condensed', 'Arial Narrow', -apple-system, BlinkMacSystemFont, sans-serif"
const CAVEAT_DISPLAY_FONT =
  "'Grimoire Caveat', 'Caveat', 'Bradley Hand', 'Marker Felt', 'Segoe Print', cursive"

export const FONT_ASSETS: Record<FontAssetId, FontAssetDefinition> = {
  caveat: {
    id: 'caveat',
    family: 'Grimoire Caveat',
    source: caveatFontUrl,
    format: 'truetype',
    descriptors: {
      display: 'swap',
      style: 'normal',
      weight: '400 700',
    },
  },
}

const BASE_FONT_ROLES: FontRoleConfig = {
  ui: SYSTEM_UI_FONT,
  editor: SYSTEM_EDITOR_FONT,
  mono: SYSTEM_MONO_FONT,
  display: CAVEAT_DISPLAY_FONT,
  label: SYSTEM_LABEL_FONT,
}

const EDITOR_FONT_ROLES: Record<EditorFont, Pick<FontRoleConfig, 'editor'>> = {
  system: { editor: SYSTEM_EDITOR_FONT },
  serif: { editor: "ui-serif, 'New York', 'Iowan Old Style', Georgia, serif" },
  mono: { editor: SYSTEM_MONO_FONT },
  readable: { editor: "'Atkinson Hyperlegible', 'Avenir Next', system-ui, sans-serif" },
  literary: { editor: "ui-serif, 'New York', 'Hoefler Text', 'Iowan Old Style', Georgia, serif" },
  compact: { editor: "'Avenir Next Condensed', 'Arial Narrow', system-ui, sans-serif" },
  handwritten: { editor: CAVEAT_DISPLAY_FONT },
}

const THEME_FONT_ROLES: Partial<Record<ThemePreset, Partial<FontRoleConfig>>> = {
  manuscript: {
    display: CAVEAT_DISPLAY_FONT,
    label: SYSTEM_LABEL_FONT,
  },
  retro: {
    label: SYSTEM_LABEL_FONT,
  },
}

const loadedFontAssetIds = new Set<FontAssetId>()

/** Resolves the concrete font stacks for each product surface role. */
export function resolveFontRoles(appearance: ResolvedAppearance): FontRoleConfig {
  return {
    ...BASE_FONT_ROLES,
    ...THEME_FONT_ROLES[appearance.themePreset],
    ...EDITOR_FONT_ROLES[appearance.editorFont],
  }
}

/** Returns local font asset IDs needed by the selected appearance. */
export function resolveFontAssetIds(appearance: ResolvedAppearance): FontAssetId[] {
  void appearance
  return ['caveat']
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
  const assetIds = resolveFontAssetIds(appearance)
  if (assetIds.length === 0) return true

  const results = await Promise.all(
    assetIds.map((assetId) => loadFontAsset(documentObject, FONT_ASSETS[assetId])),
  )
  return results.every(Boolean)
}

async function loadFontAsset(
  documentObject: Document,
  asset: FontAssetDefinition,
): Promise<boolean> {
  if (loadedFontAssetIds.has(asset.id)) return true
  if (typeof FontFace === 'undefined') return false

  try {
    const fontFace = new FontFace(
      asset.family,
      `url("${asset.source}") format("${asset.format}")`,
      asset.descriptors,
    )
    documentObject.fonts.add(await fontFace.load())
    loadedFontAssetIds.add(asset.id)
    return true
  } catch {
    return false
  }
}
