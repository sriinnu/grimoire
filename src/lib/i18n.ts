import { EN_APPEARANCE_TRANSLATIONS, ZH_HANS_APPEARANCE_TRANSLATIONS } from './i18nAppearance'
import { EN_PORTABILITY_TRANSLATIONS } from './i18nPortability'

export const DEFAULT_APP_LOCALE = 'en'
export const SYSTEM_UI_LANGUAGE = 'system'

export const APP_LOCALES = ['en', 'zh-Hans'] as const
export type AppLocale = typeof APP_LOCALES[number]
export type UiLanguagePreference = typeof SYSTEM_UI_LANGUAGE | AppLocale

const SIMPLIFIED_CHINESE_LANGUAGE_CODES = new Set(['zh', 'zh-cn', 'zh-hans', 'zh-sg'])

const EN_TRANSLATIONS = {
  'command.noMatches': 'No matching commands',
  'command.palettePlaceholder': 'Type a command...',
  'command.footerNavigate': '↑↓ navigate',
  'command.footerSelect': '↵ select',
  'command.footerClose': 'esc close',
  'command.footerSend': '↵ send',
  'command.aiMode': '{agent} mode',
  'command.openSettings': 'Open Settings',
  'command.openSettings.keywords': 'preferences config appearance theme themes constellation daylight atelier living archive nocturne retro terminal',
  'command.openLanguageSettings': 'Open Language Settings',
  'command.openLanguageSettings.keywords': 'language locale i18n internationalization localization chinese english 中文',
  'command.useSystemLanguage': 'Use System Language',
  'command.switchToEnglish': 'Switch Language to English',
  'command.switchToChinese': 'Switch Language to Simplified Chinese',
  'command.openH1Setting': 'Open H1 Auto-Rename Setting',
  'command.contribute': 'Contribute',
  'command.checkUpdates': 'Check for Updates',

  'settings.title': 'Settings',
  'settings.close': 'Close settings',
  'settings.vault.title': 'Current vault',
  'settings.vault.noVault': 'No vault selected',
  'settings.sync.title': 'Sync & Updates',
  'settings.sync.description': 'Configure background pulling and which update feed Grimoire follows. Stable only receives manually promoted releases, while Alpha follows every push to main.',
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
  'settings.themePreset.livingArchive': 'Living Archive',
  'settings.themePreset.livingArchiveDescription': 'Parchment, forest ink, journal and dream-library warmth.',
  'settings.themePreset.nocturne': 'Nocturne',
  'settings.themePreset.nocturneDescription': 'Dark desk, quiet focus, luminous links.',
  'settings.themePreset.retroTerminal': 'Retro Terminal',
  'settings.themePreset.retroTerminalDescription': 'Private CLI cockpit: phosphor text, amber actions, local machine soul.',
  'settings.editorFont.label': 'Editor font',
  'settings.editorFont.system': 'System',
  'settings.editorFont.serif': 'Serif',
  'settings.editorFont.mono': 'Mono',
  'settings.editorFont.readable': 'Readable',
  'settings.editorFont.literary': 'Literary',
  'settings.editorFont.compact': 'Compact',
  'settings.editorFont.handwritten': 'Handwritten',
  'settings.language.title': 'Language',
  'settings.language.description': 'Choose the display language for Grimoire chrome. System follows macOS when that language is supported, with English as the fallback.',
  'settings.language.label': 'Display language',
  'settings.language.system': 'System ({language})',
  'settings.language.en': 'English',
  'settings.language.zhHans': 'Simplified Chinese',
  'settings.language.summary': 'Missing translations fall back to English so partially translated locales stay usable.',
  'settings.native.title': 'Native macOS',
  'settings.native.description': 'Keep Grimoire reachable outside the main window with a small menu bar icon and quick actions.',
  'settings.native.menuBarIcon': 'Show Grimoire in the menu bar',
  'settings.native.menuBarIconDescription': 'Adds Open, New Note, Quick Open, Settings, Reload Vault, and Quit to the native menu bar menu.',
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
  'settings.aiAgents.installed': 'installed',
  'settings.aiAgents.missing': 'missing',
  'settings.aiAgents.ready': '{agent}{version} is ready to use.',
  'settings.aiAgents.notInstalled': '{agent} is not installed yet. You can still select it now and install it later.',
  'settings.aiAgents.routeTruth': 'Route truth: {providerRoute}. {modelRoute}.',
  'settings.aiAgents.routeProviderCli': 'Provider resolves from the Chitragupta stream',
  'settings.aiAgents.routeProviderOverride': 'Provider override: --provider {provider}',
  'settings.aiAgents.routeModelCli': 'Model resolves from the Chitragupta stream',
  'settings.aiAgents.routeModelOverride': 'Model override: --model {model}',
  'settings.workflow.title': 'Workflow',
  'settings.workflow.description': 'Choose whether Grimoire shows the Inbox workflow, plus how it moves through items while you triage them.',
  'settings.workflow.explicit': 'Organize notes explicitly',
  'settings.workflow.explicitDescription': 'When enabled, an Inbox section shows unorganized notes, and a toggle lets you mark notes as organized.',
  'settings.workflow.autoAdvance': 'Auto-advance to next Inbox item',
  'settings.workflow.autoAdvanceDescription': 'When enabled, marking an Inbox note as organized immediately opens the next visible Inbox note.',
  'settings.privacy.title': 'Privacy & Telemetry',
  'settings.privacy.description': 'Anonymous data helps us fix bugs and improve Grimoire. No vault content, note titles, or file paths are ever sent.',
  'settings.privacy.cloudTranscription': 'Allow cloud transcription',
  'settings.privacy.cloudTranscriptionDescription': 'Off by default. When off, audio stays on this machine and cloud speech providers are blocked even if selected elsewhere.',
  'settings.privacy.transcriptionProvider': 'Transcription provider',
  'settings.privacy.crashReporting': 'Crash reporting',
  'settings.privacy.crashReportingDescription': 'Send anonymous error reports',
  'settings.privacy.analytics': 'Usage analytics',
  'settings.privacy.analyticsDescription': 'Share anonymous usage patterns',
  'settings.footerShortcut': '⌘, to open settings',
  'settings.cancel': 'Cancel',
  'settings.save': 'Save',

  'locale.en': 'English',
  'locale.zhHans': 'Simplified Chinese',

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

const ZH_HANS_TRANSLATIONS: Partial<Record<TranslationKey, string>> = {
  'command.noMatches': '没有匹配的命令',
  'command.palettePlaceholder': '输入命令...',
  'command.footerNavigate': '↑↓ 导航',
  'command.footerSelect': '↵ 选择',
  'command.footerClose': 'esc 关闭',
  'command.footerSend': '↵ 发送',
  'command.aiMode': '{agent} 模式',
  'command.openSettings': '打开设置',
  'command.openSettings.keywords': '设置 偏好 配置 外观 主题 constellation daylight atelier living archive nocturne retro terminal',
  'command.openLanguageSettings': '打开语言设置',
  'command.openLanguageSettings.keywords': '语言 区域 i18n 国际化 本地化 中文 english',
  'command.useSystemLanguage': '使用系统语言',
  'command.switchToEnglish': '切换到英文',
  'command.switchToChinese': '切换到简体中文',
  'command.openH1Setting': '打开 H1 自动重命名设置',
  'command.contribute': '参与贡献',
  'command.checkUpdates': '检查更新',

  'settings.title': '设置',
  'settings.close': '关闭设置',
  'settings.vault.title': '当前仓库',
  'settings.vault.noVault': '未选择仓库',
  'settings.sync.title': '同步与更新',
  'settings.sync.description': '配置后台拉取以及 Grimoire 使用的更新通道。Stable 只接收手动推广的版本，Alpha 跟随 main 的每次推送。',
  'settings.pullInterval': '拉取间隔（分钟）',
  'settings.releaseChannel': '发布通道',
  'settings.releaseStable': 'Stable',
  'settings.releaseAlpha': 'Alpha',
  'settings.git.title': '仓库本地性',
  'settings.git.enable': 'Git',
  'settings.git.enableDescription': '关闭后，Grimoire 会把这个仓库当成本地专用：不检查状态、不提交、不拉取、不推送，也不运行 AutoGit。',
  'settings.git.initializeDescription': '开启后会为这个仓库初始化本地 Git。除非你添加远程，否则不会离开这台机器。',
  'settings.git.description.enabled': '此仓库已启用 Git。Grimoire 可以显示更改、创建提交，并且只通过你配置的远程同步。',
  'settings.git.description.paused': '这个文件夹有 Git 元数据，但 Grimoire 会按你的选择保持本地专用。',
  'settings.git.description.local': '此仓库没有 Git 元数据。笔记、日记、梦境和私密区域都保持为本地纯文件。',
  'settings.git.status.on': 'Git 开启',
  'settings.git.status.off': '仅本地',
  'settings.appearance.title': '外观',
  'settings.appearance.description': '根据当前阅读和写作状态调整 Grimoire。',
  'settings.appearance.previewTitle': '线索开始显现。',
  'settings.appearance.previewBody': '笔记应该足够安静，让你思考；也足够清晰，让你行动。',
  ...ZH_HANS_APPEARANCE_TRANSLATIONS,
  'settings.sidebarAppearance.label': '左侧栏',
  'settings.sidebarAppearance.previewLabel': '侧栏',
  'settings.theme.label': '主题',
  'settings.theme.light': '浅色',
  'settings.theme.dark': '深色',
  'settings.themePreset.label': '主题预设',
  'settings.themePreset.group.signature': '主打',
  'settings.themePreset.group.studio': '工作室',
  'settings.themePreset.group.lab': '实验室',
  'settings.themePreset.constellation': 'Nocturne Constellation',
  'settings.themePreset.constellationDescription': '代理图谱、发光记忆、冷静的本地优先命令感。',
  'settings.themePreset.daylightAtelier': 'Daylight Atelier',
  'settings.themePreset.daylightAtelierDescription': '明亮工作室面板、清爽墨色书写、珊瑚与薄荷信号。',
  'settings.themePreset.livingArchive': 'Living Archive',
  'settings.themePreset.livingArchiveDescription': '羊皮纸、森林墨色、日记与梦境图书馆的温度。',
  'settings.themePreset.nocturne': 'Nocturne',
  'settings.themePreset.nocturneDescription': '深色书桌、安静专注、明亮链接。',
  'settings.themePreset.retroTerminal': 'Retro Terminal',
  'settings.themePreset.retroTerminalDescription': '私人 CLI 驾驶舱：荧光文字、琥珀操作、本地机器灵魂。',
  'settings.editorFont.label': '编辑器字体',
  'settings.editorFont.system': '系统',
  'settings.editorFont.serif': '衬线',
  'settings.editorFont.mono': '等宽',
  'settings.editorFont.readable': '易读',
  'settings.editorFont.literary': '文学',
  'settings.editorFont.compact': '紧凑',
  'settings.editorFont.handwritten': '手写',
  'settings.language.title': '语言',
  'settings.language.description': '选择 Grimoire 界面的显示语言。系统选项会在支持时跟随 macOS，否则回退到英文。',
  'settings.language.label': '显示语言',
  'settings.language.system': '系统（{language}）',
  'settings.language.en': '英文',
  'settings.language.zhHans': '简体中文',
  'settings.language.summary': '缺失的翻译会回退到英文，因此部分翻译的语言也能正常使用。',
  'settings.native.title': '原生 macOS',
  'settings.native.description': '通过小巧的菜单栏图标和快速操作，让 Grimoire 在主窗口之外也随手可用。',
  'settings.native.menuBarIcon': '在菜单栏显示 Grimoire',
  'settings.native.menuBarIconDescription': '在原生菜单栏菜单中加入打开、新建笔记、快速打开、设置、重新加载仓库和退出。',
  'settings.native.shellMaterial': '窗口材质',
  'settings.native.shellMaterialDescription': '只调整 Grimoire 自己绘制的外壳层。发布版本保持保守，不使用私有透明窗口 API。',
  'settings.native.shellMaterialStandard': '标准',
  'settings.native.shellMaterialUnified': '统一侧栏',
  'settings.native.shellMaterialGlassPreview': '玻璃预览',
  'settings.autogit.title': 'AutoGit',
  'settings.autogit.description.enabled': '在编辑暂停或应用不再活跃后，自动创建保守的 Git 检查点。',
  'settings.autogit.description.disabled': '当前仓库启用 Git 后才能使用 AutoGit。请先为此仓库初始化 Git。',
  'settings.autogit.enable': '启用 AutoGit',
  'settings.autogit.enableDescription': '启用后，Grimoire 会在空闲暂停或应用变为非活跃后自动提交并推送保存的本地更改。',
  'settings.autogit.idleThreshold': '空闲阈值（秒）',
  'settings.autogit.inactiveThreshold': '应用非活跃宽限期（秒）',
  'settings.titles.title': '标题与文件名',
  'settings.titles.description': '选择 Grimoire 是否根据第一个 H1 标题自动同步未命名笔记的文件名。',
  'settings.titles.autoRename': '根据第一个 H1 自动重命名未命名笔记',
  'settings.titles.autoRenameDescription': '启用后，只要第一个 H1 成为真实标题，Grimoire 就会重命名 untitled-note 文件。关闭后，文件名会保持不变，直到你从面包屑栏手动重命名。',
  'settings.aiAgents.title': 'AI 代理',
  'settings.aiAgents.default': '默认 AI 代理',
  'settings.aiAgents.installed': '已安装',
  'settings.aiAgents.missing': '缺失',
  'settings.aiAgents.ready': '{agent}{version} 已可使用。',
  'settings.aiAgents.notInstalled': '{agent} 尚未安装。你仍可先选择它，稍后再安装。',
  'settings.workflow.title': '工作流',
  'settings.workflow.description': '选择 Grimoire 是否显示 Inbox 工作流，以及整理时如何移动到下一项。',
  'settings.workflow.explicit': '显式整理笔记',
  'settings.workflow.explicitDescription': '启用后，Inbox 会显示尚未整理的笔记，并提供一个开关用于标记为已整理。',
  'settings.workflow.autoAdvance': '自动前进到下一条 Inbox',
  'settings.workflow.autoAdvanceDescription': '启用后，将 Inbox 笔记标记为已整理会立即打开下一条可见的 Inbox 笔记。',
  'settings.privacy.title': '隐私与遥测',
  'settings.privacy.description': '匿名数据可帮助我们修复错误并改进 Grimoire。不会发送仓库内容、笔记标题或文件路径。',
  'settings.privacy.crashReporting': '崩溃报告',
  'settings.privacy.crashReportingDescription': '发送匿名错误报告',
  'settings.privacy.analytics': '使用分析',
  'settings.privacy.analyticsDescription': '分享匿名使用模式',
  'settings.footerShortcut': '⌘, 打开设置',
  'settings.cancel': '取消',
  'settings.save': '保存',

  'locale.en': '英文',
  'locale.zhHans': '简体中文',

  'noteList.title.archive': '归档',
  'noteList.title.changes': '更改',
  'noteList.title.inbox': 'Inbox',
  'noteList.title.history': '历史',
  'noteList.title.view': '视图',
  'noteList.title.notes': '笔记',
  'noteList.searchPlaceholder': '搜索笔记...',
  'noteList.searchAction': '搜索笔记',
  'noteList.createNote': '新建笔记',
  'noteList.empty.changesError': '加载更改失败：{error}',
  'noteList.empty.noChanges': '没有待处理更改',
  'noteList.empty.noArchived': '没有归档笔记',
  'noteList.empty.noMatching': '没有匹配的笔记',
  'noteList.empty.allOrganized': '所有笔记都已整理',
  'noteList.empty.noNotes': '没有笔记',
  'noteList.empty.noMatchingItems': '没有匹配项',
  'noteList.empty.noRelatedItems': '没有相关项',
}

const TRANSLATIONS: Record<AppLocale, Partial<Record<TranslationKey, string>>> = {
  en: EN_TRANSLATIONS,
  'zh-Hans': ZH_HANS_TRANSLATIONS,
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
  return translate(displayLocale, locale === 'zh-Hans' ? 'locale.zhHans' : 'locale.en')
}
