import {
  CORE_THEME_TOKEN_KEYS,
  DERIVED_THEME_TOKEN_KEYS,
  DERIVED_TOKEN_FALLBACKS,
  REQUIRED_THEME_TOKEN_KEYS,
  SEMANTIC_TOKEN_ALIASES,
  TOKEN_CSS_VARIABLES,
  type ThemeTokenMap,
} from './themeTokens'

/** Theme modes that can be expressed by a validated preset definition. */
export type ThemeDefinitionMode = 'light' | 'dark'
export type { ThemeTokenKey, ThemeTokenMap } from './themeTokens'
export { REQUIRED_THEME_TOKEN_KEYS } from './themeTokens'

/** Editor-level knobs imported from a theme definition. */
export interface ThemeEditorDefinition {
  headingStyle: 'graph' | 'manuscript' | 'system' | 'terminal'
  lineHeight: number
  maxWidth: number
}

/** Sidebar artwork metadata imported from a theme definition. */
export interface ThemeSidebarDefinition {
  artwork: 'grimoire-sigil' | 'none'
  artworkOpacity: number
}

/** Metadata-strip presentation contract imported from a theme definition. */
export interface ThemeMetadataStripDefinition {
  style: 'badges' | 'quiet' | 'terminal'
  visibleFields: readonly string[]
}

/** Runtime-safe preset definition loaded from JSON. */
export interface ThemeDefinition {
  description: string
  editor: ThemeEditorDefinition
  family: 'archive' | 'manuscript' | 'nocturne' | 'research'
  id: string
  label: string
  metadataStrip: ThemeMetadataStripDefinition
  modes: Partial<Record<ThemeDefinitionMode, { tokens: ThemeTokenMap }>>
  schemaVersion: 1
  sidebar: ThemeSidebarDefinition
  swatches: [string, string, string]
}

/** Result returned by JSON theme import validation. */
export type ThemeDefinitionParseResult =
  | { ok: true; definition: ThemeDefinition }
  | { ok: false; errors: string[] }

type RawRecord = Record<string, unknown>

const FAMILIES = new Set<ThemeDefinition['family']>(['archive', 'manuscript', 'nocturne', 'research'])
const HEADING_STYLES = new Set<ThemeEditorDefinition['headingStyle']>(['graph', 'manuscript', 'system', 'terminal'])
const SIDEBAR_ARTWORK = new Set<ThemeSidebarDefinition['artwork']>(['grimoire-sigil', 'none'])
const LEGACY_SIDEBAR_ARTWORK = new Set(['agent-graph', 'archive', 'desk', 'manuscript', 'terminal'])
const METADATA_STYLES = new Set<ThemeMetadataStripDefinition['style']>(['badges', 'quiet', 'terminal'])
const MODES: readonly ThemeDefinitionMode[] = ['light', 'dark']

function isRecord(value: unknown): value is RawRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asRecord(value: unknown, path: string, errors: string[]): RawRecord {
  if (isRecord(value)) return value
  errors.push(`${path} must be an object.`)
  return {}
}

function readString(record: RawRecord, key: string, path: string, errors: string[]): string {
  const value = record[key]
  if (typeof value === 'string' && value.trim()) return value
  errors.push(`${path}.${key} must be a non-empty string.`)
  return ''
}

function readNumber(record: RawRecord, key: string, path: string, errors: string[]): number {
  const value = record[key]
  if (typeof value === 'number' && Number.isFinite(value)) return value
  errors.push(`${path}.${key} must be a finite number.`)
  return 0
}

function readEnum<T extends string>(
  record: RawRecord,
  key: string,
  allowed: ReadonlySet<T>,
  path: string,
  errors: string[],
): T {
  const value = record[key]
  if (typeof value === 'string' && allowed.has(value as T)) return value as T
  errors.push(`${path}.${key} is not supported.`)
  return Array.from(allowed)[0]
}

function readSidebarArtwork(record: RawRecord, errors: string[]): ThemeSidebarDefinition['artwork'] {
  const value = record.artwork
  if (typeof value !== 'string') {
    errors.push('sidebar.artwork is not supported.')
    return 'grimoire-sigil'
  }
  if (SIDEBAR_ARTWORK.has(value as ThemeSidebarDefinition['artwork'])) return value as ThemeSidebarDefinition['artwork']
  if (LEGACY_SIDEBAR_ARTWORK.has(value)) return 'grimoire-sigil'
  errors.push('sidebar.artwork is not supported.')
  return 'grimoire-sigil'
}

function readStringArray(record: RawRecord, key: string, path: string, errors: string[]): string[] {
  const value = record[key]
  if (Array.isArray(value) && value.length > 0 && value.every((item) => typeof item === 'string' && item.trim())) {
    return value
  }
  errors.push(`${path}.${key} must be a non-empty string array.`)
  return []
}

function isSafeCssValue(value: string): boolean {
  return value.length <= 120
    && !/[;{}]/u.test(value)
    && !/url\s*\(|@import|expression\s*\(/iu.test(value)
}

function normalizeSwatches(value: unknown, id: string, errors: string[]): [string, string, string] {
  if (Array.isArray(value) && value.length === 3 && value.every((swatch) => typeof swatch === 'string' && isSafeCssValue(swatch))) {
    return value as [string, string, string]
  }
  errors.push(`Theme "${id}" must define exactly three safe swatches.`)
  return ['#000000', '#111111', '#ffffff']
}

function normalizeTokens(raw: RawRecord, path: string, errors: string[]): ThemeTokenMap {
  const tokens = {} as ThemeTokenMap
  for (const key of CORE_THEME_TOKEN_KEYS) {
    const value = raw[key]
    if (typeof value !== 'string' || !value.trim() || !isSafeCssValue(value)) {
      errors.push(`${path}.${key} must be a safe CSS token value.`)
      tokens[key] = 'transparent'
      continue
    }
    tokens[key] = value
  }
  for (const key of DERIVED_THEME_TOKEN_KEYS) {
    const value = raw[key]
    if (value === undefined) {
      tokens[key] = DERIVED_TOKEN_FALLBACKS[key]
      continue
    }
    if (typeof value !== 'string' || !value.trim() || !isSafeCssValue(value)) {
      errors.push(`${path}.${key} must be a safe CSS token value.`)
      tokens[key] = DERIVED_TOKEN_FALLBACKS[key]
      continue
    }
    tokens[key] = value
  }
  return tokens
}

function normalizeModes(raw: RawRecord, errors: string[]): ThemeDefinition['modes'] {
  const modes: ThemeDefinition['modes'] = {}
  for (const mode of MODES) {
    if (raw[mode] === undefined) continue
    const modeRecord = asRecord(raw[mode], `modes.${mode}`, errors)
    const tokensRecord = asRecord(modeRecord.tokens, `modes.${mode}.tokens`, errors)
    modes[mode] = { tokens: normalizeTokens(tokensRecord, `modes.${mode}.tokens`, errors) }
  }
  if (!modes.light && !modes.dark) {
    errors.push('Theme must define at least one light or dark mode.')
  }
  return modes
}

/** Validates unknown JSON into a runtime-safe Grimoire theme definition. */
export function parseThemeDefinition(value: unknown): ThemeDefinitionParseResult {
  const errors: string[] = []
  const raw = asRecord(value, 'theme', errors)
  const id = readString(raw, 'id', 'theme', errors)
  const editor = asRecord(raw.editor, 'editor', errors)
  const sidebar = asRecord(raw.sidebar, 'sidebar', errors)
  const metadataStrip = asRecord(raw.metadataStrip, 'metadataStrip', errors)
  const modes = normalizeModes(asRecord(raw.modes, 'modes', errors), errors)
  const schemaVersion = raw.schemaVersion

  if (schemaVersion !== 1) errors.push('theme.schemaVersion must be 1.')

  const definition: ThemeDefinition = {
    id,
    label: readString(raw, 'label', 'theme', errors),
    description: readString(raw, 'description', 'theme', errors),
    family: readEnum(raw, 'family', FAMILIES, 'theme', errors),
    schemaVersion: 1,
    swatches: normalizeSwatches(raw.swatches, id, errors),
    modes,
    editor: {
      headingStyle: readEnum(editor, 'headingStyle', HEADING_STYLES, 'editor', errors),
      lineHeight: readNumber(editor, 'lineHeight', 'editor', errors),
      maxWidth: readNumber(editor, 'maxWidth', 'editor', errors),
    },
    sidebar: {
      artwork: readSidebarArtwork(sidebar, errors),
      artworkOpacity: readNumber(sidebar, 'artworkOpacity', 'sidebar', errors),
    },
    metadataStrip: {
      style: readEnum(metadataStrip, 'style', METADATA_STYLES, 'metadataStrip', errors),
      visibleFields: readStringArray(metadataStrip, 'visibleFields', 'metadataStrip', errors),
    },
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true, definition }
}

/** Parses a JSON string as a safe theme definition for import or hot reload. */
export function parseThemeDefinitionJson(json: string): ThemeDefinitionParseResult {
  try {
    return parseThemeDefinition(JSON.parse(json) as unknown)
  } catch (error) {
    return { ok: false, errors: [error instanceof Error ? error.message : String(error)] }
  }
}

/** Serializes a validated theme definition for export. */
export function serializeThemeDefinition(definition: ThemeDefinition): string {
  return `${JSON.stringify(definition, null, 2)}\n`
}

/** Picks the closest available mode from a definition, failing closed to dark before light. */
export function resolveThemeDefinitionMode(
  definition: ThemeDefinition,
  requestedMode: ThemeDefinitionMode,
): ThemeDefinitionMode {
  if (definition.modes[requestedMode]) return requestedMode
  return definition.modes.dark ? 'dark' : 'light'
}

/** Applies a validated theme definition as live CSS custom properties. */
export function applyThemeDefinitionToRoot(
  root: HTMLElement,
  definition: ThemeDefinition,
  requestedMode: ThemeDefinitionMode,
): void {
  const mode = resolveThemeDefinitionMode(definition, requestedMode)
  const tokens = definition.modes[mode]?.tokens
  if (!tokens) return

  root.setAttribute('data-theme-definition-id', definition.id)
  root.setAttribute('data-theme-definition-mode', mode)
  root.setAttribute('data-sidebar-artwork', definition.sidebar.artwork)
  root.style.setProperty('--editor-max-width', `${definition.editor.maxWidth}px`)
  root.style.setProperty('--editor-line-height', String(definition.editor.lineHeight))
  root.style.setProperty('--sidebar-artwork-opacity', String(definition.sidebar.artworkOpacity))

  for (const key of REQUIRED_THEME_TOKEN_KEYS) {
    const value = tokens[key]
    root.style.setProperty(TOKEN_CSS_VARIABLES[key], value)
    for (const alias of SEMANTIC_TOKEN_ALIASES[key] ?? []) {
      root.style.setProperty(alias, value)
    }
  }
}
