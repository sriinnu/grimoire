export const DEFAULT_APP_LOCALE = 'en'
export const SYSTEM_UI_LANGUAGE = 'system'

export const APP_LOCALES = ['en', 'zh-Hans', 'de', 'hi', 'sa'] as const
export type AppLocale = typeof APP_LOCALES[number]
export type UiLanguagePreference = typeof SYSTEM_UI_LANGUAGE | AppLocale
export type TranslationValues = Record<string, string | number>

const SIMPLIFIED_CHINESE_LANGUAGE_CODES = new Set(['zh', 'zh-cn', 'zh-hans', 'zh-sg'])
const GERMAN_LANGUAGE_CODES = new Set(['de', 'de-at', 'de-ch', 'de-de'])
const HINDI_LANGUAGE_CODES = new Set(['hi', 'hi-in'])
const SANSKRIT_LANGUAGE_CODES = new Set(['sa', 'sa-deva', 'sa-devanagari', 'sa-in'])

const LOCALE_DISPLAY_NAMES: Record<AppLocale, Record<AppLocale, string>> = {
  en: {
    en: 'English',
    'zh-Hans': 'Simplified Chinese',
    de: 'German',
    hi: 'Hindi',
    sa: 'Sanskrit',
  },
  'zh-Hans': {
    en: '英文',
    'zh-Hans': '简体中文',
    de: '德语',
    hi: '印地语',
    sa: '梵语',
  },
  de: {
    en: 'Englisch',
    'zh-Hans': 'Vereinfachtes Chinesisch',
    de: 'Deutsch',
    hi: 'Hindi',
    sa: 'Sanskrit',
  },
  hi: {
    en: 'अंग्रेज़ी',
    'zh-Hans': 'सरलीकृत चीनी',
    de: 'जर्मन',
    hi: 'हिन्दी',
    sa: 'संस्कृत',
  },
  sa: {
    en: 'आङ्ग्लभाषा',
    'zh-Hans': 'सरलचीनी',
    de: 'जर्मन',
    hi: 'हिन्दी',
    sa: 'संस्कृतम्',
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
  if (GERMAN_LANGUAGE_CODES.has(normalized) || normalized.startsWith('de-')) return 'de'
  if (HINDI_LANGUAGE_CODES.has(normalized) || normalized.startsWith('hi-')) return 'hi'
  if (SANSKRIT_LANGUAGE_CODES.has(normalized) || normalized.startsWith('sa-')) return 'sa'
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
