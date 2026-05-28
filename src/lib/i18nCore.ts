export const DEFAULT_APP_LOCALE = 'en'
export const SYSTEM_UI_LANGUAGE = 'system'

export const APP_LOCALES = ['en', 'zh-Hans'] as const
export type AppLocale = typeof APP_LOCALES[number]
export type UiLanguagePreference = typeof SYSTEM_UI_LANGUAGE | AppLocale
export type TranslationValues = Record<string, string | number>

const SIMPLIFIED_CHINESE_LANGUAGE_CODES = new Set(['zh', 'zh-cn', 'zh-hans', 'zh-sg'])

const LOCALE_DISPLAY_NAMES: Record<AppLocale, Record<AppLocale, string>> = {
  en: {
    en: 'English',
    'zh-Hans': 'Simplified Chinese',
  },
  'zh-Hans': {
    en: '英文',
    'zh-Hans': '简体中文',
  },
}

/** Interpolate named placeholders in a translated string. */
export function interpolate(template: string, values: TranslationValues = {}): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    const value = values[key]
    return value === undefined ? match : String(value)
  })
}

function normalizeLocaleCode(value: string): AppLocale | null {
  const normalized = value.trim().replace('_', '-').toLowerCase()
  if (normalized === 'en' || normalized.startsWith('en-')) return 'en'
  if (SIMPLIFIED_CHINESE_LANGUAGE_CODES.has(normalized)) return 'zh-Hans'
  return null
}

/** Normalize a stored or user-entered UI language preference. */
export function normalizeUiLanguagePreference(value: unknown): UiLanguagePreference | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  const lower = trimmed.toLowerCase()
  if (lower === SYSTEM_UI_LANGUAGE || lower === 'auto') return SYSTEM_UI_LANGUAGE
  return normalizeLocaleCode(trimmed)
}

/** Serialize the preference shape used by settings persistence. */
export function serializeUiLanguagePreference(value: unknown): AppLocale | null {
  const normalized = normalizeUiLanguagePreference(value)
  if (!normalized || normalized === SYSTEM_UI_LANGUAGE) return null
  return normalized
}

/** Read browser language preferences when available. */
export function getBrowserLanguagePreferences(): string[] {
  if (typeof navigator === 'undefined') return []
  const languages = Array.isArray(navigator.languages) ? navigator.languages : []
  if (languages.length > 0) return [...languages]
  return navigator.language ? [navigator.language] : []
}

/** Resolve the active locale from app preference plus system/browser languages. */
export function resolveEffectiveLocale(
  preference: unknown,
  languagePreferences: readonly string[] = getBrowserLanguagePreferences(),
): AppLocale {
  const normalizedPreference = normalizeUiLanguagePreference(preference)
  if (normalizedPreference && normalizedPreference !== SYSTEM_UI_LANGUAGE) {
    return normalizedPreference
  }

  for (const language of languagePreferences) {
    const locale = normalizeLocaleCode(language)
    if (locale) return locale
  }

  return DEFAULT_APP_LOCALE
}

/** Return the display name for a supported locale in another supported locale. */
export function localeDisplayName(locale: AppLocale, displayLocale: AppLocale = locale): string {
  return LOCALE_DISPLAY_NAMES[displayLocale]?.[locale] ?? LOCALE_DISPLAY_NAMES.en[locale]
}
