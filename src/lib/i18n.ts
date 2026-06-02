import { EN_APPEARANCE_TRANSLATIONS } from './i18nAppearance'
import {
  DE_TRANSLATIONS,
  HI_TRANSLATIONS,
  ZH_HANS_TRANSLATIONS,
} from './i18nLocaleTranslations'
import { SA_TRANSLATIONS } from './i18nSanskritTranslations'
import {
  DE_SETTINGS_POLISH_TRANSLATIONS,
  HI_SETTINGS_POLISH_TRANSLATIONS,
  SA_SETTINGS_POLISH_TRANSLATIONS,
  ZH_HANS_SETTINGS_POLISH_TRANSLATIONS,
} from './i18nSettingsPolishTranslations'
import { EN_PRIVACY_RUNWAY_TRANSLATIONS } from './i18nPrivacyRunway'
import { EN_PORTABILITY_TRANSLATIONS } from './i18nPortability'
import { EN_WORKFLOW_RUNWAY_TRANSLATIONS } from './i18nWorkflowRunway'

export const DEFAULT_APP_LOCALE = 'en'
export const SYSTEM_UI_LANGUAGE = 'system'

export const APP_LOCALES = ['en', 'zh-Hans', 'de', 'hi', 'sa'] as const
export type AppLocale = typeof APP_LOCALES[number]
export type UiLanguagePreference = typeof SYSTEM_UI_LANGUAGE | AppLocale

const SIMPLIFIED_CHINESE_LANGUAGE_CODES = new Set(['zh', 'zh-cn', 'zh-hans', 'zh-sg'])
const GERMAN_LANGUAGE_CODES = new Set(['de', 'de-at', 'de-ch', 'de-de'])
const HINDI_LANGUAGE_CODES = new Set(['hi', 'hi-in'])
const SANSKRIT_LANGUAGE_CODES = new Set(['sa', 'sa-deva', 'sa-devanagari', 'sa-in'])

const EN_TRANSLATIONS = {
  'command.noMatches': 'No matching commands',
  'command.palettePlaceholder': 'Type a command...',
  'command.footerNavigate': '↑↓ navigate',
  'command.footerSelect': '↵ select',
  'command.footerClose': 'esc close',
  'command.footerSend': '↵ send',
  'command.aiMode': '{agent} mode',
  'command.openSettings': 'Open Settings',
  'command.openSettings.keywords': 'preferences config appearance theme themes constellation daylight atelier prabhat studio living archive nocturne retro terminal',
  'command.openLanguageSettings': 'Open Language Settings',
  'command.openLanguageSettings.keywords': 'language locale i18n internationalization localization chinese english german hindi sanskrit deutsch हिन्दी संस्कृत 中文',
  'command.useSystemLanguage': 'Use System Language',
  'command.switchLanguageTo': 'Switch Language to {language}',
  'command.switchToEnglish': 'Switch Language to English',
  'command.switchToChinese': 'Switch Language to Simplified Chinese',
  'command.openH1Setting': 'Open H1 Auto-Rename Setting',
  'command.contribute': 'Contribute',
  'command.checkUpdates': 'Check for Updates',

  'settings.title': 'Settings',
  'settings.description': 'Configure local vault, portability, appearance, agents, language, native shell, and privacy preferences.',
  'settings.close': 'Close settings',
  'settings.vault.title': 'Current vault',
  'settings.vault.noVault': 'No vault selected',
  'settings.vault.state.localFiles': 'Local files',
  'settings.vault.state.localGit': 'Local files + Git',
  'settings.sync.title': 'Sync & Updates',
  'settings.sync.description': 'Configure background pulling and which update feed Grimoire follows. Stable only receives manually promoted releases, while Alpha follows every push to main.',
  'settings.sync.runway.markdown': 'Markdown source',
  'settings.sync.runway.markdownDetail': 'Files stay readable on disk first.',
  'settings.sync.runway.local': 'Local',
  'settings.sync.runway.git': 'Git lane',
  'settings.sync.runway.gitMetadata': 'Repository metadata exists here.',
  'settings.sync.runway.gitNoMetadata': 'No repository metadata required.',
  'settings.sync.runway.armed': 'Armed',
  'settings.sync.runway.gated': 'Gated',
  'settings.sync.runway.releaseDetail': 'Controls app updates only.',
  'settings.pullInterval': 'Pull interval (minutes)',
  'settings.releaseChannel': 'Release channel',
  'settings.releaseStable': 'Stable',
  'settings.releaseAlpha': 'Alpha',
  'settings.git.title': 'Vault locality',
  'settings.git.enable': 'Git',
  'settings.git.enableDescription': 'When off, Grimoire treats this vault as local-only: no status checks, commits, pulls, pushes, or AutoGit.',
  'settings.git.initializeDescription': 'Turning this on initializes a local Git repository for this vault. Nothing leaves your machine until you add a remote.',
  'settings.git.description.enabled': 'Git is enabled for this vault. Grimoire can show changes, create commits, and sync only through the remotes you configure.',
  'settings.git.description.paused': 'This folder has Git metadata, but Grimoire is intentionally keeping the vault local-only.',
  'settings.git.description.local': 'This vault has no Git metadata. Notes, journals, dreams, and private lanes stay as plain local files.',
  'settings.git.status.on': 'Git on',
  'settings.git.status.off': 'Local only',
  'settings.appearance.title': 'Appearance',
  'settings.appearance.description': 'Tune Grimoire for the kind of reading and writing you are doing now.',
  'settings.appearance.previewTitle': 'The thread becomes visible.',
  'settings.appearance.previewBody': 'A note should feel quiet enough to think in, but sharp enough to move fast.',
  ...EN_APPEARANCE_TRANSLATIONS,
  'settings.sidebarAppearance.label': 'Left sidebar',
  'settings.sidebarAppearance.previewLabel': 'Sidebar',
  'settings.theme.label': 'Theme',
  'settings.theme.light': 'Light',
  'settings.theme.dark': 'Dark',
  'settings.themePreset.label': 'Theme preset',
  'settings.themePreset.group.signature': 'Signature',
  'settings.themePreset.group.studio': 'Studio',
  'settings.themePreset.group.lab': 'Lab',
  'settings.themePreset.constellation': 'Nocturne Constellation',
  'settings.themePreset.constellationDescription': 'Agent graph, luminous memory, calm local-first command.',
  'settings.themePreset.daylightAtelier': 'Daylight Atelier',
  'settings.themePreset.daylightAtelierDescription': 'Bright studio panels, ink-clean writing, coral and mint signal.',
  'settings.themePreset.prabhatStudio': 'Prabhat Studio',
  'settings.themePreset.prabhatStudioDescription': 'A bright dawn workspace: pearl panels, calm ink, saffron and lotus signal.',
  'settings.themePreset.livingArchive': 'Living Archive',
  'settings.themePreset.livingArchiveDescription': 'Parchment, forest ink, journal and dream-library warmth.',
  'settings.themePreset.nocturne': 'Nocturne',
  'settings.themePreset.nocturneDescription': 'Dark desk, quiet focus, luminous links.',
  'settings.themePreset.retroTerminal': 'Retro Terminal',
  'settings.themePreset.retroTerminalDescription': 'Private CLI cockpit: phosphor text, amber actions, local machine soul.',
  'settings.editorFont.label': 'Editor font',
  'settings.editorFont.system': 'Native Sans',
  'settings.editorFont.serif': 'Book Serif',
  'settings.editorFont.mono': 'Mono',
  'settings.editorFont.readable': 'Readable Sans',
  'settings.editorFont.humanist': 'Humanist Sans',
  'settings.editorFont.literary': 'Book Serif',
  'settings.editorFont.editorial': 'Editorial Serif',
  'settings.editorFont.manuscript': 'Manuscript Serif',
  'settings.editorFont.compact': 'Native Sans',
  'settings.editorFont.handwritten': 'Book Serif',
  'settings.editorLineHeight.label': 'Editor line height',
  'settings.editorLineHeight.compact': 'Compact',
  'settings.editorLineHeight.comfortable': 'Comfortable',
  'settings.editorLineHeight.spacious': 'Spacious',
  'settings.language.title': 'Language',
  'settings.language.description': 'Choose the display language for Grimoire chrome. System follows your OS language when it is supported, with English as the fallback.',
  'settings.language.label': 'Display language',
  'settings.language.system': 'System ({language})',
  'settings.language.en': 'English',
  'settings.language.zhHans': 'Simplified Chinese',
  'settings.language.de': 'German',
  'settings.language.hi': 'Hindi',
  'settings.language.sa': 'Sanskrit',
  'settings.language.summary': 'Missing translations fall back to English so partially translated locales stay usable.',
  'settings.native.title': 'Native {platform}',
  'settings.native.description': 'Tune Grimoire for the native shell behavior available on {platform}.',
  'settings.native.menuBarIcon': 'Show Grimoire in the menu bar',
  'settings.native.menuBarIconDescription': 'Adds Open, New Note, Quick Open, Settings, Reload Vault, and Quit to the native menu bar menu.',
  'settings.native.menuBarIconUnavailable': '{platform} tray integration not available yet',
  'settings.native.menuBarIconUnavailableDescription': 'This control stays off until Grimoire ships native quick actions for {platform}.',
  'settings.native.shellMaterial': 'Window material',
  'settings.native.shellMaterialDescription': 'Changes only Grimoire-owned shell layers. Release builds stay conservative and avoid private transparent-window APIs.',
  'settings.native.shellMaterialStandard': 'Standard',
  'settings.native.shellMaterialUnified': 'Unified sidebar',
  'settings.native.shellMaterialGlassPreview': 'Glass preview',
  'settings.autogit.title': 'AutoGit',
  'settings.autogit.description.enabled': 'Automatically create conservative Git checkpoints after editing pauses or when the app is no longer active.',
  'settings.autogit.description.disabled': 'AutoGit is unavailable until the current vault is Git-enabled. Initialize Git for this vault first.',
  'settings.autogit.enable': 'Enable AutoGit',
  'settings.autogit.enableDescription': 'When enabled, Grimoire will commit and push saved local changes automatically after an idle pause or after the app becomes inactive.',
  'settings.autogit.idleThreshold': 'Idle threshold (seconds)',
  'settings.autogit.inactiveThreshold': 'Inactive-app grace period (seconds)',
  ...EN_PORTABILITY_TRANSLATIONS,
  'settings.titles.title': 'Titles & Filenames',
  'settings.titles.description': 'Choose whether Grimoire automatically syncs untitled note filenames from the first H1 title.',
  'settings.titles.autoRename': 'Auto-rename untitled notes from first H1',
  'settings.titles.autoRenameDescription': 'When enabled, Grimoire renames untitled-note files as soon as the first H1 becomes a real title. Turn this off to keep the filename unchanged until you rename it manually from the breadcrumb bar.',
  'settings.aiAgents.title': 'AI Agents',
  'settings.aiAgents.description': 'Choose which CLI AI agent Grimoire uses in the AI panel and command palette.',
  'settings.aiAgents.default': 'Default AI agent',
  'settings.aiAgents.provider': 'Provider override',
  'settings.aiAgents.providerPlaceholder': 'Router default',
  'settings.aiAgents.providerDefault': 'Default',
  'settings.aiAgents.model': 'Model override',
  'settings.aiAgents.modelPlaceholder': 'CLI default',
  'settings.aiAgents.modelDefault': 'Default',
  'settings.aiAgents.providerKeysTitle': 'Provider API keys',
  'settings.aiAgents.providerKeysDescription': 'Keys are stored in {secureStore} and injected only into local CLI agent processes. Environment keys can be detected, but saving here makes app-launched Grimoire reliable.',
  'settings.aiAgents.providerKeysDescriptionUnavailable': 'On {platform}, Grimoire detects provider keys from environment variables. Saving keys in Settings waits for {secureStore} support.',
  'settings.aiAgents.providerKeysLoading': 'Checking provider keys...',
  'settings.aiAgents.providerKeysInputLabel': '{provider} API key',
  'settings.aiAgents.providerKeysSave': 'Save',
  'settings.aiAgents.providerKeysClear': 'Clear',
  'settings.aiAgents.providerKeysKeychain': 'macOS Keychain',
  'settings.aiAgents.providerKeysEnvironment': 'Environment',
  'settings.aiAgents.providerKeysMissing': 'Missing',
  'settings.aiAgents.installed': 'installed',
  'settings.aiAgents.missing': 'missing',
  'settings.aiAgents.ready': '{agent}{version} is ready to use.',
  'settings.aiAgents.notInstalled': '{agent} is not installed yet. You can still select it now and install it later.',
  'settings.aiAgents.routeTruth': 'Route truth: {providerRoute}. {modelRoute}.',
  'settings.aiAgents.routeProviderCli': 'Provider resolves from the Chitragupta stream',
  'settings.aiAgents.routeProviderOverride': 'Provider override: --provider {provider}',
  'settings.aiAgents.routeModelCli': 'Model resolves from the Chitragupta stream',
  'settings.aiAgents.routeModelOverride': 'Model override: --model {model}',
  'settings.aiAgents.mcpBoundary': 'Chitragupta chat uses the local CLI route. MCP memory, recall, wiki, graph, and diagnostics are separate readiness checks.',
  'settings.aiAgents.mcpContractTitle': 'MCP memory contract',
  'settings.aiAgents.mcpContractReady': 'Live memory lanes stay local-ledger only until Chitragupta MCP reports recall, wiki, graph, ingest, diagnostics, and source-backed write suggestions ready.',
  'settings.aiAgents.mcpContractTransport': 'If the MCP transport closes, Grimoire keeps chat separate and blocks live memory actions until recall, wiki, graph, and diagnostics reconnect.',
  'settings.aiAgents.mcpStatusLabel': 'External MCP registration',
  'settings.aiAgents.mcpStatusChecking': 'Checking',
  'settings.aiAgents.mcpStatusCheckingDetail': 'Checking whether this vault is registered with external MCP clients. Runtime bridge readiness is still verified before live memory actions run.',
  'settings.aiAgents.mcpStatusInstalled': 'Connected',
  'settings.aiAgents.mcpStatusInstalledDetail': 'External MCP clients are registered for this vault. Runtime bridge readiness is still verified before recall, wiki, graph, ingest, diagnostics, or write suggestions run.',
  'settings.aiAgents.mcpStatusNotInstalled': 'Not connected',
  'settings.aiAgents.mcpStatusNotInstalledDetail': 'Chitragupta CLI chat can still run. Live memory actions stay blocked until MCP is connected for this vault and the transport is open.',
  'settings.aiAgents.mcpStatusConnect': 'Connect MCP',
  'settings.aiAgents.mcpStatusManage': 'Manage MCP',
  'settings.aiAgents.mcpSurfaceMemorySearch': 'memory search',
  'settings.aiAgents.mcpSurfaceRecall': 'recall',
  'settings.aiAgents.mcpSurfaceWiki': 'wiki',
  'settings.aiAgents.mcpSurfaceGraph': 'graph',
  'settings.aiAgents.mcpSurfaceIngest': 'ingest',
  'settings.aiAgents.mcpSurfaceDiagnostics': 'diagnostics',
  'settings.aiAgents.mcpSurfaceWriteSuggestions': 'write suggestions',
  'settings.workflow.title': 'Workflow',
  'settings.workflow.description': 'Choose whether Grimoire shows the Inbox workflow, plus how it moves through items while you triage them.',
  'settings.workflow.explicit': 'Organize notes explicitly',
  'settings.workflow.explicitDescription': 'When enabled, an Inbox section shows unorganized notes, and a toggle lets you mark notes as organized.',
  'settings.workflow.autoAdvance': 'Auto-advance to next Inbox item',
  'settings.workflow.autoAdvanceDescription': 'When enabled, marking an Inbox note as organized immediately opens the next visible Inbox note.',
  ...EN_WORKFLOW_RUNWAY_TRANSLATIONS,
  'settings.privacy.title': 'Privacy & Telemetry',
  'settings.privacy.description': 'Anonymous data helps us fix bugs and improve Grimoire. No vault content, note titles, or file paths are ever sent.',
  'settings.privacy.cloudTranscription': 'Allow cloud transcription',
  'settings.privacy.cloudTranscriptionDescription': 'Off by default. When off, audio stays on this machine and cloud speech providers are blocked even if selected elsewhere.',
  'settings.privacy.transcriptionProvider': 'Transcription provider',
  'settings.privacy.transcriptionReadiness': 'Transcription readiness',
  'settings.privacy.transcriptionChecking': 'Checking local transcription runtime...',
  'settings.privacy.transcriptionReady': 'Ready for local transcription',
  'settings.privacy.transcriptionNotReady': 'Not ready yet',
  'settings.privacy.transcriptionCli': 'CLI',
  'settings.privacy.transcriptionModel': 'Model',
  'settings.privacy.crashReporting': 'Crash reporting',
  'settings.privacy.crashReportingDescription': 'Send anonymous error reports',
  'settings.privacy.analytics': 'Usage analytics',
  'settings.privacy.analyticsDescription': 'Share anonymous usage patterns',
  ...EN_PRIVACY_RUNWAY_TRANSLATIONS,
  'settings.footerShortcut': '⌘↵ to save · Esc to close',
  'settings.cancel': 'Cancel',
  'settings.save': 'Save',

  'locale.en': 'English',
  'locale.zhHans': 'Simplified Chinese',
  'locale.de': 'German',
  'locale.hi': 'Hindi',
  'locale.sa': 'Sanskrit',

  'noteList.title.archive': 'Archive',
  'noteList.title.changes': 'Changes',
  'noteList.title.inbox': 'Inbox',
  'noteList.title.history': 'History',
  'noteList.title.view': 'View',
  'noteList.title.notes': 'Notes',
  'noteList.searchPlaceholder': 'Search notes...',
  'noteList.searchAction': 'Search notes',
  'noteList.createNote': 'Create new note',
  'noteList.empty.changesError': 'Failed to load changes: {error}',
  'noteList.empty.noChanges': 'No pending changes',
  'noteList.empty.noArchived': 'No archived notes',
  'noteList.empty.noMatching': 'No matching notes',
  'noteList.empty.allOrganized': 'All notes are organized',
  'noteList.empty.noNotes': 'No notes found',
  'noteList.empty.noMatchingItems': 'No matching items',
  'noteList.empty.noRelatedItems': 'No related items',
} as const

export type TranslationKey = keyof typeof EN_TRANSLATIONS
type TranslationValues = Record<string, string | number>

const TRANSLATIONS: Record<AppLocale, Partial<Record<TranslationKey, string>>> = {
  en: EN_TRANSLATIONS,
  'zh-Hans': { ...ZH_HANS_TRANSLATIONS, ...ZH_HANS_SETTINGS_POLISH_TRANSLATIONS },
  de: { ...DE_TRANSLATIONS, ...DE_SETTINGS_POLISH_TRANSLATIONS },
  hi: { ...HI_TRANSLATIONS, ...HI_SETTINGS_POLISH_TRANSLATIONS },
  sa: { ...SA_TRANSLATIONS, ...SA_SETTINGS_POLISH_TRANSLATIONS },
}

export function interpolate(template: string, values: TranslationValues = {}): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    const value = values[key]
    return value === undefined ? match : String(value)
  })
}

export function translate(locale: AppLocale, key: TranslationKey, values?: TranslationValues): string {
  const template = TRANSLATIONS[locale]?.[key] ?? EN_TRANSLATIONS[key]
  return interpolate(template, values)
}

export function createTranslator(locale: AppLocale) {
  return (key: TranslationKey, values?: TranslationValues) => translate(locale, key, values)
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

export function normalizeUiLanguagePreference(value: unknown): UiLanguagePreference | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  const lower = trimmed.toLowerCase()
  if (lower === SYSTEM_UI_LANGUAGE || lower === 'auto') return SYSTEM_UI_LANGUAGE
  return normalizeLocaleCode(trimmed)
}

export function serializeUiLanguagePreference(value: unknown): AppLocale | null {
  const normalized = normalizeUiLanguagePreference(value)
  if (!normalized || normalized === SYSTEM_UI_LANGUAGE) return null
  return normalized
}

export function getBrowserLanguagePreferences(): string[] {
  if (typeof navigator === 'undefined') return []
  const languages = Array.isArray(navigator.languages) ? navigator.languages : []
  if (languages.length > 0) return [...languages]
  return navigator.language ? [navigator.language] : []
}

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

export function localeDisplayName(locale: AppLocale, displayLocale: AppLocale = locale): string {
  const localeKeys: Record<AppLocale, TranslationKey> = {
    en: 'locale.en',
    'zh-Hans': 'locale.zhHans',
    de: 'locale.de',
    hi: 'locale.hi',
    sa: 'locale.sa',
  }
  return translate(displayLocale, localeKeys[locale])
}
