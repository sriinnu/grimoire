import {
  parseThemeDefinitionJson,
  serializeThemeDefinition,
  type ThemeDefinition,
  type ThemeDefinitionParseResult,
} from './themeRegistry'

export const LOCAL_THEME_PACK_STORAGE_KEY = 'grimoire:local-theme-pack'
export const LOCAL_THEME_PACK_CHANGE_EVENT = 'grimoire:local-theme-pack-change'
export const DEV_THEME_PACK_ENDPOINT = '/api/theme-pack/local'

type ThemePackStorage = Pick<Storage, 'getItem' | 'removeItem' | 'setItem'>

export type LocalThemeFileParseResult = ThemeDefinitionParseResult

export type DevelopmentThemePackRefreshResult =
  | { status: 'loaded'; definition: ThemeDefinition }
  | { status: 'missing' }
  | { status: 'invalid'; errors: string[] }

function safeRead(storage: Pick<Storage, 'getItem'>, key: string): string | null {
  try {
    return storage.getItem(key)
  } catch {
    return null
  }
}

function safeWrite(storage: Pick<Storage, 'setItem'>, key: string, value: string): void {
  try {
    storage.setItem(key, value)
  } catch {
    // Local theme packs are a convenience layer; readonly storage should not break startup.
  }
}

function safeRemove(storage: Pick<Storage, 'removeItem'>, key: string): void {
  try {
    storage.removeItem(key)
  } catch {
    // Ignore restricted-storage contexts.
  }
}

/** Reads the active local-only theme pack override from browser storage. */
export function readStoredLocalThemeDefinition(storage: Pick<Storage, 'getItem'>): ThemeDefinition | null {
  const stored = safeRead(storage, LOCAL_THEME_PACK_STORAGE_KEY)
  if (!stored) return null
  const parsed = parseThemeDefinitionJson(stored)
  return parsed.ok ? parsed.definition : null
}

/** Stores a validated local-only theme pack override for startup and live preview. */
export function writeStoredLocalThemeDefinition(storage: Pick<Storage, 'setItem'>, definition: ThemeDefinition): void {
  safeWrite(storage, LOCAL_THEME_PACK_STORAGE_KEY, serializeThemeDefinition(definition))
}

/** Clears the active local-only theme pack override. */
export function clearStoredLocalThemeDefinition(storage: Pick<Storage, 'removeItem'>): void {
  safeRemove(storage, LOCAL_THEME_PACK_STORAGE_KEY)
}

/** Notifies the app shell that the local theme pack override changed. */
export function emitLocalThemePackChange(target: Pick<Window, 'dispatchEvent'> = window): void {
  target.dispatchEvent(new CustomEvent(LOCAL_THEME_PACK_CHANGE_EVENT))
}

/** Parses a local JSON file selected by the user as a safe theme pack. */
export async function parseLocalThemeFile(file: File | Pick<File, 'text'>): Promise<LocalThemeFileParseResult> {
  if (typeof file.text === 'function') {
    return parseThemeDefinitionJson(await file.text())
  }

  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(parseThemeDefinitionJson(String(reader.result ?? '')))
    reader.onerror = () => resolve({ ok: false, errors: ['Failed to read theme file.'] })
    reader.readAsText(file as Blob)
  })
}

/** Downloads a validated theme pack without storing it in the vault or repo. */
export function downloadThemeDefinitionJson(definition: ThemeDefinition, documentObject: Document = document): void {
  const blob = new Blob([serializeThemeDefinition(definition)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = documentObject.createElement('a')
  anchor.href = url
  anchor.download = `${definition.id}.grimoire-theme.json`
  anchor.click()
  URL.revokeObjectURL(url)
}

/** Fetches the gitignored dev theme pack endpoint and mirrors it into local app storage. */
export async function refreshDevelopmentThemePack(
  storage: ThemePackStorage,
  fetchThemePack: typeof fetch = fetch,
): Promise<DevelopmentThemePackRefreshResult> {
  let response: Response
  try {
    response = await fetchThemePack(DEV_THEME_PACK_ENDPOINT, { cache: 'no-store' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not load local theme endpoint.'
    return { status: 'invalid', errors: [message] }
  }
  if (response.status === 204 || response.status === 404) {
    clearStoredLocalThemeDefinition(storage)
    return { status: 'missing' }
  }
  if (!response.ok) {
    return { status: 'invalid', errors: [`Local theme endpoint returned ${response.status}.`] }
  }

  const parsed = parseThemeDefinitionJson(await response.text())
  if (!parsed.ok) {
    return { status: 'invalid', errors: parsed.errors }
  }

  writeStoredLocalThemeDefinition(storage, parsed.definition)
  return { status: 'loaded', definition: parsed.definition }
}
